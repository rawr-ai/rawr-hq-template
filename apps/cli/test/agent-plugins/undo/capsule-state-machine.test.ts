import { describe, expect, it } from "vitest";

import {
  canonicalJsonBytes,
  capsuleStateDigest,
  committedCapsuleDigest,
  ownerActionDigest,
} from "../../../src/lib/agent-plugins/undo/canonical";
import {
  MAX_CAPSULE_ACTIONS,
  MAX_CAPSULE_DECODED_PRIOR_BYTES,
  MAX_CAPSULE_RELATIVE_PATHS,
  MAX_CAPSULE_STATE_BYTES,
  type TargetStateBindingV1,
} from "../../../src/lib/agent-plugins/undo/contract";
import { CapsuleUndoControllerV1 } from "../../../src/lib/agent-plugins/undo/replay";
import {
  createInitialCapsuleState,
  encodeCapsuleState,
  parseCapsuleStateBytes,
  type CapsuleStateLimitsV1,
} from "../../../src/lib/agent-plugins/undo/state";
import { CapsuleControllerWriterV1, type CapsuleOpaqueSourceV1 } from "../../../src/lib/agent-plugins/undo/writer";
import {
  FIXTURE_OWNER,
  FIXTURE_TARGETS,
  FIXTURE_VERSION,
  createFixtureRegistry,
  fixtureAction,
  fixtureObserved,
  type FixtureActionV1,
  type FixtureWorldV1,
} from "./fixture-protocol";
import { InMemoryCapsuleStateStoreV1 } from "./memory-store";

describe("controller-owned capsule state machine", () => {
  it("fixes protocol-v1 bounds without a spill authority", () => {
    expect({
      actions: MAX_CAPSULE_ACTIONS,
      paths: MAX_CAPSULE_RELATIVE_PATHS,
      priorBytes: MAX_CAPSULE_DECODED_PRIOR_BYTES,
      stateBytes: MAX_CAPSULE_STATE_BYTES,
    }).toEqual({
      actions: 4_096,
      paths: 16_384,
      priorBytes: 64 * 1024 * 1024,
      stateBytes: 96 * 1024 * 1024,
    });
    const productionLimits = {
      actions: MAX_CAPSULE_ACTIONS,
      relativePaths: MAX_CAPSULE_RELATIVE_PATHS,
      decodedPriorBytes: MAX_CAPSULE_DECODED_PRIOR_BYTES,
      stateBytes: MAX_CAPSULE_STATE_BYTES,
    };
    for (const name of Object.keys(productionLimits) as (keyof CapsuleStateLimitsV1)[]) {
      expect(() => createHarness({
        ...productionLimits,
        [name]: productionLimits[name] + 1,
      })).toThrow(/protocol maximum/i);
    }
  });

  it("preflights the complete ordered aggregate without writing state or consuming operation identity", async () => {
    const aggregateTargets: readonly TargetStateBindingV1[] = Object.freeze([
      Object.freeze({
        canonicalTarget: "/tmp/rawr-capsule-fixture-destination-a",
        authorityGeneration: "ledger-generation:a",
        authorityDigest: "ledger-digest:a",
      }),
      Object.freeze({
        canonicalTarget: "/tmp/rawr-capsule-fixture-destination-b",
        authorityGeneration: "ledger-generation:b",
        authorityDigest: "ledger-digest:b",
      }),
    ]);
    const actions = [fixtureAction("plugins/a/one"), fixtureAction("plugins/b/two")];
    const harness = createHarness();
    const before = await observedBytes(harness.store);

    expect(await harness.writer.preflight(operationInput(actions, aggregateTargets))).toEqual({ kind: "Accepted" });
    expect(await observedBytes(harness.store)).toEqual(before);

    const admittedAfterPreflight = await harness.writer.begin(operationInput(actions, aggregateTargets));
    const control = createHarness();
    const controlAdmission = await control.writer.begin(operationInput(actions, aggregateTargets));
    expect(admittedAfterPreflight.kind).toBe("Accepted");
    expect(controlAdmission.kind).toBe("Accepted");
    if (admittedAfterPreflight.kind !== "Accepted" || controlAdmission.kind !== "Accepted") {
      throw new Error("expected matching accepted admissions");
    }
    expect(admittedAfterPreflight.generation).toBe(controlAdmission.generation);
    expect(await harness.writer.preflight(operationInput(actions, aggregateTargets))).toMatchObject({
      kind: "Rejected",
      failure: { code: "AdmissionBusy" },
    });
    expect(await admittedAfterPreflight.session.suspend()).toEqual({ kind: "Released" });
    expect(await controlAdmission.session.suspend()).toEqual({ kind: "Released" });
    const applyingBytes = await observedBytes(harness.store);
    expect(await harness.writer.preflight(operationInput(actions, aggregateTargets))).toMatchObject({
      kind: "Rejected",
      failure: { code: "StateBlocked", phase: "preflight" },
    });
    expect(await observedBytes(harness.store)).toEqual(applyingBytes);
  });

  it("preflights each aggregate hard bound at the exact boundary and rejects boundary plus one", async () => {
    const one = fixtureAction("plugins/a/one", 4);
    const two = fixtureAction("plugins/a/two", 4);
    const three = fixtureAction("plugins/a/three", 1);
    const exactLimits = { actions: 2, relativePaths: 2, decodedPriorBytes: 8, stateBytes: 1_000_000 };
    const exact = createHarness(exactLimits);
    const exactBefore = await observedBytes(exact.store);
    expect(await exact.writer.preflight(operationInput([one, two]))).toEqual({ kind: "Accepted" });
    expect(await exact.writer.preflight(operationInput([one, two, three]))).toMatchObject({
      kind: "Rejected",
      failure: { code: "CapsuleBoundExceeded", phase: "preflight" },
    });
    expect(await observedBytes(exact.store)).toEqual(exactBefore);

    const pathOver = createHarness({ ...exactLimits, relativePaths: 1 });
    const pathBefore = await observedBytes(pathOver.store);
    expect(await pathOver.writer.preflight(operationInput([one, two]))).toMatchObject({
      kind: "Rejected",
      failure: { code: "CapsuleBoundExceeded" },
    });
    expect(await observedBytes(pathOver.store)).toEqual(pathBefore);

    const priorOver = createHarness({ ...exactLimits, decodedPriorBytes: 7 });
    const priorBefore = await observedBytes(priorOver.store);
    expect(await priorOver.writer.preflight(operationInput([one, two]))).toMatchObject({
      kind: "Rejected",
      failure: { code: "CapsuleBoundExceeded" },
    });
    expect(await observedBytes(priorOver.store)).toEqual(priorBefore);

    const sizing = createHarness({ actions: 1, relativePaths: 1, decodedPriorBytes: 4, stateBytes: 1_000_000 });
    const sizingAdmission = await acceptedBegin(sizing, [one]);
    expect(await sizingAdmission.session.suspend()).toEqual({ kind: "Released" });
    const applying = await observedState(sizing.store);
    if (applying.body.state.kind !== "applying") throw new Error("expected applying sizing state");
    const baseSize = encodeCapsuleState(applying, {
      actions: 1,
      relativePaths: 1,
      decodedPriorBytes: 4,
      stateBytes: 1_000_000,
    }).byteLength;
    const exactWorstCase = baseSize + Math.max(
      0,
      applying.body.state.candidate.actions[0]!.maximumObservedPostBytes - 5,
    );
    const exactState = createHarness({
      actions: 1,
      relativePaths: 1,
      decodedPriorBytes: 4,
      stateBytes: exactWorstCase,
    });
    const exactStateBefore = await observedBytes(exactState.store);
    expect(await exactState.writer.preflight(operationInput([one]))).toEqual({ kind: "Accepted" });
    expect(await observedBytes(exactState.store)).toEqual(exactStateBefore);

    const stateOver = createHarness({
      actions: 1,
      relativePaths: 1,
      decodedPriorBytes: 4,
      stateBytes: exactWorstCase - 1,
    });
    const stateOverBefore = await observedBytes(stateOver.store);
    expect(await stateOver.writer.preflight(operationInput([one]))).toMatchObject({
      kind: "Rejected",
      failure: { code: "CapsuleBoundExceeded" },
    });
    expect(await observedBytes(stateOver.store)).toEqual(stateOverBefore);
  });

  it("classifies codec failures by typed boundaries rather than exception wording", async () => {
    const harness = createHarness();
    const action = fixtureAction("plugins/a/typed-failure");
    const codecFailures = harness.world.codecFailures;
    if (codecFailures === undefined) throw new Error("typed-failure fixture is not configured");
    codecFailures.parseAction = "opaque codec refusal";
    expect(await harness.writer.preflight(operationInput([action]))).toMatchObject({
      kind: "Rejected",
      failure: { code: "InvalidOwnerAction", message: "opaque codec refusal" },
    });

    delete codecFailures.parseAction;
    const admitted = await acceptedBegin(harness, [action]);
    const actionHandle = admitted.admittedActions[0]!.actionHandle;
    expect(await admitted.session.stage({ actionHandle })).toMatchObject({ kind: "Accepted" });
    codecFailures.parseObservedPost = "opaque observation refusal";
    expect(await admitted.session.markApplied({
      actionHandle,
      observedPost: fixtureObserved(action),
    })).toMatchObject({
      kind: "Rejected",
      failure: { code: "InvalidObservedPost", message: "opaque observation refusal" },
    });
    await admitted.session.suspend();
  });

  it("admits one complete plan, returns aligned opaque handles, and rejects a concurrent start", async () => {
    const harness = createHarness();
    const actions = [fixtureAction("plugins/a/one"), fixtureAction("plugins/a/two")];
    const [first, second] = await Promise.all([
      begin(harness.writer, actions),
      begin(harness.writer, actions),
    ]);
    const accepted = [first, second].find((result) => result.kind === "Accepted");
    const rejected = [first, second].find((result) => result.kind === "Rejected");

    expect(accepted?.kind).toBe("Accepted");
    expect(rejected?.kind).toBe("Rejected");
    if (accepted?.kind !== "Accepted") throw new Error("expected one admitted operation");
    expect(accepted.admittedActions).toHaveLength(2);
    expect(accepted.admittedActions.map(({ actionHandle }) => actionHandle)).toEqual([
      expect.stringMatching(/^ca1_[a-f0-9]{64}$/),
      expect.stringMatching(/^ca1_[a-f0-9]{64}$/),
    ]);
    expect(accepted.admittedActions[0]!.actionHandle).not.toBe(accepted.admittedActions[1]!.actionHandle);
    expect(rejected).toMatchObject({ failure: { code: "AdmissionBusy" } });
    expect(await accepted.session.suspend()).toEqual({ kind: "Released" });
    expect(await accepted.session.stage({
      actionHandle: accepted.admittedActions[0]!.actionHandle,
    })).toMatchObject({ kind: "Rejected", failure: { code: "StateBlocked" } });
  });

  it("rejects busy begin, recovery, and undo before owner target, classifier, or replay calls", async () => {
    const harness = createHarness();
    const action = fixtureAction("plugins/a/live-owner");
    const admitted = await acceptedBegin(harness, [action]);
    const before = { ...harness.world.calls };

    const [busyBegin, busyRecovery, busyUndo] = await Promise.all([
      begin(harness.writer, [fixtureAction("plugins/a/contender")]),
      harness.writer.recoverApplying(),
      harness.undo.undo(),
    ]);

    expect(busyBegin).toMatchObject({
      kind: "Rejected",
      failure: { code: "AdmissionBusy" },
      synchronization: { kind: "NotAcquired" },
    });
    expect(busyRecovery).toMatchObject({
      kind: "RecoveryRejected",
      failure: { code: "AdmissionBusy" },
      synchronization: { kind: "NotAcquired" },
    });
    expect(busyUndo).toMatchObject({
      kind: "RejectedBeforeReplay",
      failure: { code: "AdmissionBusy" },
      synchronization: { kind: "NotAcquired" },
    });
    expect(harness.world.calls).toEqual(before);
    expect(await admitted.session.suspend()).toEqual({ kind: "Released" });
  });

  it("fails fast when an exclusive store session is called or released concurrently", async () => {
    const harness = createHarness();
    const acquired = await harness.store.acquireExclusiveSession();
    if (acquired.kind !== "Acquired") throw new Error(acquired.failure.message);
    const barrier = harness.store.holdNextAccess();
    const firstRead = acquired.session.access.read();
    await barrier.entered;

    expect(await acquired.session.access.read()).toMatchObject({
      kind: "Rejected",
      failure: { code: "AdmissionBusy" },
    });
    await expect(acquired.session.release()).rejects.toThrow(/call in flight/i);

    barrier.release();
    expect(await firstRead).toMatchObject({ kind: "Observed" });
    await expect(acquired.session.release()).resolves.toBeUndefined();
    const reacquired = await harness.store.acquireExclusiveSession();
    expect(reacquired).toMatchObject({ kind: "Acquired" });
    if (reacquired.kind === "Acquired") await reacquired.session.release();
  });

  it("fails applying calls and suspend instead of queueing behind a live state transition", async () => {
    const harness = createHarness();
    const action = fixtureAction("plugins/a/live-call");
    const admitted = await acceptedBegin(harness, [action]);
    const barrier = harness.store.holdNextAccess();
    const stage = admitted.session.stage({ actionHandle: admitted.admittedActions[0]!.actionHandle });
    await barrier.entered;

    expect(await admitted.session.markApplied({
      actionHandle: admitted.admittedActions[0]!.actionHandle,
      observedPost: fixtureObserved(action),
    })).toMatchObject({ kind: "Rejected", failure: { code: "AdmissionBusy" } });
    expect(await admitted.session.settle()).toMatchObject({
      kind: "Rejected",
      failure: { code: "AdmissionBusy" },
      synchronization: {
        kind: "ReleaseFailed",
        failure: { code: "AdmissionBusy" },
      },
    });
    expect(await admitted.session.suspend()).toMatchObject({
      kind: "Rejected",
      failure: { code: "AdmissionBusy" },
    });

    barrier.release();
    expect(await stage).toMatchObject({ kind: "Accepted" });
    expect(await admitted.session.suspend()).toEqual({ kind: "Released" });
  });

  it("gives duplicate semantic actions distinct ordered admission handles", async () => {
    const harness = createHarness();
    const repeated = fixtureAction("plugins/a/repeated");
    const admitted = await acceptedBegin(harness, [repeated, repeated]);
    expect(admitted.admittedActions).toHaveLength(2);
    expect(admitted.admittedActions[0]!.actionHandle).not.toBe(admitted.admittedActions[1]!.actionHandle);
    const rejectedStage = await admitted.session.stage({
      actionHandle: admitted.admittedActions[1]!.actionHandle,
    });
    expect(rejectedStage).toMatchObject({ kind: "Rejected", failure: { code: "ActionStateConflict" } });
    expect(rejectedStage).not.toHaveProperty("synchronization");
    expect(await admitted.session.stage({
      actionHandle: admitted.admittedActions[0]!.actionHandle,
    })).toMatchObject({ kind: "Accepted" });
    await admitted.session.suspend();
  });

  it("restores the exact prior idle bytes on zero-mutation abort and replaces A with applied B", async () => {
    const harness = createHarness();
    const actionA = fixtureAction("plugins/a/a");
    await commit(harness, [actionA]);
    const afterA = await observedBytes(harness.store);

    const actionB = fixtureAction("plugins/b/b");
    const admittedB = await acceptedBegin(harness, [actionB]);
    const aborted = await admittedB.session.abort();
    expect(aborted.kind).toBe("Accepted");
    expect(await observedBytes(harness.store)).toEqual(afterA);

    await commit(harness, [actionB]);
    const state = await observedState(harness.store);
    expect(state.body.state.kind).toBe("idle");
    if (state.body.state.kind !== "idle" || state.body.state.committed === null) {
      throw new Error("expected B to commit");
    }
    expect(state.body.state.committed.capsule.actions).toHaveLength(1);
    expect(state.body.state.committed.capsule.actions[0]!.action).toEqual(actionB);
    expect(JSON.stringify(state)).not.toContain("plugins/a/a");
  });

  it("preserves terminal lifecycle truth when lease release reports failure", async () => {
    const abortion = createHarness();
    const abortedAdmission = await acceptedBegin(abortion, [fixtureAction("plugins/a/release-abort")]);
    abortion.store.injectNextReleaseFailure("injected abort release failure");
    expect(await abortedAdmission.session.abort()).toMatchObject({
      kind: "Accepted",
      synchronization: {
        kind: "ReleaseFailed",
        failure: { code: "AdmissionUnsafe", phase: "abort-release" },
      },
    });
    expect((await observedState(abortion.store)).body.state).toEqual({ kind: "idle", committed: null });

    const settlement = createHarness();
    const action = fixtureAction("plugins/a/release-settle");
    const admitted = await acceptedBegin(settlement, [action]);
    const actionHandle = admitted.admittedActions[0]!.actionHandle;
    await admitted.session.stage({ actionHandle });
    await admitted.session.markApplied({ actionHandle, observedPost: fixtureObserved(action) });
    settlement.store.injectNextReleaseFailure("injected terminal release failure");

    expect(await admitted.session.settle()).toMatchObject({
      kind: "Accepted",
      synchronization: {
        kind: "ReleaseFailed",
        failure: { code: "AdmissionUnsafe", phase: "settle-release" },
      },
    });
    const settledState = await observedState(settlement.store);
    expect(settledState.body.state.kind).toBe("idle");
    expect(await admitted.session.suspend()).toMatchObject({
      kind: "Rejected",
      failure: { phase: "settle-release" },
    });

    const recovery = createHarness();
    const recoveryAction = fixtureAction("plugins/a/release-recovery");
    const recoveryAdmission = await acceptedBegin(recovery, [recoveryAction]);
    await recoveryAdmission.session.stage({
      actionHandle: recoveryAdmission.admittedActions[0]!.actionHandle,
    });
    recovery.world.states.set(recoveryAction.relativePath, "prior");
    await recoveryAdmission.session.suspend();
    recovery.store.injectNextReleaseFailure("injected recovery release failure");
    expect(await recovery.writer.recoverApplying()).toMatchObject({
      kind: "RecoveredToPriorIdle",
      synchronization: {
        kind: "ReleaseFailed",
        failure: { code: "AdmissionUnsafe", phase: "recover-applying-release" },
      },
    });
    expect((await observedState(recovery.store)).body.state.kind).toBe("idle");

    await commit(recovery, [recoveryAction]);
    recovery.world.states.set(recoveryAction.relativePath, "post");
    recovery.store.injectNextReleaseFailure("injected undo release failure");
    expect(await recovery.undo.undo()).toMatchObject({
      kind: "RestoredAndCleared",
      synchronization: {
        kind: "ReleaseFailed",
        failure: { code: "AdmissionUnsafe", phase: "undo-release" },
      },
    });
    const undoneState = await observedState(recovery.store);
    expect(undoneState.body.state).toEqual({ kind: "idle", committed: null });
  });

  it("preserves a rejected begin failure alongside its release failure", async () => {
    const harness = createHarness();
    const action = fixtureAction("plugins/a/begin-release");
    const admitted = await acceptedBegin(harness, [action]);
    await admitted.session.suspend();
    harness.store.injectNextReleaseFailure("injected rejected-begin release failure");

    expect(await begin(harness.writer, [action])).toMatchObject({
      kind: "Rejected",
      failure: { code: "StateBlocked", phase: "begin" },
      synchronization: {
        kind: "ReleaseFailed",
        failure: { code: "AdmissionUnsafe", phase: "begin-release" },
      },
    });
    expect((await observedState(harness.store)).body.state.kind).toBe("applying");
    expect(await coldWriter(harness).recoverApplying()).toMatchObject({ kind: "RecoveredToPriorIdle" });
    expect((await observedState(harness.store)).body.state.kind).toBe("idle");
  });

  it("preserves an unsettled begin publication alongside its release failure", async () => {
    const harness = createHarness();
    const action = fixtureAction("plugins/a/begin-unsettled-release");
    harness.store.injectNextCasUnsettled({
      code: "StatePublicationFailed",
      phase: "begin-publication",
      message: "begin state publication cannot be classified as prior or next",
    });
    harness.store.injectNextReleaseFailure("injected unsettled-begin release failure");

    expect(await begin(harness.writer, [action])).toMatchObject({
      kind: "Unsettled",
      failure: {
        code: "StatePublicationFailed",
        phase: "begin-publication",
        message: "begin state publication cannot be classified as prior or next",
      },
      synchronization: {
        kind: "ReleaseFailed",
        failure: { code: "AdmissionUnsafe", phase: "begin-release" },
      },
    });
    expect((await observedState(harness.store)).body.state.kind).toBe("applying");
    expect(await coldWriter(harness).recoverApplying()).toMatchObject({ kind: "RecoveredToPriorIdle" });
    expect((await observedState(harness.store)).body.state.kind).toBe("idle");
  });

  it("returns nonterminal unsettled lifecycle truth with its exact release result", async () => {
    const stageHarness = createHarness();
    const stageAction = fixtureAction("plugins/a/stage-unsettled-release");
    const stageAdmission = await acceptedBegin(stageHarness, [stageAction]);
    stageHarness.store.injectNextCasUnsettled({
      code: "StatePublicationFailed",
      phase: "stage-publication",
      message: "stage publication cannot be classified",
    });
    const staged = await stageAdmission.session.stage({
      actionHandle: stageAdmission.admittedActions[0]!.actionHandle,
    });
    expect(staged).toMatchObject({
      kind: "Unsettled",
      failure: {
        code: "StatePublicationFailed",
        phase: "stage-publication",
        message: "stage publication cannot be classified",
      },
      synchronization: { kind: "Released" },
    });
    const closedStageCall = await stageAdmission.session.markApplied({
      actionHandle: stageAdmission.admittedActions[0]!.actionHandle,
      observedPost: fixtureObserved(stageAction),
    });
    expect(closedStageCall).toMatchObject({ kind: "Rejected", failure: { code: "StateBlocked" } });
    expect(closedStageCall).not.toHaveProperty("synchronization");
    expect(await coldWriter(stageHarness).recoverApplying()).toMatchObject({ kind: "RecoveredToPriorIdle" });
    expect((await observedState(stageHarness.store)).body.state.kind).toBe("idle");

    const discardHarness = createHarness();
    const discardAction = fixtureAction("plugins/a/discard-unsettled-release");
    const discardAdmission = await acceptedBegin(discardHarness, [discardAction]);
    const discardHandle = discardAdmission.admittedActions[0]!.actionHandle;
    const preparedDiscard = await discardAdmission.session.stage({ actionHandle: discardHandle });
    expect(preparedDiscard).toMatchObject({ kind: "Accepted" });
    expect(preparedDiscard).not.toHaveProperty("synchronization");
    discardHarness.store.injectNextCasUnsettled({
      code: "StatePublicationFailed",
      phase: "discard-publication",
      message: "discard publication cannot be classified",
    });
    discardHarness.store.injectNextReleaseFailure("injected discard release failure");
    expect(await discardAdmission.session.discardStaged({ actionHandle: discardHandle })).toMatchObject({
      kind: "Unsettled",
      failure: {
        code: "StatePublicationFailed",
        phase: "discard-publication",
        message: "discard publication cannot be classified",
      },
      synchronization: {
        kind: "ReleaseFailed",
        failure: { code: "AdmissionUnsafe", phase: "discard-staged-release" },
      },
    });
    expect(await coldWriter(discardHarness).recoverApplying()).toMatchObject({ kind: "RecoveredToPriorIdle" });
    expect((await observedState(discardHarness.store)).body.state.kind).toBe("idle");

    const markHarness = createHarness();
    const markAction = fixtureAction("plugins/a/mark-unsettled-release");
    const markAdmission = await acceptedBegin(markHarness, [markAction]);
    const markHandle = markAdmission.admittedActions[0]!.actionHandle;
    await markAdmission.session.stage({ actionHandle: markHandle });
    markHarness.store.injectNextCasUnsettled({
      code: "StatePublicationFailed",
      phase: "mark-publication",
      message: "observed-post publication cannot be classified",
    });
    markHarness.store.injectNextReleaseFailure("injected mark release failure");
    markHarness.world.states.set(markAction.relativePath, "post");
    expect(await markAdmission.session.markApplied({
      actionHandle: markHandle,
      observedPost: fixtureObserved(markAction),
    })).toMatchObject({
      kind: "Unsettled",
      failure: {
        code: "StatePublicationFailed",
        phase: "mark-publication",
        message: "observed-post publication cannot be classified",
      },
      synchronization: {
        kind: "ReleaseFailed",
        failure: { code: "AdmissionUnsafe", phase: "mark-applied-release" },
      },
    });
    expect(await coldWriter(markHarness).recoverApplying()).toMatchObject({ kind: "RecoveredCommitted" });
    expect((await observedState(markHarness.store)).body.state.kind).toBe("idle");
  });

  it("requires a staged action and validated observed-post binding before settlement", async () => {
    const harness = createHarness();
    const action = fixtureAction("plugins/a/file");
    const admitted = await acceptedBegin(harness, [action]);

    expect(await admitted.session.settle()).toMatchObject({
      kind: "Rejected",
      failure: { code: "AppliedObservationMissing" },
    });
    expect(await harness.writer.recoverApplying()).toEqual({
      kind: "RecoveredToPriorIdle",
      synchronization: { kind: "Released" },
    });

    const retry = await acceptedBegin(harness, [action]);
    const retryHandle = retry.admittedActions[0]!.actionHandle;
    expect(await retry.session.stage({ actionHandle: retryHandle })).toMatchObject({ kind: "Accepted" });
    expect(await retry.session.markApplied({
      actionHandle: retryHandle,
      observedPost: { ...fixtureObserved(action), identity: "wrong" },
    })).toMatchObject({ kind: "Rejected", failure: { code: "InvalidObservedPost" } });
    await retry.session.suspend();
    expect((await observedState(harness.store)).body.state.kind).toBe("applying");
  });

  it("cold-recovers staged not-applied, applied, and ambiguous states without path inference", async () => {
    const noMutation = createHarness();
    const noMutationAction = fixtureAction("plugins/a/not-applied");
    const priorBytes = await observedBytes(noMutation.store);
    const noMutationBegin = await acceptedBegin(noMutation, [noMutationAction]);
    await noMutationBegin.session.stage({
      actionHandle: noMutationBegin.admittedActions[0]!.actionHandle,
    });
    noMutation.world.states.set(noMutationAction.relativePath, "prior");
    const noMutationRecovery = new CapsuleControllerWriterV1({
      store: noMutation.store,
      registry: noMutation.registry,
    });
    expect(await noMutationRecovery.recoverApplying()).toMatchObject({
      kind: "RecoveryRejected",
      failure: { code: "AdmissionBusy" },
    });
    expect(await noMutation.undo.undo()).toMatchObject({
      kind: "RejectedBeforeReplay",
      failure: { code: "AdmissionBusy" },
      synchronization: { kind: "NotAcquired" },
    });
    expect(await noMutationBegin.session.suspend()).toEqual({ kind: "Released" });
    expect(await noMutationRecovery.recoverApplying()).toEqual({
      kind: "RecoveredToPriorIdle",
      synchronization: { kind: "Released" },
    });
    expect(await observedBytes(noMutation.store)).toEqual(priorBytes);

    const applied = createHarness();
    const appliedAction = fixtureAction("plugins/a/applied");
    const appliedBegin = await acceptedBegin(applied, [appliedAction]);
    await appliedBegin.session.stage({
      actionHandle: appliedBegin.admittedActions[0]!.actionHandle,
    });
    applied.world.states.set(appliedAction.relativePath, "post");
    await appliedBegin.session.suspend();
    expect(await new CapsuleControllerWriterV1({ store: applied.store, registry: applied.registry }).recoverApplying())
      .toMatchObject({ kind: "RecoveredCommitted" });

    const ambiguous = createHarness();
    const ambiguousAction = fixtureAction("plugins/a/ambiguous");
    const ambiguousBegin = await acceptedBegin(ambiguous, [ambiguousAction]);
    await ambiguousBegin.session.stage({
      actionHandle: ambiguousBegin.admittedActions[0]!.actionHandle,
    });
    ambiguous.world.states.set(ambiguousAction.relativePath, "ambiguous");
    await ambiguousBegin.session.suspend();
    expect(await new CapsuleControllerWriterV1({ store: ambiguous.store, registry: ambiguous.registry }).recoverApplying())
      .toMatchObject({ kind: "ApplyingUnsettled" });
    expect((await observedState(ambiguous.store)).body.state.kind).toBe("applying");
  });

  it("keeps a mutation durably applying when observed-post persistence fails, then cold-recovers it", async () => {
    const harness = createHarness();
    const action = fixtureAction("plugins/a/persist-failure");
    const admitted = await acceptedBegin(harness, [action]);
    const actionHandle = admitted.admittedActions[0]!.actionHandle;
    await admitted.session.stage({ actionHandle });
    harness.world.states.set(action.relativePath, "post");
    harness.store.injectNextFailure({
      code: "StatePublicationFailed",
      phase: "test",
      message: "injected observed-post persistence failure",
    });
    expect(await admitted.session.markApplied({
      actionHandle,
      observedPost: fixtureObserved(action),
    })).toMatchObject({ kind: "Rejected", failure: { code: "StatePublicationFailed" } });
    await admitted.session.suspend();
    expect((await observedState(harness.store)).body.state.kind).toBe("applying");
    expect(await new CapsuleControllerWriterV1({ store: harness.store, registry: harness.registry }).recoverApplying())
      .toMatchObject({ kind: "RecoveredCommitted" });
  });

  it("settles any exact applied prefix as operation B and never includes unmutated planned actions", async () => {
    const harness = createHarness();
    const actions = [
      fixtureAction("plugins/a/applied"),
      fixtureAction("plugins/a/not-applied-one"),
      fixtureAction("plugins/a/not-applied-two"),
    ];
    const admitted = await acceptedBegin(harness, actions);
    await admitted.session.stage({
      actionHandle: admitted.admittedActions[0]!.actionHandle,
    });
    await admitted.session.markApplied({
      actionHandle: admitted.admittedActions[0]!.actionHandle,
      observedPost: fixtureObserved(actions[0]!),
    });
    expect(await admitted.session.settle()).toMatchObject({ kind: "Accepted" });
    const state = await observedState(harness.store);
    if (state.body.state.kind !== "idle" || state.body.state.committed === null) {
      throw new Error("expected partial applied subset to settle");
    }
    expect(state.body.state.committed.capsule.actions.map(({ action }) => action)).toEqual([actions[0]]);
    expect(JSON.stringify(state)).not.toContain("not-applied");
    expect(await admitted.session.abort()).toMatchObject({
      kind: "Rejected",
      failure: { code: "StateBlocked" },
    });
  });

  it("replays only through the registered owner in reverse and clears exactly one capsule", async () => {
    const harness = createHarness();
    const actions = [
      fixtureAction("plugins/a/one"),
      fixtureAction("plugins/a/two"),
      fixtureAction("plugins/a/three"),
    ];
    await commit(harness, actions);
    for (const action of actions) harness.world.states.set(action.relativePath, "post");

    const result = await harness.undo.undo();
    expect(result).toEqual({
      kind: "RestoredAndCleared",
      synchronization: { kind: "Released" },
    });
    expect(harness.world.replayOrder).toEqual([
      "plugins/a/three",
      "plugins/a/two",
      "plugins/a/one",
    ]);
    const state = await observedState(harness.store);
    expect(state.body.state).toEqual({ kind: "idle", committed: null });
    expect(await harness.undo.undo()).toEqual({
      kind: "NoCommittedCapsule",
      synchronization: { kind: "Released" },
    });
  });

  it("rejects a capsule changed after binding preflight without a state write and allows a clean rebind", async () => {
    const harness = createHarness();
    const staleDigest = (await observedState(harness.store)).stateDigest;
    const action = fixtureAction("plugins/a/one");
    await commit(harness, [action]);
    harness.world.states.set(action.relativePath, "post");
    const committed = await observedState(harness.store);
    const before = await observedBytes(harness.store);

    const stale = await harness.undo.undo({ expectedStateDigest: staleDigest });
    expect(stale).toMatchObject({
      kind: "RejectedBeforeReplay",
      failure: { code: "StateChanged", phase: "undo-preflight" },
    });
    expect(await observedBytes(harness.store)).toEqual(before);
    expect(harness.world.replayOrder).toEqual([]);

    const rebound = await harness.undo.undo({ expectedStateDigest: committed.stateDigest });
    expect(rebound).toMatchObject({ kind: "RestoredAndCleared" });
    expect(harness.world.replayOrder).toEqual(["plugins/a/one"]);
  });

  it("durably retains replay failure and resumes the same generation after a cold reopen", async () => {
    const harness = createHarness();
    const actions = [fixtureAction("plugins/a/one"), fixtureAction("plugins/a/two")];
    await commit(harness, actions);
    harness.world.states.set(actions[0]!.relativePath, "post");
    harness.world.states.set(actions[1]!.relativePath, "failed");

    const first = await harness.undo.undo();
    expect(first).toMatchObject({ kind: "ReplayUnsettled", failure: { code: "ReplayBlocked" } });
    expect((await observedState(harness.store)).body.state.kind).toBe("undoing");

    harness.world.states.set(actions[1]!.relativePath, "post");
    const reopened = new CapsuleUndoControllerV1({
      store: harness.store,
      registry: harness.registry,
      opaqueSource: sequentialOpaqueSource(500),
    });
    expect(await reopened.undo()).toEqual({
      kind: "RestoredAndCleared",
      synchronization: { kind: "Released" },
    });
    expect(harness.world.replayOrder).toEqual(["plugins/a/two", "plugins/a/one"]);
  });

  it("rejects malformed canonical state, extra fields, and an unknown owner protocol", () => {
    const harness = createHarness();
    const initial = createInitialCapsuleState();
    const bytes = encodeCapsuleState(initial);
    expect(parseCapsuleStateBytes(bytes, harness.registry)).toEqual(initial);
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    const extraField = canonicalJsonBytes({ ...parsed, extra: true });
    expect(() => parseCapsuleStateBytes(extraField, harness.registry)).toThrow(/missing or extra/i);
    expect(() => parseCapsuleStateBytes(bytes.subarray(0, bytes.byteLength - 1), harness.registry)).toThrow(/trailing LF/i);
    expect(() => createFixtureRegistry(harness.world).require("unknown-owner", 1)).toThrow(/unknown owner protocol/i);
  });

  it("fails closed on recomputed unknown owner/version and malformed action/observation state", async () => {
    const harness = createHarness();
    await commit(harness, [fixtureAction("plugins/a/parser")]);
    const valid = await observedBytes(harness.store);

    const unknownOwner = JSON.parse(new TextDecoder().decode(valid)) as any;
    unknownOwner.body.state.committed.capsule.owner = "unknown-owner";
    resealState(unknownOwner);
    expect(() => parseCapsuleStateBytes(canonicalJsonBytes(unknownOwner), harness.registry)).toThrow(/unknown owner/i);

    const unknownVersion = JSON.parse(new TextDecoder().decode(valid)) as any;
    unknownVersion.body.state.committed.capsule.ownerProtocolVersion = 99;
    resealState(unknownVersion);
    expect(() => parseCapsuleStateBytes(canonicalJsonBytes(unknownVersion), harness.registry)).toThrow(/unknown owner protocol/i);

    const malformedAction = JSON.parse(new TextDecoder().decode(valid)) as any;
    const malformedStored = malformedAction.body.state.committed.capsule.actions[0];
    malformedStored.action.extra = true;
    malformedStored.actionDigest = ownerActionDigest({
      action: malformedStored.action,
      owner: FIXTURE_OWNER,
      protocolVersion: FIXTURE_VERSION,
      sequence: 0,
    });
    resealState(malformedAction);
    expect(() => parseCapsuleStateBytes(canonicalJsonBytes(malformedAction), harness.registry)).toThrow(/malformed fixture action/i);

    const malformedObservation = JSON.parse(new TextDecoder().decode(valid)) as any;
    malformedObservation.body.state.committed.capsule.actions[0].observedPost.identity = "wrong";
    resealState(malformedObservation);
    expect(() => parseCapsuleStateBytes(canonicalJsonBytes(malformedObservation), harness.registry)).toThrow(/does not bind/i);
  });

  it("rejects every hard bound before admission and accepts exact configured boundaries", async () => {
    const one = fixtureAction("plugins/a/one", 4);
    const two = fixtureAction("plugins/a/two", 4);
    const actionBound = createHarness({ actions: 1, relativePaths: 10, decodedPriorBytes: 100, stateBytes: 1_000_000 });
    expect(await begin(actionBound.writer, [one, two])).toMatchObject({
      kind: "Rejected",
      failure: { code: "CapsuleBoundExceeded" },
    });
    expect((await observedState(actionBound.store)).body.state.kind).toBe("idle");

    const pathBound = createHarness({ actions: 2, relativePaths: 1, decodedPriorBytes: 100, stateBytes: 1_000_000 });
    expect(await begin(pathBound.writer, [one, two])).toMatchObject({ kind: "Rejected" });

    const bytesBoundary = createHarness({ actions: 2, relativePaths: 2, decodedPriorBytes: 8, stateBytes: 1_000_000 });
    const bytesBoundaryAdmission = await acceptedBegin(bytesBoundary, [one, two]);
    await bytesBoundaryAdmission.session.suspend();
    const bytesOver = createHarness({ actions: 2, relativePaths: 2, decodedPriorBytes: 7, stateBytes: 1_000_000 });
    expect(await begin(bytesOver.writer, [one, two])).toMatchObject({ kind: "Rejected" });

    const sizing = createHarness({ actions: 1, relativePaths: 1, decodedPriorBytes: 4, stateBytes: 1_000_000 });
    const sizingAdmission = await acceptedBegin(sizing, [one]);
    await sizingAdmission.session.suspend();
    const applying = await observedState(sizing.store);
    const baseSize = encodeCapsuleState(applying, { actions: 1, relativePaths: 1, decodedPriorBytes: 4, stateBytes: 1_000_000 }).byteLength;
    if (applying.body.state.kind !== "applying") throw new Error("expected applying sizing state");
    const budget = applying.body.state.candidate.actions[0]!.maximumObservedPostBytes;
    const exactWorstCase = baseSize + Math.max(0, budget - 5);
    const exact = createHarness({ actions: 1, relativePaths: 1, decodedPriorBytes: 4, stateBytes: exactWorstCase });
    const exactAdmission = await acceptedBegin(exact, [one]);
    await exactAdmission.session.suspend();
    const over = createHarness({ actions: 1, relativePaths: 1, decodedPriorBytes: 4, stateBytes: exactWorstCase - 1 });
    expect(await begin(over.writer, [one])).toMatchObject({ kind: "Rejected" });

    const observedBudget = createHarness();
    const budgetAction = fixtureAction("plugins/a/observation-budget");
    const budgetAdmission = await acceptedBegin(observedBudget, [budgetAction]);
    await budgetAdmission.session.stage({
      actionHandle: budgetAdmission.admittedActions[0]!.actionHandle,
    });
    expect(await budgetAdmission.session.markApplied({
      actionHandle: budgetAdmission.admittedActions[0]!.actionHandle,
      observedPost: {
        identity: budgetAction.expectedPost,
        directories: [{ relativePath: "x".repeat(2_000), dev: "1", ino: "2" }],
      },
    })).toMatchObject({ kind: "Rejected", failure: { code: "InvalidObservedPost" } });
    await budgetAdmission.session.suspend();
  });
});

function createHarness(limits?: CapsuleStateLimitsV1) {
  const world: FixtureWorldV1 = {
    states: new Map(),
    replayOrder: [],
    codecFailures: {},
    calls: {
      targetSelections: 0,
      applyingClassifications: 0,
      replayClassifications: 0,
      replayRestores: 0,
      replayVerifications: 0,
    },
  };
  const registry = createFixtureRegistry(world);
  const store = new InMemoryCapsuleStateStoreV1(createInitialCapsuleState());
  const writer = new CapsuleControllerWriterV1({
    store,
    registry,
    opaqueSource: sequentialOpaqueSource(),
    ...(limits === undefined ? {} : { limits }),
  });
  const undo = new CapsuleUndoControllerV1({
    store,
    registry,
    opaqueSource: sequentialOpaqueSource(200),
    ...(limits === undefined ? {} : { limits }),
  });
  return { world, registry, store, writer, undo };
}

function coldWriter(harness: ReturnType<typeof createHarness>): CapsuleControllerWriterV1 {
  return new CapsuleControllerWriterV1({
    store: harness.store,
    registry: harness.registry,
    opaqueSource: sequentialOpaqueSource(500),
  });
}

async function begin(writer: CapsuleControllerWriterV1, actions: readonly FixtureActionV1[]) {
  return writer.begin(operationInput(actions));
}

function operationInput(
  actions: readonly FixtureActionV1[],
  targets: readonly TargetStateBindingV1[] = FIXTURE_TARGETS,
) {
  return {
    owner: FIXTURE_OWNER,
    ownerProtocolVersion: FIXTURE_VERSION,
    contentAuthority: "fixture-content-authority",
    targets,
    actions: actions.map((action) => ({ action })),
  } as const;
}

async function acceptedBegin(harness: ReturnType<typeof createHarness>, actions: readonly FixtureActionV1[]) {
  const result = await begin(harness.writer, actions);
  if (result.kind !== "Accepted") throw new Error(`begin rejected: ${result.failure.message}`);
  return result;
}

async function commit(harness: ReturnType<typeof createHarness>, actions: readonly FixtureActionV1[]): Promise<void> {
  const admitted = await acceptedBegin(harness, actions);
  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index]!;
    const actionHandle = admitted.admittedActions[index]!.actionHandle;
    expect(await admitted.session.stage({ actionHandle })).toMatchObject({ kind: "Accepted" });
    expect(await admitted.session.markApplied({
      actionHandle,
      observedPost: fixtureObserved(action),
    })).toMatchObject({ kind: "Accepted" });
  }
  expect(await admitted.session.settle()).toMatchObject({ kind: "Accepted" });
}

async function observedState(store: InMemoryCapsuleStateStoreV1) {
  const result = await store.read();
  if (result.kind !== "Observed") throw new Error(result.failure.message);
  return result.observation.state;
}

async function observedBytes(store: InMemoryCapsuleStateStoreV1): Promise<Uint8Array> {
  const result = await store.read();
  if (result.kind !== "Observed") throw new Error(result.failure.message);
  return result.observation.bytes;
}

function sequentialOpaqueSource(start = 1): CapsuleOpaqueSourceV1 {
  let value = start;
  return Object.freeze({
    nextBytes(): Uint8Array {
      const bytes = Buffer.alloc(32);
      bytes.writeUInt32BE(value, 28);
      value += 1;
      return bytes;
    },
  });
}

function resealState(envelope: any): void {
  envelope.body.state.committed.capsuleDigest = committedCapsuleDigest(
    envelope.body.state.committed.capsule,
  );
  envelope.stateDigest = capsuleStateDigest(envelope.body);
}
