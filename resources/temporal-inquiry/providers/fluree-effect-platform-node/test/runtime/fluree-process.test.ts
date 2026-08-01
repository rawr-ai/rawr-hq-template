import { spawn } from "node:child_process";
import { getEventListeners } from "node:events";
import { rmSync, writeFileSync } from "node:fs";
import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NodeServices } from "@effect/platform-node";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as NodePath from "@effect/platform-node/NodePath";
import { Deferred, Effect, Fiber, Layer, Sink, Stream } from "effect";
import { ChildProcess as Command } from "effect/unstable/process";
import type { KillOptions, Signal } from "effect/unstable/process/ChildProcess";
import * as CommandExecutor from "effect/unstable/process/ChildProcessSpawner";
import { describe, expect, test } from "vitest";

import {
  acquireFlureeProcess,
  FlureeProcessVersionMismatch,
  FlureeRuntimeCacheMeasurementFailed,
  FlureeRuntimeConfigurationError,
  FlureeRuntimePortLocked,
  FlureeRuntimeRunByteCapExceeded,
  FlureeRuntimeStorageLocked,
  recoverStaleFlureeRuntimeCaches,
  withFlureeProcess,
} from "../../fluree-process";

const DEAD_OWNER_PID = 2_147_483_646;
const DEAD_CHILD_PID = 2_147_483_647;

interface KillObservation {
  readonly pid: number;
  readonly signal: Signal | undefined;
}

interface FakeExecutor {
  readonly executor: CommandExecutor.ChildProcessSpawner["Service"];
  readonly commands: Command.Command[];
  readonly kills: KillObservation[];
  readonly processes: FakeProcess[];
}

interface FakeProcessState {
  running: boolean;
}

type FakeProcess = CommandExecutor.ChildProcessHandle;

function makeFakeProcess(
  pid: number,
  state: FakeProcessState,
  completed: Deferred.Deferred<CommandExecutor.ExitCode>,
  kills: KillObservation[],
  stdout: string,
  ignoreTerm: boolean
): FakeProcess {
  const processId = CommandExecutor.ProcessId(pid);
  const output = stdout.length === 0 ? Stream.empty : Stream.make(new TextEncoder().encode(stdout));
  return CommandExecutor.makeHandle({
    pid: processId,
    exitCode: Deferred.await(completed),
    isRunning: Effect.sync(() => state.running),
    kill: (options?: KillOptions) =>
      Effect.suspend(() => {
        if (!state.running) return Effect.void;
        const signal = options?.killSignal;
        kills.push({ pid: Number(processId), signal });
        if (signal === "SIGTERM" && ignoreTerm) {
          return Effect.sleep(60_000);
        }
        state.running = false;
        Deferred.doneUnsafe(
          completed,
          Effect.succeed(CommandExecutor.ExitCode(signal === "SIGKILL" ? 137 : 143))
        );
        return Effect.void;
      }),
    stdin: Sink.drain,
    stderr: Stream.empty,
    stdout: output,
    all: output,
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
    unref: Effect.succeed(Effect.void),
  });
}

interface FakeExecutorOptions {
  readonly ignoreTerm?: boolean;
  readonly onStart?: (command: Command.Command) => void;
  readonly versionOutput?: string;
}

function makeFakeExecutor(options: FakeExecutorOptions = {}): FakeExecutor {
  const commands: Command.Command[] = [];
  const kills: KillObservation[] = [];
  const processes: FakeProcess[] = [];
  let nextPid = 600_000;
  const executor = CommandExecutor.make((command) =>
    Effect.gen(function* () {
      commands.push(command);
      const completed = yield* Deferred.make<CommandExecutor.ExitCode>();
      if (!Command.isStandardCommand(command)) {
        return yield* Effect.die(new Error("The Fluree provider does not execute pipelines"));
      }
      const standard = command;
      const isVersion = standard.args.length === 1 && standard.args[0] === "--version";
      const state = { running: !isVersion };
      const child = makeFakeProcess(
        nextPid++,
        state,
        completed,
        kills,
        isVersion ? (options.versionOutput ?? "fluree 4.1.4") : "",
        options.ignoreTerm ?? false
      );
      if (isVersion) {
        Deferred.doneUnsafe(completed, Effect.succeed(CommandExecutor.ExitCode(0)));
      } else {
        simulateRuntimeLauncher(command, Number(child.pid));
      }
      processes.push(child);
      options.onStart?.(command);
      return child;
    })
  );
  return { executor, commands, kills, processes };
}

function simulateRuntimeLauncher(command: Command.Command, childPid: number): void {
  const environment = commandEnvironment(command);
  const leasePath = environment.HABITAT_RUNTIME_LEASE_PATH;
  if (leasePath === undefined) return;

  writeFileSync(
    leasePath,
    JSON.stringify({
      schema: environment.HABITAT_RUNTIME_LEASE_SCHEMA,
      phase: "running",
      ownerPid: Number(environment.HABITAT_RUNTIME_OWNER_PID),
      childPid,
      nonce: environment.HABITAT_RUNTIME_NONCE,
      createdAtMs: Number(environment.HABITAT_RUNTIME_CREATED_AT_MS),
      runDirectoryName: environment.HABITAT_RUNTIME_RUN_DIRECTORY_NAME,
    })
  );

  for (const lock of [
    {
      createdAtMs: environment.HABITAT_RUNTIME_STORAGE_LOCK_CREATED_AT_MS,
      path: environment.HABITAT_RUNTIME_STORAGE_LOCK_PATH,
      resourceKeyJson: environment.HABITAT_RUNTIME_STORAGE_KEY_JSON,
      resourceKind: "storage",
    },
    {
      createdAtMs: environment.HABITAT_RUNTIME_PORT_LOCK_CREATED_AT_MS,
      path: environment.HABITAT_RUNTIME_PORT_LOCK_PATH,
      resourceKeyJson: environment.HABITAT_RUNTIME_PORT_KEY_JSON,
      resourceKind: "port",
    },
  ] as const) {
    if (
      lock.path === undefined ||
      lock.createdAtMs === undefined ||
      lock.resourceKeyJson === undefined
    ) {
      continue;
    }
    writeFileSync(
      lock.path,
      JSON.stringify({
        schema: environment.HABITAT_RUNTIME_EXCLUSIVITY_LOCK_SCHEMA,
        phase: "running",
        ownerPid: Number(environment.HABITAT_RUNTIME_OWNER_PID),
        childPid,
        nonce: environment.HABITAT_RUNTIME_NONCE,
        createdAtMs: Number(lock.createdAtMs),
        resourceKind: lock.resourceKind,
        resourceKey: JSON.parse(lock.resourceKeyJson),
      })
    );
  }

  if (environment.HABITAT_RUNTIME_LOG_PATH !== undefined) {
    writeFileSync(environment.HABITAT_RUNTIME_LOG_PATH, "Fluree server starting\n", {
      flag: "a",
    });
  }
}

function platformLayer(fake: FakeExecutor) {
  return Layer.mergeAll(
    NodeFileSystem.layer,
    NodePath.layer,
    Layer.succeed(CommandExecutor.ChildProcessSpawner, fake.executor)
  );
}

async function makeSandbox(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "habitat-fluree-runtime-test-"));
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function pidIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function processGroupIsAlive(processGroupId: number): boolean {
  try {
    process.kill(-processGroupId, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitUntil(predicate: () => boolean | Promise<boolean>, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("condition did not become true before the deadline");
}

function standardCommand(command: Command.Command): Command.StandardCommand {
  if (!Command.isStandardCommand(command)) {
    throw new Error("The Fluree provider does not execute pipelines");
  }
  return command;
}

function commandEnvironment(command: Command.Command): Record<string, string | undefined> {
  return standardCommand(command).options.env ?? {};
}

function serverCommands(fake: FakeExecutor): Command.Command[] {
  return fake.commands.filter((command) => standardCommand(command).args.includes("server"));
}

function processOptions(
  sandbox: string,
  cacheRoot: string,
  overrides: {
    readonly cachePolicy?: Parameters<typeof acquireFlureeProcess>[0]["cachePolicy"];
    readonly port?: number;
  } = {}
): Parameters<typeof acquireFlureeProcess>[0] {
  return {
    access: "read",
    storagePath: path.join(sandbox, "storage"),
    cacheRoot,
    ...overrides,
  };
}

function storageLockDirectory(storagePath: string): string {
  return `${storagePath}.habitat-fluree-runtime-lock`;
}

async function removePortLockTestArtifacts(port: number): Promise<void> {
  if (process.getuid === undefined) throw new Error("POSIX uid is required for this test");
  const temporaryRoot = await realpath("/tmp");
  const lockRoot = path.join(
    temporaryRoot,
    `habitat-fluree-port-locks-${String(process.getuid())}`
  );
  const lockName = `127.0.0.1-${String(port)}.lock`;
  let entries: string[];
  try {
    entries = await readdir(lockRoot);
  } catch {
    return;
  }
  const exactNames = entries.filter((entry) => {
    if (entry === lockName) return true;
    const nonce = entry.slice(`${lockName}.recovered-`.length);
    return entry.startsWith(`${lockName}.recovered-`) && /^[0-9a-f]{32}$/u.test(nonce);
  });
  await Promise.all(
    exactNames.map((entry) => rm(path.join(lockRoot, entry), { recursive: true, force: true }))
  );
}

async function createRecoveredStorageLock(
  storagePath: string,
  nonce: string,
  recoveredAtMs: number
): Promise<string> {
  const recoveredDirectory = `${storageLockDirectory(storagePath)}.recovered-${nonce}`;
  await mkdir(recoveredDirectory);
  await writeFile(
    path.join(recoveredDirectory, "owner.json"),
    JSON.stringify({
      schema: "habitat.fluree-exclusivity-lock/v1",
      phase: "running",
      ownerPid: DEAD_OWNER_PID,
      childPid: DEAD_CHILD_PID,
      nonce,
      createdAtMs: recoveredAtMs - 1_000,
      resourceKind: "storage",
      resourceKey: storagePath,
    })
  );
  await writeFile(
    path.join(recoveredDirectory, "recovered.json"),
    JSON.stringify({
      schema: "habitat.fluree-recovered-lock/v1",
      recoveredAtMs,
      nonce,
      resourceKind: "storage",
      resourceKey: storagePath,
    })
  );
  return recoveredDirectory;
}

async function createOwnedRun(
  cacheRoot: string,
  input: {
    readonly nonce: string;
    readonly ownerPid: number;
    readonly childPid: number;
    readonly createdAtMs: number;
    readonly payloadBytes?: number;
  }
): Promise<string> {
  const runDirectoryName = `habitat-fluree-${input.nonce}-deadbeefcafe`;
  const runDirectory = path.join(cacheRoot, runDirectoryName);
  await mkdir(runDirectory, { recursive: true });
  const lease = {
    schema: "habitat.fluree-runtime-lease/v1",
    phase: "running",
    ownerPid: input.ownerPid,
    childPid: input.childPid,
    nonce: input.nonce,
    createdAtMs: input.createdAtMs,
    runDirectoryName,
  };
  await writeFile(path.join(runDirectory, ".fluree-runtime-lease.json"), JSON.stringify(lease));
  if ((input.payloadBytes ?? 0) > 0) {
    await writeFile(path.join(runDirectory, "payload.bin"), Buffer.alloc(input.payloadBytes ?? 0));
  }
  return runDirectory;
}

async function createLeasedRun(
  cacheRoot: string,
  input: {
    readonly nonce: string;
    readonly ownerPid: number;
    readonly childPid: number | null;
    readonly createdAtMs: number;
    readonly phase: "prepared" | "running";
    readonly payloadBytes?: number;
  }
): Promise<string> {
  const runDirectoryName = `habitat-fluree-${input.nonce}-deadbeefcafe`;
  const runDirectory = path.join(cacheRoot, runDirectoryName);
  await mkdir(runDirectory, { recursive: true });
  await writeFile(
    path.join(runDirectory, ".fluree-runtime-lease.json"),
    JSON.stringify({
      schema: "habitat.fluree-runtime-lease/v1",
      phase: input.phase,
      ownerPid: input.ownerPid,
      childPid: input.childPid,
      nonce: input.nonce,
      createdAtMs: input.createdAtMs,
      runDirectoryName,
    })
  );
  if ((input.payloadBytes ?? 0) > 0) {
    await writeFile(path.join(runDirectory, "payload.bin"), Buffer.alloc(input.payloadBytes ?? 0));
  }
  return runDirectory;
}

describe("Fluree runtime cache lifecycle", () => {
  test("keeps Effect identity inside the package-owned Promise boundary", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const executable = path.join(sandbox, "fake-fluree.sh");
    await writeFile(
      executable,
      `#!/bin/sh
if [ "\${1:-}" = "--version" ]; then
  printf "fluree 4.1.4\\n"
  exit 0
fi
printf "Fluree server starting\\n"
trap "exit 0" TERM INT
while :; do sleep 1; done
`,
      { mode: 0o700 }
    );
    let successfulRun = "";
    let successfulProcessGroup = 0;
    let failedRun = "";
    const reusableSignal = new AbortController();

    try {
      expect(getEventListeners(reusableSignal.signal, "abort")).toHaveLength(0);
      const endpoint = await withFlureeProcess(
        {
          access: "read",
          storagePath: path.join(sandbox, "storage-success"),
          cacheRoot,
          executable,
          port: 18_078,
          cachePolicy: { hardStopTimeoutMs: 2_000 },
          signal: reusableSignal.signal,
        },
        async (runtime) => {
          successfulRun = runtime.runDirectory;
          successfulProcessGroup = runtime.owner.childPid;
          expect(await pathExists(runtime.runDirectory)).toBe(true);
          expect(runtime.version).toBe("4.1.4");
          return runtime.endpoint;
        }
      );

      expect(endpoint).toBe("http://127.0.0.1:18078");
      expect(getEventListeners(reusableSignal.signal, "abort")).toHaveLength(0);
      expect(await pathExists(successfulRun)).toBe(false);
      expect(processGroupIsAlive(successfulProcessGroup)).toBe(false);

      await expect(
        withFlureeProcess(
          {
            access: "read",
            storagePath: path.join(sandbox, "storage-failure"),
            cacheRoot,
            executable,
            port: 18_079,
            cachePolicy: { hardStopTimeoutMs: 2_000 },
          },
          async (runtime) => {
            failedRun = runtime.runDirectory;
            throw new Error("consumer callback failed");
          }
        )
      ).rejects.toThrow("consumer callback failed");
      expect(await pathExists(failedRun)).toBe(false);
    } finally {
      if (successfulProcessGroup > 0 && processGroupIsAlive(successfulProcessGroup)) {
        process.kill(-successfulProcessGroup, "SIGKILL");
      }
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("rejects Promise consumers when the exact owned child exits", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const storagePath = path.join(sandbox, "storage");
    const executable = path.join(sandbox, "exiting-fluree.sh");
    await writeFile(
      executable,
      `#!/bin/sh
if [ "\${1:-}" = "--version" ]; then
  printf "fluree 4.1.4\\n"
  exit 0
fi
printf "Fluree server starting\\n"
sleep 0.1
exit 23
`,
      { mode: 0o700 }
    );
    let runDirectory = "";

    try {
      await expect(
        withFlureeProcess(
          {
            access: "read",
            storagePath,
            cacheRoot,
            executable,
            port: 18_080,
            cachePolicy: { hardStopTimeoutMs: 2_000 },
          },
          async (runtime) => {
            runDirectory = runtime.runDirectory;
            return new Promise<never>(() => undefined);
          }
        )
      ).rejects.toThrow("owned Fluree process exited with code 23");
      expect(await pathExists(runDirectory)).toBe(false);
      expect(await pathExists(storageLockDirectory(storagePath))).toBe(false);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("rejects Promise consumers when their owned run crosses the byte cap", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const storagePath = path.join(sandbox, "storage");
    const executable = path.join(sandbox, "fake-fluree.sh");
    await writeFile(
      executable,
      `#!/bin/sh
if [ "\${1:-}" = "--version" ]; then
  printf "fluree 4.1.4\\n"
  exit 0
fi
printf "Fluree server starting\\n"
trap "exit 0" TERM INT
while :; do sleep 1; done
`,
      { mode: 0o700 }
    );
    let runDirectory = "";

    try {
      await expect(
        withFlureeProcess(
          {
            access: "write",
            storagePath,
            cacheRoot,
            executable,
            port: 18_081,
            cachePolicy: {
              perRunByteCap: 1_024n,
              monitorIntervalMs: 5,
              hardStopTimeoutMs: 2_000,
            },
          },
          async (runtime) => {
            runDirectory = runtime.runDirectory;
            await writeFile(path.join(runtime.runDirectory, "large.bin"), Buffer.alloc(8_192));
            return new Promise<never>(() => undefined);
          }
        )
      ).rejects.toThrow("exceeding the 1024-byte cap");
      expect(await pathExists(runDirectory)).toBe(false);
      expect(await pathExists(storageLockDirectory(storagePath))).toBe(false);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("rejects a concurrent operation on the same canonical durable storage", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const storagePath = path.join(sandbox, "storage");
    const fake = makeFakeExecutor();

    try {
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            yield* acquireFlureeProcess({
              access: "read",
              storagePath,
              cacheRoot,
              port: 18_082,
            });
            const collision = yield* Effect.result(
              acquireFlureeProcess({
                access: "write",
                storagePath: path.join(storagePath, "."),
                cacheRoot,
                port: 18_083,
              })
            );
            if (collision._tag !== "Failure") throw new Error("expected storage lock collision");
            expect(collision.failure).toBeInstanceOf(FlureeRuntimeStorageLocked);
            expect(serverCommands(fake)).toHaveLength(1);
            expect(yield* Effect.promise(() => pathExists(storageLockDirectory(storagePath)))).toBe(
              true
            );
          })
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(fake.kills).toEqual([{ pid: 600_001, signal: "SIGTERM" }]);
      expect(await pathExists(storageLockDirectory(storagePath))).toBe(false);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("rejects the same local port across different ambient TMPDIR values", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const firstStorage = path.join(sandbox, "storage-one");
    const secondStorage = path.join(sandbox, "storage-two");
    const firstTemporaryRoot = path.join(sandbox, "tmp-one");
    const secondTemporaryRoot = path.join(sandbox, "tmp-two");
    await mkdir(firstTemporaryRoot);
    await mkdir(secondTemporaryRoot);
    const originalTmpdir = process.env.TMPDIR;
    const fake = makeFakeExecutor();

    try {
      process.env.TMPDIR = firstTemporaryRoot;
      expect(tmpdir()).toBe(firstTemporaryRoot);
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            yield* acquireFlureeProcess({
              access: "read",
              storagePath: firstStorage,
              cacheRoot,
              port: 18_086,
            });
            yield* Effect.sync(() => {
              process.env.TMPDIR = secondTemporaryRoot;
            });
            expect(tmpdir()).toBe(secondTemporaryRoot);
            const collision = yield* Effect.result(
              acquireFlureeProcess({
                access: "read",
                storagePath: secondStorage,
                cacheRoot,
                port: 18_086,
              })
            );
            if (collision._tag !== "Failure") throw new Error("expected port lock collision");
            expect(collision.failure).toBeInstanceOf(FlureeRuntimePortLocked);
            expect(serverCommands(fake)).toHaveLength(1);
            expect(
              yield* Effect.promise(() => pathExists(storageLockDirectory(secondStorage)))
            ).toBe(false);
          })
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(fake.kills).toEqual([{ pid: 600_001, signal: "SIGTERM" }]);
    } finally {
      if (originalTmpdir === undefined) {
        delete process.env.TMPDIR;
      } else {
        process.env.TMPDIR = originalTmpdir;
      }
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("fails closed when a non-Habitat HTTP listener already owns the port", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const storagePath = path.join(sandbox, "storage");
    const executable = path.join(sandbox, "fake-fluree.mjs");
    const port = 18_102;
    await removePortLockTestArtifacts(port);
    await writeFile(
      executable,
      `#!/usr/bin/env node
import { createServer } from "node:http";

if (process.argv[2] === "--version") {
  console.log("fluree 4.1.4");
  process.exit(0);
}

const listenIndex = process.argv.indexOf("--listen-addr");
const [host, portText] = process.argv[listenIndex + 1].split(":");
const server = createServer((_request, response) => {
  response.end("{}");
});
server.once("error", (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(98);
});
server.listen(Number(portText), host, () => {
  console.error("Fluree server starting");
});
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
`,
      { mode: 0o700 }
    );
    const incumbent = createServer((request, response) => {
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.setHeader("connection", "close");
      response.end(
        request.url?.endsWith("/stats")
          ? JSON.stringify({ indexing_enabled: false })
          : JSON.stringify({ status: "ready", version: "4.1.4" })
      );
    });
    let callbackCalled = false;

    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => reject(error);
        incumbent.once("error", onError);
        incumbent.listen(port, "127.0.0.1", () => {
          incumbent.off("error", onError);
          resolve();
        });
      });
      const healthResponse = await fetch(`http://127.0.0.1:${String(port)}/health`, {
        headers: { connection: "close" },
      });
      expect(healthResponse.status).toBe(200);
      expect(await healthResponse.json()).toMatchObject({ status: "ready" });
      const statsResponse = await fetch(`http://127.0.0.1:${String(port)}/v1/fluree/stats`, {
        headers: { connection: "close" },
      });
      expect(statsResponse.status).toBe(200);
      expect(await statsResponse.json()).toMatchObject({ indexing_enabled: false });

      await expect(
        withFlureeProcess(
          {
            access: "read",
            storagePath,
            cacheRoot,
            executable,
            port,
            cachePolicy: { hardStopTimeoutMs: 2_000 },
          },
          async () => {
            callbackCalled = true;
          }
        )
      ).rejects.toThrow(
        "owned Fluree child exited before publishing its post-bind listener marker"
      );
      expect(callbackCalled).toBe(false);
      expect(await pathExists(storageLockDirectory(storagePath))).toBe(false);
    } finally {
      if (incumbent.listening) {
        await new Promise<void>((resolve, reject) => {
          incumbent.close((error) => (error === undefined ? resolve() : reject(error)));
        });
      }
      await removePortLockTestArtifacts(port);
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("recovers only an exact dead storage owner and preserves its tombstone", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const storagePath = path.join(sandbox, "storage");
    const nonce = "a".repeat(32);
    const sibling = path.join(sandbox, "keep.txt");
    await mkdir(storagePath, { recursive: true });
    const canonicalStoragePath = await realpath(storagePath);
    const lockDirectory = storageLockDirectory(canonicalStoragePath);
    const recoveredDirectory = `${lockDirectory}.recovered-${nonce}`;
    await mkdir(lockDirectory);
    await writeFile(
      path.join(lockDirectory, "owner.json"),
      JSON.stringify({
        schema: "habitat.fluree-exclusivity-lock/v1",
        phase: "running",
        ownerPid: DEAD_OWNER_PID,
        childPid: DEAD_CHILD_PID,
        nonce,
        createdAtMs: Date.now() - 60_000,
        resourceKind: "storage",
        resourceKey: canonicalStoragePath,
      })
    );
    await writeFile(sibling, "keep");
    const fake = makeFakeExecutor();

    try {
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            yield* acquireFlureeProcess({
              access: "read",
              storagePath,
              cacheRoot,
              port: 18_084,
            });
            expect(yield* Effect.promise(() => pathExists(recoveredDirectory))).toBe(true);
            expect(yield* Effect.promise(() => pathExists(lockDirectory))).toBe(true);
          })
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(await pathExists(lockDirectory)).toBe(false);
      expect(await pathExists(recoveredDirectory)).toBe(true);
      expect(await readFile(sibling, "utf8")).toBe("keep");
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("cleans expired exact tombstones and fails closed at the retained cap", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const storagePath = path.join(sandbox, "storage");
    await mkdir(storagePath, { recursive: true });
    const canonicalStoragePath = await realpath(storagePath);
    const lockDirectory = storageLockDirectory(canonicalStoragePath);
    const expired = await Promise.all(
      "01234567"
        .split("")
        .map((digit) =>
          createRecoveredStorageLock(canonicalStoragePath, digit.repeat(32), Date.now() - 120_000)
        )
    );
    const sibling = `${lockDirectory}.recovered-not-an-owned-nonce`;
    await mkdir(sibling);
    await writeFile(path.join(sibling, "keep.txt"), "keep");
    const fake = makeFakeExecutor();

    try {
      await Effect.runPromise(
        Effect.scoped(
          acquireFlureeProcess({
            access: "read",
            storagePath,
            cacheRoot,
            port: 18_087,
            cachePolicy: { staleTtlMs: 0 },
          })
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(await Promise.all(expired.map(pathExists))).toEqual(Array(8).fill(false));
      expect(await readFile(path.join(sibling, "keep.txt"), "utf8")).toBe("keep");

      const retained = await Promise.all(
        "89abcdef"
          .split("")
          .map((digit) =>
            createRecoveredStorageLock(canonicalStoragePath, digit.repeat(32), Date.now())
          )
      );
      await mkdir(lockDirectory);
      await writeFile(
        path.join(lockDirectory, "owner.json"),
        JSON.stringify({
          schema: "habitat.fluree-exclusivity-lock/v1",
          phase: "running",
          ownerPid: DEAD_OWNER_PID,
          childPid: DEAD_CHILD_PID,
          nonce: "f".repeat(32),
          createdAtMs: Date.now() - 60_000,
          resourceKind: "storage",
          resourceKey: canonicalStoragePath,
        })
      );

      const capped = await Effect.runPromise(
        Effect.result(
          Effect.scoped(
            acquireFlureeProcess({
              access: "read",
              storagePath,
              cacheRoot,
              port: 18_088,
              cachePolicy: { staleTtlMs: 0 },
            })
          )
        ).pipe(Effect.provide(platformLayer(fake)))
      );
      if (capped._tag !== "Failure") throw new Error("expected tombstone-cap failure");
      expect(capped.failure).toBeInstanceOf(FlureeRuntimeStorageLocked);
      expect(await Promise.all(retained.map(pathExists))).toEqual(Array(8).fill(true));
      expect(await pathExists(lockDirectory)).toBe(true);
      expect(serverCommands(fake)).toHaveLength(1);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("fails closed without modifying an ambiguous storage lock", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const storagePath = path.join(sandbox, "storage");
    const lockDirectory = storageLockDirectory(storagePath);
    const ownerPath = path.join(lockDirectory, "owner.json");
    await mkdir(storagePath, { recursive: true });
    await mkdir(lockDirectory);
    await writeFile(ownerPath, "{}");
    const fake = makeFakeExecutor();

    try {
      const result = await Effect.runPromise(
        Effect.result(
          Effect.scoped(
            acquireFlureeProcess({
              access: "read",
              storagePath,
              cacheRoot,
              port: 18_085,
            })
          )
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      if (result._tag !== "Failure") throw new Error("expected ambiguous lock failure");
      expect(result.failure).toBeInstanceOf(FlureeRuntimeStorageLocked);
      expect(await readFile(ownerPath, "utf8")).toBe("{}");
      expect(serverCommands(fake)).toHaveLength(0);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("isolates concurrent children and finalizes only their exact run directories", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const sibling = path.join(sandbox, "keep.txt");
    await writeFile(sibling, "keep");
    const fake = makeFakeExecutor();
    const originalRustLog = process.env.RUST_LOG;
    let runDirectories: readonly string[] = [];

    try {
      process.env.RUST_LOG = "error";
      runDirectories = await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const runtimes = yield* Effect.all(
              [
                acquireFlureeProcess({
                  access: "read",
                  storagePath: path.join(sandbox, "storage-one"),
                  cacheRoot,
                  port: 18_091,
                }),
                acquireFlureeProcess({
                  access: "write",
                  storagePath: path.join(sandbox, "storage-two"),
                  cacheRoot,
                  port: 18_092,
                }),
              ],
              { concurrency: "unbounded" }
            );
            expect(runtimes[0].runDirectory).not.toBe(runtimes[1].runDirectory);
            const startedServers = serverCommands(fake);
            for (const runtime of runtimes) {
              expect(runtime.cacheDirectory).toBe(
                path.join(runtime.runDirectory, "fluree_binary_cache")
              );
              expect(runtime.version).toBe("4.1.4");
              const started = startedServers.find(
                (candidate) => commandEnvironment(candidate).TMPDIR === runtime.runDirectory
              );
              expect(started).toBeDefined();
              if (started === undefined) throw new Error("missing started server");
              expect(commandEnvironment(started).FLUREE_INDEXING_ENABLED).toBe(
                runtime.access === "write" ? "true" : "false"
              );
              expect(commandEnvironment(started).FLUREE_REINDEX_MIN_BYTES).toBe(
                runtime.access === "write" ? "100" : undefined
              );
              expect(commandEnvironment(started).FLUREE_QUERY_REFRESH_ENABLED).toBe("true");
              expect(commandEnvironment(started).FLUREE_QUERY_REFRESH_TTL_MS).toBe("0");
              expect(commandEnvironment(started).NO_COLOR).toBe("1");
              expect(commandEnvironment(started).RUST_LOG).toBe("warn,fluree_db_server=info");
              const standard = standardCommand(started);
              expect(standard.options.extendEnv).toBe(true);
              expect(standard.options.stdin).toBe("pipe");
              expect(standard.options.stdout).toBe("inherit");
              expect(standard.options.stderr).toBe("inherit");
              const configPath = path.join(runtime.runDirectory, "control", "config.toml");
              const launcherPath = path.join(runtime.runDirectory, "control", "launch-fluree.sh");
              expect(standard.args).toEqual([
                launcherPath,
                "fluree",
                "--config",
                configPath,
                "server",
                "run",
                "--storage-path",
                runtime.storagePath,
                "--listen-addr",
                runtime.endpoint.replace("http://", ""),
                "--log-level",
                "info",
              ]);
              expect(yield* Effect.promise(() => readFile(configPath, "utf8"))).toBe("");
              const runtimeLogPath = path.join(runtime.runDirectory, "control", "fluree.log");
              expect(commandEnvironment(started).HABITAT_RUNTIME_LOG_PATH).toBe(runtimeLogPath);
              expect(yield* Effect.promise(() => readFile(runtimeLogPath, "utf8"))).toContain(
                "Fluree server starting"
              );
              expect(yield* Effect.promise(() => readFile(launcherPath, "utf8"))).toContain(
                'exec "$@" </dev/null >> "$HABITAT_RUNTIME_LOG_PATH" 2>&1'
              );
              yield* Effect.promise(() =>
                expect(
                  writeFile(
                    path.join(runtime.runDirectory, ".fluree-runtime-lease.json"),
                    "collision",
                    { flag: "wx" }
                  )
                ).rejects.toMatchObject({ code: "EEXIST" })
              );
            }
            return runtimes.map((runtime) => runtime.runDirectory);
          })
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(new Set(runDirectories).size).toBe(2);
      expect(fake.commands).toHaveLength(4);
      const startedServers = serverCommands(fake);
      expect(startedServers).toHaveLength(2);
      for (const started of startedServers) {
        const environment = commandEnvironment(started);
        expect(runDirectories).toContain(environment.TMPDIR);
        expect(environment.TMP).toBe(environment.TMPDIR);
        expect(environment.TEMP).toBe(environment.TMPDIR);
      }
      expect(fake.kills).toHaveLength(2);
      expect(fake.kills.every(({ signal }) => signal === "SIGTERM")).toBe(true);
      expect(new Set(fake.kills.map(({ pid }) => pid)).size).toBe(2);
      await expect(access(runDirectories[0])).rejects.toMatchObject({ code: "ENOENT" });
      await expect(access(runDirectories[1])).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readFile(sibling, "utf8")).toBe("keep");
      expect(await pathExists(cacheRoot)).toBe(true);
    } finally {
      if (originalRustLog === undefined) {
        delete process.env.RUST_LOG;
      } else {
        process.env.RUST_LOG = originalRustLog;
      }
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("cleans up a started child when acquisition fails after process start", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const sibling = path.join(sandbox, "keep.txt");
    await writeFile(sibling, "keep");
    const fake = makeFakeExecutor({
      onStart: (command) => {
        const runDirectory = commandEnvironment(command).TMPDIR;
        if (runDirectory !== undefined) {
          rmSync(runDirectory, { recursive: true, force: true });
        }
      },
    });

    try {
      const result = await Effect.runPromise(
        Effect.result(Effect.scoped(acquireFlureeProcess(processOptions(sandbox, cacheRoot)))).pipe(
          Effect.provide(platformLayer(fake))
        )
      );

      expect(result._tag).toBe("Failure");
      expect(fake.processes).toHaveLength(2);
      expect(fake.kills).toEqual([{ pid: 600_001, signal: "SIGTERM" }]);
      expect(await readFile(sibling, "utf8")).toBe("keep");
      expect(await pathExists(cacheRoot)).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("runs exact cleanup when the owning fiber is interrupted", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const fake = makeFakeExecutor();

    try {
      const runDirectory = await Effect.runPromise(
        Effect.gen(function* () {
          const ready = yield* Deferred.make<string>();
          const fiber = yield* Effect.scoped(
            Effect.gen(function* () {
              const runtime = yield* acquireFlureeProcess(processOptions(sandbox, cacheRoot));
              yield* Deferred.succeed(ready, runtime.runDirectory);
              return yield* Effect.never;
            })
          ).pipe(Effect.provide(platformLayer(fake)), Effect.forkChild);
          const directory = yield* Deferred.await(ready);
          yield* Fiber.interrupt(fiber);
          return directory;
        })
      );

      expect(fake.kills).toEqual([{ pid: 600_001, signal: "SIGTERM" }]);
      expect(await pathExists(runDirectory)).toBe(false);
      expect(await pathExists(cacheRoot)).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("runs exact cleanup when the Promise boundary AbortSignal is interrupted", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const fake = makeFakeExecutor();
    const controller = new AbortController();
    let publishRunDirectory: ((runDirectory: string) => void) | undefined;
    const acquired = new Promise<string>((resolve) => {
      publishRunDirectory = resolve;
    });

    try {
      const running = Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const runtime = yield* acquireFlureeProcess(processOptions(sandbox, cacheRoot));
            yield* Effect.sync(() => publishRunDirectory?.(runtime.runDirectory));
            return yield* Effect.never;
          })
        ).pipe(Effect.provide(platformLayer(fake))),
        { signal: controller.signal }
      );
      const runDirectory = await acquired;

      controller.abort(new Error("test interruption"));

      await expect(running).rejects.toBeDefined();
      expect(fake.kills).toEqual([{ pid: 600_001, signal: "SIGTERM" }]);
      expect(await pathExists(runDirectory)).toBe(false);
      expect(await pathExists(cacheRoot)).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("terminates the exact child after a hard owner crash and recovers its lease", async () => {
    const packageRoot = fileURLToPath(new URL("../..", import.meta.url));
    const fixtureRoot = await mkdtemp(path.join(packageRoot, ".fluree-crash-test-"));
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const storagePath = path.join(sandbox, "storage");
    const sibling = path.join(cacheRoot, "keep");
    const executable = path.join(fixtureRoot, "fake-fluree.sh");
    const ownerScript = path.join(fixtureRoot, "owner.ts");
    await removePortLockTestArtifacts(18_099);
    await mkdir(cacheRoot, { recursive: true });
    await writeFile(sibling, "keep");
    await writeFile(
      executable,
      `#!/bin/sh
if [ "\${1:-}" = "--version" ]; then
  printf "fluree 4.1.4\\n"
  exit 0
fi
printf "Fluree server starting\\n"
trap "exit 0" TERM INT
/bin/sh -c 'trap "" TERM INT; while :; do sleep 1; done' &
while :; do sleep 1; done
`,
      { mode: 0o700 }
    );
    const runtimeModule = pathToFileURL(path.join(packageRoot, "fluree-process.ts")).href;
    await writeFile(
      ownerScript,
      `import { NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import { acquireFlureeProcess } from ${JSON.stringify(runtimeModule)};
const options = JSON.parse(process.argv[2]);
await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const runtime = yield* acquireFlureeProcess(options);
      console.log("READY:" + JSON.stringify({
        childPid: runtime.owner.childPid,
        runDirectory: runtime.runDirectory,
      }));
      return yield* Effect.never;
    })
  ).pipe(Effect.provide(NodeServices.layer))
);
`
    );

    const owner = spawn(
      "bun",
      [
        ownerScript,
        JSON.stringify({
          access: "read",
          cacheRoot,
          executable,
          port: 18_099,
          storagePath,
          cachePolicy: {
            shutdownGraceMs: 1_500,
            hardStopTimeoutMs: 100,
          },
        }),
      ],
      {
        cwd: packageRoot,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    let childPid = 0;
    let runDirectory = "";

    try {
      const ready = await new Promise<{ childPid: number; runDirectory: string }>(
        (resolve, reject) => {
          let output = "";
          const timeout = setTimeout(
            () => reject(new Error("owner did not publish runtime readiness")),
            10_000
          );
          owner.stdout?.on("data", (chunk: Buffer) => {
            output += chunk.toString();
            const line = output.split("\n").find((candidate) => candidate.startsWith("READY:"));
            if (line === undefined) return;
            clearTimeout(timeout);
            resolve(JSON.parse(line.slice("READY:".length)));
          });
          owner.once("exit", (code) => {
            clearTimeout(timeout);
            reject(new Error(`owner exited before readiness with code ${String(code)}`));
          });
        }
      );
      childPid = ready.childPid;
      runDirectory = ready.runDirectory;
      expect(pidIsAlive(childPid)).toBe(true);
      expect(await pathExists(storageLockDirectory(storagePath))).toBe(true);

      owner.kill("SIGKILL");
      await waitUntil(() => !pidIsAlive(owner.pid ?? 0), 5_000);
      await waitUntil(() => !pidIsAlive(childPid), 5_000);

      const duringGrace = await Effect.runPromise(
        recoverStaleFlureeRuntimeCaches({
          cacheRoot,
          cachePolicy: { staleTtlMs: 0 },
        }).pipe(Effect.provide(NodeServices.layer))
      );
      expect(duringGrace.removedRunDirectories).toEqual([]);
      expect(duringGrace.activeRunDirectoriesPreserved).toBe(1);
      expect(await pathExists(runDirectory)).toBe(true);

      const collision = await Effect.runPromise(
        Effect.result(
          Effect.scoped(
            acquireFlureeProcess({
              access: "read",
              storagePath,
              cacheRoot,
              executable,
              port: 18_101,
            })
          )
        ).pipe(Effect.provide(NodeServices.layer))
      );
      if (collision._tag !== "Failure") throw new Error("expected live child storage collision");
      expect(collision.failure).toBeInstanceOf(FlureeRuntimeStorageLocked);

      await waitUntil(() => !processGroupIsAlive(childPid), 5_000);

      const report = await Effect.runPromise(
        recoverStaleFlureeRuntimeCaches({
          cacheRoot,
          cachePolicy: { staleTtlMs: 0 },
        }).pipe(Effect.provide(NodeServices.layer))
      );

      expect(report.removedRunDirectories).toEqual([runDirectory]);
      expect(await pathExists(runDirectory)).toBe(false);
      expect(await pathExists(storageLockDirectory(storagePath))).toBe(true);
      expect(await readFile(sibling, "utf8")).toBe("keep");
    } finally {
      if (owner.pid !== undefined && pidIsAlive(owner.pid)) owner.kill("SIGKILL");
      if (childPid > 0 && pidIsAlive(childPid)) process.kill(childPid, "SIGKILL");
      await removePortLockTestArtifacts(18_099);
      await rm(fixtureRoot, { recursive: true, force: true });
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("cleans the full process group after natural Fluree completion", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const executable = path.join(sandbox, "fake-fluree.sh");
    await writeFile(
      executable,
      `#!/bin/sh
if [ "\${1:-}" = "--version" ]; then
  printf "fluree 4.1.4\\n"
  exit 0
fi
printf "Fluree server starting\\n"
sleep 1
exit 0
`,
      { mode: 0o700 }
    );
    let processGroupId = 0;
    let runDirectory = "";

    try {
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const runtime = yield* acquireFlureeProcess({
              access: "read",
              storagePath: path.join(sandbox, "storage"),
              cacheRoot,
              executable,
              port: 18_100,
              cachePolicy: { hardStopTimeoutMs: 2_000 },
            });
            processGroupId = runtime.owner.childPid;
            runDirectory = runtime.runDirectory;
            yield* runtime.wait;
            yield* Effect.sleep(1_500);
          })
        ).pipe(Effect.provide(NodeServices.layer))
      );

      expect(processGroupIsAlive(processGroupId)).toBe(false);
      expect(await pathExists(runDirectory)).toBe(false);
      expect(await readdir(cacheRoot)).toEqual([]);
    } finally {
      if (processGroupId > 0 && processGroupIsAlive(processGroupId)) {
        process.kill(-processGroupId, "SIGKILL");
      }
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("bounds TERM grace, escalates to KILL, and then removes the owned run", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const fake = makeFakeExecutor({ ignoreTerm: true });
    let runDirectory = "";

    try {
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const runtime = yield* acquireFlureeProcess(
              processOptions(sandbox, cacheRoot, {
                cachePolicy: {
                  shutdownGraceMs: 1,
                  hardStopTimeoutMs: 100,
                },
              })
            );
            runDirectory = runtime.runDirectory;
          })
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(fake.kills).toEqual([
        { pid: 600_001, signal: "SIGTERM" },
        { pid: 600_001, signal: "SIGKILL" },
      ]);
      expect(await pathExists(runDirectory)).toBe(false);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("revalidates owner markers before final recursive cleanup", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const fake = makeFakeExecutor();
    let runDirectory = "";

    try {
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const runtime = yield* acquireFlureeProcess(processOptions(sandbox, cacheRoot));
            runDirectory = runtime.runDirectory;
            const leasePath = path.join(runtime.runDirectory, ".fluree-runtime-lease.json");
            yield* Effect.promise(() => writeFile(leasePath, "{}"));
          })
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(fake.kills).toEqual([{ pid: 600_001, signal: "SIGTERM" }]);
      expect(await pathExists(runDirectory)).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("preserves active owners and children while removing only dead TTL-expired runs", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    await mkdir(cacheRoot, { recursive: true });
    const old = Date.now() - 60_000;
    const dead = await createOwnedRun(cacheRoot, {
      nonce: "1".repeat(32),
      ownerPid: DEAD_OWNER_PID,
      childPid: DEAD_CHILD_PID,
      createdAtMs: old,
      payloadBytes: 64,
    });
    const activeOwner = await createOwnedRun(cacheRoot, {
      nonce: "2".repeat(32),
      ownerPid: process.pid,
      childPid: DEAD_CHILD_PID,
      createdAtMs: old,
    });
    const activeChild = await createOwnedRun(cacheRoot, {
      nonce: "3".repeat(32),
      ownerPid: DEAD_OWNER_PID,
      childPid: process.pid,
      createdAtMs: old,
    });
    const freshDead = await createOwnedRun(cacheRoot, {
      nonce: "4".repeat(32),
      ownerPid: DEAD_OWNER_PID,
      childPid: DEAD_CHILD_PID,
      createdAtMs: Date.now(),
    });
    const fake = makeFakeExecutor();

    try {
      const report = await Effect.runPromise(
        recoverStaleFlureeRuntimeCaches({
          cacheRoot,
          cachePolicy: { staleTtlMs: 1_000 },
        }).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(report.removedRunDirectories.map((entry) => path.basename(entry))).toEqual([
        path.basename(dead),
      ]);
      expect(report.activeRunDirectoriesPreserved).toBe(2);
      expect(await pathExists(dead)).toBe(false);
      expect(await pathExists(activeOwner)).toBe(true);
      expect(await pathExists(activeChild)).toBe(true);
      expect(await pathExists(freshDead)).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("recovers an abandoned prepared lease but preserves a live launcher lease", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    await mkdir(cacheRoot, { recursive: true });
    const old = Date.now() - 60_000;
    const abandoned = await createLeasedRun(cacheRoot, {
      nonce: "9".repeat(32),
      ownerPid: DEAD_OWNER_PID,
      childPid: null,
      createdAtMs: old,
      phase: "prepared",
      payloadBytes: 64,
    });
    const liveLauncher = await createLeasedRun(cacheRoot, {
      nonce: "e".repeat(32),
      ownerPid: DEAD_OWNER_PID,
      childPid: process.pid,
      createdAtMs: old,
      phase: "running",
    });
    const fresh = await createLeasedRun(cacheRoot, {
      nonce: "f".repeat(32),
      ownerPid: DEAD_OWNER_PID,
      childPid: null,
      createdAtMs: Date.now(),
      phase: "prepared",
    });
    const fake = makeFakeExecutor();

    try {
      const report = await Effect.runPromise(
        recoverStaleFlureeRuntimeCaches({
          cacheRoot,
          cachePolicy: { staleTtlMs: 1_000 },
        }).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(report.removedRunDirectories.map((entry) => path.basename(entry))).toEqual([
        path.basename(abandoned),
      ]);
      expect(report.activeRunDirectoriesPreserved).toBe(1);
      expect(await pathExists(abandoned)).toBe(false);
      expect(await pathExists(liveLauncher)).toBe(true);
      expect(await pathExists(fresh)).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("concurrent recovery removes stale runs without touching siblings", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    await mkdir(cacheRoot, { recursive: true });
    const staleRuns = await Promise.all(
      ["a", "b", "c", "d"].map((digit, index) =>
        createOwnedRun(cacheRoot, {
          nonce: digit.repeat(32),
          ownerPid: DEAD_OWNER_PID,
          childPid: DEAD_CHILD_PID,
          createdAtMs: Date.now() - 60_000 - index,
          payloadBytes: 32,
        })
      )
    );
    const sibling = path.join(cacheRoot, "unowned-sibling");
    await mkdir(sibling);
    const fake = makeFakeExecutor();

    try {
      const reports = await Effect.runPromise(
        Effect.all(
          [
            recoverStaleFlureeRuntimeCaches({
              cacheRoot,
              cachePolicy: { staleTtlMs: 0 },
            }),
            recoverStaleFlureeRuntimeCaches({
              cacheRoot,
              cachePolicy: { staleTtlMs: 0 },
            }),
          ],
          { concurrency: "unbounded" }
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      const removed = reports
        .flatMap((report) => report.removedRunDirectories)
        .map((entry) => path.basename(entry))
        .sort();
      expect(new Set(removed)).toEqual(new Set(staleRuns.map((entry) => path.basename(entry))));
      expect(await Promise.all(staleRuns.map(pathExists))).toEqual([false, false, false, false]);
      expect(await pathExists(sibling)).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("never deletes invalid, unowned, symlinked, sibling, or root paths", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const outside = path.join(sandbox, "outside");
    const sibling = path.join(sandbox, "sibling.txt");
    await mkdir(cacheRoot, { recursive: true });
    await mkdir(outside);
    await writeFile(path.join(outside, "sentinel.txt"), "outside");
    await writeFile(sibling, "sibling");
    const invalid = path.join(cacheRoot, `habitat-fluree-${"5".repeat(32)}-deadbeefcafe`);
    await mkdir(invalid);
    await writeFile(path.join(invalid, ".fluree-runtime-lease.json"), "{}");
    const unrelated = path.join(cacheRoot, "ordinary-directory");
    await mkdir(unrelated);
    const linked = path.join(cacheRoot, `habitat-fluree-${"6".repeat(32)}-deadbeefcafe`);
    await symlink(outside, linked, "dir");
    const fake = makeFakeExecutor();

    try {
      const report = await Effect.runPromise(
        recoverStaleFlureeRuntimeCaches({
          cacheRoot,
          cachePolicy: { staleTtlMs: 0, retainedByteCap: 0n },
        }).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(report.removedRunDirectories).toEqual([]);
      expect(report.unownedEntriesPreserved).toBe(3);
      expect(await pathExists(cacheRoot)).toBe(true);
      expect(await pathExists(invalid)).toBe(true);
      expect(await pathExists(unrelated)).toBe(true);
      expect(await pathExists(linked)).toBe(true);
      expect(await readFile(path.join(outside, "sentinel.txt"), "utf8")).toBe("outside");
      expect(await readFile(sibling, "utf8")).toBe("sibling");
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("preserves TTL-protected dead runs and reports a retained-cap breach", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    await mkdir(cacheRoot, { recursive: true });
    const oldest = await createOwnedRun(cacheRoot, {
      nonce: "7".repeat(32),
      ownerPid: DEAD_OWNER_PID,
      childPid: DEAD_CHILD_PID,
      createdAtMs: Date.now() - 2_000,
      payloadBytes: 2_048,
    });
    const newest = await createOwnedRun(cacheRoot, {
      nonce: "8".repeat(32),
      ownerPid: DEAD_OWNER_PID,
      childPid: DEAD_CHILD_PID,
      createdAtMs: Date.now() - 1_000,
      payloadBytes: 2_048,
    });
    const fake = makeFakeExecutor();

    try {
      const report = await Effect.runPromise(
        recoverStaleFlureeRuntimeCaches({
          cacheRoot,
          cachePolicy: {
            staleTtlMs: 60_000,
            retainedByteCap: 3_000n,
          },
        }).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(report.removedRunDirectories).toEqual([]);
      expect(report.retainedDeadBytes).toBeGreaterThan(3_000n);
      expect(report.retainedByteCapExceeded).toBe(true);
      expect(await pathExists(oldest)).toBe(true);
      expect(await pathExists(newest)).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("blocks recovery admission when retained owned bytes cannot be measured", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    await mkdir(cacheRoot, { recursive: true });
    const owned = await createOwnedRun(cacheRoot, {
      nonce: "a".repeat(32),
      ownerPid: DEAD_OWNER_PID,
      childPid: DEAD_CHILD_PID,
      createdAtMs: Date.now(),
      payloadBytes: 64,
    });
    await symlink(path.join(sandbox, "missing"), path.join(owned, "dangling"));
    const fake = makeFakeExecutor();

    try {
      const result = await Effect.runPromise(
        Effect.result(
          recoverStaleFlureeRuntimeCaches({
            cacheRoot,
            cachePolicy: {
              staleTtlMs: 60_000,
              retainedByteCap: 1n,
            },
          })
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      expect(result._tag).toBe("Failure");
      expect(await pathExists(owned)).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("rejects overlapping durable and scratch ownership before recovery", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    await mkdir(cacheRoot, { recursive: true });
    const stale = await createOwnedRun(cacheRoot, {
      nonce: "9".repeat(32),
      ownerPid: DEAD_OWNER_PID,
      childPid: DEAD_CHILD_PID,
      createdAtMs: Date.now() - 60_000,
      payloadBytes: 64,
    });
    const storagePath = path.join(stale, "durable");
    await mkdir(storagePath);
    const fake = makeFakeExecutor();

    try {
      const result = await Effect.runPromise(
        Effect.result(
          Effect.scoped(
            acquireFlureeProcess({
              access: "read",
              storagePath,
              cacheRoot,
              cachePolicy: { staleTtlMs: 0 },
            })
          )
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      if (result._tag !== "Failure") throw new Error("expected overlapping path failure");
      expect(result.failure).toBeInstanceOf(FlureeRuntimeConfigurationError);
      expect(await pathExists(stale)).toBe(true);
      expect(serverCommands(fake)).toHaveLength(0);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("rejects non-bigint byte caps at the JavaScript boundary", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const fake = makeFakeExecutor();

    try {
      const result = await Effect.runPromise(
        Effect.result(
          Effect.scoped(
            acquireFlureeProcess({
              access: "read",
              storagePath: path.join(sandbox, "storage"),
              cacheRoot,
              cachePolicy: {
                // @ts-expect-error This test exercises untyped JavaScript callers.
                perRunByteCap: Number.NaN,
                // @ts-expect-error This test exercises untyped JavaScript callers.
                retainedByteCap: Number.POSITIVE_INFINITY,
              },
            })
          )
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      if (result._tag !== "Failure") throw new Error("expected invalid byte-cap failure");
      expect(result.failure).toBeInstanceOf(FlureeRuntimeConfigurationError);
      expect(serverCommands(fake)).toHaveLength(0);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("rejects a mismatched Fluree executable before starting the server", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const fake = makeFakeExecutor({ versionOutput: "fluree 4.2.0" });

    try {
      const result = await Effect.runPromise(
        Effect.result(Effect.scoped(acquireFlureeProcess(processOptions(sandbox, cacheRoot)))).pipe(
          Effect.provide(platformLayer(fake))
        )
      );

      if (result._tag !== "Failure") throw new Error("expected version mismatch");
      expect(result.failure).toBeInstanceOf(FlureeProcessVersionMismatch);
      expect(fake.commands).toHaveLength(1);
      expect(serverCommands(fake)).toHaveLength(0);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("rejects an invalid operation access before launch", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const fake = makeFakeExecutor();

    try {
      const result = await Effect.runPromise(
        Effect.result(
          Effect.scoped(
            acquireFlureeProcess({
              ...processOptions(sandbox, cacheRoot),
              access: "watch" as never,
            })
          )
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      if (result._tag !== "Failure") throw new Error("expected invalid indexing mode");
      expect(result.failure).toBeInstanceOf(FlureeRuntimeConfigurationError);
      expect(serverCommands(fake)).toHaveLength(0);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("rejects version output that only contains the supported version as a substring", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const fake = makeFakeExecutor({ versionOutput: "fluree 4.1.4-beta" });

    try {
      const result = await Effect.runPromise(
        Effect.result(Effect.scoped(acquireFlureeProcess(processOptions(sandbox, cacheRoot)))).pipe(
          Effect.provide(platformLayer(fake))
        )
      );

      if (result._tag !== "Failure") throw new Error("expected version mismatch");
      expect(result.failure).toBeInstanceOf(FlureeProcessVersionMismatch);
      expect(serverCommands(fake)).toHaveLength(0);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("stops the exact owned child when the live per-run byte cap is crossed", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const fake = makeFakeExecutor();
    let runDirectory = "";

    try {
      const result = await Effect.runPromise(
        Effect.result(
          Effect.scoped(
            Effect.gen(function* () {
              const runtime = yield* acquireFlureeProcess(
                processOptions(sandbox, cacheRoot, {
                  cachePolicy: {
                    perRunByteCap: 1_024n,
                    monitorIntervalMs: 5,
                  },
                })
              );
              runDirectory = runtime.runDirectory;
              yield* Effect.promise(() =>
                writeFile(path.join(runtime.runDirectory, "large.bin"), Buffer.alloc(8_192))
              );
              return yield* runtime.wait;
            })
          )
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      if (result._tag !== "Failure") throw new Error("expected live byte cap failure");
      expect(result.failure).toBeInstanceOf(FlureeRuntimeRunByteCapExceeded);
      expect(fake.kills).toEqual([{ pid: 600_001, signal: "SIGTERM" }]);
      expect(await pathExists(runDirectory)).toBe(false);
      expect(await pathExists(cacheRoot)).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("fails closed and stops the child when live cache measurement fails", async () => {
    const sandbox = await makeSandbox();
    const cacheRoot = path.join(sandbox, "cache");
    const fake = makeFakeExecutor();

    try {
      const result = await Effect.runPromise(
        Effect.result(
          Effect.scoped(
            Effect.gen(function* () {
              const runtime = yield* acquireFlureeProcess(
                processOptions(sandbox, cacheRoot, {
                  cachePolicy: { monitorIntervalMs: 5 },
                })
              );
              yield* Effect.promise(() =>
                rm(runtime.runDirectory, { recursive: true, force: true })
              );
              return yield* runtime.wait;
            })
          )
        ).pipe(Effect.provide(platformLayer(fake)))
      );

      if (result._tag !== "Failure") throw new Error("expected measurement failure");
      expect(result.failure).toBeInstanceOf(FlureeRuntimeCacheMeasurementFailed);
      expect(fake.kills).toEqual([{ pid: 600_001, signal: "SIGTERM" }]);
      expect(await pathExists(cacheRoot)).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });
});
