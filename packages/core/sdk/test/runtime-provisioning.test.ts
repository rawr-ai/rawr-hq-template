import { spawn } from "node:child_process";
import { existsSync, fstatSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { orderBootgraph } from "../../runtime/bootgraph/src/index";
import type { AppRole, ResourceLifetime } from "../../runtime/definition/src/index";
import {
  provisionProcess,
  readProvisionedProcessHandoff,
} from "../../runtime/substrate/effect/src/index";
import { type FileLease, produceProvisioningFixture } from "./fixtures/provisioning-fixture";

test("real producer handoff provisions one cohost lease with exact requirement identity and ready config", async () => {
  const appRoot = await mkdtemp(join(tmpdir(), "sdk-provisioning-"));
  const fixture = produceProvisioningFixture(appRoot, { cohost: true, serviceConfig: true });
  expect(fixture.calls).toEqual({ build: 0, acquire: 0, release: 0, construct: 0 });
  const result = await provisionProcess({
    ...fixture,
    sources: { appRoot, test: { service: { label: "ready" } } },
  });
  try {
    const lease = result.processResources.get(fixture.serverRequirement);
    expect(fstatSync(lease.fd).isFile()).toBe(true);
    expect(await readFile(lease.path, "utf8")).toBe(`${process.pid}\n`);
    expect(result.processResources.get(fixture.asyncRequirement)).toBe(lease);
    expect(result.roleResources.server?.get(fixture.serverRequirement)).toBe(lease);
    expect(result.roleResources.async?.get(fixture.asyncRequirement)).toBe(lease);
    expect(result.processResources.has({ ...fixture.serverRequirement })).toBe(false);
    expect(() => result.processResources.get({ ...fixture.serverRequirement })).toThrow(TypeError);
    const handoff = readProvisionedProcessHandoff(result);
    expect(handoff.compilation).toBe(fixture.compilation);
    const selectionId = fixture.compilation.plan.providerSelections[0]!.selectionId;
    expect(handoff.values.has(selectionId)).toBe(true);
    expect(handoff.values.get(selectionId)).toBe(lease);
    expect(handoff.config.service(fixture.compilation.plan.serviceBindings[0]!.bindingId)).toEqual({
      config: { label: "ready" },
    });
    expect(fixture.calls).toEqual({ build: 1, acquire: 1, release: 0, construct: 0 });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.roleResources)).toBe(true);
    expect(result.findings).toEqual([]);
  } finally {
    await result.managedRuntime.dispose();
    await rm(appRoot, { recursive: true, force: true });
  }
  expect(fixture.calls.release).toBe(1);
});

const resourceViews: readonly { lifetime: ResourceLifetime; role?: AppRole }[] = [
  { lifetime: "process" },
  { lifetime: "process", role: "server" },
  { lifetime: "role" },
  { lifetime: "role", role: "server" },
];

test.each(
  resourceViews
)("projects one $lifetime lease with role qualifier $role without reacquisition", async ({
  lifetime,
  role,
}) => {
  const appRoot = await mkdtemp(join(tmpdir(), "sdk-role-resources-"));
  const fixture = produceProvisioningFixture(appRoot, { cohost: true, lifetime, role });
  try {
    expect(fixture.compilation.plan.compiledResources).toHaveLength(1);
    expect(fixture.bootgraph.modules).toHaveLength(1);
    expect(fixture.calls).toEqual({ build: 0, acquire: 0, release: 0, construct: 0 });
    const result = await provisionProcess({ ...fixture, sources: { appRoot } });
    try {
      const server = result.roleResources.server;
      const asyncRole = result.roleResources.async;
      expect(server).toBeDefined();
      expect(asyncRole).toBeDefined();
      const lease = server!.get(fixture.serverRequirement);
      expect(fstatSync(lease.fd).isFile()).toBe(true);
      expect(server!.get(fixture.asyncRequirement)).toBe(lease);
      const selectionId = fixture.compilation.plan.compiledResources[0]!.selectionId;
      expect(readProvisionedProcessHandoff(result).values.get(selectionId)).toBe(lease);
      for (const requirement of [fixture.serverRequirement, fixture.asyncRequirement]) {
        expect(result.processResources.has(requirement)).toBe(lifetime === "process");
        if (lifetime === "process") expect(result.processResources.get(requirement)).toBe(lease);
        else expect(() => result.processResources.get(requirement)).toThrow(TypeError);
        expect(asyncRole!.has(requirement)).toBe(role === undefined);
        if (role === undefined) expect(asyncRole!.get(requirement)).toBe(lease);
        else expect(() => asyncRole!.get(requirement)).toThrow(TypeError);
      }
      expect(fixture.calls).toEqual({ build: 1, acquire: 1, release: 0, construct: 0 });
    } finally {
      await result.managedRuntime.dispose();
      await result.managedRuntime.dispose();
    }
    expect(fixture.calls).toEqual({ build: 1, acquire: 1, release: 1, construct: 0 });
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
});

test("matching reordered graphs cannot substitute the compiler-held provider identity", async () => {
  const appRoot = await mkdtemp(join(tmpdir(), "sdk-provider-identity-"));
  const fixture = produceProvisioningFixture(appRoot);
  try {
    const { plan } = fixture.compilation;
    const nodes = plan.bootgraphInput.nodes.map((node) => ({
      ...node,
      providerId: "substituted.provider",
    }));
    const corrupted = {
      ...fixture.compilation,
      plan: {
        ...plan,
        bootgraphInput: { ...plan.bootgraphInput, nodes },
        providerDependencyGraph: { ...plan.providerDependencyGraph, nodes },
      },
    };
    const reordered = orderBootgraph(corrupted.plan.bootgraphInput);
    expect(reordered.modules[0]!.providerId).toBe("substituted.provider");
    await expect(
      provisionProcess({ compilation: corrupted, bootgraph: reordered, sources: { appRoot } })
    ).rejects.toThrow(TypeError);
    expect(fixture.calls).toEqual({ build: 0, acquire: 0, release: 0, construct: 0 });
    const baseline = await provisionProcess({ ...fixture, sources: { appRoot } });
    try {
      expect(fstatSync(baseline.processResources.get(fixture.serverRequirement).fd).isFile()).toBe(
        true
      );
      expect(fixture.calls.acquire).toBe(1);
    } finally {
      await baseline.managedRuntime.dispose();
    }
    expect(fixture.calls.release).toBe(1);
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
});

test("a reordered nonempty graph cannot add an edge with an absent requirement", async () => {
  const appRoot = await mkdtemp(join(tmpdir(), "sdk-extra-edge-"));
  const fixture = produceProvisioningFixture(appRoot, { dependent: true });
  try {
    const { plan } = fixture.compilation;
    expect(plan.providerDependencyGraph.nodes).toHaveLength(2);
    expect(plan.providerDependencyGraph.edges).toHaveLength(1);
    const absentId = `resource-requirement:sha256:${"0".repeat(64)}`;
    expect(
      plan.resourceRequirements.some((requirement) => requirement.requirementId === absentId)
    ).toBe(false);
    const edges = [
      ...plan.providerDependencyGraph.edges,
      { ...plan.providerDependencyGraph.edges[0]!, requirementId: absentId },
    ];
    const corrupted = {
      ...fixture.compilation,
      plan: {
        ...plan,
        bootgraphInput: { ...plan.bootgraphInput, edges },
        providerDependencyGraph: { ...plan.providerDependencyGraph, edges },
      },
    };
    const reordered = orderBootgraph(corrupted.plan.bootgraphInput);
    expect(reordered.order).toEqual(fixture.bootgraph.order);
    await expect(
      provisionProcess({ compilation: corrupted, bootgraph: reordered, sources: { appRoot } })
    ).rejects.toThrow(TypeError);
    expect(fixture.calls).toEqual({ build: 0, acquire: 0, release: 0, construct: 0 });
    const baseline = await provisionProcess({ ...fixture, sources: { appRoot } });
    try {
      const lease = baseline.processResources.get(fixture.serverRequirement);
      expect(baseline.processResources.get(fixture.dependentRequirement)).toBe(lease);
      expect(fstatSync(lease.fd).isFile()).toBe(true);
      expect(fixture.calls).toEqual({ build: 2, acquire: 2, release: 0, construct: 0 });
    } finally {
      await baseline.managedRuntime.dispose();
    }
    expect(fixture.calls).toEqual({ build: 2, acquire: 2, release: 2, construct: 0 });
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
});

test("mismatched bootgraph and invalid service config refuse before provider work", async () => {
  const appRoot = await mkdtemp(join(tmpdir(), "sdk-preflight-"));
  try {
    const fixture = produceProvisioningFixture(appRoot, { serviceConfig: true });
    const mismatched = {
      ...fixture.bootgraph,
      modules: [],
      order: [],
      rollbackOrder: [],
      releaseOrder: [],
    };
    await expect(
      provisionProcess({
        compilation: fixture.compilation,
        bootgraph: mismatched,
        sources: { appRoot, test: { service: { label: "ready" } } },
      })
    ).rejects.toThrow();
    await expect(
      provisionProcess({ ...fixture, sources: { appRoot, test: { service: { label: 42 } } } })
    ).rejects.toThrow();
    expect(fixture.calls).toEqual({ build: 0, acquire: 0, release: 0, construct: 0 });
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
});

test("a required selected source is still required with zero selected config refs", async () => {
  const appRoot = await mkdtemp(join(tmpdir(), "sdk-required-source-"));
  try {
    const fixture = produceProvisioningFixture(appRoot, { requiredFile: true });
    expect(fixture.compilation.plan.serviceBindings).toEqual([]);
    await expect(provisionProcess({ ...fixture, sources: { appRoot } })).rejects.toThrow();
    expect(fixture.calls.acquire).toBe(0);
    await writeFile(join(appRoot, "required.json"), "{}");
    const result = await provisionProcess({ ...fixture, sources: { appRoot } });
    try {
      expect(result.roles).toEqual(["server"]);
      expect(result.roleResources.async).toBeUndefined();
      expect(result.processResources.has(fixture.asyncRequirement)).toBe(false);
      expect(fixture.calls.acquire).toBe(1);
    } finally {
      await result.managedRuntime.dispose();
    }
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
});

test.each([
  { name: "missing", values: {} },
  { name: "invalid", values: { "async.provider": { label: 42 } } },
])("server startup ignores $name async config from a provider declared in the same profile", async ({
  values,
}) => {
  const appRoot = await mkdtemp(join(tmpdir(), "sdk-selected-server-"));
  const fixture = produceProvisioningFixture(appRoot, { asyncConfig: true });
  try {
    expect(fixture.profileProviderIds).toEqual([
      "file-lease.provider",
      "configured-async-lease.provider",
    ]);
    expect(fixture.compilation.plan.roles).toEqual(["server"]);
    expect(fixture.compilation.plan.configSources).toEqual([{ kind: "test" }]);
    expect(
      fixture.compilation.plan.providerSelections.map((selection) => selection.providerId)
    ).toEqual(["file-lease.provider"]);
    expect(fixture.asyncArtifacts!.compilation.plan.profileId).toBe(
      fixture.compilation.plan.profileId
    );
    expect(
      fixture.asyncArtifacts!.compilation.plan.providerSelections.map(
        (selection) => selection.providerId
      )
    ).toContain("configured-async-lease.provider");
    expect(fixture.asyncCalls).toEqual({ decode: 0, build: 0, acquire: 0, release: 0 });
    const result = await provisionProcess({ ...fixture, sources: { appRoot, test: values } });
    try {
      const lease = result.processResources.get(fixture.serverRequirement);
      expect(fstatSync(lease.fd).isFile()).toBe(true);
      expect(result.processResources.has(fixture.configuredAsyncRequirement)).toBe(false);
      expect(fixture.calls).toEqual({ build: 1, acquire: 1, release: 0, construct: 0 });
      expect(fixture.asyncCalls).toEqual({ decode: 0, build: 0, acquire: 0, release: 0 });
    } finally {
      await result.managedRuntime.dispose();
    }
    expect(fixture.calls.release).toBe(1);
    expect(fixture.asyncCalls).toEqual({ decode: 0, build: 0, acquire: 0, release: 0 });
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
});

test("selecting async requires its typed provider config before any acquisition", async () => {
  const appRoot = await mkdtemp(join(tmpdir(), "sdk-selected-async-"));
  const fixture = produceProvisioningFixture(appRoot, { asyncConfig: true });
  try {
    const asyncArtifacts = fixture.asyncArtifacts!;
    expect(fixture.profileProviderIds).toContain("configured-async-lease.provider");
    expect(asyncArtifacts.compilation.plan.profileId).toBe(fixture.compilation.plan.profileId);
    expect(asyncArtifacts.compilation.plan.roles).toEqual(["async"]);
    expect(asyncArtifacts.compilation.plan.compiledResources).toHaveLength(2);
    expect(
      asyncArtifacts.compilation.plan.compiledResources.find(
        (resource) => resource.providerId === "configured-async-lease.provider"
      )?.configRef?.key
    ).toBe("async.provider");
    await expect(
      provisionProcess({ ...asyncArtifacts, sources: { appRoot, test: {} } })
    ).rejects.toThrow(TypeError);
    expect(fixture.calls).toEqual({ build: 0, acquire: 0, release: 0, construct: 0 });
    expect(fixture.asyncCalls).toEqual({ decode: 0, build: 0, acquire: 0, release: 0 });
    await expect(
      provisionProcess({
        ...asyncArtifacts,
        sources: { appRoot, test: { "async.provider": { label: 42 } } },
      })
    ).rejects.toThrow(TypeError);
    expect(fixture.calls).toEqual({ build: 0, acquire: 0, release: 0, construct: 0 });
    expect(fixture.asyncCalls).toEqual({ decode: 1, build: 0, acquire: 0, release: 0 });
    const result = await provisionProcess({
      ...asyncArtifacts,
      sources: { appRoot, test: { "async.provider": { label: "ready" } } },
    });
    try {
      const configured = result.processResources.get(fixture.configuredAsyncRequirement);
      expect(configured.label).toBe("ready");
      expect(configured.lease).toBe(result.processResources.get(fixture.asyncRequirement));
      expect(fstatSync(configured.lease.fd).isFile()).toBe(true);
      expect(result.processResources.has(fixture.serverRequirement)).toBe(false);
      expect(fixture.calls).toEqual({ build: 1, acquire: 1, release: 0, construct: 0 });
      expect(fixture.asyncCalls).toEqual({ decode: 2, build: 1, acquire: 1, release: 0 });
    } finally {
      await result.managedRuntime.dispose();
    }
    expect(fixture.calls.release).toBe(1);
    expect(fixture.asyncCalls.release).toBe(1);
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
});

test("independent OS children own distinct leases; stopping one does not release its sibling", async () => {
  const appRoot = await mkdtemp(join(tmpdir(), "sdk-child-provisioning-"));
  const childPath = fileURLToPath(new URL("./fixtures/provisioning-child.ts", import.meta.url));
  const children = ["left", "right"].map((id) => {
    const child = spawn("bun", [childPath, appRoot, id], { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      stderr += chunk;
    });
    const exited = new Promise<number | null>((resolve) => child.once("exit", resolve));
    const ready = new Promise<FileLease & { acquisitions: number; sameLease: boolean }>(
      (resolve, reject) => {
        let line = "";
        child.once("error", reject);
        child.once("exit", () => reject(new Error(`Child exited before readiness: ${stderr}`)));
        child.stdout.setEncoding("utf8").on("data", (chunk) => {
          line += chunk;
          if (line.includes("\n")) {
            try {
              resolve(JSON.parse(line));
            } catch (error) {
              reject(error);
            }
          }
        });
      }
    );
    return { child, exited, ready };
  });
  try {
    const leases = await Promise.all(children.map(({ ready }) => ready));
    const left = leases[0]!;
    const right = leases[1]!;
    expect(left.pid).not.toBe(right.pid);
    expect(left.path).not.toBe(right.path);
    for (const lease of leases) {
      expect(lease.acquisitions).toBe(1);
      expect(lease.sameLease).toBe(true);
      expect(existsSync(lease.path)).toBe(true);
    }
    children[0]!.child.stdin.end();
    expect(await children[0]!.exited).toBe(0);
    expect(existsSync(left.path)).toBe(false);
    expect(existsSync(right.path)).toBe(true);
    children[1]!.child.stdin.end();
    expect(await children[1]!.exited).toBe(0);
    expect(existsSync(right.path)).toBe(false);
  } finally {
    for (const { child } of children) child.kill();
    await Promise.all(children.map((child) => child.exited));
    await rm(appRoot, { recursive: true, force: true });
  }
}, 30_000);
