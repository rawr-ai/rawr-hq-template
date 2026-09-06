import { expect, test } from "bun:test";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { FilesystemResource } from "@habitat-ai/resource-filesystem";
import { defineNodeFilesystemRuntimeProvider } from "@habitat-ai/resource-filesystem/providers/effect-platform-node";
import { FilesystemRuntimeResource } from "@habitat-ai/resource-filesystem/runtime";
import { defineApp, defineEntrypoint, defineProcessCatalog, startApp } from "@habitat-ai/sdk/app";
import { defineCliTopicPlugin } from "@habitat-ai/sdk/plugins/cli";
import { defineRuntimeProfile, providerSelection } from "@habitat-ai/sdk/runtime/profiles";
import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { requireResource } from "@habitat-ai/sdk/runtime/resources";
import {
  Cause,
  Context,
  Data,
  Deferred,
  Effect,
  Exit,
  Fiber,
  FileSystem,
  Layer,
  Path,
  type PlatformError,
  Stream,
} from "effect";
import { ChildProcess } from "effect/unstable/process";
import type { ChildProcessResource } from "../../../contract";
import { ChildProcessRuntimeResource } from "../../../runtime";
import { defineNodeChildProcessRuntimeProvider } from "../index";

test("provider factory and build stay cold and retain the exact filesystem requirement", () => {
  const provider = defineNodeChildProcessRuntimeProvider();
  let reads = 0;
  const plan = provider.build({
    config: undefined,
    observation: { publish() {} },
    resources: {
      has() {
        throw new Error("Cold build must not inspect ready dependencies");
      },
      get() {
        reads++;
        throw new Error("Cold build must not read ready dependencies");
      },
    },
  });
  expect(reads).toBe(0);
  expect(plan.kind).toBe("provider.effect-plan");
  expect(Object.isFrozen(plan)).toBe(true);
  expect(Object.isFrozen(provider)).toBe(true);
  expect(provider.provides).toBe(ChildProcessRuntimeResource);
  expect(provider.requires).toHaveLength(1);
  expect(provider.requires[0]?.resource).toBe(FilesystemRuntimeResource);
  expect(provider.requires[0]?.optional).not.toBe(true);
  expect(Object.isFrozen(provider.requires[0])).toBe(true);
});

test("selected child-process demand refuses a missing filesystem provider before mount", async () => {
  const root = await createRoot();
  const events: string[] = [];
  try {
    await expect(startChildProcess(root, null, events)).rejects.toThrow(/provider|coverage/i);
    expect(events).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("acquires one exact filesystem dependency and preserves native argv, cwd, streams and exit", async () => {
  const root = await createRoot();
  const accesses: string[] = [];
  const resolutions: string[][] = [];
  const events: string[] = [];
  let selectedFilesystem: FilesystemResource | undefined;
  const filesystemProvider = defineRuntimeProvider({
    id: "child-process.test-filesystem",
    title: "Observed native filesystem",
    provides: FilesystemRuntimeResource,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.scoped(
          Effect.gen(function* () {
            const context = yield* Layer.build(Layer.merge(NodeFileSystem.layer, NodePath.layer));
            const fileSystem = Context.get(context, FileSystem.FileSystem);
            const path = Context.get(context, Path.Path);
            const value: FilesystemResource = Object.freeze({
              fileSystem: {
                ...fileSystem,
                access: (...args: Parameters<typeof fileSystem.access>) => {
                  accesses.push(args[0]);
                  return fileSystem.access(...args);
                },
              },
              path: {
                ...path,
                resolve: (...args: ReadonlyArray<string>) => {
                  resolutions.push([...args]);
                  return path.resolve(...args);
                },
              },
            });
            selectedFilesystem = value;
            events.push("filesystem.acquired");
            return value;
          })
        ),
        release: () => Effect.sync(() => events.push("filesystem.released")).pipe(Effect.asVoid),
      }),
  });
  let fixture: Awaited<ReturnType<typeof startChildProcess>> | undefined;
  try {
    fixture = await startChildProcess(root, filesystemProvider, events);
    if (selectedFilesystem === undefined)
      throw new Error("The filesystem provider did not acquire");
    expect(fixture.filesystem).toBe(selectedFilesystem);
    expect(events).toEqual(["filesystem.acquired", "mounted"]);
    expect(accesses).toEqual([]);
    expect(resolutions).toEqual([]);
    const args = ["space value", "semi;colon", "$(not-a-shell-command)", "--leading", ""];
    const script = [
      'process.stdout.write(JSON.stringify({ args: process.argv.slice(1), cwd: process.cwd() }) + "\\n");',
      'process.stdout.write("o".repeat(65536));',
      'process.stderr.write("e".repeat(65536));',
      "process.exitCode = 17;",
    ].join("\n");
    const spawner = fixture.childProcess;
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const child = yield* spawner.spawn(
            ChildProcess.make(process.execPath, ["--eval", script, "--", ...args], {
              cwd: root,
              stdin: Stream.empty,
              forceKillAfter: "2 seconds",
            })
          );
          const [stdout, stderr, exitCode] = yield* Effect.all(
            [readBounded(child.stdout, 131072), readBounded(child.stderr, 131072), child.exitCode],
            { concurrency: "unbounded" }
          );
          return { stdout, stderr, exitCode };
        })
      )
    );
    expect(result.stdout).toBe(`${JSON.stringify({ args, cwd: root })}\n${"o".repeat(65536)}`);
    expect(result.stderr).toBe("e".repeat(65536));
    expect(Number(result.exitCode)).toBe(17);
    expect(accesses).toEqual([root]);
    expect(resolutions).toEqual([[root]]);
    const firstStop = fixture.started.stop();
    expect(fixture.started.stop()).toBe(firstStop);
    await firstStop;
    expect(events).toEqual(["filesystem.acquired", "mounted", "stopped", "filesystem.released"]);
  } finally {
    await fixture?.started.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("a caller's stream limit closes its native child scope before the failure settles", async () => {
  const root = await createRoot();
  let fixture: Awaited<ReturnType<typeof startChildProcess>> | undefined;
  let pid: number | undefined;
  try {
    fixture = await startChildProcess(root);
    const spawner = fixture.childProcess;
    const failure = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const child = yield* spawner.spawn(
            ChildProcess.make(
              process.execPath,
              ["--eval", 'process.stdout.write("x".repeat(4096)); setInterval(() => {}, 1000);'],
              { cwd: root, stdin: Stream.empty, forceKillAfter: "2 seconds" }
            )
          );
          pid = Number(child.pid);
          yield* Effect.all(
            [readBounded(child.stdout, 1024), readBounded(child.stderr, 1024), child.exitCode],
            { concurrency: "unbounded" }
          );
        })
      ).pipe(Effect.flip)
    );
    expect(failure).toBeInstanceOf(OutputLimit);
    expect(pid).toBeDefined();
    if (pid !== undefined) expect(processExists(pid)).toBe(false);
  } finally {
    await fixture?.started.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test.skipIf(process.platform === "win32")(
  "native interruption waits for the child's delayed SIGTERM cleanup and exit",
  async () => {
    const root = await createRoot();
    const marker = join(root, "child-events");
    let fixture: Awaited<ReturnType<typeof startChildProcess>> | undefined;
    let fiber: Fiber.Fiber<void, PlatformError.PlatformError> | undefined;
    let pid: number | undefined;
    try {
      fixture = await startChildProcess(root);
      const spawner = fixture.childProcess;
      const ready = await Effect.runPromise(Deferred.make<void>());
      const script = [
        'const fs = require("node:fs");',
        `const marker = ${JSON.stringify(marker)};`,
        'process.once("SIGTERM", () => {',
        '  fs.appendFileSync(marker, "term\\n");',
        '  setTimeout(() => { fs.appendFileSync(marker, "cleanup\\n"); process.exit(0); }, 350);',
        "});",
        "setInterval(() => {}, 1000);",
        "setTimeout(() => process.exit(94), 6000);",
        'fs.appendFileSync(marker, "ready\\n");',
        'process.stdout.write("ready\\n");',
      ].join("\n");
      fiber = Effect.runFork(
        Effect.scoped(
          Effect.gen(function* () {
            const child = yield* spawner.spawn(
              ChildProcess.make(process.execPath, ["--eval", script], {
                cwd: root,
                stdin: Stream.empty,
                forceKillAfter: "2 seconds",
              })
            );
            pid = Number(child.pid);
            let output = "";
            yield* Effect.all(
              [
                Stream.runForEach(child.stdout, (chunk) => {
                  output += new TextDecoder().decode(chunk);
                  return output.includes("ready\n")
                    ? Deferred.succeed(ready, undefined)
                    : Effect.void;
                }),
                Stream.runDrain(child.stderr),
                child.exitCode,
              ],
              { concurrency: "unbounded" }
            );
          })
        )
      );
      await Effect.runPromise(Deferred.await(ready).pipe(Effect.timeout("3 seconds")));
      let settled = false;
      const interrupted = Effect.runPromise(Fiber.interrupt(fiber)).then(() => {
        settled = true;
      });
      await Bun.sleep(30);
      expect(settled).toBe(false);
      await interrupted;
      const exit = await Effect.runPromise(Fiber.await(fiber));
      expect(Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause)).toBe(true);
      expect(await readFile(marker, "utf8")).toBe("ready\nterm\ncleanup\n");
      expect(pid).toBeDefined();
      if (pid !== undefined) expect(processExists(pid)).toBe(false);
    } finally {
      if (fiber !== undefined) await Effect.runPromise(Fiber.interrupt(fiber));
      await fixture?.started.stop();
      await rm(root, { recursive: true, force: true });
    }
  },
  10_000
);

class OutputLimit extends Data.TaggedError("OutputLimit")<{
  readonly maxBytes: number;
}> {}

function readBounded(
  stream: Stream.Stream<Uint8Array, PlatformError.PlatformError>,
  maxBytes: number
) {
  return Effect.gen(function* () {
    const decoder = new TextDecoder();
    let text = "";
    let bytes = 0;
    yield* Stream.runForEach(stream, (chunk) => {
      bytes += chunk.byteLength;
      if (bytes > maxBytes) return Effect.fail(new OutputLimit({ maxBytes }));
      text += decoder.decode(chunk, { stream: true });
      return Effect.void;
    });
    return text + decoder.decode();
  });
}

async function createRoot() {
  return realpath(await mkdtemp(join(tmpdir(), "habitat child-process ")));
}

function processExists(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") return false;
    throw error;
  }
}

async function startChildProcess(
  root: string,
  filesystemProvider: ReturnType<
    typeof defineNodeFilesystemRuntimeProvider
  > | null = defineNodeFilesystemRuntimeProvider(),
  events: string[] = []
) {
  const plugin = defineCliTopicPlugin.factory()({
    capability: "child-process-proof",
    services: {},
    commands: [],
  })();
  const app = defineApp({ id: "child-process-proof", plugins: [plugin] });
  const process = defineProcessCatalog({
    test: {
      id: "child-process-proof",
      roles: ["cli"],
      harness: "child-process.test",
      resourceRequirements: [
        requireResource({
          resource: ChildProcessRuntimeResource,
          reason: "Exercise native children",
        }),
      ],
    },
  }).test;
  const profile = defineRuntimeProfile({
    id: "child-process-proof",
    providers: [
      ...(filesystemProvider === null
        ? []
        : [
            providerSelection({
              resource: FilesystemRuntimeResource,
              provider: filesystemProvider,
            }),
          ]),
      providerSelection({
        resource: ChildProcessRuntimeResource,
        provider: defineNodeChildProcessRuntimeProvider(),
      }),
    ],
    harnesses: ["child-process.test"],
  });
  const entrypoint = defineEntrypoint({
    id: "child-process-proof",
    app,
    process,
    profile,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "child-process-proof",
      deployment: "test",
      source: "native-provider-proof",
    },
  });
  let ready: { childProcess: ChildProcessResource; filesystem: FilesystemResource } | undefined;
  const started = await startApp(entrypoint, {
    sources: { appRoot: root },
    finalization: { policy: "waitForNativeStop", deadlineMs: 1000 },
    integrations: [
      {
        surface: "cli/commands",
        harness: {
          id: "child-process.test",
          roles: ["cli"],
          surfaces: ["cli/commands"],
          async mount(input) {
            ready = {
              childProcess: input.processAccess.resource(ChildProcessRuntimeResource),
              filesystem: input.processAccess.resource(FilesystemRuntimeResource),
            };
            events.push("mounted");
            return {
              async stop() {
                events.push("stopped");
              },
            };
          },
        },
      },
    ],
  });
  if (ready === undefined) {
    await started.stop();
    throw new Error("The selected fixture harness did not receive ready native capabilities");
  }
  return { started, ...ready };
}
