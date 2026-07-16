import { execFile, spawn } from "node:child_process";
import {
  fstatSync,
  type BigIntStats,
} from "node:fs";
import {
  link,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  readlink,
  rename,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { CapsuleRoot } from "../../../src/lib/agent-plugins/layout";
import {
  type CapsuleAdvisoryLockV1,
  createBunFfiCapsuleAdvisoryLock,
  type NativeFlockCallV1,
} from "../../../src/lib/agent-plugins/undo/advisory-lock";
import { openNodeCapsuleStateStoreV1 } from "../../../src/lib/agent-plugins/undo/node-store";
import { CapsuleControllerWriterV1 } from "../../../src/lib/agent-plugins/undo/writer";
import {
  FIXTURE_OWNER,
  FIXTURE_TARGETS,
  FIXTURE_VERSION,
  createFixtureRegistry,
  fixtureAction,
  type FixtureWorldV1,
} from "./fixture-protocol";
import { createOwnedFixtureRoot } from "./owned-fixture-root";

const STATE_FILE = "capsule-state-v1.json";
const LOCK_FILE = ".capsule-admission-v1.lock";
const TEMP_PREFIX = ".capsule-state-v1-tmp-";

describe("path-safe filesystem capsule store", () => {
  it("initializes only a newly owned root, persists exact state, and keeps reads metadata-stable", async () => {
    const fixture = await createOwnedFixtureRoot();
    const priorHome = process.env.HOME;
    const priorRawrDataDir = process.env.RAWR_DATA_DIR;
    try {
      const world = emptyWorld();
      const registry = createFixtureRegistry(world);
      const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
      const store = await openedStore(root, registry);
      const before = await stateStatus(root);
      const first = await store.read();
      expect(first.kind).toBe("Observed");
      const after = await stateStatus(root);
      expect(identityAndMetadata(after)).toEqual(identityAndMetadata(before));

      process.env.RAWR_DATA_DIR = path.join(fixture.path, "hostile-data-root");
      process.env.HOME = path.join(fixture.path, "hostile-home");
      const reopened = await openedStore(root, registry);
      const second = await reopened.read();
      expect(second).toEqual(first);
      expect(await readdir(fixture.path)).toEqual(["last-operation-v1"]);
    } finally {
      restoreEnvironment("HOME", priorHome);
      restoreEnvironment("RAWR_DATA_DIR", priorRawrDataDir);
      await fixture.cleanup();
    }
  });

  it("keeps filesystem authority bytes and metadata unchanged during aggregate preflight", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
      const registry = createFixtureRegistry(emptyWorld());
      const store = await openedStore(root, registry);
      const writer = new CapsuleControllerWriterV1({ store, registry });
      const beforeStatus = await stateStatus(root);
      const beforeBytes = await readFile(path.join(root, STATE_FILE));

      expect(await writer.preflight({
        owner: FIXTURE_OWNER,
        ownerProtocolVersion: FIXTURE_VERSION,
        contentAuthority: "fixture-content-authority",
        targets: FIXTURE_TARGETS,
        actions: [{ action: fixtureAction("plugins/a/file") }],
      })).toEqual({ kind: "Accepted" });

      const afterStatus = await stateStatus(root);
      expect(await readFile(path.join(root, STATE_FILE))).toEqual(beforeBytes);
      expect(identityAndMetadata(afterStatus)).toEqual(identityAndMetadata(beforeStatus));
      expect((await readdir(root)).sort()).toEqual([LOCK_FILE, STATE_FILE].sort());
    } finally {
      await fixture.cleanup();
    }
  });

  it("rejects a pre-existing empty root and does not repair it", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const root = path.join(fixture.path, "last-operation-v1");
      await mkdir(root, { mode: 0o700 });
      const opened = await openNodeCapsuleStateStoreV1({
        root: root as CapsuleRoot,
        registry: createFixtureRegistry(emptyWorld()),
        advisoryLock: createInProcessAdvisoryLock(),
      });
      expect(opened).toMatchObject({ kind: "Rejected", failure: { code: "StateInvalid" } });
      expect(await readdir(root)).toEqual([]);
    } finally {
      await fixture.cleanup();
    }
  });

  it("never recreates a missing stable admission entry after initial root creation", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
      const registry = createFixtureRegistry(emptyWorld());
      const initialized = await openedStore(root, registry);
      await unlink(path.join(root, LOCK_FILE));

      const reopened = await openNodeCapsuleStateStoreV1({
        root,
        registry,
        advisoryLock: createInProcessAdvisoryLock(),
      });
      expect(reopened).toMatchObject({ kind: "Rejected", failure: { code: "AdmissionUnsafe" } });
      expect(await initialized.read()).toMatchObject({ kind: "Rejected", failure: { code: "AdmissionUnsafe" } });
      expect(await readdir(root)).toEqual([STATE_FILE]);
    } finally {
      await fixture.cleanup();
    }
  });

  it("rejects a missing state under the retained admission without recreating state", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
      const registry = createFixtureRegistry(emptyWorld());
      await openedStore(root, registry);
      await unlink(path.join(root, STATE_FILE));

      const reopened = await openNodeCapsuleStateStoreV1({
        root,
        registry,
        advisoryLock: createInProcessAdvisoryLock(),
      });
      expect(reopened).toMatchObject({ kind: "Rejected", failure: { code: "StateInvalid" } });
      expect(await readdir(root)).toEqual([LOCK_FILE]);
    } finally {
      await fixture.cleanup();
    }
  });

  it("prevents an existing-root opener from overtaking first-time state publication", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
      const registry = createFixtureRegistry(emptyWorld());
      const advisoryLock = createInodeAdvisoryLock();
      let reportAdmissionOpened!: () => void;
      let continueInitialization!: () => void;
      const admissionOpened = new Promise<void>((resolve) => {
        reportAdmissionOpened = resolve;
      });
      const initializationMayContinue = new Promise<void>((resolve) => {
        continueInitialization = resolve;
      });

      const firstOpening = openNodeCapsuleStateStoreV1({
        root,
        registry,
        advisoryLock,
        failpoints: {
          async afterAdmissionOpened() {
            reportAdmissionOpened();
            await initializationMayContinue;
          },
        },
      });
      await admissionOpened;

      let concurrentAdmissionAcquired = false;
      const concurrent = await openNodeCapsuleStateStoreV1({
        root,
        registry,
        advisoryLock,
        failpoints: {
          afterAdmissionAcquired() {
            concurrentAdmissionAcquired = true;
          },
        },
      });
      expect(concurrent).toMatchObject({
        kind: "Rejected",
        failure: { code: "StateInvalid", phase: "initialize" },
      });
      expect(concurrentAdmissionAcquired).toBe(false);

      continueInitialization();
      const first = await firstOpening;
      expect(first).toMatchObject({ kind: "Opened" });
      const converged = await openNodeCapsuleStateStoreV1({ root, registry, advisoryLock });
      expect(converged).toMatchObject({ kind: "Opened" });
    } finally {
      await fixture.cleanup();
    }
  });

  it("rejects an aliased root and remains independent of cwd and a deleted content locator", async () => {
    const fixture = await createOwnedFixtureRoot();
    const priorCwd = process.cwd();
    try {
      const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
      const registry = createFixtureRegistry(emptyWorld());
      const store = await openedStore(root, registry);
      const contentLocator = path.join(fixture.path, "content-locator.txt");
      await writeFile(contentLocator, "locator only\n");
      await unlink(contentLocator);
      process.chdir(fixture.path);
      expect(await store.read()).toMatchObject({ kind: "Observed" });
      process.chdir(priorCwd);

      const alias = path.join(fixture.path, "aliased-capsule-root");
      await symlink(root, alias);
      const openedAlias = await openNodeCapsuleStateStoreV1({
        root: alias as CapsuleRoot,
        registry,
        advisoryLock: createInProcessAdvisoryLock(),
      });
      expect(openedAlias).toMatchObject({ kind: "Rejected", failure: { code: "RootUnsafe" } });
    } finally {
      process.chdir(priorCwd);
      await fixture.cleanup();
    }
  });

  it("preserves symlink, directory, and hardlink substitutions of the state slot", async () => {
    for (const substitution of ["symlink", "directory", "hardlink"] as const) {
      const fixture = await createOwnedFixtureRoot();
      try {
        const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
        const store = await openedStore(root, createFixtureRegistry(emptyWorld()));
        const statePath = path.join(root, STATE_FILE);
        if (substitution === "symlink") {
          const prior = path.join(root, "preserved-prior-state");
          const outside = path.join(fixture.path, "outside.txt");
          await rename(statePath, prior);
          await writeFile(outside, "outside\n", { mode: 0o600 });
          await symlink(outside, statePath);
          expect(await store.read()).toMatchObject({ kind: "Rejected" });
          expect(await readFile(outside, "utf8")).toBe("outside\n");
          expect(await readlink(statePath)).toBe(outside);
        } else if (substitution === "directory") {
          await rename(statePath, path.join(root, "preserved-prior-state"));
          await mkdir(statePath, { mode: 0o700 });
          expect(await store.read()).toMatchObject({ kind: "Rejected" });
          expect((await lstat(statePath)).isDirectory()).toBe(true);
        } else {
          const alias = path.join(root, "state-hardlink-alias");
          await link(statePath, alias);
          expect(await store.read()).toMatchObject({ kind: "Rejected" });
          expect((await lstat(alias, { bigint: true })).nlink).toBe(2n);
        }
      } finally {
        await fixture.cleanup();
      }
    }
  });

  it("preserves a replaced or hardlinked stable admission entry and never treats it as state", async () => {
    const replacedFixture = await createOwnedFixtureRoot();
    try {
      const root = path.join(replacedFixture.path, "last-operation-v1") as CapsuleRoot;
      const registry = createFixtureRegistry(emptyWorld());
      await openedStore(root, registry);
      let replaced = false;
      const opened = await openNodeCapsuleStateStoreV1({
        root,
        registry,
        advisoryLock: createInProcessAdvisoryLock(),
        failpoints: {
          async afterAdmissionAcquired() {
            if (replaced) return;
            replaced = true;
            await rename(path.join(root, LOCK_FILE), path.join(root, "preserved-old-lock"));
            await writeFile(path.join(root, LOCK_FILE), "replacement\n", { mode: 0o600 });
          },
        },
      });
      expect(opened).toMatchObject({ kind: "Rejected", failure: { code: "AdmissionUnsafe" } });
      expect(await readFile(path.join(root, LOCK_FILE), "utf8")).toBe("replacement\n");
      expect(await lstat(path.join(root, "preserved-old-lock"))).toBeDefined();
    } finally {
      await replacedFixture.cleanup();
    }

    const linkedFixture = await createOwnedFixtureRoot();
    try {
      const root = path.join(linkedFixture.path, "last-operation-v1") as CapsuleRoot;
      const registry = createFixtureRegistry(emptyWorld());
      const store = await openedStore(root, registry);
      await link(path.join(root, LOCK_FILE), path.join(root, "lock-hardlink-alias"));
      expect(await store.read()).toMatchObject({ kind: "Rejected", failure: { code: "AdmissionUnsafe" } });
      expect((await lstat(path.join(root, LOCK_FILE), { bigint: true })).nlink).toBe(2n);
    } finally {
      await linkedFixture.cleanup();
    }
  });

  it("preserves symlink and directory substitutions of the stable admission entry", async () => {
    for (const substitution of ["symlink", "directory"] as const) {
      const fixture = await createOwnedFixtureRoot();
      try {
        const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
        const registry = createFixtureRegistry(emptyWorld());
        await openedStore(root, registry);
        const lockPath = path.join(root, LOCK_FILE);
        const priorLock = path.join(root, "preserved-prior-lock");
        await rename(lockPath, priorLock);
        if (substitution === "symlink") await symlink(priorLock, lockPath);
        else await mkdir(lockPath, { mode: 0o700 });
        const opened = await openNodeCapsuleStateStoreV1({
          root,
          registry,
          advisoryLock: createInProcessAdvisoryLock(),
        });
        expect(opened).toMatchObject({ kind: "Rejected", failure: { code: "AdmissionUnsafe" } });
        const status = await lstat(lockPath);
        expect(substitution === "symlink" ? status.isSymbolicLink() : status.isDirectory()).toBe(true);
      } finally {
        await fixture.cleanup();
      }
    }
  });

  it("rejects final publication after replacement, symlink, or hardlink substitution of the locked admission entry", async () => {
    for (const substitution of ["replacement", "symlink", "hardlink"] as const) {
      const fixture = await createOwnedFixtureRoot();
      try {
        const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
        const registry = createFixtureRegistry(emptyWorld());
        const initial = await openedStore(root, registry);
        const initialRead = await initial.read();
        if (initialRead.kind !== "Observed") throw new Error(initialRead.failure.message);
        const beforeStatus = await stateStatus(root);
        const beforeBytes = await readFile(path.join(root, STATE_FILE));
        const lockPath = path.join(root, LOCK_FILE);
        const preservedLock = path.join(root, `preserved-final-lock-${substitution}`);
        const hardlinkAlias = path.join(root, "final-lock-hardlink-alias");
        let substituted = false;
        const opened = await openNodeCapsuleStateStoreV1({
          root,
          registry,
          advisoryLock: createInProcessAdvisoryLock(),
          failpoints: {
            async beforeFinalStatePublication() {
              if (substituted) return;
              substituted = true;
              if (substitution === "hardlink") {
                await link(lockPath, hardlinkAlias);
                return;
              }
              await rename(lockPath, preservedLock);
              if (substitution === "replacement") {
                await writeFile(lockPath, "replacement\n", { flag: "wx", mode: 0o600 });
              } else {
                await symlink(preservedLock, lockPath);
              }
            },
          },
        });
        if (opened.kind !== "Opened") throw new Error(opened.failure.message);
        const writer = new CapsuleControllerWriterV1({ store: opened.store, registry });
        const result = await writer.begin(fixtureBeginInput(`plugins/a/final-${substitution}`));

        expect(result).toMatchObject({
          kind: "Rejected",
          failure: { code: "StatePublicationFailed" },
        });
        expect(substituted).toBe(true);
        expect(await readFile(path.join(root, STATE_FILE))).toEqual(beforeBytes);
        expect(identityAndMetadata(await stateStatus(root))).toEqual(identityAndMetadata(beforeStatus));
        expect((await readdir(root)).filter((entry) => entry.startsWith(TEMP_PREFIX))).toEqual([]);
        if (substitution === "replacement") {
          expect(await readFile(lockPath, "utf8")).toBe("replacement\n");
          expect((await lstat(preservedLock)).isFile()).toBe(true);
        } else if (substitution === "symlink") {
          expect((await lstat(lockPath)).isSymbolicLink()).toBe(true);
          expect(await readlink(lockPath)).toBe(preservedLock);
          expect((await lstat(preservedLock)).isFile()).toBe(true);
        } else {
          expect((await lstat(lockPath, { bigint: true })).nlink).toBe(2n);
          expect((await lstat(hardlinkAlias, { bigint: true })).nlink).toBe(2n);
        }
      } finally {
        await fixture.cleanup();
      }
    }
  });

  it("preserves a substituted private temporary and reports cleanup blocking without state mutation", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
      const registry = createFixtureRegistry(emptyWorld());
      const initial = await openedStore(root, registry);
      const initialRead = await initial.read();
      if (initialRead.kind !== "Observed") throw new Error("initial state unavailable");
      let preservedTemporary: string | undefined;
      const opened = await openNodeCapsuleStateStoreV1({
        root,
        registry,
        advisoryLock: createInProcessAdvisoryLock(),
        failpoints: {
          async afterTemporaryCreated(temporaryPath) {
            preservedTemporary = `${temporaryPath}.owned-original`;
            await rename(temporaryPath, preservedTemporary);
            await symlink(path.join(fixture.path, "outside-target"), temporaryPath);
          },
        },
      });
      if (opened.kind !== "Opened") throw new Error(opened.failure.message);
      const writer = new CapsuleControllerWriterV1({ store: opened.store, registry });
      const result = await writer.begin({
        owner: FIXTURE_OWNER,
        ownerProtocolVersion: FIXTURE_VERSION,
        contentAuthority: "fixture-content-authority",
        targets: FIXTURE_TARGETS,
        actions: [{ action: fixtureAction("plugins/a/file") }],
      });
      expect(result).toMatchObject({
        kind: "Rejected",
        failure: { code: "StatePublicationFailed", cleanup: { code: "TemporaryCleanupBlocked" } },
      });
      expect(preservedTemporary).toBeDefined();
      expect((await lstat(preservedTemporary!)).isFile()).toBe(true);
      const tempLinks = (await readdir(root)).filter((entry) => entry.startsWith(".capsule-state-v1-tmp-"));
      expect(tempLinks.some((entry) => !entry.endsWith(".owned-original"))).toBe(true);
      const after = await initial.read();
      expect(after).toEqual(initialRead);
    } finally {
      await fixture.cleanup();
    }
  });

  it("reports hardlinked private-temp cleanup as blocked and preserves both links", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
      const registry = createFixtureRegistry(emptyWorld());
      await openedStore(root, registry);
      let aliasPath: string | undefined;
      const opened = await openNodeCapsuleStateStoreV1({
        root,
        registry,
        advisoryLock: createInProcessAdvisoryLock(),
        failpoints: {
          beforeStatePublication() {
            throw new Error("injected primary publication failure");
          },
          async beforeTemporaryCleanup(temporaryPath) {
            aliasPath = `${temporaryPath}.hardlink`;
            await link(temporaryPath, aliasPath);
          },
        },
      });
      if (opened.kind !== "Opened") throw new Error(opened.failure.message);
      const writer = new CapsuleControllerWriterV1({ store: opened.store, registry });
      const result = await writer.begin({
        owner: FIXTURE_OWNER,
        ownerProtocolVersion: FIXTURE_VERSION,
        contentAuthority: "fixture-content-authority",
        targets: FIXTURE_TARGETS,
        actions: [{ action: fixtureAction("plugins/a/file") }],
      });
      expect(result).toMatchObject({
        kind: "Rejected",
        failure: { cleanup: { code: "TemporaryCleanupBlocked" } },
      });
      expect(aliasPath).toBeDefined();
      expect((await lstat(aliasPath!, { bigint: true })).nlink).toBe(2n);
    } finally {
      await fixture.cleanup();
    }
  });

  it("preserves directory and foreign-regular substitutions of a private state temporary", async () => {
    for (const substitution of ["directory", "regular"] as const) {
      const fixture = await createOwnedFixtureRoot();
      try {
        const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
        const registry = createFixtureRegistry(emptyWorld());
        await openedStore(root, registry);
        let replacementPath: string | undefined;
        const opened = await openNodeCapsuleStateStoreV1({
          root,
          registry,
          advisoryLock: createInProcessAdvisoryLock(),
          failpoints: {
            async afterTemporaryCreated(temporaryPath) {
              await rename(temporaryPath, `${temporaryPath}.owned-original`);
              replacementPath = temporaryPath;
              if (substitution === "directory") await mkdir(temporaryPath, { mode: 0o700 });
              else await writeFile(temporaryPath, "foreign\n", { mode: 0o600 });
            },
          },
        });
        if (opened.kind !== "Opened") throw new Error(opened.failure.message);
        const writer = new CapsuleControllerWriterV1({ store: opened.store, registry });
        const result = await writer.begin({
          owner: FIXTURE_OWNER,
          ownerProtocolVersion: FIXTURE_VERSION,
          contentAuthority: "fixture-content-authority",
          targets: FIXTURE_TARGETS,
          actions: [{ action: fixtureAction("plugins/a/file") }],
        });
        expect(result).toMatchObject({
          kind: "Rejected",
          failure: { cleanup: { code: "TemporaryCleanupBlocked" } },
        });
        const replacement = await lstat(replacementPath!);
        expect(substitution === "directory" ? replacement.isDirectory() : replacement.isFile()).toBe(true);
        if (substitution === "regular") expect(await readFile(replacementPath!, "utf8")).toBe("foreign\n");
      } finally {
        await fixture.cleanup();
      }
    }
  });

  it("reports post-rename verification failure as recovery-bearing Unsettled and cold-recovers", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
      const world = emptyWorld();
      const registry = createFixtureRegistry(world);
      const initial = await openedStore(root, registry);
      const initialRead = await initial.read();
      if (initialRead.kind !== "Observed") throw new Error(initialRead.failure.message);
      let failAfterRename = true;
      const opened = await openNodeCapsuleStateStoreV1({
        root,
        registry,
        advisoryLock: createInProcessAdvisoryLock(),
        failpoints: {
          afterStatePublication() {
            if (!failAfterRename) return;
            failAfterRename = false;
            throw new Error("injected failure after atomic state rename");
          },
        },
      });
      if (opened.kind !== "Opened") throw new Error(opened.failure.message);
      const writer = new CapsuleControllerWriterV1({ store: opened.store, registry });
      const result = await writer.begin({
        owner: FIXTURE_OWNER,
        ownerProtocolVersion: FIXTURE_VERSION,
        contentAuthority: "fixture-content-authority",
        targets: FIXTURE_TARGETS,
        actions: [{ action: fixtureAction("plugins/a/unsettled") }],
      });
      expect(result).toMatchObject({
        kind: "Unsettled",
        generation: expect.stringMatching(/^cg1_[a-f0-9]{64}$/),
        recoveryRequired: true,
        failure: { code: "StatePublicationFailed" },
      });
      expect(result).not.toHaveProperty("token");
      const visible = await opened.store.read();
      expect(visible).toMatchObject({ kind: "Observed", observation: { state: { body: { state: { kind: "applying" } } } } });

      const reopened = await openedStore(root, registry);
      const recoveryWriter = new CapsuleControllerWriterV1({ store: reopened, registry });
      expect(await recoveryWriter.recoverApplying()).toEqual({
        kind: "RecoveredToPriorIdle",
        synchronization: { kind: "Released" },
      });
      const afterRecovery = await reopened.read();
      expect(afterRecovery).toEqual(initialRead);
    } finally {
      await fixture.cleanup();
    }
  });

  it("uses exact Linux/Darwin flock flags and fails closed on unsupported platforms", async () => {
    const calls: NativeFlockCallV1[] = [];
    const linux = createBunFfiCapsuleAdvisoryLock({
      platform: "linux",
      nativeFlock(call) {
        calls.push(call);
        return { returnCode: 0, errno: 0 };
      },
    });
    expect(await linux.acquire(41)).toEqual({ kind: "Acquired" });
    expect(await linux.release(41)).toEqual({ kind: "Released" });
    expect(calls).toEqual([{ fd: 41, operation: 6 }, { fd: 41, operation: 8 }]);

    const busy = createBunFfiCapsuleAdvisoryLock({
      platform: "darwin",
      nativeFlock: () => ({ returnCode: -1, errno: 35 }),
    });
    expect(await busy.acquire(7)).toEqual({ kind: "Busy" });
    const unsupported = createBunFfiCapsuleAdvisoryLock({ platform: "win32" });
    expect(await unsupported.acquire(7)).toMatchObject({ kind: "Unsupported" });
  });

  it("preflights the actual filesystem lock without leaving a partial capsule root", async () => {
    const fixture = await createOwnedFixtureRoot();
    try {
      const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
      const unsupported = createBunFfiCapsuleAdvisoryLock({
        platform: "darwin",
        nativeFlock: () => ({ returnCode: -1, errno: 45 }),
      });
      const opened = await openNodeCapsuleStateStoreV1({
        root,
        registry: createFixtureRegistry(emptyWorld()),
        advisoryLock: unsupported,
      });
      expect(opened).toMatchObject({ kind: "Rejected", failure: { code: "AdmissionUnsupported" } });
      await expect(lstat(root)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await fixture.cleanup();
    }
  });

  it.runIf(process.platform === "darwin" || process.platform === "linux")(
    "provides real interprocess exclusion and kernel crash release",
    async () => {
      const fixture = await createOwnedFixtureRoot();
      try {
        const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
        const registry = createFixtureRegistry(emptyWorld());
        const store = await openedStore(root, registry);
        const childPath = fileURLToPath(new URL("./flock-child.ts", import.meta.url));
        const child = spawn("bun", [childPath, path.join(root, LOCK_FILE), "hold"], {
          stdio: ["ignore", "pipe", "pipe"],
        });
        await waitForLine(child.stdout!, "LOCKED");
        expect(await runBunProbe(childPath, path.join(root, LOCK_FILE))).toBe("Busy");
        const exited = new Promise<void>((resolve, reject) => {
          child.once("exit", () => resolve());
          child.once("error", reject);
        });
        child.kill("SIGKILL");
        await exited;
        expect(await runBunProbe(childPath, path.join(root, LOCK_FILE))).toBe("Acquired");
        expect(await store.read()).toMatchObject({ kind: "Observed" });
      } finally {
        await fixture.cleanup();
      }
    },
  );

  it.runIf(process.platform === "darwin" || process.platform === "linux")(
    "holds the operation lease through staged mutation and cold-recovers after process death",
    async () => {
      const probePath = fileURLToPath(new URL("./operation-lease-bun-probe.ts", import.meta.url));
      const result = JSON.parse(await runBunFile(probePath));
      expect(result.liveRecovery).toMatchObject({
          kind: "RecoveryRejected",
          failure: { code: "AdmissionBusy" },
          synchronization: { kind: "NotAcquired" },
      });
      expect(result.liveUndo).toMatchObject({
        kind: "RejectedBeforeReplay",
        failure: { code: "AdmissionBusy" },
        synchronization: { kind: "NotAcquired" },
      });
      expect(result.beforeBusy).toEqual({
        targetSelections: 0,
        applyingClassifications: 0,
        replayClassifications: 0,
        replayRestores: 0,
        replayVerifications: 0,
      });
      expect(result.afterBusy).toEqual(result.beforeBusy);
      expect(result.recovered).toEqual({
        kind: "RecoveredToPriorIdle",
        synchronization: { kind: "Released" },
      });
    },
  );

  it(
    "closes the admission descriptor when explicit unlock rejects",
    async () => {
      const fixture = await createOwnedFixtureRoot();
      try {
        const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
        const releasedDescriptors: number[] = [];
        const throwingUnlock: CapsuleAdvisoryLockV1 = Object.freeze({
          platform: "darwin",
          async acquire() {
            return { kind: "Acquired" as const };
          },
          async release(fd: number) {
            releasedDescriptors.push(fd);
            throw new Error("injected unlock rejection");
          },
        });
        const opened = await openNodeCapsuleStateStoreV1({
          root,
          registry: createFixtureRegistry(emptyWorld()),
          advisoryLock: throwingUnlock,
        });
        if (opened.kind !== "Opened") throw new Error(opened.failure.message);
        const first = await opened.store.acquireExclusiveSession();
        if (first.kind !== "Acquired") throw new Error(first.failure.message);
        await expect(first.session.release()).resolves.toBeUndefined();
        expect(() => fstatSync(releasedDescriptors.at(-1)!)).toThrow();

        const second = await opened.store.acquireExclusiveSession();
        expect(second).toMatchObject({ kind: "Acquired" });
        if (second.kind === "Acquired") {
          await expect(second.session.release()).resolves.toBeUndefined();
          expect(() => fstatSync(releasedDescriptors.at(-1)!)).toThrow();
        }
      } finally {
        await fixture.cleanup();
      }
    },
  );

  it.runIf(process.platform === "darwin" || process.platform === "linux")(
    "runs the complete state transaction through the pinned Bun flock adapter",
    async () => {
      const probePath = fileURLToPath(new URL("./node-store-bun-probe.ts", import.meta.url));
      const output = await runBunFile(probePath);
      expect(JSON.parse(output)).toEqual({ state: "idle", committed: true });
    },
  );

  it("contains no recursive removal or admission unlink path in production", async () => {
    const sourceRoot = fileURLToPath(new URL("../../../src/lib/agent-plugins/undo", import.meta.url));
    const files = (await readdir(sourceRoot)).filter((entry) => entry.endsWith(".ts"));
    const source = (await Promise.all(files.map((entry) => readFile(path.join(sourceRoot, entry), "utf8")))).join("\n");
    expect(source).not.toMatch(/recursive\s*:\s*true/);
    expect(source).not.toMatch(/\brm(?:Sync)?\s*\(/);
    expect(source).not.toMatch(/unlink\([^)]*capsule-admission-v1/);
    expect(source).not.toMatch(/\brmdir\s*\(/);
  });
});

async function openedStore(
  root: CapsuleRoot,
  registry: ReturnType<typeof createFixtureRegistry>,
) {
  const result = await openNodeCapsuleStateStoreV1({
    root,
    registry,
    advisoryLock: createInProcessAdvisoryLock(),
  });
  if (result.kind !== "Opened") throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result.store;
}

function fixtureBeginInput(relativePath: string) {
  return {
    owner: FIXTURE_OWNER,
    ownerProtocolVersion: FIXTURE_VERSION,
    contentAuthority: "fixture-content-authority",
    targets: FIXTURE_TARGETS,
    actions: [{ action: fixtureAction(relativePath) }],
  } as const;
}

function emptyWorld(): FixtureWorldV1 {
  return { states: new Map(), replayOrder: [] };
}

async function stateStatus(root: string) {
  return lstat(path.join(root, STATE_FILE), { bigint: true });
}

function identityAndMetadata(status: BigIntStats) {
  return {
    dev: status.dev,
    ino: status.ino,
    mode: status.mode,
    size: status.size,
    mtimeNs: status.mtimeNs,
    ctimeNs: status.ctimeNs,
  };
}

async function waitForLine(stream: NodeJS.ReadableStream, expected: string): Promise<void> {
  let output = "";
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`timed out waiting for ${expected}; got ${output}`)), 5_000);
    stream.on("data", (chunk) => {
      output += String(chunk);
      if (output.includes(`${expected}\n`)) {
        clearTimeout(timeout);
        resolve();
      }
    });
    stream.on("error", reject);
  });
}

function createInProcessAdvisoryLock(): CapsuleAdvisoryLockV1 {
  let held = false;
  return Object.freeze({
    platform: "darwin" as const,
    async acquire() {
      if (held) return { kind: "Busy" as const };
      held = true;
      return { kind: "Acquired" as const };
    },
    async release() {
      if (!held) return { kind: "Failed" as const, reason: "test lock was not held" };
      held = false;
      return { kind: "Released" as const };
    },
  });
}

function createInodeAdvisoryLock(): CapsuleAdvisoryLockV1 {
  const held = new Set<string>();
  return Object.freeze({
    platform: "darwin" as const,
    async acquire(fd: number) {
      try {
        const key = fileDescriptorIdentity(fd);
        if (held.has(key)) return { kind: "Busy" as const };
        held.add(key);
        return { kind: "Acquired" as const };
      } catch (error) {
        return { kind: "Failed" as const, reason: error instanceof Error ? error.message : String(error) };
      }
    },
    async release(fd: number) {
      try {
        const key = fileDescriptorIdentity(fd);
        if (!held.delete(key)) return { kind: "Failed" as const, reason: "test inode lock was not held" };
        return { kind: "Released" as const };
      } catch (error) {
        return { kind: "Failed" as const, reason: error instanceof Error ? error.message : String(error) };
      }
    },
  });
}

function fileDescriptorIdentity(fd: number): string {
  const status = fstatSync(fd, { bigint: true });
  return `${status.dev}:${status.ino}`;
}

async function runBunProbe(childPath: string, lockPath: string): Promise<string> {
  return runBunFile(childPath, lockPath, "probe");
}

async function runBunFile(childPath: string, ...args: string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    execFile("bun", [childPath, ...args], (error, stdout, stderr) => {
      if (error !== null) {
        reject(new Error(`flock probe failed: ${error.message}; ${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
