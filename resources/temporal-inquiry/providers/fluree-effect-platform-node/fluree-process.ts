import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import nodeProcess from "node:process";
import { NodeServices } from "@effect/platform-node";
import {
  Clock,
  Context,
  Data,
  Deferred,
  Effect,
  Exit,
  FileSystem,
  Layer,
  Option,
  Path,
  type PlatformError,
  Scope,
} from "effect";
import { ChildProcess } from "effect/unstable/process";
import {
  type ChildProcessHandle,
  ChildProcessSpawner,
  type ExitCode,
} from "effect/unstable/process/ChildProcessSpawner";

import { SUPPORTED_FLUREE_VERSION } from "./definition";

const RUN_DIRECTORY_PREFIX = "habitat-fluree-";
const LEASE_FILE_NAME = ".fluree-runtime-lease.json";
const STORAGE_LOCK_DIRECTORY_SUFFIX = ".habitat-fluree-runtime-lock";
const PORT_LOCK_ROOT_DIRECTORY_PREFIX = "habitat-fluree-port-locks-";
const PORT_LOCK_DIRECTORY_SUFFIX = ".lock";
const EXCLUSIVITY_LOCK_FILE_NAME = "owner.json";
const RECOVERED_LOCK_FILE_NAME = "recovered.json";
const RECOVERED_LOCK_MARKER = ".recovered-";
const MAX_RECOVERED_LOCKS_PER_TARGET = 8;
const MIN_RECOVERED_LOCK_TTL_MS = 60_000;
const LAUNCHER_FILE_NAME = "launch-fluree.sh";
const RUNTIME_LOG_FILE_NAME = "fluree.log";
const NORMAL_SHUTDOWN_FILE_NAME = "normal-shutdown";
const LEASE_SCHEMA = "habitat.fluree-runtime-lease/v1";
const EXCLUSIVITY_LOCK_SCHEMA = "habitat.fluree-exclusivity-lock/v1";
const RECOVERED_LOCK_SCHEMA = "habitat.fluree-recovered-lock/v1";
const FLUREE_CACHE_DIRECTORY_NAME = "fluree_binary_cache";
const OWNERSHIP_HANDSHAKE_TIMEOUT_MS = 5_000;
// FlureeDB 4.1.4 emits this only after TcpListener::bind succeeds.
const FLUREE_LISTENER_BOUND_MARKER = "Fluree server starting";
const SHARED_PORT_LOCK_PARENT_DIRECTORY = "/tmp";
const NONCE_PATTERN = /^[0-9a-f]{32}$/u;
const POSIX_LAUNCHER = `#!/bin/sh
set -eu
umask 077

# NodeChildProcessSpawner launches this script as a detached process-group leader.
# The watchdog stays in that group, keeping its ID reserved until escalation
# finishes so a recycled process ID can never receive either signal.
runtime_pgid=$(/bin/ps -o pgid= -p "$$" | /usr/bin/tr -d '[:space:]')
if [ "$runtime_pgid" != "$$" ]; then
  printf 'Habitat Fluree launcher requires an isolated process group\\n' >&2
  exit 70
fi

lease_tmp="\${HABITAT_RUNTIME_LEASE_PATH}.tmp.$$"
printf '{"schema":"%s","phase":"running","ownerPid":%s,"childPid":%s,"nonce":"%s","createdAtMs":%s,"runDirectoryName":"%s"}\\n' \
  "$HABITAT_RUNTIME_LEASE_SCHEMA" "$HABITAT_RUNTIME_OWNER_PID" "$$" \
  "$HABITAT_RUNTIME_NONCE" "$HABITAT_RUNTIME_CREATED_AT_MS" \
  "$HABITAT_RUNTIME_RUN_DIRECTORY_NAME" > "$lease_tmp"
mv "$lease_tmp" "$HABITAT_RUNTIME_LEASE_PATH"

storage_lock_tmp="\${HABITAT_RUNTIME_STORAGE_LOCK_PATH}.tmp.$$"
printf '{"schema":"%s","phase":"running","ownerPid":%s,"childPid":%s,"nonce":"%s","createdAtMs":%s,"resourceKind":"storage","resourceKey":%s}\\n' \
  "$HABITAT_RUNTIME_EXCLUSIVITY_LOCK_SCHEMA" "$HABITAT_RUNTIME_OWNER_PID" "$$" \
  "$HABITAT_RUNTIME_NONCE" "$HABITAT_RUNTIME_STORAGE_LOCK_CREATED_AT_MS" \
  "$HABITAT_RUNTIME_STORAGE_KEY_JSON" > "$storage_lock_tmp"
mv "$storage_lock_tmp" "$HABITAT_RUNTIME_STORAGE_LOCK_PATH"

port_lock_tmp="\${HABITAT_RUNTIME_PORT_LOCK_PATH}.tmp.$$"
printf '{"schema":"%s","phase":"running","ownerPid":%s,"childPid":%s,"nonce":"%s","createdAtMs":%s,"resourceKind":"port","resourceKey":%s}\\n' \
  "$HABITAT_RUNTIME_EXCLUSIVITY_LOCK_SCHEMA" "$HABITAT_RUNTIME_OWNER_PID" "$$" \
  "$HABITAT_RUNTIME_NONCE" "$HABITAT_RUNTIME_PORT_LOCK_CREATED_AT_MS" \
  "$HABITAT_RUNTIME_PORT_KEY_JSON" > "$port_lock_tmp"
mv "$port_lock_tmp" "$HABITAT_RUNTIME_PORT_LOCK_PATH"

# FD 3 is the Habitat owner's stdin pipe. EOF means the owner crashed, so the
# exact exec-preserved PID receives TERM even when Effect finalizers cannot run.
target_pid=$$
exec 3<&0
/bin/sh -c '
  target_pid=$1
  grace_ms=$2
  shutdown_path=$3
  trap "" TERM INT HUP
  while IFS= read -r _line <&3; do :; done
  /bin/kill -TERM -- "-$target_pid" 2>/dev/null || exit 0
  if [ -f "$shutdown_path" ]; then
    /bin/kill -KILL -- "-$target_pid" 2>/dev/null || true
    exit 0
  fi

  grace_seconds=$(( (grace_ms + 999) / 1000 ))
  while [ "$grace_seconds" -gt 0 ]; do
    if [ -f "$shutdown_path" ]; then
      /bin/kill -KILL -- "-$target_pid" 2>/dev/null || true
      exit 0
    fi
    sleep 1
    grace_seconds=$((grace_seconds - 1))
  done

  /bin/kill -KILL -- "-$target_pid" 2>/dev/null || true
' habitat-fluree-watchdog "$target_pid" "$HABITAT_RUNTIME_SHUTDOWN_GRACE_MS" \
  "$HABITAT_RUNTIME_SHUTDOWN_PATH" &
exec 3<&-
exec "$@" </dev/null >> "$HABITAT_RUNTIME_LOG_PATH" 2>&1
`;

export interface FlureeRuntimeCachePolicy {
  /** Dead owned runs younger than this are preserved. */
  readonly staleTtlMs: number;
  /** A live child is stopped when its isolated run directory grows beyond this size. */
  readonly perRunByteCap: bigint;
  /** New launches fail while TTL-protected dead scratch exceeds this size. */
  readonly retainedByteCap: bigint;
  /** Sampling interval for the live per-run cap. */
  readonly monitorIntervalMs: number;
  /** Grace period after SIGTERM before finalization escalates to SIGKILL. */
  readonly shutdownGraceMs: number;
  /** Bound applied to each explicit forced-stop wait before cleanup continues. */
  readonly hardStopTimeoutMs: number;
}

export const DEFAULT_FLUREE_RUNTIME_CACHE_POLICY: FlureeRuntimeCachePolicy = Object.freeze({
  staleTtlMs: 24 * 60 * 60 * 1_000,
  perRunByteCap: 4n * 1_024n * 1_024n * 1_024n,
  retainedByteCap: 8n * 1_024n * 1_024n * 1_024n,
  monitorIntervalMs: 10_000,
  shutdownGraceMs: 20_000,
  hardStopTimeoutMs: 5_000,
});

export interface FlureeRuntimeOptions {
  readonly cacheRoot?: string;
  readonly cachePolicy?: Partial<FlureeRuntimeCachePolicy>;
}

export interface RecoverFlureeRuntimeCachesOptions extends FlureeRuntimeOptions {}

export type FlureeProcessAccess = "read" | "write";

export interface FlureeProcessOptions extends FlureeRuntimeOptions {
  /** Low-level runtime posture; temporal-inquiry sessions always select `write`. */
  readonly access: FlureeProcessAccess;
  readonly storagePath: string;
  readonly executable?: string;
  readonly port?: number;
  /** Cancels this exact owned process scope and runs its Effect finalizers. */
  readonly signal?: AbortSignal;
}

export class FlureeRuntimeConfigurationError extends Data.TaggedError(
  "FlureeRuntimeConfigurationError"
)<{
  readonly message: string;
}> {}

export class FlureeRuntimeRetainedByteCapExceeded extends Data.TaggedError(
  "FlureeRuntimeRetainedByteCapExceeded"
)<{
  readonly cacheRoot: string;
  readonly retainedBytes: bigint;
  readonly byteCap: bigint;
}> {}

export class FlureeRuntimeRunByteCapExceeded extends Data.TaggedError(
  "FlureeRuntimeRunByteCapExceeded"
)<{
  readonly runDirectory: string;
  readonly observedBytes: bigint;
  readonly byteCap: bigint;
  readonly message: string;
}> {}

export class FlureeRuntimeCacheMeasurementFailed extends Data.TaggedError(
  "FlureeRuntimeCacheMeasurementFailed"
)<{
  readonly runDirectory: string;
  readonly cause: string;
}> {}

export class FlureeRuntimeOwnershipHandshakeFailed extends Data.TaggedError(
  "FlureeRuntimeOwnershipHandshakeFailed"
)<{
  readonly runDirectory: string;
  readonly message: string;
}> {}

export class FlureeRuntimeStorageLocked extends Data.TaggedError("FlureeRuntimeStorageLocked")<{
  readonly storagePath: string;
  readonly lockDirectory: string;
  readonly message: string;
}> {}

export class FlureeRuntimePortLocked extends Data.TaggedError("FlureeRuntimePortLocked")<{
  readonly endpoint: string;
  readonly lockDirectory: string;
  readonly message: string;
}> {}

export class FlureeProcessExitedUnexpectedly extends Data.TaggedError(
  "FlureeProcessExitedUnexpectedly"
)<{
  readonly endpoint: string;
  readonly storagePath: string;
  readonly exitCode: number;
  readonly message: string;
}> {}

export class FlureeProcessVersionMismatch extends Data.TaggedError("FlureeProcessVersionMismatch")<{
  readonly executable: string;
  readonly expectedVersion: typeof SUPPORTED_FLUREE_VERSION;
  readonly observedVersion: string;
}> {}

export type FlureeRuntimeError =
  | FlureeRuntimeConfigurationError
  | FlureeRuntimeRetainedByteCapExceeded
  | FlureeRuntimeRunByteCapExceeded
  | FlureeRuntimeCacheMeasurementFailed
  | FlureeRuntimeOwnershipHandshakeFailed
  | FlureeRuntimeStorageLocked
  | FlureeRuntimePortLocked
  | FlureeProcessExitedUnexpectedly
  | FlureeProcessVersionMismatch;

export interface FlureeRuntimeOwner {
  readonly ownerPid: number;
  readonly childPid: number;
  readonly nonce: string;
  readonly createdAtMs: number;
}

export interface FlureeProcess {
  readonly access: FlureeProcessAccess;
  readonly runDirectory: string;
  readonly cacheDirectory: string;
  readonly endpoint: string;
  readonly storagePath: string;
  readonly owner: FlureeRuntimeOwner;
  readonly process: ChildProcessHandle;
  readonly version: typeof SUPPORTED_FLUREE_VERSION;
  readonly wait: Effect.Effect<
    ExitCode,
    | PlatformError.PlatformError
    | FlureeRuntimeRunByteCapExceeded
    | FlureeRuntimeCacheMeasurementFailed
  >;
}

/** Promise-facing view that does not expose Habitat's Effect runtime identity. */
export interface FlureeProcessHandle {
  readonly access: FlureeProcessAccess;
  readonly runDirectory: string;
  readonly cacheDirectory: string;
  readonly endpoint: string;
  readonly storagePath: string;
  readonly owner: FlureeRuntimeOwner;
  readonly signal: AbortSignal;
  readonly version: typeof SUPPORTED_FLUREE_VERSION;
}

export class FlureeProcessService extends Context.Service<FlureeProcessService, FlureeProcess>()(
  "@habitat/resource-temporal-inquiry/providers/fluree-effect-platform-node/FlureeProcess"
) {}

/** Opt-in scoped layer; it is intentionally not part of HabitatRuntimeLive. */
export function makeFlureeProcessLayer(options: FlureeProcessOptions) {
  return Layer.effect(FlureeProcessService, acquireFlureeProcess(options));
}

function runPromiseWithOwnedSignal<Result, Failure>(
  program: Effect.Effect<Result, Failure, never>,
  signal: AbortSignal | undefined
): Promise<Result> {
  if (signal === undefined) return Effect.runPromise(program);
  // Effect 3.21.3 retains its listener on a supplied AbortSignal. Isolate that
  // implementation detail from a caller that reuses one long-lived signal.
  const ownedController = new AbortController();
  const forwardAbort = () => ownedController.abort(signal.reason);
  if (signal.aborted) {
    forwardAbort();
  } else {
    signal.addEventListener("abort", forwardAbort, { once: true });
  }
  return Effect.runPromise(program, { signal: ownedController.signal }).finally(() => {
    signal.removeEventListener("abort", forwardAbort);
  });
}

/**
 * Run Promise-based consumer work inside one package-owned Fluree scope.
 *
 * This is the ordinary cross-version package boundary. Consumers receive only
 * endpoint and ownership facts; Habitat's Effect, platform, process, and scope
 * identities remain internal. Application health remains `FlureeClient`'s job.
 */
export function withFlureeProcess<Result>(
  options: FlureeProcessOptions,
  use: (process: FlureeProcessHandle) => Promise<Result>
): Promise<Result> {
  const program = Effect.scoped(
    Effect.flatMap(acquireFlureeProcess(options), (process) => {
      const consumer = Effect.tryPromise({
        try: (signal) =>
          use({
            access: process.access,
            runDirectory: process.runDirectory,
            cacheDirectory: process.cacheDirectory,
            endpoint: process.endpoint,
            storagePath: process.storagePath,
            owner: process.owner,
            signal,
            version: process.version,
          }),
        catch: (cause) => cause,
      });
      const runtimeFailure = process.wait.pipe(
        Effect.flatMap((exitCode) =>
          Effect.fail(
            new FlureeProcessExitedUnexpectedly({
              endpoint: process.endpoint,
              storagePath: process.storagePath,
              exitCode: Number(exitCode),
              message: `owned Fluree process exited with code ${String(Number(exitCode))}`,
            })
          )
        )
      );
      return Effect.raceFirst(consumer, runtimeFailure);
    })
  ).pipe(Effect.provide(NodeServices.layer));
  return runPromiseWithOwnedSignal(program, options.signal);
}

export interface FlureeRuntimeCacheRecoveryReport {
  readonly cacheRoot: string;
  readonly removedRunDirectories: readonly string[];
  readonly removedBytes: bigint;
  readonly retainedDeadBytes: bigint;
  readonly retainedByteCapExceeded: boolean;
  readonly activeRunDirectoriesPreserved: number;
  readonly unownedEntriesPreserved: number;
}

interface RuntimeLeaseBase {
  readonly schema: typeof LEASE_SCHEMA;
  readonly ownerPid: number;
  readonly nonce: string;
  readonly createdAtMs: number;
  readonly runDirectoryName: string;
}

interface PreparedRuntimeLease extends RuntimeLeaseBase {
  readonly phase: "prepared";
  readonly childPid: null;
}

interface RunningRuntimeLease extends RuntimeLeaseBase {
  readonly phase: "running";
  readonly childPid: number;
}

type RuntimeLease = PreparedRuntimeLease | RunningRuntimeLease;

interface OwnedRunDirectory {
  readonly path: string;
  readonly lease: RuntimeLease;
}

interface ResolvedRuntimeOptions {
  readonly cacheRoot: string;
  readonly cachePolicy: FlureeRuntimeCachePolicy;
}

interface FlureeServerCommand {
  readonly access: FlureeProcessAccess;
  readonly executable: string;
  readonly storagePath: string;
  readonly port: number;
}

interface PreparedRuntimeDirectory {
  readonly runDirectory: string;
  readonly lease: PreparedRuntimeLease;
}

type ExclusivityResourceKind = "storage" | "port";

interface ExclusivityLockTarget {
  readonly resourceKind: ExclusivityResourceKind;
  readonly resourceKey: string;
  readonly lockDirectory: string;
}

interface ExclusivityLockBase {
  readonly schema: typeof EXCLUSIVITY_LOCK_SCHEMA;
  readonly ownerPid: number;
  readonly nonce: string;
  readonly createdAtMs: number;
  readonly resourceKind: ExclusivityResourceKind;
  readonly resourceKey: string;
}

interface PreparedExclusivityLock extends ExclusivityLockBase {
  readonly phase: "prepared";
  readonly childPid: null;
}

interface RunningExclusivityLock extends ExclusivityLockBase {
  readonly phase: "running";
  readonly childPid: number;
}

type ExclusivityLockLease = PreparedExclusivityLock | RunningExclusivityLock;

interface OwnedExclusivityLock extends ExclusivityLockTarget {
  readonly metadataPath: string;
  readonly lease: ExclusivityLockLease;
}

interface RecoveredLockMarker {
  readonly schema: typeof RECOVERED_LOCK_SCHEMA;
  readonly recoveredAtMs: number;
  readonly nonce: string;
  readonly resourceKind: ExclusivityResourceKind;
  readonly resourceKey: string;
}

interface OwnedRecoveredLock extends OwnedExclusivityLock {
  readonly markerPath: string;
  readonly marker: RecoveredLockMarker;
}

type FlureeRuntimeLiveFailure =
  | FlureeRuntimeRunByteCapExceeded
  | FlureeRuntimeCacheMeasurementFailed;

const emptyRecoveryReport = (cacheRoot: string): FlureeRuntimeCacheRecoveryReport => ({
  cacheRoot,
  removedRunDirectories: [],
  removedBytes: 0n,
  retainedDeadBytes: 0n,
  retainedByteCapExceeded: false,
  activeRunDirectoriesPreserved: 0,
  unownedEntriesPreserved: 0,
});

/**
 * Validate and start the exact supported Fluree server in an isolated cache environment.
 *
 * The returned handle is owned by the surrounding Effect scope. Closing that
 * scope stops the exact process handle and removes only this run directory.
 */
export const acquireFlureeProcess = Effect.fn("habitat.acquireFlureeProcess")(function* (
  options: FlureeProcessOptions
) {
  if (nodeProcess.platform !== "darwin" && nodeProcess.platform !== "linux") {
    return yield* new FlureeRuntimeConfigurationError({
      message: `local Fluree process ownership is unsupported on '${nodeProcess.platform}'`,
    });
  }
  if (options.storagePath.trim().length === 0) {
    return yield* new FlureeRuntimeConfigurationError({
      message: "storagePath must not be empty",
    });
  }
  if (options.access !== "read" && options.access !== "write") {
    return yield* new FlureeRuntimeConfigurationError({
      message: "access must be either 'read' or 'write'",
    });
  }
  const port = options.port ?? 8_091;
  if (!isPositiveSafeInteger(port) || port > 65_535) {
    return yield* new FlureeRuntimeConfigurationError({
      message: "port must be an integer from 1 through 65535",
    });
  }
  const resolved = yield* resolveRuntimeOptions(options);
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const commandExecutor = yield* ChildProcessSpawner;
  const executable = options.executable ?? "fluree";
  const observedVersion = yield* commandExecutor.string(
    ChildProcess.make(executable, ["--version"])
  );
  if (!containsExactFlureeVersion(observedVersion)) {
    return yield* new FlureeProcessVersionMismatch({
      executable,
      expectedVersion: SUPPORTED_FLUREE_VERSION,
      observedVersion: observedVersion.trim(),
    });
  }
  const requestedStoragePath = path.resolve(options.storagePath);
  yield* fileSystem.makeDirectory(requestedStoragePath, { recursive: true });
  const storagePath = yield* canonicalDirectory(fileSystem, requestedStoragePath);
  const cacheRoot = yield* ensureCacheRoot(fileSystem, path, resolved.cacheRoot);
  if (pathsOverlap(path, storagePath, cacheRoot)) {
    return yield* new FlureeRuntimeConfigurationError({
      message: `storagePath '${storagePath}' and cacheRoot '${cacheRoot}' must be disjoint`,
    });
  }
  const recovery = yield* recoverAtRoot(fileSystem, path, cacheRoot, resolved.cachePolicy);
  if (recovery.retainedByteCapExceeded) {
    return yield* new FlureeRuntimeRetainedByteCapExceeded({
      cacheRoot,
      retainedBytes: recovery.retainedDeadBytes,
      byteCap: resolved.cachePolicy.retainedByteCap,
    });
  }
  const portLockRoot = yield* ensurePortLockRoot(fileSystem, path);
  if (pathsOverlap(path, storagePath, portLockRoot)) {
    return yield* new FlureeRuntimeConfigurationError({
      message: `storagePath '${storagePath}' and port lock root '${portLockRoot}' must be disjoint`,
    });
  }

  return yield* acquireInManagedInnerScope(
    makeRuntimeResource(
      fileSystem,
      path,
      commandExecutor,
      {
        access: options.access,
        executable,
        storagePath,
        port,
      },
      cacheRoot,
      portLockRoot,
      resolved.cachePolicy,
      storagePath,
      `http://127.0.0.1:${port}`
    )
  );
});

/**
 * Remove only validated owned directories whose owner and child are both dead
 * and whose ownership timestamp is at least the configured TTL old.
 */
export const recoverStaleFlureeRuntimeCaches = Effect.fn(
  "temporalInquiry.recoverStaleFlureeRuntimeCaches"
)(function* (options: RecoverFlureeRuntimeCachesOptions = {}) {
  const resolved = yield* resolveRuntimeOptions(options);
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const requestedRoot = path.resolve(resolved.cacheRoot);
  if (!(yield* fileSystem.exists(requestedRoot))) {
    return emptyRecoveryReport(requestedRoot);
  }
  const cacheRoot = yield* canonicalDirectory(fileSystem, requestedRoot);
  return yield* recoverAtRoot(fileSystem, path, cacheRoot, resolved.cachePolicy);
});

function acquireInManagedInnerScope<A, E, R>(
  resource: Effect.Effect<A, E, R | Scope.Scope>
): Effect.Effect<A, E, R | Scope.Scope> {
  return Effect.uninterruptibleMask((restore) =>
    Effect.gen(function* () {
      const innerScope = yield* Scope.make();
      const value = yield* restore(Scope.provide(innerScope)(resource)).pipe(
        Effect.onExit((exit) =>
          Exit.isFailure(exit) ? Scope.close(innerScope, exit) : Effect.void
        )
      );
      yield* Effect.addFinalizer((exit) => Scope.close(innerScope, exit));
      return value;
    })
  );
}

function makeRuntimeResource(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  commandExecutor: ChildProcessSpawner["Service"],
  server: FlureeServerCommand,
  cacheRoot: string,
  portLockRoot: string,
  policy: FlureeRuntimeCachePolicy,
  storagePath: string,
  endpoint: string
): Effect.Effect<
  FlureeProcess,
  | PlatformError.PlatformError
  | FlureeRuntimeOwnershipHandshakeFailed
  | FlureeRuntimeStorageLocked
  | FlureeRuntimePortLocked,
  Scope.Scope
> {
  return Effect.gen(function* () {
    const nonce = randomUUID().replaceAll("-", "");
    const portLock = yield* Effect.acquireRelease(
      acquireExclusivityLock(
        fileSystem,
        path,
        portLockTarget(path, portLockRoot, server.port),
        nonce,
        policy.staleTtlMs
      ),
      (owned) =>
        releaseExclusivityLock(fileSystem, path, owned, policy.hardStopTimeoutMs + 2_000).pipe(
          Effect.ignore
        )
    );
    const storageLock = yield* Effect.acquireRelease(
      acquireExclusivityLock(
        fileSystem,
        path,
        storageLockTarget(storagePath),
        nonce,
        policy.staleTtlMs
      ),
      (owned) =>
        releaseExclusivityLock(fileSystem, path, owned, policy.hardStopTimeoutMs + 2_000).pipe(
          Effect.ignore
        )
    );
    const prepared = yield* Effect.acquireRelease(
      prepareRuntimeDirectory(fileSystem, path, cacheRoot, nonce),
      ({ lease, runDirectory }) =>
        cleanupRuntimeDirectory(
          fileSystem,
          path,
          cacheRoot,
          runDirectory,
          nonce,
          lease,
          policy.hardStopTimeoutMs + 2_000
        ).pipe(Effect.ignore)
    );
    const { lease, runDirectory } = prepared;
    const { createdAtMs } = lease;
    const runDirectoryName = path.basename(runDirectory);

    const controlDirectory = path.join(runDirectory, "control");
    const configPath = path.join(controlDirectory, "config.toml");
    const launcherPath = path.join(controlDirectory, LAUNCHER_FILE_NAME);
    const runtimeLogPath = path.join(controlDirectory, RUNTIME_LOG_FILE_NAME);
    const normalShutdownPath = path.join(controlDirectory, NORMAL_SHUTDOWN_FILE_NAME);
    yield* fileSystem.makeDirectory(controlDirectory);
    yield* fileSystem.writeFileString(configPath, "", {
      flag: "wx",
      mode: 0o600,
    });
    yield* fileSystem.writeFileString(runtimeLogPath, "", {
      flag: "wx",
      mode: 0o600,
    });
    yield* fileSystem.writeFileString(launcherPath, POSIX_LAUNCHER, {
      flag: "wx",
      mode: 0o700,
    });
    const isolatedCommand = ChildProcess.make(
      "/bin/sh",
      [
        launcherPath,
        server.executable,
        "--config",
        configPath,
        "server",
        "run",
        "--storage-path",
        server.storagePath,
        "--listen-addr",
        `127.0.0.1:${server.port}`,
        "--log-level",
        "info",
      ],
      {
        extendEnv: true,
        env: {
          FLUREE_INDEXING_ENABLED: server.access === "write" ? "true" : "false",
          ...(server.access === "write" ? { FLUREE_REINDEX_MIN_BYTES: "100" } : {}),
          FLUREE_QUERY_REFRESH_ENABLED: "true",
          FLUREE_QUERY_REFRESH_TTL_MS: "0",
          NO_COLOR: "1",
          RUST_LOG: "warn,fluree_db_server=info",
          HABITAT_RUNTIME_CREATED_AT_MS: String(createdAtMs),
          HABITAT_RUNTIME_LEASE_PATH: path.join(runDirectory, LEASE_FILE_NAME),
          HABITAT_RUNTIME_LEASE_SCHEMA: LEASE_SCHEMA,
          HABITAT_RUNTIME_LOG_PATH: runtimeLogPath,
          HABITAT_RUNTIME_NONCE: nonce,
          HABITAT_RUNTIME_OWNER_PID: String(nodeProcess.pid),
          HABITAT_RUNTIME_EXCLUSIVITY_LOCK_SCHEMA: EXCLUSIVITY_LOCK_SCHEMA,
          HABITAT_RUNTIME_PORT_KEY_JSON: JSON.stringify(portLock.resourceKey),
          HABITAT_RUNTIME_PORT_LOCK_CREATED_AT_MS: String(portLock.lease.createdAtMs),
          HABITAT_RUNTIME_PORT_LOCK_PATH: portLock.metadataPath,
          HABITAT_RUNTIME_RUN_DIRECTORY_NAME: runDirectoryName,
          HABITAT_RUNTIME_SHUTDOWN_GRACE_MS: String(policy.shutdownGraceMs),
          HABITAT_RUNTIME_SHUTDOWN_PATH: normalShutdownPath,
          HABITAT_RUNTIME_STORAGE_LOCK_CREATED_AT_MS: String(storageLock.lease.createdAtMs),
          HABITAT_RUNTIME_STORAGE_LOCK_PATH: storageLock.metadataPath,
          HABITAT_RUNTIME_STORAGE_KEY_JSON: JSON.stringify(storageLock.resourceKey),
          TMPDIR: runDirectory,
          TMP: runDirectory,
          TEMP: runDirectory,
        },
        stdin: "pipe",
        stderr: "inherit",
        stdout: "inherit",
      }
    );
    const child = yield* commandExecutor.spawn(isolatedCommand);
    yield* Effect.addFinalizer(() =>
      finalizeProcess(fileSystem, child, policy, normalShutdownPath)
    );

    const metadata = yield* awaitRuntimeOwnership(
      fileSystem,
      path,
      cacheRoot,
      runDirectoryName,
      Number(child.pid),
      child
    );
    yield* awaitExclusivityOwnership(fileSystem, path, portLock, Number(child.pid), child);
    yield* awaitExclusivityOwnership(fileSystem, path, storageLock, Number(child.pid), child);
    yield* awaitRuntimeListenerOwnership(fileSystem, runtimeLogPath, runDirectory, child);

    const byteCapFailure = yield* Deferred.make<never, FlureeRuntimeLiveFailure>();
    yield* monitorRunDirectory(
      fileSystem,
      path,
      child,
      runDirectory,
      normalShutdownPath,
      policy,
      byteCapFailure
    ).pipe(Effect.ignore, Effect.forkScoped);

    return {
      access: server.access,
      runDirectory,
      cacheDirectory: path.join(runDirectory, FLUREE_CACHE_DIRECTORY_NAME),
      endpoint,
      storagePath,
      owner: Object.freeze({
        ownerPid: metadata.ownerPid,
        childPid: metadata.childPid,
        nonce: metadata.nonce,
        createdAtMs: metadata.createdAtMs,
      }),
      process: child,
      version: SUPPORTED_FLUREE_VERSION,
      wait: Effect.raceFirst(child.exitCode, Deferred.await(byteCapFailure)).pipe(
        Effect.flatMap((exitCode) =>
          Deferred.poll(byteCapFailure).pipe(
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.succeed(exitCode),
                onSome: (failure) => failure,
              })
            )
          )
        )
      ),
    };
  });
}

function acquireExclusivityLock(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  target: ExclusivityLockTarget,
  nonce: string,
  staleTtlMs: number
): Effect.Effect<
  OwnedExclusivityLock,
  PlatformError.PlatformError | FlureeRuntimeStorageLocked | FlureeRuntimePortLocked
> {
  return Effect.uninterruptible(
    Effect.gen(function* () {
      yield* cleanupRecoveredExclusivityLocks(fileSystem, path, target, staleTtlMs);
      const { lockDirectory } = target;
      const metadataPath = path.join(lockDirectory, EXCLUSIVITY_LOCK_FILE_NAME);
      const createdAtMs = yield* Clock.currentTimeMillis;
      const lease: PreparedExclusivityLock = {
        schema: EXCLUSIVITY_LOCK_SCHEMA,
        phase: "prepared",
        ownerPid: nodeProcess.pid,
        childPid: null,
        nonce,
        createdAtMs,
        resourceKind: target.resourceKind,
        resourceKey: target.resourceKey,
      };

      const claim = yield* Effect.result(fileSystem.makeDirectory(lockDirectory, { mode: 0o700 }));
      if (claim._tag === "Failure") {
        if (!isPlatformAlreadyExists(claim.failure)) return yield* claim.failure;
        const current = yield* inspectOwnedExclusivityLock(fileSystem, path, target);
        if (current === undefined) {
          return yield* exclusivityLocked(
            target,
            "the atomic lock exists without valid exact ownership metadata"
          );
        }
        if (exclusivityLockIsAlive(current.lease)) {
          return yield* exclusivityLocked(
            target,
            `the ${target.resourceKind} is already owned by a live operation`
          );
        }

        const retainedTombstones = yield* recoveredExclusivityLockDirectories(
          fileSystem,
          path,
          target
        );
        if (retainedTombstones.length >= MAX_RECOVERED_LOCKS_PER_TARGET) {
          return yield* exclusivityLocked(
            target,
            `dead-owner recovery retained ${String(
              retainedTombstones.length
            )} protected tombstones and reached its fail-closed cap`
          );
        }

        const recoveryCandidate = yield* inspectOwnedExclusivityLock(fileSystem, path, target);
        if (
          recoveryCandidate === undefined ||
          !exclusivityLockIdentityEqual(recoveryCandidate.lease, current.lease) ||
          exclusivityLockIsAlive(recoveryCandidate.lease)
        ) {
          return yield* exclusivityLocked(
            target,
            `ownership changed while recovering a dead ${target.resourceKind} lock`
          );
        }

        const recoveredDirectory = recoveredLockDirectory(target, current.lease.nonce);
        const recovered = yield* Effect.result(
          fileSystem.rename(lockDirectory, recoveredDirectory)
        );
        if (recovered._tag === "Failure") {
          return yield* exclusivityLocked(target, "another operation won dead-owner recovery");
        }
        const recoveredAtMs = yield* Clock.currentTimeMillis;
        yield* fileSystem.writeFileString(
          path.join(recoveredDirectory, RECOVERED_LOCK_FILE_NAME),
          JSON.stringify({
            schema: RECOVERED_LOCK_SCHEMA,
            recoveredAtMs,
            nonce: current.lease.nonce,
            resourceKind: target.resourceKind,
            resourceKey: target.resourceKey,
          } satisfies RecoveredLockMarker),
          { flag: "wx", mode: 0o600 }
        );

        const reclaimed = yield* Effect.result(
          fileSystem.makeDirectory(lockDirectory, { mode: 0o700 })
        );
        if (reclaimed._tag === "Failure") {
          return yield* exclusivityLocked(
            target,
            `another operation acquired the ${target.resourceKind} after dead-owner recovery`
          );
        }
      }

      yield* fileSystem
        .writeFileString(metadataPath, JSON.stringify(lease), {
          flag: "wx",
          mode: 0o600,
        })
        .pipe(
          Effect.tapError(() =>
            fileSystem.remove(lockDirectory, { recursive: true }).pipe(Effect.ignore)
          )
        );
      return {
        ...target,
        metadataPath,
        lease,
      };
    })
  );
}

function awaitExclusivityOwnership(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  expected: OwnedExclusivityLock,
  childPid: number,
  child: ChildProcessHandle
): Effect.Effect<void, FlureeRuntimeOwnershipHandshakeFailed | PlatformError.PlatformError> {
  return Effect.gen(function* () {
    const startedAtMs = yield* Clock.currentTimeMillis;
    while (true) {
      const current = yield* inspectOwnedExclusivityLock(fileSystem, path, expected);
      if (
        current?.lease.phase === "running" &&
        exclusivityLockIdentityEqual(current.lease, expected.lease) &&
        current.lease.childPid === childPid
      ) {
        return;
      }

      const running = yield* child.isRunning.pipe(Effect.catch(() => Effect.succeed(false)));
      const nowMs = yield* Clock.currentTimeMillis;
      if (!running || nowMs - startedAtMs >= OWNERSHIP_HANDSHAKE_TIMEOUT_MS) {
        return yield* new FlureeRuntimeOwnershipHandshakeFailed({
          runDirectory: expected.lockDirectory,
          message: running
            ? `launcher did not publish exact ${expected.resourceKind} ownership before the handshake deadline`
            : `launcher exited before publishing exact ${expected.resourceKind} ownership`,
        });
      }
      yield* Effect.sleep(10);
    }
  });
}

function awaitRuntimeListenerOwnership(
  fileSystem: FileSystem.FileSystem,
  runtimeLogPath: string,
  runDirectory: string,
  child: ChildProcessHandle
): Effect.Effect<void, FlureeRuntimeOwnershipHandshakeFailed | PlatformError.PlatformError> {
  return Effect.gen(function* () {
    const startedAtMs = yield* Clock.currentTimeMillis;
    while (true) {
      const runtimeLog = yield* fileSystem.readFileString(runtimeLogPath);
      const running = yield* child.isRunning.pipe(Effect.catch(() => Effect.succeed(false)));
      if (running && runtimeLog.includes(FLUREE_LISTENER_BOUND_MARKER)) return;

      const nowMs = yield* Clock.currentTimeMillis;
      if (!running || nowMs - startedAtMs >= OWNERSHIP_HANDSHAKE_TIMEOUT_MS) {
        return yield* new FlureeRuntimeOwnershipHandshakeFailed({
          runDirectory,
          message: running
            ? "owned Fluree child did not publish its post-bind listener marker before the handshake deadline"
            : "owned Fluree child exited before publishing its post-bind listener marker",
        });
      }
      yield* Effect.sleep(10);
    }
  });
}

function releaseExclusivityLock(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  expected: OwnedExclusivityLock,
  processGroupExitTimeoutMs: number
): Effect.Effect<void, PlatformError.PlatformError> {
  return Effect.gen(function* () {
    const current = yield* inspectOwnedExclusivityLock(fileSystem, path, expected);
    if (current === undefined || !exclusivityLockIdentityEqual(current.lease, expected.lease)) {
      return;
    }
    if (current.lease.childPid !== null && isProcessGroupAlive(current.lease.childPid)) {
      const startedAtMs = yield* Clock.currentTimeMillis;
      while (isProcessGroupAlive(current.lease.childPid)) {
        const nowMs = yield* Clock.currentTimeMillis;
        if (nowMs - startedAtMs >= processGroupExitTimeoutMs) return;
        yield* Effect.sleep(10);
      }
    }

    const releaseCandidate = yield* inspectOwnedExclusivityLock(fileSystem, path, expected);
    if (
      releaseCandidate === undefined ||
      !exclusivityLockIdentityEqual(releaseCandidate.lease, expected.lease) ||
      (releaseCandidate.lease.childPid !== null &&
        isProcessGroupAlive(releaseCandidate.lease.childPid))
    ) {
      return;
    }
    const entries = yield* fileSystem.readDirectory(releaseCandidate.lockDirectory);
    if (entries.length !== 1 || entries[0] !== EXCLUSIVITY_LOCK_FILE_NAME) return;
    yield* fileSystem.remove(releaseCandidate.metadataPath);
    yield* fileSystem.remove(releaseCandidate.lockDirectory, { recursive: true });
  });
}

function cleanupRecoveredExclusivityLocks(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  target: ExclusivityLockTarget,
  staleTtlMs: number
): Effect.Effect<void, PlatformError.PlatformError> {
  return Effect.gen(function* () {
    const nowMs = yield* Clock.currentTimeMillis;
    const retentionMs = Math.max(staleTtlMs, MIN_RECOVERED_LOCK_TTL_MS);
    const recoveredDirectories = yield* recoveredExclusivityLockDirectories(
      fileSystem,
      path,
      target
    );
    for (const recoveredDirectory of recoveredDirectories) {
      const recovered = yield* inspectRecoveredExclusivityLock(
        fileSystem,
        path,
        target,
        recoveredDirectory
      );
      if (
        recovered === undefined ||
        exclusivityLockIsAlive(recovered.lease) ||
        nowMs - recovered.marker.recoveredAtMs < retentionMs
      ) {
        continue;
      }
      const deletionCandidate = yield* inspectRecoveredExclusivityLock(
        fileSystem,
        path,
        target,
        recoveredDirectory
      );
      if (
        deletionCandidate === undefined ||
        !exclusivityLockIdentityEqual(deletionCandidate.lease, recovered.lease) ||
        !recoveredLockMarkerEqual(deletionCandidate.marker, recovered.marker) ||
        exclusivityLockIsAlive(deletionCandidate.lease)
      ) {
        continue;
      }
      const entries = (yield* fileSystem.readDirectory(recoveredDirectory)).sort();
      if (
        entries.length !== 2 ||
        entries[0] !== EXCLUSIVITY_LOCK_FILE_NAME ||
        entries[1] !== RECOVERED_LOCK_FILE_NAME
      ) {
        continue;
      }
      yield* fileSystem.remove(deletionCandidate.metadataPath);
      yield* fileSystem.remove(deletionCandidate.markerPath);
      yield* fileSystem.remove(recoveredDirectory, { recursive: true });
    }
  });
}

function recoveredExclusivityLockDirectories(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  target: ExclusivityLockTarget
): Effect.Effect<string[], PlatformError.PlatformError> {
  return Effect.gen(function* () {
    const parent = path.dirname(target.lockDirectory);
    const prefix = `${path.basename(target.lockDirectory)}${RECOVERED_LOCK_MARKER}`;
    const entries = yield* fileSystem.readDirectory(parent);
    const recovered: string[] = [];
    for (const entry of entries) {
      if (path.basename(entry) !== entry || !entry.startsWith(prefix)) continue;
      const nonce = entry.slice(prefix.length);
      if (!NONCE_PATTERN.test(nonce)) continue;
      const candidate = path.join(parent, entry);
      if (candidate === recoveredLockDirectory(target, nonce)) recovered.push(candidate);
    }
    return recovered.sort();
  });
}

function inspectRecoveredExclusivityLock(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  target: ExclusivityLockTarget,
  recoveredDirectory: string
): Effect.Effect<OwnedRecoveredLock | undefined> {
  return Effect.gen(function* () {
    const prefix = `${target.lockDirectory}${RECOVERED_LOCK_MARKER}`;
    if (!recoveredDirectory.startsWith(prefix)) return undefined;
    const nonce = recoveredDirectory.slice(prefix.length);
    if (
      !NONCE_PATTERN.test(nonce) ||
      recoveredDirectory !== recoveredLockDirectory(target, nonce)
    ) {
      return undefined;
    }
    const owned = yield* inspectOwnedExclusivityLock(fileSystem, path, {
      ...target,
      lockDirectory: recoveredDirectory,
    });
    if (owned === undefined || owned.lease.nonce !== nonce) return undefined;
    const markerPath = path.join(recoveredDirectory, RECOVERED_LOCK_FILE_NAME);
    if (!(yield* isPlainFile(fileSystem, markerPath))) return undefined;
    const marker = parseRecoveredLockMarker(yield* fileSystem.readFileString(markerPath));
    if (
      marker === undefined ||
      marker.nonce !== nonce ||
      marker.resourceKind !== target.resourceKind ||
      marker.resourceKey !== target.resourceKey
    ) {
      return undefined;
    }
    return {
      ...owned,
      markerPath,
      marker,
    };
  }).pipe(Effect.catch(() => Effect.succeed(undefined)));
}

function prepareRuntimeDirectory(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  cacheRoot: string,
  nonce: string
): Effect.Effect<PreparedRuntimeDirectory, PlatformError.PlatformError> {
  return Effect.uninterruptible(
    Effect.gen(function* () {
      const runDirectory = yield* fileSystem.makeTempDirectory({
        directory: cacheRoot,
        prefix: `${RUN_DIRECTORY_PREFIX}${nonce}-`,
      });
      const createdAtMs = yield* Clock.currentTimeMillis;
      const lease: PreparedRuntimeLease = {
        schema: LEASE_SCHEMA,
        phase: "prepared",
        ownerPid: nodeProcess.pid,
        childPid: null,
        nonce,
        createdAtMs,
        runDirectoryName: path.basename(runDirectory),
      };
      yield* fileSystem
        .writeFileString(path.join(runDirectory, LEASE_FILE_NAME), JSON.stringify(lease), {
          flag: "wx",
          mode: 0o600,
        })
        .pipe(
          Effect.tapError(() =>
            fileSystem.remove(runDirectory, { recursive: true, force: true }).pipe(Effect.ignore)
          )
        );
      return { runDirectory, lease };
    })
  );
}

function monitorRunDirectory(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  child: ChildProcessHandle,
  runDirectory: string,
  normalShutdownPath: string,
  policy: FlureeRuntimeCachePolicy,
  byteCapFailure: Deferred.Deferred<never, FlureeRuntimeLiveFailure>
): Effect.Effect<void> {
  return Effect.gen(function* () {
    while (yield* child.isRunning.pipe(Effect.catch(() => Effect.succeed(false)))) {
      const measurement = yield* Effect.result(
        directoryBytes(fileSystem, path, runDirectory).pipe(
          Effect.catch(() => directoryBytes(fileSystem, path, runDirectory))
        )
      );
      if (measurement._tag === "Failure") {
        const error = new FlureeRuntimeCacheMeasurementFailed({
          runDirectory,
          cause: String(measurement.failure),
        });
        yield* failAndStop(fileSystem, child, normalShutdownPath, policy, byteCapFailure, error);
        return;
      }
      const observedBytes = measurement.success;
      if (observedBytes > policy.perRunByteCap) {
        const error = new FlureeRuntimeRunByteCapExceeded({
          runDirectory,
          observedBytes,
          byteCap: policy.perRunByteCap,
          message: `Fluree run grew to ${String(observedBytes)} bytes, exceeding the ${String(
            policy.perRunByteCap
          )}-byte cap`,
        });
        yield* failAndStop(fileSystem, child, normalShutdownPath, policy, byteCapFailure, error);
        return;
      }
      const nearCap = observedBytes * 4n >= policy.perRunByteCap * 3n;
      yield* Effect.sleep(
        nearCap ? Math.min(policy.monitorIntervalMs, 1_000) : policy.monitorIntervalMs
      );
    }
  });
}

function failAndStop(
  fileSystem: FileSystem.FileSystem,
  child: ChildProcessHandle,
  normalShutdownPath: string,
  policy: FlureeRuntimeCachePolicy,
  failure: Deferred.Deferred<never, FlureeRuntimeLiveFailure>,
  error: FlureeRuntimeLiveFailure
): Effect.Effect<void> {
  return Effect.uninterruptible(
    Deferred.fail(failure, error).pipe(
      Effect.andThen(finalizeProcess(fileSystem, child, policy, normalShutdownPath))
    )
  );
}

function finalizeProcess(
  fileSystem: FileSystem.FileSystem,
  child: ChildProcessHandle,
  policy: FlureeRuntimeCachePolicy,
  normalShutdownPath: string
): Effect.Effect<void> {
  return Effect.gen(function* () {
    yield* fileSystem
      .writeFileString(normalShutdownPath, "owner-managed\n", {
        flag: "w",
        mode: 0o600,
      })
      .pipe(Effect.ignore);
    const running = yield* child.isRunning.pipe(Effect.catch(() => Effect.succeed(false)));
    if (!running) return;
    const terminated = yield* child.kill({ killSignal: "SIGTERM" }).pipe(
      Effect.interruptible,
      Effect.timeoutOption(policy.shutdownGraceMs),
      Effect.catch(() => Effect.succeed(Option.none()))
    );
    if (Option.isNone(terminated)) {
      yield* forceStopProcess(child, policy.hardStopTimeoutMs);
    }
    yield* child.exitCode.pipe(
      Effect.interruptible,
      Effect.timeoutOption(policy.hardStopTimeoutMs),
      Effect.ignore
    );
  });
}

function forceStopProcess(child: ChildProcessHandle, timeoutMs: number): Effect.Effect<void> {
  return child.isRunning.pipe(
    Effect.flatMap((running) =>
      running
        ? child
            .kill({ killSignal: "SIGKILL" })
            .pipe(Effect.interruptible, Effect.timeoutOption(timeoutMs), Effect.asVoid)
        : Effect.void
    ),
    Effect.ignore
  );
}

function resolveRuntimeOptions(
  options: FlureeRuntimeOptions
): Effect.Effect<ResolvedRuntimeOptions, FlureeRuntimeConfigurationError> {
  const policy: FlureeRuntimeCachePolicy = {
    ...DEFAULT_FLUREE_RUNTIME_CACHE_POLICY,
    ...options.cachePolicy,
  };
  if (!isNonNegativeSafeInteger(policy.staleTtlMs)) {
    return Effect.fail(
      new FlureeRuntimeConfigurationError({
        message: "staleTtlMs must be a non-negative safe integer",
      })
    );
  }
  if (!isPositiveSafeInteger(policy.monitorIntervalMs)) {
    return Effect.fail(
      new FlureeRuntimeConfigurationError({
        message: "monitorIntervalMs must be a positive safe integer",
      })
    );
  }
  if (!isNonNegativeSafeInteger(policy.shutdownGraceMs)) {
    return Effect.fail(
      new FlureeRuntimeConfigurationError({
        message: "shutdownGraceMs must be a non-negative safe integer",
      })
    );
  }
  if (!isPositiveSafeInteger(policy.hardStopTimeoutMs)) {
    return Effect.fail(
      new FlureeRuntimeConfigurationError({
        message: "hardStopTimeoutMs must be a positive safe integer",
      })
    );
  }
  if (typeof policy.perRunByteCap !== "bigint" || policy.perRunByteCap <= 0n) {
    return Effect.fail(
      new FlureeRuntimeConfigurationError({
        message: "perRunByteCap must be greater than zero",
      })
    );
  }
  if (typeof policy.retainedByteCap !== "bigint" || policy.retainedByteCap < 0n) {
    return Effect.fail(
      new FlureeRuntimeConfigurationError({
        message: "retainedByteCap must not be negative",
      })
    );
  }
  return Effect.succeed({
    cacheRoot: nodePath.resolve(
      options.cacheRoot ?? nodePath.join(tmpdir(), "habitat-fluree-runtime")
    ),
    cachePolicy: policy,
  });
}

function ensureCacheRoot(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  requestedRoot: string
): Effect.Effect<string, PlatformError.PlatformError> {
  const absoluteRoot = path.resolve(requestedRoot);
  return fileSystem
    .makeDirectory(absoluteRoot, { recursive: true })
    .pipe(Effect.andThen(canonicalDirectory(fileSystem, absoluteRoot)));
}

function ensurePortLockRoot(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path
): Effect.Effect<string, PlatformError.PlatformError | FlureeRuntimeConfigurationError> {
  return Effect.gen(function* () {
    const temporaryRoot = yield* canonicalDirectory(
      fileSystem,
      path.resolve(SHARED_PORT_LOCK_PARENT_DIRECTORY)
    );
    if (nodeProcess.getuid === undefined) {
      return yield* new FlureeRuntimeConfigurationError({
        message: "local port ownership requires a POSIX user identity",
      });
    }
    const uid = nodeProcess.getuid();
    const requestedRoot = path.join(temporaryRoot, `${PORT_LOCK_ROOT_DIRECTORY_PREFIX}${uid}`);
    yield* fileSystem.makeDirectory(requestedRoot, { recursive: true, mode: 0o700 });
    const canonicalRoot = yield* fileSystem.realPath(requestedRoot);
    if (canonicalRoot !== requestedRoot) {
      return yield* new FlureeRuntimeConfigurationError({
        message: `port lock root '${requestedRoot}' must not be a symlink`,
      });
    }
    const info = yield* fileSystem.stat(canonicalRoot);
    if (info.type !== "Directory") {
      return yield* new FlureeRuntimeConfigurationError({
        message: `port lock root '${requestedRoot}' must be a directory`,
      });
    }
    const observedUid = Option.getOrUndefined(info.uid);
    if (observedUid !== undefined && observedUid !== uid) {
      return yield* new FlureeRuntimeConfigurationError({
        message: `port lock root '${requestedRoot}' must be owned by uid ${String(uid)}`,
      });
    }
    if ((info.mode & 0o077) !== 0) {
      yield* fileSystem.chmod(canonicalRoot, 0o700);
    }
    return canonicalRoot;
  });
}

function canonicalDirectory(
  fileSystem: FileSystem.FileSystem,
  directory: string
): Effect.Effect<string, PlatformError.PlatformError> {
  return Effect.gen(function* () {
    const canonical = yield* fileSystem.realPath(directory);
    const info = yield* fileSystem.stat(canonical);
    if (info.type !== "Directory") {
      return yield* Effect.die(new Error(`Expected directory at '${directory}'`));
    }
    return canonical;
  });
}

function recoverAtRoot(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  cacheRoot: string,
  policy: FlureeRuntimeCachePolicy
): Effect.Effect<FlureeRuntimeCacheRecoveryReport, PlatformError.PlatformError> {
  return Effect.gen(function* () {
    const nowMs = yield* Clock.currentTimeMillis;
    const entries = yield* fileSystem.readDirectory(cacheRoot);
    const removedRunDirectories: string[] = [];
    let removedBytes = 0n;
    let activeRunDirectoriesPreserved = 0;
    let unownedEntriesPreserved = 0;

    for (const entry of entries) {
      const owned = yield* inspectOwnedRunDirectory(fileSystem, path, cacheRoot, entry);
      if (owned === undefined) {
        unownedEntriesPreserved += 1;
        continue;
      }
      if (runtimeLeaseIsAlive(owned.lease)) {
        activeRunDirectoriesPreserved += 1;
        continue;
      }
      if (nowMs - owned.lease.createdAtMs < policy.staleTtlMs) {
        continue;
      }

      // Revalidate immediately before deletion so a live owner always wins.
      const current = yield* inspectOwnedRunDirectory(fileSystem, path, cacheRoot, entry);
      if (current === undefined) {
        unownedEntriesPreserved += 1;
        continue;
      }
      if (runtimeLeaseIsAlive(current.lease)) {
        activeRunDirectoriesPreserved += 1;
        continue;
      }
      if (nowMs - current.lease.createdAtMs < policy.staleTtlMs) {
        continue;
      }
      if (
        !isExactRunDirectory(
          path,
          cacheRoot,
          current.path,
          current.lease.nonce,
          current.lease.runDirectoryName
        )
      ) {
        unownedEntriesPreserved += 1;
        continue;
      }
      const currentBytes = yield* directoryBytes(fileSystem, path, current.path);
      yield* fileSystem.remove(current.path, { recursive: true, force: true });
      removedRunDirectories.push(current.path);
      removedBytes += currentBytes;
    }

    const retainedDeadBytes = yield* retainedDeadOwnedBytes(fileSystem, path, cacheRoot);
    return {
      cacheRoot,
      removedRunDirectories,
      removedBytes,
      retainedDeadBytes,
      retainedByteCapExceeded: retainedDeadBytes > policy.retainedByteCap,
      activeRunDirectoriesPreserved,
      unownedEntriesPreserved,
    };
  });
}

function retainedDeadOwnedBytes(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  cacheRoot: string
): Effect.Effect<bigint, PlatformError.PlatformError> {
  return Effect.gen(function* () {
    const runs = yield* deadOwnedRuns(fileSystem, path, cacheRoot);
    let total = 0n;
    for (const run of runs) {
      total += yield* directoryBytes(fileSystem, path, run.path);
    }
    return total;
  });
}

function deadOwnedRuns(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  cacheRoot: string
): Effect.Effect<OwnedRunDirectory[], PlatformError.PlatformError> {
  return Effect.gen(function* () {
    const entries = yield* fileSystem.readDirectory(cacheRoot);
    const dead: OwnedRunDirectory[] = [];
    for (const entry of entries) {
      const owned = yield* inspectOwnedRunDirectory(fileSystem, path, cacheRoot, entry);
      if (owned !== undefined && !runtimeLeaseIsAlive(owned.lease)) {
        dead.push(owned);
      }
    }
    return dead;
  });
}

function inspectOwnedRunDirectory(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  cacheRoot: string,
  entry: string
): Effect.Effect<OwnedRunDirectory | undefined> {
  return Effect.gen(function* () {
    if (path.basename(entry) !== entry) return undefined;
    const runDirectory = path.resolve(cacheRoot, entry);
    if (path.dirname(runDirectory) !== cacheRoot) return undefined;
    const canonical = yield* fileSystem.realPath(runDirectory);
    if (canonical !== runDirectory) return undefined;
    const info = yield* fileSystem.stat(runDirectory);
    if (info.type !== "Directory") return undefined;

    const leasePath = path.join(runDirectory, LEASE_FILE_NAME);
    if (!(yield* isPlainFile(fileSystem, leasePath))) return undefined;
    const lease = parseRuntimeLease(yield* fileSystem.readFileString(leasePath));
    if (
      lease === undefined ||
      !isExactRunDirectory(path, cacheRoot, runDirectory, lease.nonce, lease.runDirectoryName)
    ) {
      return undefined;
    }

    return {
      path: runDirectory,
      lease,
    } satisfies OwnedRunDirectory;
  }).pipe(Effect.catch(() => Effect.succeed(undefined)));
}

function inspectOwnedExclusivityLock(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  target: ExclusivityLockTarget
): Effect.Effect<OwnedExclusivityLock | undefined> {
  return Effect.gen(function* () {
    const { lockDirectory } = target;
    if ((yield* fileSystem.realPath(lockDirectory)) !== lockDirectory) return undefined;
    if ((yield* fileSystem.stat(lockDirectory)).type !== "Directory") return undefined;

    const metadataPath = path.join(lockDirectory, EXCLUSIVITY_LOCK_FILE_NAME);
    if (!(yield* isPlainFile(fileSystem, metadataPath))) return undefined;
    const lease = parseExclusivityLock(yield* fileSystem.readFileString(metadataPath));
    if (
      lease === undefined ||
      lease.resourceKind !== target.resourceKind ||
      lease.resourceKey !== target.resourceKey
    ) {
      return undefined;
    }
    return {
      ...target,
      metadataPath,
      lease,
    };
  }).pipe(Effect.catch(() => Effect.succeed(undefined)));
}

function awaitRuntimeOwnership(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  cacheRoot: string,
  runDirectoryName: string,
  childPid: number,
  child: ChildProcessHandle
): Effect.Effect<
  RunningRuntimeLease,
  FlureeRuntimeOwnershipHandshakeFailed | PlatformError.PlatformError
> {
  return Effect.gen(function* () {
    const startedAtMs = yield* Clock.currentTimeMillis;
    const runDirectory = path.join(cacheRoot, runDirectoryName);
    while (true) {
      const owned = yield* inspectOwnedRunDirectory(fileSystem, path, cacheRoot, runDirectoryName);
      if (
        owned?.lease.phase === "running" &&
        owned.lease.ownerPid === nodeProcess.pid &&
        owned.lease.childPid === childPid
      ) {
        return owned.lease;
      }

      const running = yield* child.isRunning.pipe(Effect.catch(() => Effect.succeed(false)));
      const nowMs = yield* Clock.currentTimeMillis;
      const runDirectoryExists = yield* fileSystem.exists(runDirectory);
      if (
        !running ||
        !runDirectoryExists ||
        nowMs - startedAtMs >= OWNERSHIP_HANDSHAKE_TIMEOUT_MS
      ) {
        return yield* new FlureeRuntimeOwnershipHandshakeFailed({
          runDirectory,
          message:
            running && runDirectoryExists
              ? "launcher did not publish exact ownership before the handshake deadline"
              : "launcher exited before publishing exact ownership",
        });
      }
      yield* Effect.sleep(10);
    }
  });
}

function isPlainFile(
  fileSystem: FileSystem.FileSystem,
  filePath: string
): Effect.Effect<boolean, PlatformError.PlatformError> {
  return Effect.gen(function* () {
    if ((yield* fileSystem.realPath(filePath)) !== filePath) return false;
    return (yield* fileSystem.stat(filePath)).type === "File";
  });
}

function directoryBytes(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  directory: string
): Effect.Effect<bigint, PlatformError.PlatformError> {
  return Effect.gen(function* () {
    const entries = yield* fileSystem.readDirectory(directory, { recursive: true });
    let total = 0n;
    for (const entry of entries) {
      const candidate = path.resolve(directory, entry);
      if (!isContainedPath(path, directory, candidate)) continue;
      const measurement = yield* Effect.result(fileSystem.stat(candidate));
      if (measurement._tag === "Failure") {
        if (!isPlatformNotFound(measurement.failure)) return yield* measurement.failure;
        const link = yield* Effect.result(fileSystem.readLink(candidate));
        if (link._tag === "Success" || !isPlatformNotFound(link.failure)) {
          return yield* measurement.failure;
        }
        continue;
      }
      const info = measurement.success;
      const size = info.type === "File" ? BigInt(info.size) : 0n;
      total += size;
    }
    return total;
  });
}

function cleanupRuntimeDirectory(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  cacheRoot: string,
  runDirectory: string,
  nonce: string,
  expectedLease: RuntimeLease,
  processGroupExitTimeoutMs: number
): Effect.Effect<void, PlatformError.PlatformError> {
  return Effect.gen(function* () {
    const runDirectoryName = path.basename(runDirectory);
    if (!isExactRunDirectory(path, cacheRoot, runDirectory, nonce, runDirectoryName)) {
      return;
    }
    const current = yield* inspectOwnedRunDirectory(fileSystem, path, cacheRoot, runDirectoryName);
    if (
      current === undefined ||
      current.path !== runDirectory ||
      !runtimeLeaseBaseIdentityEqual(current.lease, expectedLease)
    ) {
      return;
    }
    if (current.lease.childPid !== null && isProcessGroupAlive(current.lease.childPid)) {
      const startedAtMs = yield* Clock.currentTimeMillis;
      while (isProcessGroupAlive(current.lease.childPid)) {
        const nowMs = yield* Clock.currentTimeMillis;
        if (nowMs - startedAtMs >= processGroupExitTimeoutMs) return;
        yield* Effect.sleep(10);
      }
    }
    const deletionCandidate = yield* inspectOwnedRunDirectory(
      fileSystem,
      path,
      cacheRoot,
      runDirectoryName
    );
    if (
      deletionCandidate === undefined ||
      deletionCandidate.path !== runDirectory ||
      !runtimeLeaseBaseIdentityEqual(deletionCandidate.lease, expectedLease)
    ) {
      return;
    }
    if (
      deletionCandidate.lease.childPid !== null &&
      isProcessGroupAlive(deletionCandidate.lease.childPid)
    ) {
      return;
    }
    yield* fileSystem.remove(deletionCandidate.path, { recursive: true, force: true });
  });
}

function isExactRunDirectory(
  path: Path.Path,
  cacheRoot: string,
  runDirectory: string,
  nonce: string,
  runDirectoryName: string
): boolean {
  return (
    NONCE_PATTERN.test(nonce) &&
    path.dirname(runDirectory) === cacheRoot &&
    path.basename(runDirectory) === runDirectoryName &&
    runDirectoryName.startsWith(`${RUN_DIRECTORY_PREFIX}${nonce}-`) &&
    runDirectoryName.length > RUN_DIRECTORY_PREFIX.length + nonce.length + 1
  );
}

function isContainedPath(path: Path.Path, root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative.length > 0 &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function pathsOverlap(path: Path.Path, left: string, right: string): boolean {
  return left === right || isContainedPath(path, left, right) || isContainedPath(path, right, left);
}

function storageLockDirectory(storagePath: string): string {
  return `${storagePath}${STORAGE_LOCK_DIRECTORY_SUFFIX}`;
}

function storageLockTarget(storagePath: string): ExclusivityLockTarget {
  return {
    resourceKind: "storage",
    resourceKey: storagePath,
    lockDirectory: storageLockDirectory(storagePath),
  };
}

function portLockTarget(
  path: Path.Path,
  portLockRoot: string,
  port: number
): ExclusivityLockTarget {
  const endpoint = `127.0.0.1:${String(port)}`;
  return {
    resourceKind: "port",
    resourceKey: endpoint,
    lockDirectory: path.join(
      portLockRoot,
      `${endpoint.replaceAll(":", "-")}${PORT_LOCK_DIRECTORY_SUFFIX}`
    ),
  };
}

function recoveredLockDirectory(target: ExclusivityLockTarget, nonce: string): string {
  return `${target.lockDirectory}${RECOVERED_LOCK_MARKER}${nonce}`;
}

function exclusivityLocked(
  target: ExclusivityLockTarget,
  message: string
): FlureeRuntimeStorageLocked | FlureeRuntimePortLocked {
  return target.resourceKind === "storage"
    ? new FlureeRuntimeStorageLocked({
        storagePath: target.resourceKey,
        lockDirectory: target.lockDirectory,
        message,
      })
    : new FlureeRuntimePortLocked({
        endpoint: target.resourceKey,
        lockDirectory: target.lockDirectory,
        message,
      });
}

function exclusivityLockIsAlive(lease: ExclusivityLockLease): boolean {
  return (
    isProcessAlive(lease.ownerPid) ||
    (lease.childPid !== null &&
      (isProcessAlive(lease.childPid) || isProcessGroupAlive(lease.childPid)))
  );
}

function exclusivityLockIdentityEqual(
  left: ExclusivityLockLease,
  right: ExclusivityLockLease
): boolean {
  return (
    left.ownerPid === right.ownerPid &&
    left.nonce === right.nonce &&
    left.createdAtMs === right.createdAtMs &&
    left.resourceKind === right.resourceKind &&
    left.resourceKey === right.resourceKey
  );
}

function recoveredLockMarkerEqual(left: RecoveredLockMarker, right: RecoveredLockMarker): boolean {
  return (
    left.recoveredAtMs === right.recoveredAtMs &&
    left.nonce === right.nonce &&
    left.resourceKind === right.resourceKind &&
    left.resourceKey === right.resourceKey
  );
}

function runtimeLeaseIsAlive(lease: RuntimeLease): boolean {
  return (
    isProcessAlive(lease.ownerPid) ||
    (lease.childPid !== null &&
      (isProcessAlive(lease.childPid) || isProcessGroupAlive(lease.childPid)))
  );
}

function runtimeLeaseBaseIdentityEqual(left: RuntimeLease, right: RuntimeLease): boolean {
  return (
    left.ownerPid === right.ownerPid &&
    left.nonce === right.nonce &&
    left.createdAtMs === right.createdAtMs &&
    left.runDirectoryName === right.runDirectoryName
  );
}

function isProcessAlive(pid: number): boolean {
  try {
    nodeProcess.kill(pid, 0);
    return true;
  } catch (cause) {
    return isRecord(cause) && cause.code === "EPERM";
  }
}

function isProcessGroupAlive(processGroupId: number): boolean {
  try {
    nodeProcess.kill(-processGroupId, 0);
    return true;
  } catch (cause) {
    return isRecord(cause) && cause.code === "EPERM";
  }
}

function parseRuntimeLease(input: string): RuntimeLease | undefined {
  const value = parseJsonRecord(input);
  if (
    value === undefined ||
    !hasExactKeys(value, [
      "schema",
      "phase",
      "ownerPid",
      "childPid",
      "nonce",
      "createdAtMs",
      "runDirectoryName",
    ]) ||
    value.schema !== LEASE_SCHEMA ||
    (value.phase !== "prepared" && value.phase !== "running") ||
    !isPositiveSafeInteger(value.ownerPid) ||
    (value.childPid !== null && !isPositiveSafeInteger(value.childPid)) ||
    typeof value.nonce !== "string" ||
    !NONCE_PATTERN.test(value.nonce) ||
    !isNonNegativeSafeInteger(value.createdAtMs) ||
    typeof value.runDirectoryName !== "string"
  ) {
    return undefined;
  }
  if (value.phase === "prepared") {
    if (value.childPid !== null) return undefined;
    return {
      schema: LEASE_SCHEMA,
      phase: "prepared",
      ownerPid: value.ownerPid,
      childPid: null,
      nonce: value.nonce,
      createdAtMs: value.createdAtMs,
      runDirectoryName: value.runDirectoryName,
    };
  }
  if (!isPositiveSafeInteger(value.childPid)) return undefined;
  return {
    schema: LEASE_SCHEMA,
    phase: "running",
    ownerPid: value.ownerPid,
    childPid: value.childPid,
    nonce: value.nonce,
    createdAtMs: value.createdAtMs,
    runDirectoryName: value.runDirectoryName,
  };
}

function parseExclusivityLock(input: string): ExclusivityLockLease | undefined {
  const value = parseJsonRecord(input);
  if (
    value === undefined ||
    !hasExactKeys(value, [
      "schema",
      "phase",
      "ownerPid",
      "childPid",
      "nonce",
      "createdAtMs",
      "resourceKind",
      "resourceKey",
    ]) ||
    value.schema !== EXCLUSIVITY_LOCK_SCHEMA ||
    (value.phase !== "prepared" && value.phase !== "running") ||
    !isPositiveSafeInteger(value.ownerPid) ||
    (value.childPid !== null && !isPositiveSafeInteger(value.childPid)) ||
    typeof value.nonce !== "string" ||
    !NONCE_PATTERN.test(value.nonce) ||
    !isNonNegativeSafeInteger(value.createdAtMs) ||
    (value.resourceKind !== "storage" && value.resourceKind !== "port") ||
    typeof value.resourceKey !== "string" ||
    value.resourceKey.length === 0
  ) {
    return undefined;
  }
  if (value.phase === "prepared") {
    if (value.childPid !== null) return undefined;
    return {
      schema: EXCLUSIVITY_LOCK_SCHEMA,
      phase: "prepared",
      ownerPid: value.ownerPid,
      childPid: null,
      nonce: value.nonce,
      createdAtMs: value.createdAtMs,
      resourceKind: value.resourceKind,
      resourceKey: value.resourceKey,
    };
  }
  if (!isPositiveSafeInteger(value.childPid)) return undefined;
  return {
    schema: EXCLUSIVITY_LOCK_SCHEMA,
    phase: "running",
    ownerPid: value.ownerPid,
    childPid: value.childPid,
    nonce: value.nonce,
    createdAtMs: value.createdAtMs,
    resourceKind: value.resourceKind,
    resourceKey: value.resourceKey,
  };
}

function parseRecoveredLockMarker(input: string): RecoveredLockMarker | undefined {
  const value = parseJsonRecord(input);
  if (
    value === undefined ||
    !hasExactKeys(value, ["schema", "recoveredAtMs", "nonce", "resourceKind", "resourceKey"]) ||
    value.schema !== RECOVERED_LOCK_SCHEMA ||
    !isNonNegativeSafeInteger(value.recoveredAtMs) ||
    typeof value.nonce !== "string" ||
    !NONCE_PATTERN.test(value.nonce) ||
    (value.resourceKind !== "storage" && value.resourceKind !== "port") ||
    typeof value.resourceKey !== "string" ||
    value.resourceKey.length === 0
  ) {
    return undefined;
  }
  return {
    schema: RECOVERED_LOCK_SCHEMA,
    recoveredAtMs: value.recoveredAtMs,
    nonce: value.nonce,
    resourceKind: value.resourceKind,
    resourceKey: value.resourceKey,
  };
}

function parseJsonRecord(input: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(input);
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPlatformNotFound(error: PlatformError.PlatformError): boolean {
  return error.reason._tag === "NotFound";
}

function isPlatformAlreadyExists(error: PlatformError.PlatformError): boolean {
  return error.reason._tag === "AlreadyExists";
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function containsExactFlureeVersion(output: string): boolean {
  return output.trim() === `fluree ${SUPPORTED_FLUREE_VERSION}`;
}
