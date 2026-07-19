import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  unlink,
  type FileHandle,
} from "node:fs/promises";
import path, { basename, dirname } from "node:path";

import type { CapsuleRoot } from "../layout";
import {
  createBunFfiCapsuleAdvisoryLock,
  type CapsuleAdvisoryLockV1,
} from "./advisory-lock";
import type { CapsuleFailure } from "./contract";
import { ClosedOwnerProtocolRegistryV1 } from "./protocol-registry";
import {
  createInitialCapsuleState,
  encodeCapsuleState,
  normalizeCapsuleLimits,
  parseCapsuleStateBytes,
  PRODUCTION_CAPSULE_LIMITS,
  type CapsuleStateEnvelopeV1,
  type CapsuleStateLimitsV1,
} from "./state";
import type {
  CapsuleExclusiveSessionV1,
  CapsuleStateAccessV1,
  CapsuleStateObservationV1,
  CapsuleStateStoreV1,
  CapsuleStoreCasResultV1,
  CapsuleStoreExclusiveResultV1,
  CapsuleStoreReadResultV1,
} from "./store";

const STATE_FILE = "capsule-state-v1.json";
const ADMISSION_FILE = ".capsule-admission-v1.lock";
const TEMP_PREFIX = ".capsule-state-v1-tmp-";

interface FileIdentityV1 {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly mode: bigint;
  readonly nlink: bigint;
  readonly size: bigint;
}

interface RootIdentityV1 {
  readonly path: string;
  readonly dev: bigint;
  readonly ino: bigint;
}

interface AdmissionHandleV1 {
  readonly handle: FileHandle;
  readonly path: string;
  readonly identity: FileIdentityV1;
}

export interface CapsuleStoreFailpointsV1 {
  readonly afterAdmissionOpened?: () => void | Promise<void>;
  readonly afterAdmissionAcquired?: () => void | Promise<void>;
  readonly afterTemporaryCreated?: (path: string) => void | Promise<void>;
  readonly beforeStatePublication?: (path: string) => void | Promise<void>;
  readonly beforeFinalStatePublication?: (path: string) => void | Promise<void>;
  readonly afterStatePublication?: (path: string) => void | Promise<void>;
  readonly beforeTemporaryCleanup?: (path: string) => void | Promise<void>;
}

export type OpenNodeCapsuleStoreResultV1 =
  | Readonly<{ kind: "Opened"; store: NodeCapsuleStateStoreV1 }>
  | Readonly<{ kind: "Rejected"; failure: CapsuleFailure }>;

export interface RawCapsuleSlotObservationV1 {
  readonly bytes: Uint8Array;
}

export type RawCapsuleSlotCasResultV1 =
  | Readonly<{ kind: "Committed"; observation: CapsuleStateObservationV1 }>
  | Readonly<{
    kind: "Unsettled";
    intendedState: CapsuleStateEnvelopeV1;
    observation?: CapsuleStateObservationV1;
    failure: CapsuleFailure;
  }>
  | Readonly<{ kind: "Rejected"; failure: CapsuleFailure }>;

export interface RawCapsuleSlotSessionV1 {
  read(): Promise<
    | Readonly<{ kind: "Observed"; observation: RawCapsuleSlotObservationV1 }>
    | Readonly<{ kind: "Rejected"; failure: CapsuleFailure }>
  >;
  compareAndSet(input: Readonly<{
    expectedBytes: Uint8Array;
    nextState: CapsuleStateEnvelopeV1;
  }>): Promise<RawCapsuleSlotCasResultV1>;
  release(): Promise<void>;
}

export type OpenExistingRawCapsuleSlotResultV1 =
  | Readonly<{ kind: "Absent" }>
  | Readonly<{ kind: "Acquired"; session: RawCapsuleSlotSessionV1 }>
  | Readonly<{ kind: "Rejected"; failure: CapsuleFailure }>;

/**
 * Opens the existing controller capsule slot without decoding an owner protocol.
 * This capability exists only for the bounded provider-v1-to-export retirement.
 */
export async function openExistingRawCapsuleSlotV1(options: Readonly<{
  root: CapsuleRoot;
  registry: ClosedOwnerProtocolRegistryV1;
  advisoryLock?: CapsuleAdvisoryLockV1;
  limits?: CapsuleStateLimitsV1;
  failpoints?: CapsuleStoreFailpointsV1;
}>): Promise<OpenExistingRawCapsuleSlotResultV1> {
  const advisoryLock = options.advisoryLock ?? createBunFfiCapsuleAdvisoryLock();
  if (advisoryLock.platform !== "darwin" && advisoryLock.platform !== "linux") {
    return Object.freeze({
      kind: "Rejected",
      failure: failure(
        "AdmissionUnsupported",
        "open-raw-slot",
        `capsule advisory lock is unsupported on ${advisoryLock.platform}`,
      ),
    });
  }
  const rootPath = requireCanonicalAbsolutePath(options.root, "capsule root");
  try {
    await lstat(rootPath, { bigint: true });
  } catch (error) {
    if (isCode(error, "ENOENT")) return Object.freeze({ kind: "Absent" });
    return Object.freeze({
      kind: "Rejected",
      failure: failure("RootUnsafe", "open-raw-slot", errorMessage(error), rootPath),
    });
  }
  const preflight = await preflightAdvisoryLock(dirname(rootPath), advisoryLock);
  if (preflight !== null) return Object.freeze({ kind: "Rejected", failure: preflight });
  const store = new NodeCapsuleStateStoreV1({
    ...options,
    root: rootPath as CapsuleRoot,
    advisoryLock,
  });
  return store.acquireRawMigrationSession();
}

export async function openNodeCapsuleStateStoreV1(options: Readonly<{
  root: CapsuleRoot;
  registry: ClosedOwnerProtocolRegistryV1;
  advisoryLock?: CapsuleAdvisoryLockV1;
  limits?: CapsuleStateLimitsV1;
  failpoints?: CapsuleStoreFailpointsV1;
}>): Promise<OpenNodeCapsuleStoreResultV1> {
  const advisoryLock = options.advisoryLock ?? createBunFfiCapsuleAdvisoryLock();
  if (advisoryLock.platform !== "darwin" && advisoryLock.platform !== "linux") {
    return {
      kind: "Rejected",
      failure: failure(
        "AdmissionUnsupported",
        "open-store",
        `capsule advisory lock is unsupported on ${advisoryLock.platform}`,
      ),
    };
  }
  const rootPath = requireCanonicalAbsolutePath(options.root, "capsule root");
  const preflight = await preflightAdvisoryLock(dirname(rootPath), advisoryLock);
  if (preflight !== null) return Object.freeze({ kind: "Rejected", failure: preflight });
  const store = new NodeCapsuleStateStoreV1({
    ...options,
    root: rootPath as CapsuleRoot,
    advisoryLock,
  });
  const initialized = await store.initialize();
  return initialized.kind === "Observed"
    ? Object.freeze({ kind: "Opened", store })
    : Object.freeze({ kind: "Rejected", failure: initialized.failure });
}

export class NodeCapsuleStateStoreV1 implements CapsuleStateStoreV1 {
  readonly #rootPath: string;
  readonly #registry: ClosedOwnerProtocolRegistryV1;
  readonly #advisoryLock: CapsuleAdvisoryLockV1;
  readonly #limits: CapsuleStateLimitsV1;
  readonly #failpoints: CapsuleStoreFailpointsV1;

  constructor(options: Readonly<{
    root: CapsuleRoot;
    registry: ClosedOwnerProtocolRegistryV1;
    advisoryLock: CapsuleAdvisoryLockV1;
    limits?: CapsuleStateLimitsV1;
    failpoints?: CapsuleStoreFailpointsV1;
  }>) {
    this.#rootPath = requireCanonicalAbsolutePath(options.root, "capsule root");
    this.#registry = options.registry;
    this.#advisoryLock = options.advisoryLock;
    this.#limits = normalizeCapsuleLimits(options.limits ?? PRODUCTION_CAPSULE_LIMITS);
    this.#failpoints = options.failpoints ?? Object.freeze({});
  }

  async initialize(): Promise<CapsuleStoreReadResultV1> {
    try {
      let created = false;
      const parentPath = dirname(this.#rootPath);
      await verifyCanonicalDirectory(parentPath, "capsule root parent");
      try {
        await mkdir(this.#rootPath, { mode: 0o700 });
        created = true;
      } catch (error) {
        if (!isCode(error, "EEXIST")) throw error;
      }
      const root = await verifyRoot(this.#rootPath);
      if (!created) {
        try {
          await lstat(this.#statePath(), { bigint: true });
        } catch (error) {
          if (isCode(error, "ENOENT")) {
            return {
              kind: "Rejected",
              failure: failure(
                "StateInvalid",
                "initialize",
                "an existing capsule root is missing its sole state file",
                this.#statePath(),
              ),
            };
          }
          throw error;
        }
      }
      return await this.#withAdmission(root, async (admission) => {
        if (!created) {
          try {
            await lstat(this.#statePath(), { bigint: true });
          } catch (error) {
            if (isCode(error, "ENOENT")) {
              return {
                kind: "Rejected",
                failure: failure(
                  "StateInvalid",
                  "initialize",
                  "an existing capsule root is missing its sole state file",
                  this.#statePath(),
                ),
              };
            }
            throw error;
          }
        }
        const observed = await this.#readState(root, admission, true);
        if (observed !== null) return { kind: "Observed", observation: observed };
        if (!created) throw new Error("capsule state disappeared during initialization");
        const initial = createInitialCapsuleState();
        const publication = await this.#publish(root, admission, null, initial);
        return publication.kind === "Committed"
          ? { kind: "Observed", observation: publication.observation }
          : publication.kind === "Conflict"
            ? { kind: "Observed", observation: publication.observation }
            : { kind: "Rejected", failure: publication.failure };
      }, created);
    } catch (error) {
      return {
        kind: "Rejected",
        failure: failure("RootUnsafe", "initialize", errorMessage(error), this.#rootPath),
      };
    }
  }

  async read(): Promise<CapsuleStoreReadResultV1> {
    try {
      const root = await verifyRoot(this.#rootPath);
      return await this.#withAdmission(root, async (admission) => {
        const observation = await this.#readState(root, admission, false);
        return observation === null
          ? {
            kind: "Rejected",
            failure: failure("StateInvalid", "read", "capsule state file is missing", this.#statePath()),
          }
          : { kind: "Observed", observation };
      });
    } catch (error) {
      return {
        kind: "Rejected",
        failure: failure("RootUnsafe", "read", errorMessage(error), this.#rootPath),
      };
    }
  }

  async compareAndSet(input: Readonly<{
    expectedStateDigest: `cs1_${string}`;
    nextState: CapsuleStateEnvelopeV1;
  }>): Promise<CapsuleStoreCasResultV1> {
    try {
      const root = await verifyRoot(this.#rootPath);
      return await this.#withAdmission(root, async (admission) => {
        const observed = await this.#readState(root, admission, false);
        if (observed === null) {
          return {
            kind: "Rejected",
            failure: failure("StateInvalid", "compare-and-set", "capsule state file is missing", this.#statePath()),
          };
        }
        if (observed.state.stateDigest !== input.expectedStateDigest) {
          return { kind: "Conflict", observation: observed };
        }
        return this.#publish(root, admission, observed, input.nextState);
      });
    } catch (error) {
      return {
        kind: "Rejected",
        failure: failure("RootUnsafe", "compare-and-set", errorMessage(error), this.#rootPath),
      };
    }
  }

  async acquireExclusiveSession(): Promise<CapsuleStoreExclusiveResultV1> {
    let admission: AdmissionHandleV1 | undefined;
    let acquired = false;
    try {
      const root = await verifyRoot(this.#rootPath);
      admission = await this.#openAdmission(root, false);
      await this.#failpoints.afterAdmissionOpened?.();
      const acquisition = await this.#advisoryLock.acquire(admission.handle.fd);
      if (acquisition.kind !== "Acquired") {
        const code = acquisition.kind === "Busy"
          ? "AdmissionBusy"
          : acquisition.kind === "Unsupported"
            ? "AdmissionUnsupported"
            : "AdmissionUnsafe";
        await releaseAdmissionHandle(this.#advisoryLock, admission.handle, false);
        admission = undefined;
        return {
          kind: "Rejected",
          failure: failure(
            code,
            "admission",
            "reason" in acquisition ? acquisition.reason : "capsule admission is busy",
            path.join(root.path, ADMISSION_FILE),
          ),
        };
      }
      acquired = true;
      await this.#failpoints.afterAdmissionAcquired?.();
      await revalidateRoot(root);
      await revalidateAdmission(root, admission);

      let released = false;
      let inFlight = false;
      const heldAdmission = admission;
      const run = async <T extends CapsuleStoreReadResultV1 | CapsuleStoreCasResultV1>(
        phase: string,
        operation: () => Promise<T>,
      ): Promise<T> => {
        if (released) return rejectedReleasedSession(phase, this.#rootPath) as T;
        if (inFlight) return rejectedBusySession(phase, this.#rootPath) as T;
        inFlight = true;
        try {
          return await operation();
        } finally {
          inFlight = false;
        }
      };
      const access: CapsuleStateAccessV1 = Object.freeze({
        read: (): Promise<CapsuleStoreReadResultV1> => run("read", async () => {
          try {
            const observation = await this.#readState(root, heldAdmission, false);
            return observation === null
              ? {
                kind: "Rejected",
                failure: failure("StateInvalid", "read", "capsule state file is missing", this.#statePath()),
              }
              : { kind: "Observed", observation };
          } catch (error) {
            return {
              kind: "Rejected",
              failure: failure("RootUnsafe", "read", errorMessage(error), this.#rootPath),
            };
          }
        }),
        compareAndSet: async (
          input: Parameters<CapsuleStateAccessV1["compareAndSet"]>[0],
        ): Promise<CapsuleStoreCasResultV1> => run("compare-and-set", async () => {
          try {
            const observed = await this.#readState(root, heldAdmission, false);
            if (observed === null) {
              return {
                kind: "Rejected",
                failure: failure(
                  "StateInvalid",
                  "compare-and-set",
                  "capsule state file is missing",
                  this.#statePath(),
                ),
              };
            }
            if (observed.state.stateDigest !== input.expectedStateDigest) {
              return { kind: "Conflict", observation: observed };
            }
            return await this.#publish(root, heldAdmission, observed, input.nextState);
          } catch (error) {
            return {
              kind: "Rejected",
              failure: failure("RootUnsafe", "compare-and-set", errorMessage(error), this.#rootPath),
            };
          }
        }),
      });
      const session: CapsuleExclusiveSessionV1 = Object.freeze({
        access,
        release: async () => {
          if (released) return;
          if (inFlight) throw new Error("capsule exclusive session has an access call in flight");
          released = true;
          await releaseAdmissionHandle(this.#advisoryLock, heldAdmission.handle, true);
        },
      });
      admission = undefined;
      acquired = false;
      return Object.freeze({ kind: "Acquired", session });
    } catch (error) {
      if (admission !== undefined) {
        await releaseAdmissionHandle(this.#advisoryLock, admission.handle, acquired).catch(() => undefined);
      }
      return {
        kind: "Rejected",
        failure: failure(
          "AdmissionUnsafe",
          "admission",
          errorMessage(error),
          path.join(this.#rootPath, ADMISSION_FILE),
        ),
      };
    }
  }

  async acquireRawMigrationSession(): Promise<OpenExistingRawCapsuleSlotResultV1> {
    let admission: AdmissionHandleV1 | undefined;
    let acquired = false;
    try {
      const root = await verifyRoot(this.#rootPath);
      admission = await this.#openAdmission(root, false);
      await this.#failpoints.afterAdmissionOpened?.();
      const acquisition = await this.#advisoryLock.acquire(admission.handle.fd);
      if (acquisition.kind !== "Acquired") {
        const code = acquisition.kind === "Busy"
          ? "AdmissionBusy"
          : acquisition.kind === "Unsupported"
            ? "AdmissionUnsupported"
            : "AdmissionUnsafe";
        await releaseAdmissionHandle(this.#advisoryLock, admission.handle, false);
        admission = undefined;
        return Object.freeze({
          kind: "Rejected",
          failure: failure(
            code,
            "raw-slot-admission",
            "reason" in acquisition ? acquisition.reason : "capsule admission is busy",
            path.join(root.path, ADMISSION_FILE),
          ),
        });
      }
      acquired = true;
      await this.#failpoints.afterAdmissionAcquired?.();
      await revalidateRoot(root);
      await revalidateAdmission(root, admission);

      let released = false;
      let inFlight = false;
      const heldAdmission = admission;
      const session: RawCapsuleSlotSessionV1 = Object.freeze({
        read: async () => {
          if (released) return rejectedRawSlot("read", this.#rootPath);
          if (inFlight) return rejectedRawSlotBusy("read", this.#rootPath);
          inFlight = true;
          try {
            const observation = await this.#readRawState(root, heldAdmission, false);
            return observation === null
              ? Object.freeze({
                kind: "Rejected" as const,
                failure: failure("StateInvalid", "raw-slot-read", "capsule state file is missing", this.#statePath()),
              })
              : Object.freeze({ kind: "Observed" as const, observation });
          } catch (error) {
            return Object.freeze({
              kind: "Rejected" as const,
              failure: failure("RootUnsafe", "raw-slot-read", errorMessage(error), this.#rootPath),
            });
          } finally {
            inFlight = false;
          }
        },
        compareAndSet: async (
          input: Parameters<RawCapsuleSlotSessionV1["compareAndSet"]>[0],
        ) => {
          if (released) return rejectedRawSlot("compare-and-set", this.#rootPath);
          if (inFlight) return rejectedRawSlotBusy("compare-and-set", this.#rootPath);
          inFlight = true;
          try {
            const result = await this.#publish(
              root,
              heldAdmission,
              Object.freeze({ bytes: input.expectedBytes.slice() }),
              input.nextState,
            );
            return result.kind === "Conflict"
              ? Object.freeze({
                kind: "Rejected" as const,
                failure: failure(
                  "StateChanged",
                  "raw-slot-compare-and-set",
                  "capsule state changed during legacy retirement",
                  this.#statePath(),
                ),
              })
              : result;
          } finally {
            inFlight = false;
          }
        },
        release: async () => {
          if (released) return;
          if (inFlight) throw new Error("capsule raw-slot session has an access call in flight");
          released = true;
          await releaseAdmissionHandle(this.#advisoryLock, heldAdmission.handle, true);
        },
      });
      admission = undefined;
      acquired = false;
      return Object.freeze({ kind: "Acquired", session });
    } catch (error) {
      if (admission !== undefined) {
        await releaseAdmissionHandle(this.#advisoryLock, admission.handle, acquired).catch(() => undefined);
      }
      return Object.freeze({
        kind: "Rejected",
        failure: failure("AdmissionUnsafe", "raw-slot-admission", errorMessage(error), this.#rootPath),
      });
    }
  }

  async #withAdmission<T extends CapsuleStoreReadResultV1 | CapsuleStoreCasResultV1>(
    root: RootIdentityV1,
    operation: (admission: AdmissionHandleV1) => Promise<T>,
    createAdmission = false,
  ): Promise<T> {
    let admission: AdmissionHandleV1 | undefined;
    let acquired = false;
    try {
      admission = await this.#openAdmission(root, createAdmission);
      await this.#failpoints.afterAdmissionOpened?.();
      const result = await this.#advisoryLock.acquire(admission.handle.fd);
      if (result.kind !== "Acquired") {
        const code = result.kind === "Busy"
          ? "AdmissionBusy"
          : result.kind === "Unsupported"
            ? "AdmissionUnsupported"
            : "AdmissionUnsafe";
        return {
          kind: "Rejected",
          failure: failure(code, "admission", "reason" in result ? result.reason : "capsule admission is busy", admission.path),
        } as T;
      }
      acquired = true;
      await this.#failpoints.afterAdmissionAcquired?.();
      await revalidateRoot(root);
      await revalidateAdmission(root, admission);
      return await operation(admission);
    } catch (error) {
      return {
        kind: "Rejected",
        failure: failure(
          "AdmissionUnsafe",
          "admission",
          errorMessage(error),
          admission?.path ?? path.join(root.path, ADMISSION_FILE),
        ),
      } as T;
    } finally {
      if (admission !== undefined) {
        await releaseAdmissionHandle(this.#advisoryLock, admission.handle, acquired);
      }
    }
  }

  async #openAdmission(root: RootIdentityV1, create: boolean): Promise<AdmissionHandleV1> {
    await revalidateRoot(root);
    const admissionPath = path.join(root.path, ADMISSION_FILE);
    const handle = await open(
      admissionPath,
      constants.O_RDWR
        | constants.O_NOFOLLOW
        | (create ? constants.O_CREAT | constants.O_EXCL : 0),
      0o600,
    );
    try {
      const opened = await handle.stat({ bigint: true });
      const identity = identityOf(opened);
      if (!opened.isFile() || opened.isSymbolicLink() || identity.nlink !== 1n || (identity.mode & 0o777n) !== 0o600n) {
        throw new Error("capsule admission entry must be a private single-link regular file");
      }
      const admission = Object.freeze({ handle, path: admissionPath, identity });
      await revalidateAdmission(root, admission);
      return admission;
    } catch (error) {
      await handle.close().catch(() => undefined);
      throw error;
    }
  }

  async #readState(
    root: RootIdentityV1,
    admission: AdmissionHandleV1,
    allowMissing: boolean,
  ): Promise<CapsuleStateObservationV1 | null> {
    const raw = await this.#readRawState(root, admission, allowMissing);
    if (raw === null) return null;
    const state = parseCapsuleStateBytes(raw.bytes, this.#registry, this.#limits);
    return Object.freeze({ state, bytes: raw.bytes.slice() });
  }

  async #readRawState(
    root: RootIdentityV1,
    admission: AdmissionHandleV1,
    allowMissing: boolean,
  ): Promise<RawCapsuleSlotObservationV1 | null> {
    await revalidateRoot(root);
    await revalidateAdmission(root, admission);
    const statePath = this.#statePath();
    let visible;
    try {
      visible = await lstat(statePath, { bigint: true });
    } catch (error) {
      if (allowMissing && isCode(error, "ENOENT")) return null;
      throw error;
    }
    if (
      !visible.isFile()
      || visible.isSymbolicLink()
      || visible.nlink !== 1n
      || (visible.mode & 0o777n) !== 0o600n
    ) {
      throw new Error("capsule state must be a single-link regular file");
    }
    const handle = await open(statePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const opened = await handle.stat({ bigint: true });
      if (
        !sameIdentity(visible, opened)
        || !opened.isFile()
        || opened.nlink !== 1n
        || (opened.mode & 0o777n) !== 0o600n
      ) {
        throw new Error("capsule state changed while opening");
      }
      const bytes = await readBounded(handle, this.#limits.stateBytes);
      const after = await lstat(statePath, { bigint: true });
      if (
        !sameIdentity(opened, after)
        || !after.isFile()
        || after.nlink !== 1n
        || (after.mode & 0o777n) !== 0o600n
      ) {
        throw new Error("capsule state changed while reading");
      }
      if (await realpath(statePath) !== statePath) throw new Error("capsule state is aliased");
      return Object.freeze({ bytes: bytes.slice() });
    } finally {
      await handle.close();
    }
  }

  async #publish(
    root: RootIdentityV1,
    admission: AdmissionHandleV1,
    expected: CapsuleStateObservationV1 | RawCapsuleSlotObservationV1 | null,
    nextState: CapsuleStateEnvelopeV1,
  ): Promise<CapsuleStoreCasResultV1> {
    const bytes = encodeCapsuleState(nextState, this.#limits);
    const tempPath = path.join(root.path, `${TEMP_PREFIX}${randomBytes(16).toString("hex")}`);
    let tempHandle: FileHandle | undefined;
    let tempIdentity: FileIdentityV1 | undefined;
    let published = false;
    try {
      await revalidateRoot(root);
      await revalidateAdmission(root, admission);
      tempHandle = await open(
        tempPath,
        constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | constants.O_NOFOLLOW,
        0o600,
      );
      const status = await tempHandle.stat({ bigint: true });
      tempIdentity = identityOf(status);
      if (!status.isFile() || status.nlink !== 1n || (status.mode & 0o777n) !== 0o600n) {
        throw new Error("capsule state temporary is not a private single-link regular file");
      }
      await this.#failpoints.afterTemporaryCreated?.(tempPath);
      await tempHandle.writeFile(bytes);
      await tempHandle.sync();
      const afterWrite = await tempHandle.stat({ bigint: true });
      if (!sameFileIdentity(tempIdentity, identityOf(afterWrite)) || afterWrite.size !== BigInt(bytes.byteLength)) {
        throw new Error("capsule state temporary identity or size changed while writing");
      }
      const verifiedBytes = await readBounded(tempHandle, this.#limits.stateBytes, 0);
      if (!bytesEqual(bytes, verifiedBytes)) throw new Error("capsule state temporary bytes failed verification");
      await revalidateTemporary(root, tempPath, tempIdentity);
      await this.#failpoints.beforeStatePublication?.(tempPath);
      await revalidateRoot(root);
      await revalidateAdmission(root, admission);
      const currentRaw = await this.#readRawState(root, admission, expected === null);
      if (
        (expected === null && currentRaw !== null)
        || (expected !== null && (currentRaw === null || !bytesEqual(currentRaw.bytes, expected.bytes)))
      ) {
        if (currentRaw === null) throw new Error("capsule state disappeared before publication");
        if (tempIdentity === undefined) throw new Error("capsule temporary identity is unavailable during conflict");
        const cleanup = await this.#cleanupTemporary(root, tempPath, tempIdentity);
        if (expected !== null && !("state" in expected)) {
          const changed = failure(
            "StateChanged",
            "raw-slot-compare-and-set",
            "capsule state changed during legacy retirement",
            this.#statePath(),
          );
          return {
            kind: "Rejected",
            failure: cleanup === null ? changed : Object.freeze({ ...changed, cleanup }),
          };
        }
        if (cleanup !== null) {
          return {
            kind: "Rejected",
            failure: Object.freeze({
              ...failure(
                "StatePublicationFailed",
                "compare-and-set-conflict",
                "capsule state conflict temporary cleanup failed",
                tempPath,
              ),
              cleanup,
            }),
          };
        }
        const current = Object.freeze({
          state: parseCapsuleStateBytes(currentRaw.bytes, this.#registry, this.#limits),
          bytes: currentRaw.bytes.slice(),
        });
        return { kind: "Conflict", observation: current };
      }
      await this.#failpoints.beforeFinalStatePublication?.(this.#statePath());
      await revalidateTemporary(root, tempPath, tempIdentity);
      await revalidateRoot(root);
      await revalidateAdmission(root, admission);
      await rename(tempPath, this.#statePath());
      published = true;
      await this.#failpoints.afterStatePublication?.(this.#statePath());
      const visible = await lstat(this.#statePath(), { bigint: true });
      if (
        !sameFileIdentity(tempIdentity, identityOf(visible))
        || !visible.isFile()
        || visible.nlink !== 1n
        || (visible.mode & 0o777n) !== 0o600n
      ) {
        throw new Error("published capsule state does not match the verified temporary");
      }
      if (await realpath(this.#statePath()) !== this.#statePath()) throw new Error("published capsule state is aliased");
      const rootHandle = await open(root.path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try {
        await rootHandle.sync();
      } finally {
        await rootHandle.close();
      }
      return { kind: "Committed", observation: Object.freeze({ state: nextState, bytes: bytes.slice() }) };
    } catch (error) {
      const primary = failure(
        "StatePublicationFailed",
        "publish-state",
        errorMessage(error),
        published ? this.#statePath() : tempPath,
      );
      const cleanup = tempIdentity === undefined || published
        ? null
        : await this.#cleanupTemporary(root, tempPath, tempIdentity);
      if (published) {
        let observation: CapsuleStateObservationV1 | undefined;
        try {
          observation = await this.#readState(root, admission, false) ?? undefined;
        } catch {
          observation = undefined;
        }
        return {
          kind: "Unsettled",
          intendedState: nextState,
          ...(observation === undefined ? {} : { observation }),
          failure: primary,
        };
      }
      return {
        kind: "Rejected",
        failure: cleanup === null ? primary : Object.freeze({ ...primary, cleanup }),
      };
    } finally {
      await tempHandle?.close().catch(() => undefined);
    }
  }

  async #cleanupTemporary(
    root: RootIdentityV1,
    tempPath: string,
    expected: FileIdentityV1,
  ): Promise<NonNullable<CapsuleFailure["cleanup"]> | null> {
    try {
      await this.#failpoints.beforeTemporaryCleanup?.(tempPath);
      await revalidateRoot(root);
      requirePrivateTemporary(root.path, tempPath);
      await revalidateTemporary(root, tempPath, expected);
      await revalidateTemporary(root, tempPath, expected);
      await unlink(tempPath);
      return null;
    } catch (error) {
      if (isCode(error, "ENOENT")) return null;
      const blocked = error instanceof UnsafeCleanupError;
      return Object.freeze({
        code: blocked ? "TemporaryCleanupBlocked" : "TemporaryCleanupFailed",
        message: errorMessage(error),
        path: tempPath,
      });
    }
  }

  #statePath(): string {
    return path.join(this.#rootPath, STATE_FILE);
  }
}

async function preflightAdvisoryLock(
  parentPath: string,
  advisoryLock: CapsuleAdvisoryLockV1,
): Promise<CapsuleFailure | null> {
  let parentHandle: FileHandle | undefined;
  let acquired = false;
  let outcome: CapsuleFailure | null = null;
  try {
    await verifyCanonicalDirectory(parentPath, "capsule root parent");
    parentHandle = await open(
      parentPath,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    );
    const result = await advisoryLock.acquire(parentHandle.fd);
    if (result.kind !== "Acquired") {
      const code = result.kind === "Busy"
        ? "AdmissionBusy"
        : result.kind === "Unsupported"
          ? "AdmissionUnsupported"
          : "AdmissionUnsafe";
      outcome = failure(
        code,
        "admission-preflight",
        "reason" in result ? result.reason : "capsule admission preflight is busy",
        parentPath,
      );
    } else {
      acquired = true;
    }
  } catch (error) {
    outcome = failure("AdmissionUnsafe", "admission-preflight", errorMessage(error), parentPath);
  }
  if (parentHandle === undefined) return outcome;
  try {
    await releaseAdmissionHandle(advisoryLock, parentHandle, acquired);
  } catch (error) {
    return failure("AdmissionUnsafe", "admission-preflight-release", errorMessage(error), parentPath);
  }
  return outcome;
}

async function verifyCanonicalDirectory(candidate: string, label: string): Promise<RootIdentityV1> {
  const absolute = requireCanonicalAbsolutePath(candidate, label);
  const status = await lstat(absolute, { bigint: true });
  if (!status.isDirectory() || status.isSymbolicLink() || await realpath(absolute) !== absolute) {
    throw new Error(`${label} is not a canonical non-symlink directory`);
  }
  return Object.freeze({ path: absolute, dev: status.dev, ino: status.ino });
}

async function verifyRoot(rootPath: string): Promise<RootIdentityV1> {
  const root = await verifyCanonicalDirectory(rootPath, "capsule root");
  const rootStatus = await lstat(rootPath, { bigint: true });
  if ((rootStatus.mode & 0o777n) !== 0o700n) {
    throw new Error("capsule root must have mode 0700");
  }
  const parent = await verifyCanonicalDirectory(dirname(rootPath), "capsule root parent");
  if (dirname(root.path) !== parent.path || basename(root.path) !== basename(rootPath)) {
    throw new Error("capsule root is not an exact direct child of its canonical parent");
  }
  return root;
}

async function revalidateRoot(root: RootIdentityV1): Promise<void> {
  const current = await lstat(root.path, { bigint: true });
  if (
    !current.isDirectory()
    || current.isSymbolicLink()
    || current.dev !== root.dev
    || current.ino !== root.ino
    || (current.mode & 0o777n) !== 0o700n
    || await realpath(root.path) !== root.path
  ) {
    throw new Error("capsule root changed");
  }
}

async function revalidateAdmission(root: RootIdentityV1, admission: AdmissionHandleV1): Promise<void> {
  await revalidateRoot(root);
  if (dirname(admission.path) !== root.path || basename(admission.path) !== ADMISSION_FILE) {
    throw new Error("admission is not the exact stable direct child");
  }
  const visible = await lstat(admission.path, { bigint: true });
  const opened = await admission.handle.stat({ bigint: true });
  if (
    !visible.isFile()
    || visible.isSymbolicLink()
    || !opened.isFile()
    || opened.isSymbolicLink()
    || visible.nlink !== 1n
    || opened.nlink !== 1n
    || (visible.mode & 0o777n) !== 0o600n
    || (opened.mode & 0o777n) !== 0o600n
    || !sameFileIdentity(admission.identity, identityOf(visible))
    || !sameFileIdentity(admission.identity, identityOf(opened))
    || await realpath(admission.path) !== admission.path
  ) {
    throw new Error("capsule admission entry changed or is aliased");
  }
}

async function revalidateTemporary(root: RootIdentityV1, tempPath: string, expected: FileIdentityV1): Promise<void> {
  requirePrivateTemporary(root.path, tempPath);
  const visible = await lstat(tempPath, { bigint: true });
  if (
    !visible.isFile()
    || visible.isSymbolicLink()
    || visible.nlink !== 1n
    || (visible.mode & 0o777n) !== 0o600n
    || !sameFileIdentity(expected, identityOf(visible))
    || await realpath(tempPath) !== tempPath
  ) {
    throw new UnsafeCleanupError("capsule temporary changed, is linked, or is aliased");
  }
}

function requirePrivateTemporary(rootPath: string, tempPath: string): void {
  if (
    dirname(tempPath) !== rootPath
    || !basename(tempPath).startsWith(TEMP_PREFIX)
    || basename(tempPath).length <= TEMP_PREFIX.length
    || path.resolve(tempPath) !== tempPath
  ) {
    throw new UnsafeCleanupError("capsule temporary is not the exact private direct child");
  }
}

async function readBounded(handle: FileHandle, maximum: number, position = 0): Promise<Uint8Array> {
  const before = await handle.stat({ bigint: true });
  if (before.size > BigInt(maximum)) throw new Error("capsule state exceeds its serialized byte bound");
  const result = Buffer.allocUnsafe(Number(before.size) + 1);
  let offset = 0;
  while (offset < result.byteLength) {
    const read = await handle.read(result, offset, result.byteLength - offset, position + offset);
    if (read.bytesRead === 0) break;
    offset += read.bytesRead;
  }
  const after = await handle.stat({ bigint: true });
  if (after.size !== before.size || BigInt(offset) !== after.size) {
    throw new Error("capsule state size changed while reading");
  }
  if (offset > maximum) throw new Error("capsule state exceeds its serialized byte bound");
  return new Uint8Array(result.buffer, result.byteOffset, offset).slice();
}

function identityOf(status: Readonly<{
  dev: bigint;
  ino: bigint;
  mode: bigint;
  nlink: bigint;
  size: bigint;
}>): FileIdentityV1 {
  return Object.freeze({
    dev: status.dev,
    ino: status.ino,
    mode: status.mode,
    nlink: status.nlink,
    size: status.size,
  });
}

function sameIdentity(
  left: Readonly<{ dev: bigint; ino: bigint }>,
  right: Readonly<{ dev: bigint; ino: bigint }>,
): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameFileIdentity(left: FileIdentityV1, right: FileIdentityV1): boolean {
  return sameIdentity(left, right);
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

function requireCanonicalAbsolutePath(value: string, label: string): string {
  if (!path.isAbsolute(value) || path.normalize(value) !== value || path.resolve(value) !== value) {
    throw new Error(`${label} must be absolute and normalized`);
  }
  return value;
}

async function releaseAdmissionHandle(
  advisoryLock: CapsuleAdvisoryLockV1,
  handle: FileHandle,
  acquired: boolean,
): Promise<void> {
  let unlocked = false;
  let unlockError: unknown;
  if (acquired) {
    try {
      const result = await advisoryLock.release(handle.fd);
      if (result.kind === "Released") unlocked = true;
      else unlockError = new Error(result.reason);
    } catch (error) {
      unlockError = error;
    }
  }

  let closed = false;
  let closeError: unknown;
  try {
    await handle.close();
    closed = true;
  } catch (error) {
    closeError = error;
  }

  if (acquired ? unlocked || closed : closed) return;
  throw new Error(
    `capsule admission release failed: unlock=${errorMessage(unlockError)}; close=${errorMessage(closeError)}`,
  );
}

function failure(
  code: CapsuleFailure["code"],
  phase: string,
  message: string,
  failurePath?: string,
): CapsuleFailure {
  return Object.freeze({ code, phase, message, ...(failurePath === undefined ? {} : { path: failurePath }) });
}

class UnsafeCleanupError extends Error {}

function isCode(error: unknown, code: string): boolean {
  return error !== null
    && typeof error === "object"
    && "code" in error
    && (error as { code?: unknown }).code === code;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function rejectedReleasedSession(
  phase: string,
  path: string,
): Readonly<{ kind: "Rejected"; failure: CapsuleFailure }> {
  return {
    kind: "Rejected",
    failure: failure("AdmissionUnsafe", phase, "capsule exclusive session is released", path),
  };
}

function rejectedBusySession(
  phase: string,
  path: string,
): Readonly<{ kind: "Rejected"; failure: CapsuleFailure }> {
  return {
    kind: "Rejected",
    failure: failure("AdmissionBusy", phase, "capsule exclusive session already has a call in flight", path),
  };
}

function rejectedRawSlot(
  phase: string,
  path: string,
): Readonly<{ kind: "Rejected"; failure: CapsuleFailure }> {
  return Object.freeze({
    kind: "Rejected",
    failure: failure("AdmissionUnsafe", `raw-slot-${phase}`, "capsule raw-slot session is released", path),
  });
}

function rejectedRawSlotBusy(
  phase: string,
  path: string,
): Readonly<{ kind: "Rejected"; failure: CapsuleFailure }> {
  return Object.freeze({
    kind: "Rejected",
    failure: failure("AdmissionBusy", `raw-slot-${phase}`, "capsule raw-slot session already has a call in flight", path),
  });
}
