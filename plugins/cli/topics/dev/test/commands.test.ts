import { expect, test } from "bun:test";
import { serviceRuntimeExport } from "@habitat-ai/dev-service/client";
import { readOclifCommandSource } from "@habitat-ai/sdk/plugins/cli/oclif";
import { Effect } from "effect";
import { syncUpstreamCommand } from "../src/commands/repo-sync-upstream.js";
import { doctorCommand } from "../src/commands/stack-doctor.js";
import { drainCommand } from "../src/commands/stack-drain.js";
import { cleanupCommand } from "../src/commands/worktree-cleanup.js";
import { createPlugin } from "../src/index.js";
import { services } from "../src/services.js";
import { commands, parse, program, recordingBoundary } from "./support/fixture.js";

test("cold topic exposes exactly four native sources sharing one managed service use", () => {
  const plugin = createPlugin();
  expect(plugin.commands).toEqual(commands);
  expect(plugin.commands.map((command) => command.id)).toEqual([
    "dev:repo:sync-upstream",
    "dev:stack:doctor",
    "dev:stack:drain",
    "dev:worktree:cleanup",
  ]);
  expect(Object.keys(plugin.services)).toEqual(["dev"]);
  expect(plugin.services.dev).toBe(services.dev);
  expect(services.dev.serviceId).toBe(serviceRuntimeExport.definition.id);
  expect(plugin.resourceRequirements).toEqual([]);
  for (const command of plugin.commands) {
    const source = readOclifCommandSource(command.source);
    expect(source.args).toEqual({});
    expect(source.metadata.aliases).toBeUndefined();
  }
});

const repositoryPath = "../repository with spaces";
const repository = ["--repository", repositoryPath];
const cases = [
  {
    name: "configured upstream plan",
    command: syncUpstreamCommand,
    argv: repository,
    operation: "repo.syncUpstream",
    input: { repositoryPath, apply: false },
  },
  {
    name: "explicit upstream apply",
    command: syncUpstreamCommand,
    argv: [...repository, "--remote", "upstream", "--branch", "release/topic", "--apply"],
    operation: "repo.syncUpstream",
    input: {
      repositoryPath,
      apply: true,
      upstream: { remote: "upstream", branch: "release/topic" },
    },
  },
  {
    name: "observed doctor",
    command: doctorCommand,
    argv: repository,
    operation: "stack.doctor",
    input: { repositoryPath },
    noFail: false,
  },
  {
    name: "doctor local exit suppression",
    command: doctorCommand,
    argv: [...repository, "--no-fail"],
    operation: "stack.doctor",
    input: { repositoryPath },
    noFail: true,
  },
  {
    name: "drain request plan",
    command: drainCommand,
    argv: repository,
    operation: "stack.drain",
    input: { repositoryPath, apply: false },
  },
  {
    name: "drain request apply",
    command: drainCommand,
    argv: [...repository, "--apply"],
    operation: "stack.drain",
    input: { repositoryPath, apply: true },
  },
  {
    name: "cleanup explicit protection and default merge filter",
    command: cleanupCommand,
    argv: [...repository, "--prefix", "wt-owned-", "--trunk", "develop"],
    operation: "worktree.cleanup",
    input: {
      repositoryPath,
      apply: false,
      prefix: "wt-owned-",
      trunk: "develop",
      mergedOnly: true,
      pinnedPaths: [],
      pinnedBranches: [],
    },
  },
  {
    name: "cleanup unmerged opt-in and exact pins",
    command: cleanupCommand,
    argv: [
      ...repository,
      "--prefix",
      "wt-owned-",
      "--trunk",
      "develop",
      "--no-merged-only",
      "--pin-path",
      "../wt-kept",
      "--pin-path",
      "../wt-kept",
      "--pin-branch",
      "topic/held",
      "--apply",
    ],
    operation: "worktree.cleanup",
    input: {
      repositoryPath,
      apply: true,
      prefix: "wt-owned-",
      trunk: "develop",
      mergedOnly: false,
      pinnedPaths: ["../wt-kept", "../wt-kept"],
      pinnedBranches: ["topic/held"],
    },
  },
];

for (const entry of cases) {
  test(`${entry.name}: native input projects exactly one public service call`, async () => {
    const recording = recordingBoundary();
    const parsed = await parse(entry.command, [...entry.argv, "--json"]);
    const effect = program(entry.command, parsed, recording);
    expect(recording.calls).toEqual([]);
    expect(recording.invocations).toEqual([]);
    const outcome = await Effect.runPromise(effect);
    expect(recording.calls).toEqual([{ operation: entry.operation, input: entry.input }]);
    expect(recording.invocations).toEqual([{ invocation: undefined }]);
    expect<unknown>(outcome).toEqual({
      operation: entry.operation,
      result: recording.result,
      json: true,
      ...(entry.noFail === undefined ? {} : { noFail: entry.noFail }),
    });
    expect<unknown>(outcome?.result).toBe(recording.result);
  });
}

for (const [command, argv, operation] of [
  [syncUpstreamCommand, [], "repo.syncUpstream"],
  [drainCommand, [], "stack.drain"],
  [cleanupCommand, ["--prefix", "wt-owned-", "--trunk", "main"], "worktree.cleanup"],
] as const) {
  test(`${command.id}: dry-run overrides apply and exact scratch evidence stays service-owned`, async () => {
    for (const scratchMode of [[], ["--scratch-mode", "block"]]) {
      const recording = recordingBoundary();
      const parsed = await parse(command, [
        ...argv,
        ...repository,
        "--apply",
        "--dry-run",
        "--scratch-file",
        "review.md",
        "--scratch-file",
        "review.md",
        ...scratchMode,
      ]);
      await Effect.runPromise(program(command, parsed, recording));
      expect(recording.calls).toEqual([
        {
          operation,
          input: {
            repositoryPath,
            apply: false,
            scratch: {
              files: ["review.md", "review.md"],
              ...(scratchMode.length === 0 ? {} : { mode: "block" }),
            },
            ...(command === cleanupCommand
              ? {
                  prefix: "wt-owned-",
                  trunk: "main",
                  mergedOnly: true,
                  pinnedPaths: [],
                  pinnedBranches: [],
                }
              : {}),
          },
        },
      ]);
    }
  });
}

test("omitted repository passes the invoking directory without topic-side discovery", async () => {
  const recording = recordingBoundary();
  await Effect.runPromise(program(doctorCommand, await parse(doctorCommand, []), recording));
  expect(recording.calls).toEqual([
    { operation: "stack.doctor", input: { repositoryPath: process.cwd() } },
  ]);
});

for (const command of commands) {
  test(`${command.id}: native service failure passes through unchanged`, async () => {
    const failure = new Error("native operation failed");
    const recording = recordingBoundary(failure);
    const argv =
      command === cleanupCommand
        ? ["--prefix", "wt-owned-", "--trunk", "main"]
        : command === doctorCommand
          ? ["--no-fail"]
          : [];
    const effect = program(command, await parse(command, argv), recording);
    expect(await Effect.runPromise(Effect.flip(effect))).toBe(failure);
    expect(recording.calls).toHaveLength(1);
    expect(recording.invocations).toEqual([{ invocation: undefined }]);
  });
}

for (const [command, argv] of [
  [syncUpstreamCommand, ["--remote", "origin"]],
  [doctorCommand, ["--repository", ""]],
  [doctorCommand, ["--apply"]],
  [drainCommand, ["--scratch-mode", "block"]],
  [drainCommand, ["--phase", "finalize"]],
  [cleanupCommand, ["--prefix", "wt-owned-", "--no-merged-only"]],
] as const) {
  test(`${command.id}: native refusal ${argv.join(" ")} never enters the service`, async () => {
    const recording = recordingBoundary();
    await expect(
      (async () => {
        await Effect.runPromise(program(command, await parse(command, [...argv]), recording));
      })()
    ).rejects.toThrow();
    expect(recording.calls).toEqual([]);
    expect(recording.invocations).toEqual([]);
  });
}
