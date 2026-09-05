import { closeSync, fstatSync, openSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Flags } from "@oclif/core";
import { Effect } from "effect";
import { Type } from "typebox";
import { expect, test } from "vitest";
import { defineApp, defineEntrypoint, defineProcessCatalog, startApp } from "../src/app/index";
import { defineCommand } from "../src/plugins/cli/effect/index";
import { defineCliTopicPlugin } from "../src/plugins/cli/index";
import {
  createOclifCommand,
  type OclifCommandContext,
  readOclifCommandSource,
} from "../src/plugins/cli/oclif/index";
import { deriveRuntimeArtifacts } from "../src/runtime/derivation/index";
import type { LoweredCliCommand } from "../src/runtime/harnesses/index";
import { defineRuntimeProfile, providerSelection } from "../src/runtime/profiles/index";
import { providerFx } from "../src/runtime/providers/effect/index";
import { defineRuntimeProvider } from "../src/runtime/providers/index";
import { defineRuntimeResource, requireResource } from "../src/runtime/resources/index";
import { RuntimeSchema } from "../src/runtime/schema";
import { defineService, sealService, useService } from "../src/service/index";

test("CLI retains cold source identity, decodes once across native retries, and owns cancellation cleanup", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-cli-runtime-"));
  const calls = { build: 0, acquire: 0, release: 0, decode: 0, body: 0, cleanup: 0 };
  const lease = defineRuntimeResource<"cli.file", number>({
    id: "cli.file",
    title: "CLI file",
    purpose: "Real command lease",
  });
  const required = requireResource({ resource: lease, reason: "Selected file" });
  const foreign = requireResource({ resource: lease, reason: "Undeclared access" });
  const provider = defineRuntimeProvider({
    id: "cli.provider",
    title: "CLI provider",
    provides: lease,
    requires: [],
    build() {
      calls.build++;
      return providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          calls.acquire++;
          return openSync(join(root, "lease"), "wx");
        }),
        release: (fd) =>
          Effect.sync(() => {
            closeSync(fd);
            calls.release++;
          }),
      });
    },
  });
  const source = Object.freeze({ native: "exact-source" });
  const command = defineCommand({
    id: "retry",
    source,
    input: RuntimeSchema.fromTypeBox(
      Type.Refine(Type.String(), () => {
        calls.decode++;
        return true;
      })
    ),
    policy: { retry: { times: 1 } },
    effect(context) {
      calls.body++;
      expect(Object.keys(context.clients)).toEqual([]);
      expect(fstatSync(context.resources.get(required)).isFile()).toBe(true);
      expect(() => context.resources.get(foreign)).toThrow("outside this selected plugin");
      return calls.body === 1 ? Effect.fail("retry") : Effect.succeed(context.input);
    },
  });
  let entered!: () => void;
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const cancel = defineCommand({
    id: "cancel",
    source: {},
    input: RuntimeSchema.fromTypeBox(Type.Null()),
    effect: () =>
      Effect.ensuring(
        Effect.gen(function* () {
          entered();
          return yield* Effect.never;
        }),
        Effect.sync(() => {
          calls.cleanup++;
        })
      ),
  });
  const plugin = defineCliTopicPlugin.factory()({
    capability: "proof",
    services: {},
    resourceRequirements: [required],
    commands: [command, cancel],
  })();
  const app = defineApp({ id: "cli.app", plugins: [plugin] });
  const profile = defineRuntimeProfile({
    id: "local",
    providers: [providerSelection({ resource: lease, provider })],
    harnesses: ["cli.native"],
  });
  const process = defineProcessCatalog({ cli: { id: "cli", roles: ["cli"] } }).cli;
  const entrypoint = defineEntrypoint({
    id: "cli",
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "cli",
      deployment: "local",
      source: "proof",
    },
  });
  const derived = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  expect(derived.cliCommandSources.find(({ ref }) => ref.commandId === "retry")?.source).toBe(
    source
  );
  expect(calls).toEqual({ build: 0, acquire: 0, release: 0, decode: 0, body: 0, cleanup: 0 });
  expect(JSON.stringify(derived.portableArtifact)).not.toContain("exact-source");
  let commands: readonly LoweredCliCommand[] = [];
  const started = await startApp(entrypoint, {
    sources: { appRoot: root },
    integrations: [
      {
        surface: "cli/commands",
        harness: {
          id: "cli.native",
          roles: ["cli"],
          surfaces: ["cli/commands"],
          async mount(input) {
            commands = input.mountReadyPayloads.flatMap(({ payload }) => payload);
            return { stop: async () => {} };
          },
        },
      },
    ],
    finalization: { policy: "waitForNativeStop", deadlineMs: 1000 },
  });
  try {
    const retry = commands.find(({ ref }) => ref.commandId === "retry")!;
    expect(retry.source).toBe(source);
    await expect(retry.invoke(42)).rejects.toThrow();
    expect(calls.body).toBe(0);
    await expect(retry.invoke("native")).resolves.toBe("native");
    expect(calls.decode).toBe(1);
    expect(calls.body).toBe(2);
    const abort = new AbortController();
    const pending = commands
      .find(({ ref }) => ref.commandId === "cancel")!
      .invoke(null, { signal: abort.signal });
    const rejected = expect(pending).rejects.toThrow();
    await ready;
    abort.abort();
    await rejected;
    expect(calls.cleanup).toBe(1);
    expect(calls.release).toBe(0);
    await started.stop();
    await expect(retry.invoke("closed")).rejects.toThrow();
    expect(calls.acquire).toBe(1);
    expect(calls.release).toBe(1);
  } finally {
    await started.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("native authoring retains metadata without parsing or evaluating the body", () => {
  let called = false;
  const flags = {
    operation: Flags.string({
      relationships: [
        {
          type: "all",
          flags: [
            {
              name: "confirm",
              when: async () => {
                throw new Error("Cold native relationship evaluated");
              },
            },
          ],
        },
      ],
    }),
    confirm: Flags.boolean(),
  };
  const command = createOclifCommand({
    id: "native",
    args: {},
    flags,
    effect: ({ args }) => {
      called = true;
      return Effect.succeed(args);
    },
  });
  expect(command.kind).toBe("cli.command");
  const source = readOclifCommandSource(command.source);
  expect(source.flags).toBe(flags);
  expect(Object.isFrozen(source.metadata)).toBe(true);
  expect(command.inputSchema.decode({ args: {}, flags: {} }).success).toBe(true);
  expect(command.inputSchema.decode({ args: {}, flags: {}, extra: true }).success).toBe(false);
  expect(called).toBe(false);
});

test("native CLI typing preserves client membership and exact Effect channels", () => {
  const definition = defineService({ id: "cli.typed", deps: {} });
  const service = sealService(definition, {
    contract: definition.oc.router({ read: definition.oc }),
    construct() {
      throw new Error("cold");
    },
  });
  const services = { reader: useService(service) };
  const command = createOclifCommand({
    id: "typed",
    args: {},
    flags: {},
    effect: function* (context: OclifCommandContext<{}, {}, typeof services>) {
      if (false) {
        // @ts-expect-error Native projection does not add undeclared clients.
        context.clients.missing;
        // @ts-expect-error An absent invocation lane cannot acquire invented data.
        context.clients.reader.withInvocation({ invocation: "invented" });
      }
      return yield* Effect.fail({ _tag: "TypedCliFailure" as const });
    },
  });
  defineCliTopicPlugin.factory()({ capability: "typed", services, commands: [command] });
  const constant = createOclifCommand({
    id: "constant",
    args: {},
    flags: {},
    effect: function* () {
      return "ready" as const;
    },
  });
  type Equal<A, B> =
    (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
  type DescriptorChannels<T> =
    T extends import("../src/plugins/cli/effect/index").CommandDescriptor<
      infer _I,
      infer A,
      infer E,
      infer R,
      infer _C
    >
      ? [A, E, R]
      : never;
  const channels: Equal<DescriptorChannels<typeof constant>, ["ready", never, never]> = true;
  expect(channels).toBe(true);
  if (false) {
    // @ts-expect-error The plugin must actually supply the declared reader.
    defineCliTopicPlugin.factory()({ capability: "missing", services: {}, commands: [command] });
    // @ts-expect-error Promise is not a native local Effect program.
    createOclifCommand({ id: "promise", args: {}, flags: {}, effect: async () => "wrong" });
  }
});
