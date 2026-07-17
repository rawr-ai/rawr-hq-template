import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Client } from "@rawr/agent-plugin-lifecycle/client";
import { describe, expect, it } from "vitest";

import {
  parseArtifactHandle,
  parseAttestPromotionRequest,
  parseBuildRequest,
  parseExportRequest,
  parsePackageRequest,
  parseRetireRequest,
  parseStatusRequest,
  parseSyncRequest,
  parseTestRequest,
  parseVendorStatusRequest,
  parseVendorUpdateRequest,
} from "../../src/lib/agent-plugins/commands/input";
import {
  invokeLifecycleProcedure,
  lifecycleResultExitCode,
  parseControllerProjectionBinding,
  type LifecycleOperationRequest,
} from "../../src/lib/agent-plugins/commands/projection";
import * as projectionSurface from "../../src/lib/agent-plugins/commands/projection";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const hex40 = "a".repeat(40);
const hex64 = "b".repeat(64);
const releaseHandle = `release:rd1_${"1".repeat(64)}:ad1_${"2".repeat(64)}`;
const setHandle = `release-set:rs1_${"3".repeat(64)}`;

describe("qualified lifecycle command boundary", () => {
  it("has no mutable process-global lifecycle binding surface", () => {
    expect(Object.hasOwn(projectionSurface, "bindLifecycleClientFactory")).toBe(false);
    expect(Object.hasOwn(projectionSurface, "bindAgentPluginUndoApplication")).toBe(false);
  });

  it("keeps the lifecycle command closure disjoint from the external Oclif registry owner", () => {
    const closure = relativeImportClosure([
      path.join(cliRoot, "src", "commands", "agent", "plugins"),
      path.join(cliRoot, "src", "lib", "agent-plugins", "commands"),
    ]);

    expect(closure.some((file) => file.includes(`${path.sep}external-extensions${path.sep}`))).toBe(false);
    for (const file of closure) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("@oclif/plugin-plugins");
      expect(source, file).not.toContain("NativeRegistryState");
      expect(source, file).not.toContain("NativePluginSubprocessPort");
    }
  });

  it("declares only the exact qualified lifecycle and external-extension command inventory", () => {
    const declared = [
      ...commandFiles(path.join(cliRoot, "src", "commands", "agent", "plugins"), "agent:plugins"),
      ...commandFiles(path.join(cliRoot, "src", "commands", "plugins"), "plugins"),
    ].sort();

    expect(declared).toEqual([...EXACT_PLUGIN_COMMANDS]);
    for (const id of declared) {
      const root = id.startsWith("agent:plugins:")
        ? path.join(cliRoot, "src", "commands", "agent", "plugins")
        : path.join(cliRoot, "src", "commands", "plugins");
      const relative = id.replace(id.startsWith("agent:plugins:") ? "agent:plugins:" : "plugins:", "")
        .split(":")
        .join(path.sep);
      const source = readFileSync(path.join(root, `${relative}.ts`), "utf8");
      expect(source, id).not.toMatch(/static\s+(?:hiddenAliases|aliases)\s*=/u);
    }
  });

  it("loads every admitted command and refuses retired aggregate, alias, and composition surfaces", { timeout: 60_000 }, () => {
    for (const id of EXACT_PLUGIN_COMMANDS) {
      const result = runRawr([...id.split(":"), "--help"]);
      expect(result.status, `${id}\n${result.stderr}`).toBe(0);
    }

    for (const retired of [
      ["agent", "sync"],
      ["undo"],
      ["plugins", "sync"],
      ["plugins", "status"],
      ["plugins", "export"],
      ["plugins", "scaffold"],
      ["plugins", "web"],
      ["app"],
    ]) {
      const result = runRawr(retired);
      expect(result.status, retired.join(" ")).toBe(2);
      expect(result.stderr).toContain(`command ${retired.join(":")} not found`);
    }
  });

  it("rejects ambiguous and noncanonical inputs before a client can be constructed", () => {
    let clientConstructions = 0;
    const construct = () => {
      clientConstructions += 1;
    };
    for (const invalid of [
      () => parseArtifactHandle(hex64),
      () => parseArtifactHandle(`release:rd1_${"A".repeat(64)}:ad1_${"2".repeat(64)}`),
      () => parseBuildRequest({ ...releaseWorkspace(), plugin: "alpha", "complete-set": true }),
      () => parsePackageRequest({ artifact: releaseHandle, format: "cowork-v1", output: "relative.zip" }),
      () => parseExportRequest({
        artifact: releaseHandle,
        mode: "complete-set",
        layout: "codex-v1",
        destination: ["/tmp/rawr-export"],
      }),
      () => parseTestRequest({
        release: [releaseHandle],
        "release-set": setHandle,
        "evaluation-profile": "native@v1",
        target: ["codex=/tmp/codex-home"],
      }),
      () => parseStatusRequest({
        "content-workspace": "/tmp/content",
        "repository-identity": "repo",
        target: ["codex=relative"],
      }),
      () => parseControllerProjectionBinding({
        "provider-executable": ["codex=/tmp/codex", "codex=/tmp/other-codex"],
      }),
    ]) {
      expect(() => {
        invalid();
        construct();
      }).toThrow();
    }
    expect(clientConstructions).toBe(0);

    const command = runRawr([
      "agent", "plugins", "package",
      "--artifact", releaseHandle,
      "--format", "cowork-v1",
      "--output", "relative.zip",
      "--json",
    ]);
    expect(command.status).toBe(2);
    expect(JSON.parse(command.stdout)).toMatchObject({
      ok: false,
      error: { code: "LIFECYCLE_INPUT_INVALID" },
    });
  });

  it("parses every command into its closed procedure request", () => {
    expect(parseBuildRequest({ ...releaseWorkspace(), "complete-set": true })).toMatchObject({
      mode: { kind: "complete-set" },
      contentWorkspace: { locator: "/tmp/content", sourceCommit: hex40, sourceTree: hex64 },
    });
    expect(parseVendorStatusRequest(vendorWorkspace())).toMatchObject({
      contentWorkspace: { locator: "/tmp/content" },
    });
    expect(parseVendorUpdateRequest({ ...vendorWorkspace(), source: ["vendor-a"] })).toMatchObject({
      sourceIds: ["vendor-a"],
    });
    expect(parsePackageRequest({ artifact: releaseHandle, format: "cowork-v1", output: "/tmp/alpha.zip" }))
      .toMatchObject({ artifactRef: { kind: "release" }, outputPath: "/tmp/alpha.zip" });
    expect(parseExportRequest({
      artifact: setHandle,
      mode: "complete-set",
      layout: "claude-v1",
      destination: ["/tmp/export"],
    })).toMatchObject({
      protocolVersion: 1,
      artifactRef: { kind: "complete-set" },
      overwritePolicy: "managed-only",
    });
    expect(parseTestRequest({
      "release-set": setHandle,
      "evaluation-profile": "native@v1",
      target: ["codex=/tmp/codex-home", "claude=/tmp/claude-home"],
    })).toMatchObject({ kind: "complete-test" });
    expect(parseSyncRequest(providerWorkspace())).toMatchObject({ kind: "canonical-sync", channel: "current-main" });
    expect(parseStatusRequest(providerWorkspace())).toMatchObject({ kind: "canonical-status", channel: "current-main" });
    expect(parseAttestPromotionRequest(attestationFlags())).toMatchObject({
      locator: { workspacePath: "/tmp/content", expectedRepositoryIdentity: "repo" },
      landedReleaseInputObject: { path: "records/landed.json" },
    });
  });

  it("dispatches each projection to exactly one typed client procedure", async () => {
    const calls: string[] = [];
    const client = recordingClient(calls);
    const requests = operationRequests();
    for (const request of requests) {
      calls.length = 0;
      await invokeLifecycleProcedure(client, request);
      expect(calls).toEqual([request.operation]);
    }
  });

  it("preserves status exit semantics and stutter outcomes without mutation dispatch", async () => {
    expect(lifecycleResultExitCode("providers.canonicalStatus", {
      ok: true,
      value: [{ status: "CONVERGED" }, { status: "CONVERGED" }],
    })).toBe(0);
    expect(lifecycleResultExitCode("providers.canonicalStatus", {
      ok: true,
      value: [{ status: "CONVERGED" }, { status: "DRIFTED" }],
    })).toBe(1);
    expect(lifecycleResultExitCode("providers.canonicalStatus", { ok: false, issues: [] })).toBe(1);

    let writes = 0;
    const client = {
      vendors: {
        status: async () => ({ kind: "VendorStatus", sources: [] }),
        update: async () => ({ kind: "ReadOnlyConverged", sourceIds: [] }),
      },
      providers: {
        canonicalStatus: async () => ({ ok: true, value: [{ status: "CONVERGED" }] }),
        canonicalSync: async () => {
          writes += 1;
          return { ok: true, value: { status: "Mutated" } };
        },
      },
    } as unknown as Client;

    await invokeLifecycleProcedure(client, {
      operation: "vendors.status",
      input: parseVendorStatusRequest(vendorWorkspace()),
    });
    await invokeLifecycleProcedure(client, {
      operation: "vendors.update",
      input: parseVendorUpdateRequest({ ...vendorWorkspace(), source: ["vendor-a"] }),
    });
    await invokeLifecycleProcedure(client, {
      operation: "providers.canonicalStatus",
      input: parseStatusRequest(providerWorkspace()),
    });
    expect(writes).toBe(0);
  });
});

const EXACT_PLUGIN_COMMANDS = [
  "agent:plugins:attest-promotion",
  "agent:plugins:build",
  "agent:plugins:check",
  "agent:plugins:create",
  "agent:plugins:export",
  "agent:plugins:package",
  "agent:plugins:retire",
  "agent:plugins:status",
  "agent:plugins:sync",
  "agent:plugins:test",
  "agent:plugins:undo",
  "agent:plugins:vendors:status",
  "agent:plugins:vendors:update",
  "plugins:inspect",
  "plugins:install",
  "plugins:link",
  "plugins:list",
  "plugins:reset",
  "plugins:uninstall",
  "plugins:update",
] as const;

function commandFiles(root: string, prefix: string): string[] {
  const ids: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      const relative = path.relative(root, absolute).slice(0, -".ts".length).split(path.sep).join(":");
      ids.push(`${prefix}:${relative}`);
    }
  };
  visit(root);
  return ids;
}

function recordingClient(calls: string[]): Client {
  const call = (name: string) => async () => {
    calls.push(name);
    return { kind: "Recorded" };
  };
  return {
    releases: { check: call("releases.check"), build: call("releases.build") },
    vendors: { status: call("vendors.status"), update: call("vendors.update") },
    packaging: { package: call("packaging.package") },
    exports: { apply: call("exports.apply") },
    providers: {
      targetedTest: call("providers.targetedTest"),
      completeTest: call("providers.completeTest"),
      canonicalSync: call("providers.canonicalSync"),
      canonicalStatus: call("providers.canonicalStatus"),
      managedRetire: call("providers.managedRetire"),
      completeNativeHomes: call("providers.completeNativeHomes"),
    },
    governance: {
      validateAcceptance: call("governance.validateAcceptance"),
      attestPromotion: call("governance.attestPromotion"),
      resolveCurrentMain: call("governance.resolveCurrentMain"),
    },
  } as unknown as Client;
}

function operationRequests(): LifecycleOperationRequest[] {
  const release = parseArtifactHandle(releaseHandle);
  const releaseSet = parseArtifactHandle(setHandle);
  if (release.kind !== "release" || releaseSet.kind !== "complete-set") throw new Error("fixture handle mismatch");
  const target = [{ provider: "codex" as const, home: "/tmp/codex-home" }];
  return [
    { operation: "releases.check", input: parseBuildRequest({ ...releaseWorkspace(), plugin: "alpha" }) },
    { operation: "releases.build", input: parseBuildRequest({ ...releaseWorkspace(), plugin: "alpha" }) },
    { operation: "vendors.status", input: parseVendorStatusRequest(vendorWorkspace()) },
    { operation: "vendors.update", input: parseVendorUpdateRequest({ ...vendorWorkspace(), source: ["vendor-a"] }) },
    { operation: "packaging.package", input: parsePackageRequest({ artifact: releaseHandle, format: "cowork-v1", output: "/tmp/a.zip" }) },
    { operation: "exports.apply", input: parseExportRequest({ artifact: releaseHandle, mode: "targeted-release", layout: "codex-v1", destination: ["/tmp/export"] }) },
    { operation: "providers.targetedTest", input: { kind: "targeted-test", releases: [release], evaluationProfile: "native@v1", targets: target } },
    { operation: "providers.completeTest", input: { kind: "complete-test", releaseSet, evaluationProfile: "native@v1", targets: target } },
    { operation: "providers.canonicalSync", input: parseSyncRequest(providerWorkspace()) },
    { operation: "providers.canonicalStatus", input: parseStatusRequest(providerWorkspace()) },
    { operation: "providers.managedRetire", input: parseRetireRequest({ plugin: "alpha", target: ["codex=/tmp/codex-home"] }) },
    { operation: "governance.attestPromotion", input: parseAttestPromotionRequest(attestationFlags()) },
  ];
}

function releaseWorkspace() {
  return {
    "content-workspace": "/tmp/content",
    "repository-identity": "github:rawr/hq",
    "content-authority": "rawr-hq",
    "remote-name": "origin",
    "remote-url": "https://example.invalid/rawr-hq.git",
    ref: "refs/heads/main",
    "source-commit": hex40,
    "source-tree": hex64,
    "release-input": "records/release-input.json",
    "plugin-root": "plugins/agents",
  };
}

function vendorWorkspace() {
  const input = releaseWorkspace();
  return {
    "content-workspace": input["content-workspace"],
    "repository-identity": input["repository-identity"],
    "content-authority": input["content-authority"],
    ref: input.ref,
    "source-commit": input["source-commit"],
    "source-tree": input["source-tree"],
    "release-input": input["release-input"],
  };
}

function providerWorkspace() {
  return {
    "content-workspace": "/tmp/content",
    "repository-identity": "repo",
    target: ["codex=/tmp/codex-home"],
  };
}

function attestationFlags() {
  const flags: Record<string, unknown> = {
    "content-workspace": "/tmp/content",
    "repository-identity": "repo",
  };
  for (const prefix of ["policy", "request", "acceptance", "landed"] as const) {
    flags[`${prefix}-ref`] = "refs/heads/main";
    flags[`${prefix}-commit`] = hex40;
    flags[`${prefix}-tree`] = hex64;
    flags[`${prefix}-path`] = `records/${prefix}.json`;
    flags[`${prefix}-blob`] = hex40;
  }
  return flags;
}

function runRawr(args: readonly string[]) {
  return spawnSync("bun", [path.join(cliRoot, "test", "command-fixture", "command-test-cli.ts"), ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" },
  });
}

function relativeImportClosure(roots: readonly string[]): readonly string[] {
  const pending = roots.flatMap((root) => collectTypeScriptFiles(root));
  const visited = new Set<string>();
  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || visited.has(file)) continue;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    for (const specifier of relativeImportSpecifiers(source)) {
      const dependency = resolveTypeScriptImport(file, specifier);
      if (dependency !== undefined && !visited.has(dependency)) pending.push(dependency);
    }
  }
  return [...visited].sort();
}

function collectTypeScriptFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectTypeScriptFiles(target));
    else if (entry.isFile() && /\.tsx?$/u.test(entry.name)) files.push(target);
  }
  return files;
}

function relativeImportSpecifiers(source: string): readonly string[] {
  const specifiers = new Set<string>();
  for (const pattern of [
    /\bfrom\s+["'](\.[^"']+)["']/gu,
    /\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/gu,
    /\bimport\s+["'](\.[^"']+)["']/gu,
  ]) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) specifiers.add(specifier);
    }
  }
  return [...specifiers];
}

function resolveTypeScriptImport(importer: string, specifier: string): string | undefined {
  const unresolved = path.resolve(path.dirname(importer), specifier);
  const extensionless = unresolved.replace(/\.js$/u, "");
  for (const candidate of [
    unresolved,
    `${extensionless}.ts`,
    `${extensionless}.tsx`,
    path.join(extensionless, "index.ts"),
    path.join(extensionless, "index.tsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return undefined;
}
