import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Client } from "@rawr/agent-plugin-lifecycle/client";
import { describe, expect, it } from "vitest";

import {
  parseArtifactHandle,
  parseBuildRequest,
  parseCheckOperationRequest,
  parseExportRequest,
  parsePackageRequest,
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
  projectLifecycleOperation,
  type ControllerProjectionBinding,
  type LifecycleOperationRequest,
} from "../../src/lib/agent-plugins/commands/projection";
import * as projectionSurface from "../../src/lib/agent-plugins/commands/projection";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
} from "./service-runtime/releases/owned-fixture-root";

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
      ["agent", "plugins", "attest-promotion"],
      ["agent", "plugins", "retire"],
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
      () => parseCheckOperationRequest({ mode: "codec" }),
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

  it("rejects retired and cross-mode check inputs before a client can be constructed", () => {
    let clientConstructions = 0;
    const construct = () => {
      clientConstructions += 1;
    };
    const staged = stagedReleaseWorkspace();
    const currentMainBody = JSON.stringify(currentMainBodyFixture());

    for (const invalid of [
      { mode: "protected-lanes" },
      { ...staged, mode: "repository-staged", "source-commit": hex40 },
      { ...staged, mode: "repository-staged", "source-tree": hex64 },
      { ...staged, mode: "repository-staged", plugin: "alpha" },
      { ...staged, mode: "repository-staged", "complete-set": true },
      { ...staged, mode: "repository-clean", "source-tree": hex64 },
      { ...staged, mode: "repository-clean", "source-commit": hex40 },
      { ...releaseWorkspace(), mode: "repository-clean", plugin: "alpha" },
      { ...releaseWorkspace(), mode: "repository-clean", "complete-set": true },
      { mode: "current-main-record" },
      {
        mode: "current-main-record",
        "current-main-body-json": currentMainBody,
        "current-main-envelope-json": "{}\n",
      },
      {
        mode: "current-main-record",
        "current-main-body-json": currentMainBody,
        "content-workspace": "/tmp/content",
      },
      { mode: "current-main-record", "current-main-body-json": "{" },
      {
        mode: "current-main-selection",
        "content-workspace": "/tmp/content",
        "repository-identity": "git:github.com/rawr-ai/rawr-hq",
        "current-main-body-json": currentMainBody,
      },
      {
        mode: "current-main-selection",
        "content-workspace": "/tmp/content",
      },
    ]) {
      expect(() => {
        parseCheckOperationRequest(invalid);
        construct();
      }).toThrow();
    }

    expect(clientConstructions).toBe(0);

    for (const retired of [
      ["--mode", "protected-lanes"],
      ["--protected-lanes-json", "{}"],
      ["--protected-lanes-schema-sha256", hex64],
    ]) {
      const result = runRawr(["agent", "plugins", "check", ...retired, "--json"]);
      expect(result.status, `${retired.join(" ")}\n${result.stderr}`).toBe(2);
      expect(result.stdout).not.toContain('"operation"');
    }
  });

  it("parses every command into its closed procedure request", () => {
    expect(parseCheckOperationRequest({ ...releaseWorkspace(), mode: "release", plugin: "alpha" }))
      .toMatchObject({ operation: "releases.check", input: { mode: { kind: "targeted", pluginId: "alpha" } } });
    expect(parseCheckOperationRequest({ ...stagedReleaseWorkspace(), mode: "repository-staged" }))
      .toMatchObject({
        operation: "releases.checkRepository",
        input: { kind: "staged", contentWorkspace: { locator: "/tmp/content" } },
      });
    expect(parseCheckOperationRequest({ ...releaseWorkspace(), mode: "repository-clean" }))
      .toMatchObject({
        operation: "releases.checkRepository",
        input: { kind: "clean", contentWorkspace: { sourceCommit: hex40, sourceTree: hex64 } },
      });
    expect(parseCheckOperationRequest({
      mode: "current-main-record",
      "current-main-body-json": JSON.stringify(currentMainBodyFixture()),
    })).toEqual({
      operation: "governance.currentMainRecord",
      input: { kind: "encode-body", body: currentMainBodyFixture() },
    });
    const envelopeJson = "{\"schemaVersion\":2}\n";
    expect(parseCheckOperationRequest({
      mode: "current-main-record",
      "current-main-envelope-json": envelopeJson,
    })).toEqual({
      operation: "governance.currentMainRecord",
      input: { kind: "validate-envelope", bytes: new TextEncoder().encode(envelopeJson) },
    });
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
    expect(parseCheckOperationRequest({
      mode: "current-main-selection",
      "content-workspace": "/tmp/content",
      "repository-identity": "git:github.com/rawr-ai/rawr-hq",
    })).toMatchObject({
      operation: "governance.currentMainSelection",
      input: {
        locator: {
          workspacePath: "/tmp/content",
          expectedRepositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
        },
      },
    });
  });

  it("executes the pure current-main record operation without executable authority", () => {
    const result = runRawr([
      "agent", "plugins", "check",
      "--mode", "current-main-record",
      "--current-main-body-json", JSON.stringify(currentMainBodyFixture()),
      "--json",
    ]);

    expect(result.status, result.stderr).toBe(0);
    const output = parseSingleJson(result.stdout);
    expect(output).toMatchObject({
      ok: true,
      data: {
        operation: "governance.currentMainRecord",
        result: { ok: true, value: { protocol: "agent-plugin-current-main@v2" } },
      },
    });
    const data = jsonRecord(jsonRecord(output).data);
    const resultRecord = jsonRecord(data.result);
    const projected = jsonRecord(resultRecord.value);
    expect(projected.bytes).toBeUndefined();
    expect(typeof projected.envelopeText).toBe("string");
    if (typeof projected.envelopeText !== "string") throw new Error("Missing envelope text");
    expect(new TextEncoder().encode(projected.envelopeText).byteLength).toBe(projected.byteLength);

    const human = runRawr([
      "agent", "plugins", "check",
      "--mode", "current-main-record",
      "--current-main-body-json", JSON.stringify(currentMainBodyFixture()),
    ]);
    expect(human.status, human.stderr).toBe(0);
    expect(human.stdout).toBe(projected.envelopeText);

    const validated = runRawr([
      "agent", "plugins", "check",
      "--mode", "current-main-record",
      "--current-main-envelope-json", projected.envelopeText,
      "--json",
    ]);
    expect(validated.status, validated.stderr).toBe(0);
    expect(parseSingleJson(validated.stdout)).toMatchObject({
      ok: true,
      data: {
        operation: "governance.currentMainRecord",
        result: { ok: true, value: { envelopeText: projected.envelopeText } },
      },
    });
  });

  it("dispatches each projection to exactly one typed client procedure", async () => {
    const calls: string[] = [];
    const client = recordingClient(calls);
    const requests = operationRequests();
    for (const request of requests) {
      calls.length = 0;
      await invokeLifecycleProcedure(request, { providerExecutables: {} }, () => client);
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
    expect(lifecycleResultExitCode("providers.canonicalStatus", {
      ok: true,
      value: [{ status: "CONVERGED" }, { status: "BLOCKED_SELECTION" }],
    })).toBe(2);
    expect(lifecycleResultExitCode("providers.canonicalStatus", { ok: false, issues: [] })).toBe(1);
    expect(lifecycleResultExitCode("providers.canonicalSync", {
      ok: true,
      value: {
        status: "Blocked",
        targets: [{ status: "BLOCKED_SELECTION" }],
      },
    })).toBe(2);
    expect(lifecycleResultExitCode("governance.currentMainRecord", { ok: true, value: {} })).toBe(0);
    expect(lifecycleResultExitCode("governance.currentMainRecord", {
      ok: false,
      failure: { code: "InvalidSchema", path: "currentMain", message: "invalid" },
    })).toBe(1);
    expect(lifecycleResultExitCode("governance.currentMainSelection", {
      kind: "CURRENT_ELIGIBLE",
      selection: {},
    })).toBe(0);
    expect(lifecycleResultExitCode("governance.currentMainSelection", {
      kind: "STALE_RECORD",
      reason: "stale",
    })).toBe(2);

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

    await invokeLifecycleProcedure({
      operation: "vendors.status",
      input: parseVendorStatusRequest(vendorWorkspace()),
    }, { providerExecutables: {} }, () => client);
    await invokeLifecycleProcedure({
      operation: "vendors.update",
      input: parseVendorUpdateRequest({ ...vendorWorkspace(), source: ["vendor-a"] }),
    }, { providerExecutables: {} }, () => client);
    await invokeLifecycleProcedure({
      operation: "providers.canonicalStatus",
      input: parseStatusRequest(providerWorkspace()),
    }, { providerExecutables: {} }, () => client);
    expect(writes).toBe(0);

    const fixture = await createOwnedFixtureRoot();
    try {
      const providerHome = path.join(fixture.path, "provider-home");
      await mkdir(providerHome, { mode: 0o700 });
      const blocked = runRawr([
        ...canonicalStatusCommand(
          path.join(fixture.path, "missing-content-workspace"),
          [`codex=${providerHome}`],
          "/usr/bin/false",
        ),
        "--json",
      ]);
      expect(blocked.status, `${blocked.stderr}\n${blocked.stdout}`).toBe(2);
      expect(parseSingleJson(blocked.stdout)).toMatchObject({
        ok: true,
        data: {
          operation: "providers.canonicalStatus",
          result: {
            ok: true,
            value: [{ status: "BLOCKED_SELECTION" }],
          },
        },
      });
    } finally {
      await removeOwnedFixtureRoot(fixture);
    }
  });

  it("emits one typed result when a lifecycle procedure exits nonzero", () => {
    const missingWorkspace = path.join(tmpdir(), `rawr-c5-missing-content-${randomUUID()}`);
    const args = [
      "agent", "plugins", "check",
      "--content-workspace", missingWorkspace,
      "--repository-identity", "github:rawr/hq",
      "--content-authority", "rawr-hq",
      "--remote-name", "origin",
      "--remote-url", "https://example.invalid/rawr-hq.git",
      "--ref", "refs/heads/main",
      "--source-commit", hex40,
      "--source-tree", hex64,
      "--release-input", "records/release-input.json",
      "--plugin-root", "plugins/agents",
      "--plugin", "alpha",
      "--git-executable", "/usr/bin/git",
    ] as const;
    const result = runRawr([...args, "--json"]);

    expect(result.status, result.stderr).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      data: {
        operation: "releases.check",
        result: { kind: "IneligibleReport" },
      },
    });
    expect(result.stdout).not.toContain("LIFECYCLE_PROCEDURE_FAILED");

    const human = runRawr(args);
    expect(human.status, human.stderr).toBe(1);
    expect(human.stdout).toBe("releases.check: IneligibleReport\n");
    expect(human.stdout).not.toBe("ok\n");
  });

  it("rejects provider executable authority on export-only undo", () => {
    const result = runRawr([
      "agent", "plugins", "undo",
      "--provider-executable", "codex=/tmp/codex",
      "--json",
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Nonexistent flag: --provider-executable");
    expect(result.stdout).not.toContain("LIFECYCLE_UNDO_FAILED");
  });

  it("rejects selected executable authorities before constructing lifecycle ports", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const providerHome = path.join(fixture.path, "provider-home");
      const missingGit = path.join(fixture.path, "missing-git");
      const providerAlias = path.join(fixture.path, "provider-alias");
      await mkdir(providerHome, { mode: 0o700 });
      await symlink("/bin/echo", providerAlias);
      const targetedTest = parseTestRequest({
        release: [releaseHandle],
        "evaluation-profile": "native@v1",
        target: [`codex=${providerHome}`],
      });
      if (targetedTest.kind !== "targeted-test") throw new Error("targeted test fixture parsed as complete-set mode");

      const cases: readonly Readonly<{
        label: string;
        request: LifecycleOperationRequest;
        binding: ControllerProjectionBinding;
        command: readonly string[];
      }>[] = [
        {
          label: "missing Git executable",
          request: { operation: "releases.check", input: parseBuildRequest({ ...releaseWorkspace(), plugin: "alpha" }) },
          binding: { gitExecutable: missingGit, providerExecutables: {} },
          command: releaseCheckCommand(fixture.path, missingGit),
        },
        {
          label: "provider executable alias",
          request: {
            operation: "providers.targetedTest",
            input: targetedTest,
          },
          binding: { providerExecutables: { codex: providerAlias } },
          command: [
            "agent", "plugins", "test",
            "--release", releaseHandle,
            "--evaluation-profile", "native@v1",
            "--target", `codex=${providerHome}`,
            "--provider-executable", `codex=${providerAlias}`,
          ],
        },
      ];

      for (const testCase of cases) {
        let clientConstructions = 0;
        const rejected = await captureRejection(projectLifecycleOperation(
          testCase.request,
          testCase.binding,
          () => {
            clientConstructions += 1;
            return recordingClient([]);
          },
        ));
        expect.soft(rejected, testCase.label).toMatchObject({
          code: "LIFECYCLE_AUTHORITY_BINDING_INVALID",
        });
        expect.soft(clientConstructions, testCase.label).toBe(0);

        const command = runRawr([...testCase.command, "--json"]);
        expect.soft(command.status, `${testCase.label}\n${command.stderr}`).toBe(2);
        expect.soft(parseSingleJson(command.stdout), testCase.label).toMatchObject({
          ok: false,
          error: { code: "LIFECYCLE_AUTHORITY_BINDING_INVALID" },
        });
      }
    } finally {
      await removeOwnedFixtureRoot(fixture);
    }
  });

  it("rejects aliased and duplicate canonical provider homes before constructing lifecycle ports", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const providerHome = path.join(fixture.path, "provider-home");
      const providerAlias = path.join(fixture.path, "provider-home-alias");
      await mkdir(providerHome, { mode: 0o700 });
      await symlink(providerHome, providerAlias);

      const targetCases = [
        {
          label: "aliased provider home",
          targets: [`codex=${providerAlias}`],
          providerExecutables: { codex: "/bin/echo" },
        },
        {
          label: "duplicate canonical provider home",
          targets: [`claude=${providerHome}`, `codex=${providerHome}`],
          providerExecutables: { claude: "/bin/echo", codex: "/bin/echo" },
        },
      ] as const;

      for (const testCase of targetCases) {
        const request: LifecycleOperationRequest = {
          operation: "providers.canonicalStatus",
          input: parseStatusRequest({
            "content-workspace": fixture.path,
            "repository-identity": "repo",
            target: [...testCase.targets],
          }),
        };
        const binding: ControllerProjectionBinding = {
          gitExecutable: "/usr/bin/git",
          providerExecutables: testCase.providerExecutables,
        };
        let clientConstructions = 0;
        const rejected = await captureRejection(projectLifecycleOperation(request, binding, () => {
          clientConstructions += 1;
          return recordingClient([]);
        }));
        expect.soft(rejected, testCase.label).toMatchObject({ code: "LIFECYCLE_INPUT_INVALID" });
        expect.soft(clientConstructions, testCase.label).toBe(0);

        const command = runRawr([
          ...canonicalStatusCommand(
            fixture.path,
            testCase.targets,
            "/bin/echo",
            "claude" in testCase.providerExecutables ? "/bin/echo" : undefined,
          ),
          "--json",
        ]);
        expect.soft(command.status, `${testCase.label}\n${command.stderr}`).toBe(2);
        expect.soft(parseSingleJson(command.stdout), testCase.label).toMatchObject({
          ok: false,
          error: { code: "LIFECYCLE_INPUT_INVALID" },
        });
      }
    } finally {
      await removeOwnedFixtureRoot(fixture);
    }
  });
});

const EXACT_PLUGIN_COMMANDS = [
  "agent:plugins:build",
  "agent:plugins:check",
  "agent:plugins:create",
  "agent:plugins:export",
  "agent:plugins:package",
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
    releases: {
      check: call("releases.check"),
      checkRepository: call("releases.checkRepository"),
      build: call("releases.build"),
    },
    vendors: { status: call("vendors.status"), update: call("vendors.update") },
    packaging: { package: call("packaging.package") },
    exports: { apply: call("exports.apply") },
    providers: {
      targetedTest: call("providers.targetedTest"),
      completeTest: call("providers.completeTest"),
      canonicalSync: call("providers.canonicalSync"),
      canonicalStatus: call("providers.canonicalStatus"),
      completeNativeHomes: call("providers.completeNativeHomes"),
    },
    governance: {
      currentMainRecord: call("governance.currentMainRecord"),
      currentMainSelection: call("governance.currentMainSelection"),
    },
  } as unknown as Client;
}

function operationRequests(): LifecycleOperationRequest[] {
  const release = parseArtifactHandle(releaseHandle);
  const releaseSet = parseArtifactHandle(setHandle);
  if (release.kind !== "release" || releaseSet.kind !== "complete-set") throw new Error("fixture handle mismatch");
  const target = [{ provider: "codex" as const, home: "/tmp/codex-home" }];
  const stagedCheck = parseCheckOperationRequest({
    ...stagedReleaseWorkspace(),
    mode: "repository-staged",
  });
  const currentMainRecord = parseCheckOperationRequest({
    mode: "current-main-record",
    "current-main-body-json": JSON.stringify(currentMainBodyFixture()),
  });
  const currentMainSelection = parseCheckOperationRequest({
    mode: "current-main-selection",
    "content-workspace": "/tmp/content",
    "repository-identity": "git:github.com/rawr-ai/rawr-hq",
  });
  return [
    { operation: "releases.check", input: parseBuildRequest({ ...releaseWorkspace(), plugin: "alpha" }) },
    stagedCheck,
    currentMainRecord,
    currentMainSelection,
    { operation: "releases.build", input: parseBuildRequest({ ...releaseWorkspace(), plugin: "alpha" }) },
    { operation: "vendors.status", input: parseVendorStatusRequest(vendorWorkspace()) },
    { operation: "vendors.update", input: parseVendorUpdateRequest({ ...vendorWorkspace(), source: ["vendor-a"] }) },
    { operation: "packaging.package", input: parsePackageRequest({ artifact: releaseHandle, format: "cowork-v1", output: "/tmp/a.zip" }) },
    { operation: "exports.apply", input: parseExportRequest({ artifact: releaseHandle, mode: "targeted-release", layout: "codex-v1", destination: ["/tmp/export"] }) },
    { operation: "providers.targetedTest", input: { kind: "targeted-test", releases: [release], evaluationProfile: "native@v1", targets: target } },
    { operation: "providers.completeTest", input: { kind: "complete-test", releaseSet, evaluationProfile: "native@v1", targets: target } },
    { operation: "providers.canonicalSync", input: parseSyncRequest(providerWorkspace()) },
    { operation: "providers.canonicalStatus", input: parseStatusRequest(providerWorkspace()) },
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

function stagedReleaseWorkspace() {
  const input = releaseWorkspace();
  return {
    "content-workspace": input["content-workspace"],
    "repository-identity": input["repository-identity"],
    "content-authority": input["content-authority"],
    "remote-name": input["remote-name"],
    "remote-url": input["remote-url"],
    ref: input.ref,
    "release-input": input["release-input"],
    "plugin-root": input["plugin-root"],
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
    "repository-identity": "git:fixture-agent-plugins",
    target: ["codex=/tmp/codex-home"],
  };
}

function currentMainBodyFixture() {
  return {
    schemaVersion: 2,
    channel: "current-main",
    contentAuthority: "rawr-hq",
    sourceRepositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
    sourceCommit: "a".repeat(40),
    sourceTree: "b".repeat(40),
    releaseInputDigest: `ri1_${"c".repeat(64)}`,
    releaseSetDigest: `rs1_${"d".repeat(64)}`,
    evaluationProfile: "provider-smoke@v1",
    projections: [
      {
        provider: "claude",
        projectionDigest: `ap1_${"e".repeat(64)}`,
        rendererProtocol: "claude-projection@v1",
        adapterProtocol: "claude-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"f".repeat(64)}`,
      },
      {
        provider: "codex",
        projectionDigest: `ap1_${"1".repeat(64)}`,
        rendererProtocol: "codex-projection@v1",
        adapterProtocol: "codex-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"2".repeat(64)}`,
      },
    ],
  };
}

function runRawr(args: readonly string[]) {
  return spawnSync("bun", [path.join(cliRoot, "test", "command-fixture", "command-test-cli.ts"), ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env: { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" },
  });
}

function releaseCheckCommand(contentWorkspace: string, gitExecutable: string): readonly string[] {
  return [
    "agent", "plugins", "check",
    "--content-workspace", contentWorkspace,
    "--repository-identity", "github:rawr/hq",
    "--content-authority", "rawr-hq",
    "--remote-name", "origin",
    "--remote-url", "https://example.invalid/rawr-hq.git",
    "--ref", "refs/heads/main",
    "--source-commit", hex40,
    "--source-tree", hex64,
    "--release-input", "records/release-input.json",
    "--plugin-root", "plugins/agents",
    "--plugin", "alpha",
    "--git-executable", gitExecutable,
  ];
}

function canonicalStatusCommand(
  contentWorkspace: string,
  targets: readonly string[],
  codexExecutable: string,
  claudeExecutable?: string,
): readonly string[] {
  return [
    "agent", "plugins", "status",
    "--content-workspace", contentWorkspace,
    "--repository-identity", "git:fixture-agent-plugins",
    ...targets.flatMap((target) => ["--target", target]),
    "--git-executable", "/usr/bin/git",
    "--provider-executable", `codex=${codexExecutable}`,
    ...(claudeExecutable === undefined ? [] : ["--provider-executable", `claude=${claudeExecutable}`]),
  ];
}

async function captureRejection(operation: Promise<unknown>): Promise<unknown> {
  try {
    await operation;
    return null;
  } catch (error) {
    return error;
  }
}

function parseSingleJson(output: string): unknown {
  return JSON.parse(output) as unknown;
}

function jsonRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected JSON object");
  }
  return value as Readonly<Record<string, unknown>>;
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
