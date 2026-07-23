import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  symlink,
  unlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "bun:test";

import type {
  ProviderProjectionRecordAddress,
  ProviderTargetRecordAddress,
} from "@rawr/resource-agent-provider-records";
import {
  makeAgentProviderRecordsResource,
  runNodeAgentProviderRecords,
  type AgentProviderRecordsEvent,
} from "../index";

const encoder = new TextEncoder();
const MAX_BYTES = 1024 * 1024;

interface OwnedFixture {
  readonly path: string;
  readonly dev: number;
  readonly ino: number;
}

describe("effect-platform-node agent provider records", () => {
  let fixtureRoot: OwnedFixture | null = null;

  afterEach(async () => {
    if (fixtureRoot !== null) await removeOwnedFixture(fixtureRoot);
    fixtureRoot = null;
  });

  it("publishes exact immutable projection bytes and leaves a converged repeat read-only", async () => {
    fixtureRoot = await createFixture();
    const layout = fixtureLayout(fixtureRoot.path);
    const resource = makeAgentProviderRecordsResource(layout);
    const address = projectionAddress("Manifest", "ap1_manifest");
    const bytes = encoder.encode('{"projection":1}\n');

    expect(await run(resource.readProjection({ address, maxBytes: MAX_BYTES }))).toEqual({
      ok: true,
      value: { kind: "Absent", address },
    });
    await expect(lstat(layout.projectionRoot)).rejects.toMatchObject({ code: "ENOENT" });

    expect(await run(resource.publishProjection({ address, bytes, maxBytes: MAX_BYTES }))).toEqual({
      ok: true,
      value: { outcome: "Published", address },
    });
    const destination = path.join(layout.projectionRoot, "manifests", "ap1_manifest.json");
    expect(new Uint8Array(await readFile(destination))).toEqual(bytes);
    const before = await stat(destination);
    expect(before.mode & 0o777).toBe(0o600);

    expect(await run(resource.publishProjection({ address, bytes, maxBytes: MAX_BYTES }))).toEqual({
      ok: true,
      value: { outcome: "ReadOnlyConverged", address },
    });
    const after = await stat(destination);
    expect({ ino: after.ino, mtimeMs: after.mtimeMs }).toEqual({
      ino: before.ino,
      mtimeMs: before.mtimeMs,
    });

    await chmod(destination, 0o644);
    const nonCanonicalRepeat = await run(
      resource.publishProjection({
        address,
        bytes,
        maxBytes: MAX_BYTES,
      })
    );
    expect(nonCanonicalRepeat.ok).toBe(false);
    if (!nonCanonicalRepeat.ok) expect(nonCanonicalRepeat.failure.reason).toBe("Occupied");

    const occupied = await run(
      resource.publishProjection({
        address,
        bytes: encoder.encode('{"projection":2}\n'),
        maxBytes: MAX_BYTES,
      })
    );
    expect(occupied.ok).toBe(false);
    if (!occupied.ok) expect(occupied.failure.reason).toBe("Occupied");
    expect(new Uint8Array(await readFile(destination))).toEqual(bytes);
  });

  it("captures, atomically writes, converges, and settles one target record", async () => {
    fixtureRoot = await createFixture();
    const layout = fixtureLayout(fixtureRoot.path);
    const resource = makeAgentProviderRecordsResource(layout);
    const address = targetAddress("Identity", "pt1_target");
    const bytes = encoder.encode('{"identity":1}\n');
    const captured = await capture(resource, address, "read-identity-1");

    expect(captured.observation).toEqual({ kind: "Absent", address });
    const writeInput = {
      address,
      planDigest: "plan-identity-1",
      readToken: captured.readToken,
      captureHandle: captured.handle,
      mutation: { kind: "Put" as const, bytes },
    };
    expect(await run(resource.writeTarget(writeInput))).toMatchObject({
      ok: true,
      value: { outcome: "Applied" },
    });
    const destination = path.join(layout.targetRecordsRoot, "identities", "pt1_target.json");
    const before = await stat(destination);
    expect(before.mode & 0o777).toBe(0o600);

    expect(await run(resource.writeTarget(writeInput))).toMatchObject({
      ok: true,
      value: { outcome: "ReadOnlyConverged" },
    });
    const after = await stat(destination);
    expect({ ino: after.ino, mtimeMs: after.mtimeMs }).toEqual({
      ino: before.ino,
      mtimeMs: before.mtimeMs,
    });

    const settled = await run(
      resource.settleTarget({
        address,
        planDigest: writeInput.planDigest,
        readToken: captured.readToken,
        captureHandle: captured.handle,
      })
    );
    expect(settled).toMatchObject({ ok: true, value: { outcome: "Settled" } });
    const reused = await run(
      resource.settleTarget({
        address,
        planDigest: writeInput.planDigest,
        readToken: captured.readToken,
        captureHandle: captured.handle,
      })
    );
    expect(reused.ok).toBe(false);
    if (!reused.ok) expect(reused.failure.reason).toBe("HandleConsumed");
  });

  it("releases one unmutated target capture exactly once", async () => {
    fixtureRoot = await createFixture();
    const resource = makeAgentProviderRecordsResource(fixtureLayout(fixtureRoot.path));
    const address = targetAddress("Identity", "pt1_release");
    const captured = await capture(resource, address, "read-release");
    const releaseInput = {
      address,
      readToken: captured.readToken,
      captureHandle: captured.handle,
    };

    const wrongToken = await run(
      resource.releaseTarget({
        ...releaseInput,
        readToken: "wrong-read-release",
      })
    );
    expect(wrongToken.ok).toBe(false);
    if (!wrongToken.ok) expect(wrongToken.failure.reason).toBe("WrongToken");

    expect(await run(resource.releaseTarget(releaseInput))).toEqual({
      ok: true,
      value: {
        readToken: captured.readToken,
        outcome: "Released",
        handle: captured.handle,
      },
    });
    const repeated = await run(resource.releaseTarget(releaseInput));
    expect(repeated.ok).toBe(false);
    if (!repeated.ok) expect(repeated.failure.reason).toBe("HandleConsumed");

    const writeAfterRelease = await run(
      resource.writeTarget({
        ...releaseInput,
        planDigest: "plan-after-release",
        mutation: { kind: "Put", bytes: encoder.encode('{"identity":1}\n') },
      })
    );
    expect(writeAfterRelease.ok).toBe(false);
    if (!writeAfterRelease.ok) expect(writeAfterRelease.failure.reason).toBe("HandleConsumed");
    expect(await readTarget(resource, address)).toEqual({ kind: "Absent", address });
  });

  it("serializes concurrent settlement so one capture is consumed exactly once", async () => {
    fixtureRoot = await createFixture();
    const resource = makeAgentProviderRecordsResource(fixtureLayout(fixtureRoot.path));
    const address = targetAddress("Identity", "pt1_concurrent_settle");
    const captured = await capture(resource, address, "read-concurrent-settle");
    const input = {
      address,
      planDigest: "plan-concurrent-settle",
      readToken: captured.readToken,
      captureHandle: captured.handle,
      mutation: { kind: "Put" as const, bytes: encoder.encode('{"identity":1}\n') },
    };
    expect(await run(resource.writeTarget(input))).toMatchObject({
      ok: true,
      value: { outcome: "Applied" },
    });

    const results = await Promise.all([
      run(resource.settleTarget(input)),
      run(resource.settleTarget(input)),
    ]);
    const settled = results.filter((result) => result.ok);
    const refused = results.filter((result) => !result.ok);

    expect(settled).toHaveLength(1);
    expect(settled[0]).toMatchObject({ value: { outcome: "Settled" } });
    expect(refused).toHaveLength(1);
    if (refused[0] !== undefined && !refused[0].ok) {
      expect(refused[0].failure.reason).toBe("HandleConsumed");
    }
  });

  it("refuses to settle a captured handle without binding the proposed plan", async () => {
    fixtureRoot = await createFixture();
    const resource = makeAgentProviderRecordsResource(fixtureLayout(fixtureRoot.path));
    const address = targetAddress("Receipt", "pt1_unbound_settle");
    const captured = await capture(resource, address, "read-unbound-settle");

    const manufactured = await run(
      resource.settleTarget({
        address,
        planDigest: "manufactured-plan",
        readToken: captured.readToken,
        captureHandle: captured.handle,
      })
    );
    expect(manufactured.ok).toBe(false);
    if (!manufactured.ok) expect(manufactured.failure.reason).toBe("HandleState");

    const legitimate = {
      address,
      planDigest: "legitimate-plan",
      readToken: captured.readToken,
      captureHandle: captured.handle,
      mutation: { kind: "Put" as const, bytes: encoder.encode('{"receipt":1}\n') },
    };
    expect(await run(resource.writeTarget(legitimate))).toMatchObject({
      ok: true,
      value: { outcome: "Applied" },
    });
    expect(await run(resource.settleTarget(legitimate))).toMatchObject({
      ok: true,
      value: { outcome: "Settled" },
    });
  });

  it("serializes capture release with an in-flight target write", async () => {
    fixtureRoot = await createFixture();
    const layout = fixtureLayout(fixtureRoot.path);
    const commitEntered = Promise.withResolvers<void>();
    const continueCommit = Promise.withResolvers<void>();
    const resource = makeAgentProviderRecordsResource({
      ...layout,
      async onEvent(event: AgentProviderRecordsEvent) {
        if (event.kind === "BeforeAtomicCommit" && event.address.scope === "Target") {
          commitEntered.resolve();
          await continueCommit.promise;
        }
      },
    });
    const address = targetAddress("Identity", "pt1_release_fence");
    const captured = await capture(resource, address, "read-release-fence");
    const writeInput = {
      address,
      planDigest: "plan-release-fence",
      readToken: captured.readToken,
      captureHandle: captured.handle,
      mutation: { kind: "Put" as const, bytes: encoder.encode('{"identity":1}\n') },
    };

    const writing = run(resource.writeTarget(writeInput));
    await commitEntered.promise;
    const releasing = run(resource.releaseTarget(writeInput));
    const releasedDuringWrite = await Promise.race([
      releasing.then(() => true),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 50)),
    ]);
    expect(releasedDuringWrite).toBe(false);
    continueCommit.resolve();

    expect(await writing).toMatchObject({ ok: true, value: { outcome: "Applied" } });
    const releaseAfterWrite = await releasing;
    expect(releaseAfterWrite.ok).toBe(false);
    if (!releaseAfterWrite.ok) expect(releaseAfterWrite.failure.reason).toBe("HandleState");
    expect(await run(resource.restoreTarget(writeInput))).toMatchObject({
      ok: true,
      value: { outcome: "Restored", changed: true },
    });
    expect(await run(resource.settleTarget(writeInput))).toMatchObject({
      ok: true,
      value: { outcome: "Settled" },
    });
  });

  it("refuses release after an applied or partial write while preserving restore and settle", async () => {
    fixtureRoot = await createFixture();
    const layout = fixtureLayout(fixtureRoot.path);
    let interruptBeforeCommit = true;
    const resource = makeAgentProviderRecordsResource({
      ...layout,
      onEvent(event: AgentProviderRecordsEvent) {
        if (
          interruptBeforeCommit &&
          event.kind === "BeforeAtomicCommit" &&
          event.address.scope === "Target" &&
          event.address.targetKey === "pt1_partial_release"
        ) {
          interruptBeforeCommit = false;
          throw new Error("stop before partial write commit");
        }
      },
    });

    const appliedAddress = targetAddress("Receipt", "pt1_applied_release");
    const appliedCapture = await capture(resource, appliedAddress, "read-applied-release");
    const appliedInput = {
      address: appliedAddress,
      planDigest: "plan-applied-release",
      readToken: appliedCapture.readToken,
      captureHandle: appliedCapture.handle,
      mutation: { kind: "Put" as const, bytes: encoder.encode('{"receipt":"applied"}\n') },
    };
    expect(await run(resource.writeTarget(appliedInput))).toMatchObject({
      ok: true,
      value: { outcome: "Applied" },
    });
    const appliedRelease = await run(resource.releaseTarget(appliedInput));
    expect(appliedRelease.ok).toBe(false);
    if (!appliedRelease.ok) expect(appliedRelease.failure.reason).toBe("HandleState");
    expect(await run(resource.restoreTarget(appliedInput))).toMatchObject({
      ok: true,
      value: { outcome: "Restored", changed: true },
    });
    expect(await run(resource.settleTarget(appliedInput))).toMatchObject({
      ok: true,
      value: { outcome: "Settled" },
    });

    const partialAddress = targetAddress("Receipt", "pt1_partial_release");
    const partialCapture = await capture(resource, partialAddress, "read-partial-release");
    const partialInput = {
      address: partialAddress,
      planDigest: "plan-partial-release",
      readToken: partialCapture.readToken,
      captureHandle: partialCapture.handle,
      mutation: { kind: "Put" as const, bytes: encoder.encode('{"receipt":"partial"}\n') },
    };
    const partialWrite = await run(resource.writeTarget(partialInput));
    expect(partialWrite.ok).toBe(false);
    if (!partialWrite.ok) expect(partialWrite.failure.phase).toBe("event:BeforeAtomicCommit");
    const partialRelease = await run(resource.releaseTarget(partialInput));
    expect(partialRelease.ok).toBe(false);
    if (!partialRelease.ok) expect(partialRelease.failure.reason).toBe("HandleState");
    expect(await run(resource.restoreTarget(partialInput))).toMatchObject({
      ok: true,
      value: { outcome: "Restored", changed: false },
    });
    expect(await run(resource.settleTarget(partialInput))).toMatchObject({
      ok: true,
      value: { outcome: "Settled" },
    });
  });

  it("restores exact prior bytes after replacement and removal before settlement", async () => {
    fixtureRoot = await createFixture();
    const resource = makeAgentProviderRecordsResource(fixtureLayout(fixtureRoot.path));
    const address = targetAddress("Receipt", "pt1_target");
    const firstBytes = encoder.encode('{"generation":1}\n');
    const secondBytes = encoder.encode('{"generation":2}\n');
    await seedTarget(resource, address, firstBytes, "seed-1");

    const replaceCapture = await capture(resource, address, "read-replace");
    const replaceInput = {
      address,
      planDigest: "plan-replace",
      readToken: replaceCapture.readToken,
      captureHandle: replaceCapture.handle,
      mutation: { kind: "Put" as const, bytes: secondBytes },
    };
    expect(await run(resource.writeTarget(replaceInput))).toMatchObject({
      ok: true,
      value: { outcome: "Applied" },
    });
    expect(await run(resource.restoreTarget(replaceInput))).toMatchObject({
      ok: true,
      value: { outcome: "Restored", changed: true },
    });
    expect(await run(resource.restoreTarget(replaceInput))).toMatchObject({
      ok: true,
      value: { outcome: "Restored", changed: false },
    });
    const afterReplace = await readTarget(resource, address);
    expect(afterReplace.kind).toBe("Present");
    if (afterReplace.kind === "Present") expect(afterReplace.bytes).toEqual(firstBytes);
    expect(await run(resource.settleTarget(replaceInput))).toMatchObject({ ok: true });

    const removeCapture = await capture(resource, address, "read-remove");
    const removeInput = {
      address,
      planDigest: "plan-remove",
      readToken: removeCapture.readToken,
      captureHandle: removeCapture.handle,
      mutation: { kind: "Remove" as const },
    };
    expect(await run(resource.writeTarget(removeInput))).toMatchObject({
      ok: true,
      value: { outcome: "Applied" },
    });
    expect(await readTarget(resource, address)).toEqual({ kind: "Absent", address });
    expect(await run(resource.restoreTarget(removeInput))).toMatchObject({
      ok: true,
      value: { outcome: "Restored", changed: true },
    });
    const afterRemove = await readTarget(resource, address);
    expect(afterRemove.kind).toBe("Present");
    if (afterRemove.kind === "Present") expect(afterRemove.bytes).toEqual(firstBytes);
    expect(await run(resource.settleTarget(removeInput))).toMatchObject({ ok: true });
  });

  it("rewrites matching target bytes to canonical mode instead of claiming read-only convergence", async () => {
    fixtureRoot = await createFixture();
    const layout = fixtureLayout(fixtureRoot.path);
    const resource = makeAgentProviderRecordsResource(layout);
    const address = targetAddress("Identity", "pt1_mode");
    const bytes = encoder.encode('{"identity":1}\n');
    await seedTarget(resource, address, bytes, "seed-mode");
    const destination = path.join(layout.targetRecordsRoot, "identities", "pt1_mode.json");
    await chmod(destination, 0o644);

    const captured = await capture(resource, address, "read-mode");
    const input = {
      address,
      planDigest: "plan-mode",
      readToken: captured.readToken,
      captureHandle: captured.handle,
      mutation: { kind: "Put" as const, bytes },
    };
    expect(await run(resource.writeTarget(input))).toMatchObject({
      ok: true,
      value: { outcome: "Applied" },
    });
    expect((await stat(destination)).mode & 0o777).toBe(0o600);
    expect(await run(resource.settleTarget(input))).toMatchObject({ ok: true });
  });

  it("serializes target mutations so a concurrent replacement cannot be moved into removal cleanup", async () => {
    fixtureRoot = await createFixture();
    const layout = fixtureLayout(fixtureRoot.path);
    const base = makeAgentProviderRecordsResource(layout);
    const address = targetAddress("Receipt", "pt1_serialized");
    const priorBytes = encoder.encode('{"generation":1}\n');
    const replacementBytes = encoder.encode('{"generation":2}\n');
    await seedTarget(base, address, priorBytes, "seed-serialized");

    const firstCommitEntered = Promise.withResolvers<void>();
    const releaseFirstCommit = Promise.withResolvers<void>();
    const overlappingCommitEntered = Promise.withResolvers<void>();
    let commitCount = 0;
    const resource = makeAgentProviderRecordsResource({
      ...layout,
      async onEvent(event: AgentProviderRecordsEvent) {
        if (event.kind !== "BeforeAtomicCommit" || event.address.scope !== "Target") return;
        commitCount += 1;
        if (commitCount === 1) {
          firstCommitEntered.resolve();
          await releaseFirstCommit.promise;
        } else {
          overlappingCommitEntered.resolve();
        }
      },
    });
    const removeCapture = await capture(resource, address, "read-serialized-remove");
    const replaceCapture = await capture(resource, address, "read-serialized-replace");
    const removeInput = {
      address,
      planDigest: "plan-serialized-remove",
      readToken: removeCapture.readToken,
      captureHandle: removeCapture.handle,
      mutation: { kind: "Remove" as const },
    };
    const replaceInput = {
      address,
      planDigest: "plan-serialized-replace",
      readToken: replaceCapture.readToken,
      captureHandle: replaceCapture.handle,
      mutation: { kind: "Put" as const, bytes: replacementBytes },
    };

    const removing = run(resource.writeTarget(removeInput));
    await firstCommitEntered.promise;
    const replacing = run(resource.writeTarget(replaceInput));
    const overlapped = await Promise.race([
      overlappingCommitEntered.promise.then(() => true),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 50)),
    ]);
    releaseFirstCommit.resolve();
    const [removed, replaced] = await Promise.all([removing, replacing]);

    expect(overlapped).toBe(false);
    expect(removed).toMatchObject({ ok: true, value: { outcome: "Applied" } });
    expect(replaced.ok).toBe(false);
    if (!replaced.ok) {
      expect(replaced.failure).toMatchObject({
        reason: "IdentityChanged",
        phase: "preimage-revalidation",
      });
    }
    expect(await readTarget(resource, address)).toEqual({ kind: "Absent", address });
    expect(await run(resource.settleTarget(removeInput))).toMatchObject({ ok: true });
  });

  it("leaves prior bytes intact when a write stops before atomic commit and cleans its scoped temporary", async () => {
    fixtureRoot = await createFixture();
    const layout = fixtureLayout(fixtureRoot.path);
    const base = makeAgentProviderRecordsResource(layout);
    const address = targetAddress("Receipt", "pt1_atomic");
    const priorBytes = encoder.encode('{"generation":1}\n');
    await seedTarget(base, address, priorBytes, "seed-atomic");
    let fail = true;
    const resource = makeAgentProviderRecordsResource({
      ...layout,
      onEvent(event: AgentProviderRecordsEvent) {
        if (fail && event.kind === "BeforeAtomicCommit" && event.address.scope === "Target") {
          fail = false;
          throw new Error("stop before commit");
        }
      },
    });
    const captured = await capture(resource, address, "read-atomic");
    const input = {
      address,
      planDigest: "plan-atomic",
      readToken: captured.readToken,
      captureHandle: captured.handle,
      mutation: { kind: "Put" as const, bytes: encoder.encode('{"generation":2}\n') },
    };
    const failed = await run(resource.writeTarget(input));
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.failure.phase).toBe("event:BeforeAtomicCommit");
    const current = await readTarget(resource, address);
    expect(current.kind).toBe("Present");
    if (current.kind === "Present") expect(current.bytes).toEqual(priorBytes);
    expect(await readdir(path.join(layout.targetRecordsRoot, "receipts"))).toEqual([
      "pt1_atomic.json",
    ]);

    expect(await run(resource.restoreTarget(input))).toMatchObject({
      ok: true,
      value: { outcome: "Restored", changed: false },
    });
    expect(await run(resource.settleTarget(input))).toMatchObject({ ok: true });
  });

  it("keeps an after-effect post-observation failure recoverable as Partial", async () => {
    fixtureRoot = await createFixture();
    const layout = fixtureLayout(fixtureRoot.path);
    const base = makeAgentProviderRecordsResource(layout);
    const address = targetAddress("Receipt", "pt1_post_observation");
    const priorBytes = encoder.encode('{"generation":1}\n');
    const nextBytes = encoder.encode('{"generation":2}\n');
    await seedTarget(base, address, priorBytes, "seed-post-observation");
    const destination = path.join(
      layout.targetRecordsRoot,
      "receipts",
      "pt1_post_observation.json"
    );
    const parked = path.join(layout.targetRecordsRoot, "receipts", "pt1_post_observation.parked");
    let interruptPostObservation = true;
    const resource = makeAgentProviderRecordsResource({
      ...layout,
      async onEvent(event: AgentProviderRecordsEvent) {
        if (
          interruptPostObservation &&
          event.kind === "AfterAtomicCommit" &&
          event.address.scope === "Target"
        ) {
          interruptPostObservation = false;
          await rename(destination, parked);
          await symlink(parked, destination);
        }
      },
    });
    const captured = await capture(resource, address, "read-post-observation");
    const input = {
      address,
      planDigest: "plan-post-observation",
      readToken: captured.readToken,
      captureHandle: captured.handle,
      mutation: { kind: "Put" as const, bytes: nextBytes },
    };

    const failed = await run(resource.writeTarget(input));
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.failure.reason).toBe("Aliased");
    await unlink(destination);
    await rename(parked, destination);

    expect(await run(resource.restoreTarget(input))).toMatchObject({
      ok: true,
      value: { outcome: "Restored", changed: true },
    });
    const restored = await readTarget(resource, address);
    expect(restored.kind).toBe("Present");
    if (restored.kind === "Present") expect(restored.bytes).toEqual(priorBytes);
    expect(await run(resource.settleTarget(input))).toMatchObject({ ok: true });
  });

  it("rejects path escape, outside roots, and aliased record roots without mutation", async () => {
    fixtureRoot = await createFixture();
    const layout = fixtureLayout(fixtureRoot.path);
    const resource = makeAgentProviderRecordsResource(layout);
    const escaped = await run(
      resource.readTarget({
        address: targetAddress("Receipt", "../escape"),
        maxBytes: MAX_BYTES,
      })
    );
    expect(escaped.ok).toBe(false);
    if (!escaped.ok) expect(escaped.failure.reason).toBe("InvalidInput");
    expect(await readdir(layout.controllerDataRoot)).toEqual([]);

    const outside = makeAgentProviderRecordsResource({
      ...layout,
      projectionRoot: path.join(fixtureRoot.path, "outside"),
    });
    const outsideRead = await run(
      outside.readProjection({
        address: projectionAddress("Member", "pm1_member"),
        maxBytes: MAX_BYTES,
      })
    );
    expect(outsideRead.ok).toBe(false);
    if (!outsideRead.ok) expect(outsideRead.failure.reason).toBe("InvalidInput");

    const aliasedTarget = path.join(layout.controllerDataRoot, "target-alias");
    const actualTarget = path.join(layout.controllerDataRoot, "target-actual");
    await mkdir(actualTarget);
    await symlink(actualTarget, aliasedTarget);
    const aliased = makeAgentProviderRecordsResource({
      ...layout,
      targetRecordsRoot: aliasedTarget,
    });
    const aliasedRead = await run(
      aliased.readTarget({
        address: targetAddress("Identity", "pt1_alias"),
        maxBytes: MAX_BYTES,
      })
    );
    expect(aliasedRead.ok).toBe(false);
    if (!aliasedRead.ok) expect(aliasedRead.failure.reason).toBe("Aliased");
    expect(await readdir(actualTarget)).toEqual([]);
  });

  it("refuses recursive fixture cleanup when the retained allocation identity does not match", async () => {
    fixtureRoot = await createFixture();
    await expect(
      removeOwnedFixture({
        ...fixtureRoot,
        ino: fixtureRoot.ino + 1,
      })
    ).rejects.toThrow("Refusing fixture cleanup");
    expect((await lstat(fixtureRoot.path)).isDirectory()).toBe(true);
  });
});

async function run<A>(effect: Parameters<typeof runNodeAgentProviderRecords<A>>[0]) {
  return runNodeAgentProviderRecords(effect);
}

async function capture(
  resource: ReturnType<typeof makeAgentProviderRecordsResource>,
  address: ProviderTargetRecordAddress,
  readToken: string
) {
  const result = await run(resource.captureTarget({ address, readToken, maxBytes: MAX_BYTES }));
  if (!result.ok) throw new Error(result.failure.detail);
  return result.value;
}

async function readTarget(
  resource: ReturnType<typeof makeAgentProviderRecordsResource>,
  address: ProviderTargetRecordAddress
) {
  const result = await run(resource.readTarget({ address, maxBytes: MAX_BYTES }));
  if (!result.ok) throw new Error(result.failure.detail);
  return result.value;
}

async function seedTarget(
  resource: ReturnType<typeof makeAgentProviderRecordsResource>,
  address: ProviderTargetRecordAddress,
  bytes: Uint8Array,
  suffix: string
): Promise<void> {
  const captured = await capture(resource, address, `read-${suffix}`);
  const input = {
    address,
    planDigest: `plan-${suffix}`,
    readToken: captured.readToken,
    captureHandle: captured.handle,
    mutation: { kind: "Put" as const, bytes },
  };
  const written = await run(resource.writeTarget(input));
  if (!written.ok) throw new Error(written.failure.detail);
  const settled = await run(resource.settleTarget(input));
  if (!settled.ok) throw new Error(settled.failure.detail);
}

function projectionAddress(
  kind: ProviderProjectionRecordAddress["kind"],
  key: string
): ProviderProjectionRecordAddress {
  return Object.freeze({ scope: "Projection", kind, key });
}

function targetAddress(
  kind: ProviderTargetRecordAddress["kind"],
  targetKey: string
): ProviderTargetRecordAddress {
  return Object.freeze({ scope: "Target", kind, targetKey });
}

async function createFixture(): Promise<OwnedFixture> {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-agent-provider-records-")));
  const allocation = await lstat(root);
  if (!allocation.isDirectory() || allocation.isSymbolicLink()) {
    throw new Error("Fixture allocation is not one owned directory");
  }
  await mkdir(path.join(root, "controller-data"));
  return Object.freeze({ path: root, dev: allocation.dev, ino: allocation.ino });
}

function fixtureLayout(root: string) {
  const controllerDataRoot = path.join(root, "controller-data");
  return Object.freeze({
    controllerDataRoot,
    projectionRoot: path.join(controllerDataRoot, "agent-plugins", "provider-projections-v1"),
    targetRecordsRoot: path.join(controllerDataRoot, "agent-plugins", "provider-target-state-v1"),
  });
}

async function removeOwnedFixture(allocation: OwnedFixture): Promise<void> {
  const temporaryRoot = await realpath(tmpdir());
  if (
    path.dirname(allocation.path) !== temporaryRoot ||
    !path.basename(allocation.path).startsWith("rawr-agent-provider-records-")
  ) {
    throw new Error("Refusing fixture cleanup outside the owned temporary family");
  }
  const info = await lstat(allocation.path);
  if (
    !info.isDirectory() ||
    info.isSymbolicLink() ||
    (await realpath(allocation.path)) !== allocation.path ||
    info.dev !== allocation.dev ||
    info.ino !== allocation.ino
  ) {
    throw new Error("Refusing fixture cleanup of a non-canonical owned directory");
  }
  await rm(allocation.path, { recursive: true });
}
