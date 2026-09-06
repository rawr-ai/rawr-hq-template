import { expect, test } from "bun:test";
import { serviceRuntimeExport } from "@habitat-ai/agent-plugin-lifecycle-service/client";
import { Effect } from "effect";
import { checkCommand } from "../src/commands/check.js";
import { packageCommand } from "../src/commands/package.js";
import { statusCommand } from "../src/commands/status.js";
import { syncCommand } from "../src/commands/sync.js";
import { testCommand } from "../src/commands/test.js";
import { vendorsUpdateCommand } from "../src/commands/vendors/update.js";
import { readReleaseInput } from "../src/flags.js";
import { createPlugin } from "../src/index.js";
import { services } from "../src/services.js";
import {
  clean,
  cleanArgv,
  commands,
  currentMainBody,
  locator,
  locatorArgv,
  parse,
  program,
  recordingBoundary,
  staged,
  stagedArgv,
  targetArgv,
  targets,
} from "./support/fixture.js";

test("cold topic exposes exactly six commands sharing one managed lifecycle use", () => {
  const plugin = createPlugin();
  expect(plugin.commands).toEqual(commands);
  expect(plugin.commands.map((command) => command.id)).toEqual([
    "agent:plugins:check",
    "agent:plugins:package",
    "agent:plugins:status",
    "agent:plugins:sync",
    "agent:plugins:test",
    "agent:plugins:vendors:update",
  ]);
  expect(plugin.services.lifecycle).toBe(services.lifecycle);
  expect(Object.keys(plugin.services)).toEqual(["lifecycle"]);
  expect(plugin.resourceRequirements).toEqual([]);
  expect(services.lifecycle.serviceId).toBe(serviceRuntimeExport.definition.id);
});

const currentMainText = `${JSON.stringify(currentMainBody, null, 2)}\n`;
const cases = [
  {
    name: "release targeted",
    command: checkCommand,
    argv: ["--mode", "release", ...cleanArgv, "--plugin", "example"],
    operation: "releases.check",
    input: { contentWorkspace: clean, mode: { kind: "targeted", pluginId: "example" } },
  },
  {
    name: "release complete set",
    command: checkCommand,
    argv: ["--mode", "release", ...cleanArgv, "--complete-set"],
    operation: "releases.check",
    input: { contentWorkspace: clean, mode: { kind: "complete-set" } },
  },
  {
    name: "staged repository",
    command: checkCommand,
    argv: ["--mode", "repository-staged", ...stagedArgv],
    operation: "releases.checkRepository",
    input: { kind: "staged", contentWorkspace: staged },
  },
  {
    name: "clean repository",
    command: checkCommand,
    argv: ["--mode", "repository-clean", ...cleanArgv],
    operation: "releases.checkRepository",
    input: { kind: "clean", contentWorkspace: clean },
  },
  {
    name: "release refresh",
    command: checkCommand,
    argv: [
      "--mode",
      "release-input-refresh",
      ...stagedArgv,
      "--member",
      "beta",
      "--member",
      "alpha",
    ],
    operation: "releases.refreshReleaseInput",
    input: { contentWorkspace: staged, memberIds: ["beta", "alpha"] },
  },
  {
    name: "current-main encode body",
    command: checkCommand,
    argv: [
      "--mode",
      "current-main-record",
      "--current-main-body-json",
      JSON.stringify(currentMainBody),
    ],
    operation: "governance.currentMainRecord",
    input: { kind: "encode-body", body: currentMainBody },
  },
  {
    name: "current-main exact record bytes",
    command: checkCommand,
    argv: ["--mode", "current-main-record", "--current-main-record-json", currentMainText],
    operation: "governance.currentMainRecord",
    input: { kind: "validate-record", bytes: new TextEncoder().encode(currentMainText) },
  },
  {
    name: "current-main selection",
    command: checkCommand,
    argv: ["--mode", "current-main-selection", ...locatorArgv],
    operation: "governance.currentMainSelection",
    input: { locator },
  },
  {
    name: "package targeted",
    command: packageCommand,
    argv: [
      ...cleanArgv,
      "--plugin",
      "example",
      "--format",
      "cowork-v1",
      "--output",
      "/out/plugin.zip",
    ],
    operation: "packaging.package",
    input: {
      contentWorkspace: clean,
      mode: { kind: "targeted", pluginId: "example" },
      format: "cowork-v1",
      outputPath: "/out/plugin.zip",
    },
  },
  {
    name: "package complete set",
    command: packageCommand,
    argv: [...cleanArgv, "--complete-set", "--format", "cowork-v1", "--output", "/out/plugins"],
    operation: "packaging.package",
    input: {
      contentWorkspace: clean,
      mode: { kind: "complete-set" },
      format: "cowork-v1",
      outputPath: "/out/plugins",
    },
  },
  {
    name: "status",
    command: statusCommand,
    argv: ["--channel", "current-main", ...locatorArgv, ...targetArgv],
    operation: "providers.status",
    input: { channel: "current-main", locator, targets },
  },
  {
    name: "sync",
    command: syncCommand,
    argv: ["--channel", "current-main", ...locatorArgv, ...targetArgv],
    operation: "providers.sync",
    input: { channel: "current-main", locator, targets },
  },
  {
    name: "disposable targeted test",
    command: testCommand,
    argv: [
      ...cleanArgv,
      "--plugin",
      "beta",
      "--plugin",
      "alpha",
      "--disposable-root",
      "/disposable",
      ...targetArgv,
    ],
    operation: "providers.test",
    input: {
      contentWorkspace: clean,
      mode: { kind: "targeted", pluginIds: ["beta", "alpha"] },
      disposableRoot: "/disposable",
      targets,
    },
  },
  {
    name: "disposable complete-set test",
    command: testCommand,
    argv: [...cleanArgv, "--complete-set", "--disposable-root", "/disposable", ...targetArgv],
    operation: "providers.test",
    input: {
      contentWorkspace: clean,
      mode: { kind: "complete-set" },
      disposableRoot: "/disposable",
      targets,
    },
  },
  {
    name: "explicit vendor update",
    command: vendorsUpdateCommand,
    argv: [
      ...locatorArgv,
      "--content-authority",
      staged.contentAuthority,
      "--remote-url",
      staged.remoteUrl,
      "--ref",
      staged.refName,
      "--source-commit",
      clean.sourceCommit,
      "--source-tree",
      clean.sourceTree,
      "--release-input",
      staged.releaseInputPath,
      "--source",
      "upstream-b",
      "--source",
      "upstream-a",
    ],
    operation: "vendors.update",
    input: {
      contentWorkspace: {
        locator: clean.locator,
        repositoryIdentity: clean.repositoryIdentity,
        contentAuthority: clean.contentAuthority,
        remoteUrl: clean.remoteUrl,
        refName: clean.refName,
        sourceCommit: clean.sourceCommit,
        sourceTree: clean.sourceTree,
        releaseInputPath: clean.releaseInputPath,
      },
      sourceIds: ["upstream-b", "upstream-a"],
    },
  },
];

for (const entry of cases) {
  test(`${entry.name}: one native parse projects exactly one public service request`, async () => {
    const recording = recordingBoundary();
    const parsed = await parse(entry.command, [...entry.argv, "--json"]);
    const effect = program(entry.command, parsed, recording);
    expect(recording.calls).toEqual([]);
    expect(recording.invocations).toEqual([]);
    const outcome = await Effect.runPromise(effect);
    expect(recording.invocations).toEqual([{ invocation: undefined }]);
    expect(recording.calls).toEqual([{ operation: entry.operation, input: entry.input }]);
    expect<unknown>(outcome).toEqual({
      operation: entry.operation,
      result: recording.result,
      json: true,
    });
    expect<unknown>(outcome?.result).toBe(recording.result);
  });
}

test("release-input mode forwards byte admission and the exact native service refusal", async () => {
  const malformed = Uint8Array.from([0x20, 0xff, 0x0a]);
  const input = await readReleaseInput(
    (async function* () {
      yield malformed;
    })(),
    false
  );
  const failure = new Error("typed service boundary refusal");
  const recording = recordingBoundary(failure);
  const effect = program(
    checkCommand,
    { args: {}, flags: { mode: { kind: "release-input-record", input } } },
    recording
  );
  expect(await Effect.runPromise(Effect.flip(effect))).toBe(failure);
  expect(recording.calls).toEqual([{ operation: "releases.releaseInputRecord", input }]);
  expect(recording.invocations).toEqual([{ invocation: undefined }]);
});

test("aggregate target and member conflicts pass native syntax unchanged for service validation", async () => {
  for (const entry of [
    {
      command: statusCommand,
      argv: [
        "--channel",
        "current-main",
        ...locatorArgv,
        "--target",
        "codex=/same",
        "--target",
        "codex=/same",
      ],
    },
    {
      command: checkCommand,
      argv: [
        "--mode",
        "release-input-refresh",
        ...stagedArgv,
        "--member",
        "alpha",
        "--member",
        "alpha",
      ],
    },
  ]) {
    const recording = recordingBoundary();
    await Effect.runPromise(
      program(entry.command, await parse(entry.command, entry.argv), recording)
    );
    expect(recording.calls).toHaveLength(1);
    const request = recording.calls[0].input as { targets?: unknown[]; memberIds?: unknown[] };
    const values = request.targets ?? request.memberIds;
    expect(values).toHaveLength(2);
    expect(values?.[0]).toEqual(values?.[1]);
  }
});

const refusals = [
  { name: "no implicit check mode", command: checkCommand, argv: [] },
  { name: "unknown check mode", command: checkCommand, argv: ["--mode", "unknown"] },
  {
    name: "missing clean source",
    command: checkCommand,
    argv: ["--mode", "release", ...stagedArgv, "--plugin", "alpha"],
  },
  {
    name: "no implicit complete set",
    command: checkCommand,
    argv: ["--mode", "release", ...cleanArgv],
  },
  {
    name: "conflicting release selectors",
    command: checkCommand,
    argv: ["--mode", "release", ...cleanArgv, "--plugin", "alpha", "--complete-set"],
  },
  {
    name: "mixed staged and clean fields",
    command: checkCommand,
    argv: ["--mode", "repository-staged", ...cleanArgv],
  },
  {
    name: "unowned selection field",
    command: checkCommand,
    argv: ["--mode", "current-main-selection", ...locatorArgv, "--plugin", "alpha"],
  },
  {
    name: "missing refresh members",
    command: checkCommand,
    argv: ["--mode", "release-input-refresh", ...stagedArgv],
  },
  {
    name: "two current-main inputs",
    command: checkCommand,
    argv: [
      "--mode",
      "current-main-record",
      "--current-main-body-json",
      JSON.stringify(currentMainBody),
      "--current-main-record-json",
      currentMainText,
    ],
  },
  {
    name: "missing current-main input",
    command: checkCommand,
    argv: ["--mode", "current-main-record"],
  },
  {
    name: "invalid current-main body",
    command: checkCommand,
    argv: ["--mode", "current-main-record", "--current-main-body-json", "{}"],
  },
  {
    name: "relative content path",
    command: checkCommand,
    argv: [
      "--mode",
      "current-main-selection",
      "--content-workspace",
      "relative",
      "--repository-identity",
      staged.repositoryIdentity,
    ],
  },
  {
    name: "noncanonical repository identity",
    command: checkCommand,
    argv: [
      "--mode",
      "current-main-selection",
      "--content-workspace",
      "/content",
      "--repository-identity",
      "not-a-repository-id",
    ],
  },
  {
    name: "no implicit provider home",
    command: statusCommand,
    argv: ["--channel", "current-main", ...locatorArgv],
  },
  { name: "no implicit channel", command: statusCommand, argv: [...locatorArgv, ...targetArgv] },
  {
    name: "unsupported channel",
    command: syncCommand,
    argv: ["--channel", "latest", ...locatorArgv, ...targetArgv],
  },
  {
    name: "unsupported provider",
    command: syncCommand,
    argv: ["--channel", "current-main", ...locatorArgv, "--target", "other=/home"],
  },
  {
    name: "relative provider home",
    command: statusCommand,
    argv: ["--channel", "current-main", ...locatorArgv, "--target", "codex=relative"],
  },
  {
    name: "missing package destination",
    command: packageCommand,
    argv: [...cleanArgv, "--complete-set", "--format", "cowork-v1"],
  },
  {
    name: "unsupported package format",
    command: packageCommand,
    argv: [...cleanArgv, "--complete-set", "--format", "zip", "--output", "/out"],
  },
  {
    name: "missing disposable root",
    command: testCommand,
    argv: [...cleanArgv, "--complete-set", ...targetArgv],
  },
  { name: "missing vendor sources", command: vendorsUpdateCommand, argv: [] },
];

for (const entry of refusals) {
  test(`native refusal: ${entry.name} never enters the service body`, async () => {
    const recording = recordingBoundary();
    await expect(
      (async () => {
        const parsed = await parse(entry.command, entry.argv);
        await Effect.runPromise(program(entry.command, parsed, recording));
      })()
    ).rejects.toThrow();
    expect(recording.calls).toEqual([]);
    expect(recording.invocations).toEqual([]);
  });
}

for (const command of commands) {
  test(`${command.id} does not advertise inherited mutation controls or aliases`, async () => {
    for (const flag of ["--dry-run", "--yes", "--provider-home", "--rawr"]) {
      await expect(parse(command, [flag])).rejects.toThrow();
    }
  });
}
