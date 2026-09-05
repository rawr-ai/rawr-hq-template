import type { Client } from "@habitat-ai/agent-plugin-lifecycle-service/client";
import { readOclifCommandSource } from "@habitat-ai/sdk/plugins/cli/oclif";
import { Parser } from "@oclif/core";
import { Context, Effect } from "effect";
import { checkCommand } from "../../src/commands/check.js";
import { packageCommand } from "../../src/commands/package.js";
import { statusCommand } from "../../src/commands/status.js";
import { syncCommand } from "../../src/commands/sync.js";
import { testCommand } from "../../src/commands/test.js";
import { vendorsUpdateCommand } from "../../src/commands/vendors/update.js";

export const commands = [
  checkCommand,
  packageCommand,
  statusCommand,
  syncCommand,
  testCommand,
  vendorsUpdateCommand,
] as const;
export type Command = (typeof commands)[number];
type Boundary = Parameters<typeof checkCommand.effect>[0];

export const staged = {
  locator: "/content",
  repositoryIdentity: "git:example.com/curated/plugins",
  contentAuthority: "example-content",
  remoteName: "upstream",
  remoteUrl: "https://example.com/curated/plugins.git",
  refName: "refs/heads/review",
  releaseInputPath: ".habitat/release-input.json",
  pluginRoot: "plugins",
} as const;
export const clean = {
  ...staged,
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
} as const;
export const locator = {
  workspacePath: staged.locator,
  expectedRepositoryIdentity: staged.repositoryIdentity,
};
export const targets = [
  { provider: "codex", home: "/homes/codex" },
  { provider: "claude", home: "/homes/claude" },
] as const;
export const stagedArgv = [
  "--content-workspace",
  staged.locator,
  "--repository-identity",
  staged.repositoryIdentity,
  "--content-authority",
  staged.contentAuthority,
  "--remote-name",
  staged.remoteName,
  "--remote-url",
  staged.remoteUrl,
  "--ref",
  staged.refName,
  "--release-input",
  staged.releaseInputPath,
  "--plugin-root",
  staged.pluginRoot,
];
export const cleanArgv = [
  ...stagedArgv,
  "--source-commit",
  clean.sourceCommit,
  "--source-tree",
  clean.sourceTree,
];
export const locatorArgv = [
  "--content-workspace",
  staged.locator,
  "--repository-identity",
  staged.repositoryIdentity,
];
export const targetArgv = targets.flatMap(({ provider, home }) => [
  "--target",
  `${provider}=${home}`,
]);
export const currentMainBody: Extract<
  Parameters<Client["governance"]["currentMainRecord"]>[0],
  { kind: "encode-body" }
>["body"] = {
  schemaVersion: 3,
  channel: "current-main",
  contentAuthority: staged.contentAuthority,
  sourceRepositoryIdentity: staged.repositoryIdentity,
  sourceRepositoryUrl: staged.remoteUrl,
  sourceRef: "refs/tags/content-v3",
  contentCommit: clean.sourceCommit,
  contentTree: clean.sourceTree,
  releaseInputDigest: `ri1_${"c".repeat(64)}`,
};

export function recordingBoundary(failure?: Error) {
  const calls: { operation: string; input: unknown }[] = [];
  const invocations: unknown[] = [];
  const result = Object.freeze({ serviceResult: "opaque exact return value" });
  const procedure = (operation: string) => (input: unknown) =>
    Effect.suspend(() => {
      calls.push({ operation, input });
      // Projection tests deliberately use an opaque result; commands must not interpret it.
      return failure === undefined ? Effect.succeed(result as never) : Effect.fail(failure);
    });
  const client = {
    releases: {
      check: procedure("releases.check"),
      checkRepository: procedure("releases.checkRepository"),
      releaseInputRecord: procedure("releases.releaseInputRecord"),
      refreshReleaseInput: procedure("releases.refreshReleaseInput"),
    },
    governance: {
      currentMainRecord: procedure("governance.currentMainRecord"),
      currentMainSelection: procedure("governance.currentMainSelection"),
    },
    packaging: { package: procedure("packaging.package") },
    providers: {
      status: procedure("providers.status"),
      sync: procedure("providers.sync"),
      test: procedure("providers.test"),
    },
    vendors: { status: procedure("vendors.status"), update: procedure("vendors.update") },
  };
  const clients = {
    lifecycle: {
      kind: "service.client.construction-bound",
      serviceId: "habitat.agent-plugin-lifecycle",
      withInvocation(input) {
        invocations.push(input);
        return client;
      },
    },
  } satisfies Boundary["clients"];
  const boundary = {
    clients,
    resources: {
      has: () => false,
      get: () => {
        throw new Error("Commands own no direct resources");
      },
    },
    telemetry: {
      span: <A, E, R>(_name: string, effect: Effect.Effect<A, E, R>) => effect,
      event: () => Effect.void,
    },
    execution: {
      appId: "test",
      processId: "test",
      entrypointId: "test",
      profileId: "test",
      role: "cli",
      ownerId: "test",
      executionId: "test",
      traceId: "test",
    },
  } satisfies Omit<Boundary, "input">;
  return { boundary, calls, invocations, result };
}

export async function parse(command: Command, argv: string[]) {
  const source = readOclifCommandSource(command.source);
  return Parser.parse(argv, { args: source.args, flags: source.flags, strict: true });
}

export function program(
  command: Command,
  input: { args: object; flags: object },
  recording: ReturnType<typeof recordingBoundary>
) {
  // Native source parsing supplies this command's input; the heterogeneous fixture table erases it.
  const effect = command.effect({ ...recording.boundary, input } as never);
  // These recording client Effects have no ambient requirements; managed clients intentionally hide theirs.
  const context = Context.empty() as Context.Context<unknown>;
  return Effect.provideContext(
    Effect.gen(function* () {
      return yield* effect;
    }),
    context
  );
}
