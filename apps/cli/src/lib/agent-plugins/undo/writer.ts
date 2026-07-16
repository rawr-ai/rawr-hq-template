import { createHash, randomBytes } from "node:crypto";

import { canonicalJsonBytes } from "./canonical";
import type {
  ApplyingRecoveryResult,
  CapsuleApplyingSessionV1,
  CapsuleBeginInputV1,
  CapsuleBeginResult,
  CapsuleFailure,
  CapsuleGeneration,
  CapsulePreflightResult,
  CapsuleReleaseResultV1,
  CapsuleSynchronizationResultV1,
  CapsuleSuspendResult,
  CapsuleTerminalWriteResult,
  CapsuleToken,
  CapsuleUndoWriterV1,
  CapsuleWriteResult,
} from "./contract";
import { ClosedOwnerProtocolRegistryV1 } from "./protocol-registry";
import {
  normalizeCapsuleLimits,
  PRODUCTION_CAPSULE_LIMITS,
  sealCapsuleState,
  sealCommittedCapsule,
  type ApplyingCandidateV1,
  type CapsuleStateEnvelopeV1,
  type CapsuleStateLimitsV1,
  type StoredCommittedActionV1,
  type StoredPlannedActionV1,
} from "./state";
import type {
  CapsuleExclusiveSessionV1,
  CapsuleStateAccessV1,
  CapsuleStateStoreV1,
} from "./store";
import {
  capsuleInputFailureCode,
  capsuleInputValidationError,
  parseTargetBindings,
  requireOwner,
  requireSafeInteger,
  requireString,
} from "./validation";

type WithoutSynchronization<T> = T extends unknown ? Omit<T, "synchronization"> : never;
type ApplyingRecoveryOperationResult = WithoutSynchronization<ApplyingRecoveryResult>;
type CapsuleBeginOperationResult = WithoutSynchronization<CapsuleBeginResult>;
type CapsuleWriteOperationResult = WithoutSynchronization<CapsuleWriteResult>;

export interface CapsuleOpaqueSourceV1 {
  nextBytes(): Uint8Array;
}

export interface CapsuleControllerWriterOptionsV1 {
  readonly store: CapsuleStateStoreV1;
  readonly registry: ClosedOwnerProtocolRegistryV1;
  readonly opaqueSource?: CapsuleOpaqueSourceV1;
  readonly limits?: CapsuleStateLimitsV1;
}

interface ParsedCandidatePlanV1 {
  readonly owner: string;
  readonly ownerProtocolVersion: number;
  readonly contentAuthority: string;
  readonly targets: ApplyingCandidateV1["targets"];
  readonly actions: readonly StoredPlannedActionV1[];
}

const PREFLIGHT_TOKEN =
  "ct1_0000000000000000000000000000000000000000000000000000000000000000" as CapsuleToken;
const PREFLIGHT_GENERATION =
  "cg1_0000000000000000000000000000000000000000000000000000000000000000" as CapsuleGeneration;

export class CapsuleControllerWriterV1 implements CapsuleUndoWriterV1 {
  readonly #store: CapsuleStateStoreV1;
  readonly #registry: ClosedOwnerProtocolRegistryV1;
  readonly #opaqueSource: CapsuleOpaqueSourceV1;
  readonly #limits: CapsuleStateLimitsV1;

  constructor(options: CapsuleControllerWriterOptionsV1) {
    this.#store = options.store;
    this.#registry = options.registry;
    this.#opaqueSource = options.opaqueSource ?? Object.freeze({ nextBytes: () => randomBytes(32) });
    this.#limits = normalizeCapsuleLimits(options.limits ?? PRODUCTION_CAPSULE_LIMITS);
  }

  async preflight(input: CapsuleBeginInputV1): Promise<CapsulePreflightResult> {
    const read = await this.#store.read();
    if (read.kind === "Rejected") return Object.freeze({ kind: "Rejected", failure: read.failure });
    const prior = read.observation.state;
    if (prior.body.state.kind !== "idle") {
      return rejected("StateBlocked", "preflight", `capsule is ${prior.body.state.kind}`);
    }
    try {
      const plan = this.#parsePlan(input);
      sealCapsuleState(
        PREFLIGHT_GENERATION,
        Object.freeze({
          kind: "applying",
          prior: prior.body.state.committed,
          candidate: this.#candidateFor(plan, prior, PREFLIGHT_TOKEN),
        }),
        this.#limits,
      );
      return Object.freeze({ kind: "Accepted" });
    } catch (error) {
      return rejected(capsuleInputFailureCode(error), "preflight", errorMessage(error));
    }
  }

  async begin(input: CapsuleBeginInputV1): Promise<CapsuleBeginResult> {
    const acquired = await this.#store.acquireExclusiveSession();
    if (acquired.kind === "Rejected") {
      return Object.freeze({
        kind: "Rejected",
        failure: acquired.failure,
        synchronization: Object.freeze({ kind: "NotAcquired" }),
      });
    }
    const session = acquired.session;
    let result: CapsuleBeginOperationResult;
    try {
      const read = await session.access.read();
      if (read.kind === "Rejected") {
        result = { kind: "Rejected", failure: read.failure };
      } else {
        const prior = read.observation.state;
        if (prior.body.state.kind !== "idle") {
          result = rejected("StateBlocked", "begin", `capsule is ${prior.body.state.kind}`);
        } else {
          const plan = this.#parsePlan(input);
          const token = this.#tokenFor({
            priorStateDigest: prior.stateDigest,
            priorGeneration: prior.body.generation,
            owner: plan.owner,
            ownerProtocolVersion: plan.ownerProtocolVersion,
            targets: plan.targets,
          });
          const candidate = this.#candidateFor(plan, prior, token);
          const next = sealCapsuleState(
            this.#generationFor(prior, token, "begin"),
            Object.freeze({ kind: "applying", prior: prior.body.state.committed, candidate }),
            this.#limits,
          );
          const committed = await session.access.compareAndSet({
            expectedStateDigest: prior.stateDigest,
            nextState: next,
          });
          if (committed.kind === "Rejected") {
            result = { kind: "Rejected", failure: committed.failure };
          } else if (committed.kind === "Unsettled") {
            result = Object.freeze({
              kind: "Unsettled",
              generation: next.body.generation,
              failure: committed.failure,
              recoveryRequired: true,
            });
          } else if (committed.kind === "Conflict") {
            result = rejected("StateChanged", "begin", "capsule changed during atomic admission");
          } else {
            result = Object.freeze({
              kind: "Accepted",
              generation: next.body.generation,
              admittedActions: Object.freeze(candidate.actions.map((action) =>
                Object.freeze({ actionHandle: action.actionDigest }))),
              session: this.#createApplyingSession(session, token),
            });
          }
        }
      }
    } catch (error) {
      result = rejected(capsuleInputFailureCode(error), "begin", errorMessage(error));
    }
    if (result.kind === "Accepted") return result;
    let synchronization: CapsuleSynchronizationResultV1;
    try {
      await session.release();
      synchronization = Object.freeze({ kind: "Released" });
    } catch (error) {
      synchronization = Object.freeze({
        kind: "ReleaseFailed",
        failure: failure("AdmissionUnsafe", "begin-release", errorMessage(error)),
      });
    }
    return Object.freeze({ ...result, synchronization }) as CapsuleBeginResult;
  }

  #createApplyingSession(
    lease: CapsuleExclusiveSessionV1,
    token: CapsuleToken,
  ): CapsuleApplyingSessionV1 {
    let closed = false;
    let inFlight = false;
    let releaseResult: CapsuleReleaseResultV1 | null = null;
    const busyRelease = (phase: string): CapsuleReleaseResultV1 => Object.freeze({
      kind: "ReleaseFailed",
      failure: failure("AdmissionBusy", phase, "applying-session release is in flight"),
    });
    const close = async (phase: string): Promise<CapsuleReleaseResultV1> => {
      if (closed) return releaseResult ?? busyRelease(phase);
      closed = true;
      try {
        await lease.release();
        releaseResult = Object.freeze({ kind: "Released" });
      } catch (error) {
        releaseResult = Object.freeze({
          kind: "ReleaseFailed",
          failure: failure("AdmissionUnsafe", phase, errorMessage(error)),
        });
      }
      return releaseResult;
    };
    const run = async (
      phase: string,
      operation: () => Promise<CapsuleWriteOperationResult>,
    ): Promise<CapsuleWriteResult> => {
      if (closed) return rejected("StateBlocked", phase, "applying session is closed");
      if (inFlight) return rejected("AdmissionBusy", phase, "another applying-session call is in flight");
      inFlight = true;
      try {
        const result = await operation();
        if (result.kind === "Unsettled") {
          const synchronization = await close(`${phase}-release`);
          return Object.freeze({ ...result, synchronization });
        }
        return result;
      } finally {
        inFlight = false;
      }
    };
    const runTerminal = async (
      phase: string,
      operation: () => Promise<CapsuleWriteOperationResult>,
    ): Promise<CapsuleTerminalWriteResult> => {
      if (closed) {
        return Object.freeze({
          ...rejected("StateBlocked", phase, "applying session is closed"),
          synchronization: releaseResult ?? busyRelease(`${phase}-release`),
        });
      }
      if (inFlight) {
        return Object.freeze({
          ...rejected("AdmissionBusy", phase, "another applying-session call is in flight"),
          synchronization: busyRelease(`${phase}-release`),
        });
      }
      inFlight = true;
      try {
        let result: CapsuleWriteOperationResult;
        try {
          result = await operation();
        } catch (error) {
          result = rejected("StateInvalid", phase, errorMessage(error));
        }
        const synchronization = await close(`${phase}-release`);
        return Object.freeze({ ...result, synchronization }) as CapsuleTerminalWriteResult;
      } finally {
        inFlight = false;
      }
    };
    return Object.freeze({
      stage: (input: Parameters<CapsuleApplyingSessionV1["stage"]>[0]) =>
        run("stage", () => this.#stage(lease.access, token, input)),
      discardStaged: (input: Parameters<CapsuleApplyingSessionV1["discardStaged"]>[0]) => run(
        "discard-staged",
        () => this.#discardStaged(lease.access, token, input),
      ),
      markApplied: (input: Parameters<CapsuleApplyingSessionV1["markApplied"]>[0]) => run(
        "mark-applied",
        () => this.#markApplied(lease.access, token, input),
      ),
      settle: () => runTerminal("settle", () => this.#settleWithAccess(lease.access, { token })),
      abort: () => runTerminal("abort", () => this.#abortWithAccess(lease.access, { token })),
      suspend: async (): Promise<CapsuleSuspendResult> => {
        if (closed) {
          if (releaseResult === null) {
            return rejected("AdmissionBusy", "suspend", "applying-session release is in flight");
          }
          return releaseResult.kind === "Released"
            ? Object.freeze({ kind: "Released" })
            : Object.freeze({ kind: "Rejected", failure: releaseResult.failure });
        }
        if (inFlight) {
          return rejected("AdmissionBusy", "suspend", "an applying-session call is in flight");
        }
        inFlight = true;
        try {
          const synchronization = await close("suspend");
          return synchronization.kind === "Released"
            ? Object.freeze({ kind: "Released" })
            : Object.freeze({ kind: "Rejected", failure: synchronization.failure });
        } finally {
          inFlight = false;
        }
      },
    });
  }

  #stage(
    access: CapsuleStateAccessV1,
    token: CapsuleToken,
    input: Readonly<{
    actionHandle: `ca1_${string}`;
    }>,
  ): Promise<CapsuleWriteOperationResult> {
    return this.#transitionApplying(access, token, "stage", (state) => {
      const index = state.candidate.actions.findIndex((action) => action.actionDigest === input.actionHandle);
      if (index < 0) throw actionConflict("stage action is not part of the admitted candidate");
      const firstUnapplied = state.candidate.actions.findIndex((action) => action.phase !== "applied");
      if (index !== firstUnapplied || state.candidate.actions[index]!.phase !== "planned") {
        throw actionConflict("stage must select the next planned action");
      }
      return replaceAction(state, index, Object.freeze({
        ...state.candidate.actions[index]!,
        phase: "staged" as const,
      }));
    });
  }

  #discardStaged(
    access: CapsuleStateAccessV1,
    token: CapsuleToken,
    input: Readonly<{
    actionHandle: `ca1_${string}`;
    }>,
  ): Promise<CapsuleWriteOperationResult> {
    return this.#transitionApplying(access, token, "discard-staged", (state) => {
      const index = state.candidate.actions.findIndex((action) => action.actionDigest === input.actionHandle);
      if (index < 0 || state.candidate.actions[index]!.phase !== "staged") {
        throw actionConflict("discard requires the exact staged action");
      }
      return replaceAction(state, index, Object.freeze({
        ...state.candidate.actions[index]!,
        phase: "planned" as const,
      }));
    });
  }

  #markApplied(
    access: CapsuleStateAccessV1,
    token: CapsuleToken,
    input: Readonly<{
    actionHandle: `ca1_${string}`;
    observedPost: unknown;
    }>,
  ): Promise<CapsuleWriteOperationResult> {
    return this.#transitionApplying(access, token, "mark-applied", (state) => {
      const index = state.candidate.actions.findIndex((action) => action.actionDigest === input.actionHandle);
      const stored = index < 0 ? undefined : state.candidate.actions[index];
      if (stored === undefined || stored.phase !== "staged") {
        throw actionConflict("markApplied requires the exact staged action");
      }
      const parsedAction = this.#registry.parseAction(
        state.candidate.owner,
        state.candidate.ownerProtocolVersion,
        stored.action,
        stored.actionDigest,
        index,
      );
      const observed = this.#registry.parseObservedPost(
        state.candidate.owner,
        state.candidate.ownerProtocolVersion,
        parsedAction.action,
        input.observedPost,
        stored.maximumObservedPostBytes,
      );
      return replaceAction(state, index, Object.freeze({
        ...stored,
        phase: "applied" as const,
        observedPost: observed.encoded,
      }));
    });
  }

  async #settleWithAccess(
    access: CapsuleStateAccessV1,
    input: Readonly<{ token: CapsuleToken }>,
  ): Promise<CapsuleWriteOperationResult> {
    const read = await access.read();
    if (read.kind === "Rejected") return { kind: "Rejected", failure: read.failure };
    const current = read.observation.state;
    const applying = current.body.state;
    if (applying.kind !== "applying") return rejected("StateBlocked", "settle", "capsule is not applying");
    if (applying.candidate.token !== input.token) return rejected("StaleToken", "settle", "token is stale");
    try {
      if (applying.candidate.actions.some((action) => action.phase === "staged")) {
        throw actionConflict("cannot settle while an action lacks its observed-post binding");
      }
      const applied = applying.candidate.actions.filter((action) => action.phase === "applied");
      if (applied.length === 0) throw actionConflict("settlement requires an applied subset");
      const committedActions: StoredCommittedActionV1[] = applied.map((action) => {
        if (action.observedPost === null) {
          throw actionConflict("applied action lacks its validated observed-post binding");
        }
        return Object.freeze({
          actionDigest: action.actionDigest,
          actionType: action.actionType,
          action: action.action,
          relativePaths: action.relativePaths,
          decodedPriorBytes: action.decodedPriorBytes,
          observedPost: action.observedPost,
        });
      });
      const parsedApplied = applied.map((action, index) => this.#registry.parseAction(
        applying.candidate.owner,
        applying.candidate.ownerProtocolVersion,
        action.action,
        action.actionDigest,
        index,
      ).action);
      this.#registry.validateActionSequence(
        applying.candidate.owner,
        applying.candidate.ownerProtocolVersion,
        parsedApplied,
        "applied-prefix",
      );
      const appliedTargets = this.#registry.selectTargetBindings(
        applying.candidate.owner,
        applying.candidate.ownerProtocolVersion,
        applying.candidate.targets,
        parsedApplied,
      );
      const committedCapsule = sealCommittedCapsule(Object.freeze({
        owner: applying.candidate.owner,
        ownerProtocolVersion: applying.candidate.ownerProtocolVersion,
        contentAuthority: applying.candidate.contentAuthority,
        targets: appliedTargets,
        actions: Object.freeze(committedActions),
      }));
      const next = sealCapsuleState(
        this.#generationFor(current, input.token, "settle"),
        Object.freeze({ kind: "idle", committed: committedCapsule }),
        this.#limits,
      );
      return await this.#commitTransition(access, current, next, "settle");
    } catch (error) {
      return rejected(
        isActionConflict(error) ? "AppliedObservationMissing" : capsuleInputFailureCode(error),
        "settle",
        errorMessage(error),
      );
    }
  }

  async #abortWithAccess(
    access: CapsuleStateAccessV1,
    input: Readonly<{ token: CapsuleToken }>,
  ): Promise<CapsuleWriteOperationResult> {
    const read = await access.read();
    if (read.kind === "Rejected") return { kind: "Rejected", failure: read.failure };
    const current = read.observation.state;
    const applying = current.body.state;
    if (applying.kind !== "applying") return rejected("StateBlocked", "abort", "capsule is not applying");
    if (applying.candidate.token !== input.token) return rejected("StaleToken", "abort", "token is stale");
    if (applying.candidate.actions.some((action) => action.phase !== "planned")) {
      return rejected("ActionStateConflict", "abort", "abort requires a zero-mutation candidate");
    }
    try {
      const prior = sealCapsuleState(
        applying.candidate.priorGeneration,
        Object.freeze({ kind: "idle", committed: applying.prior }),
        this.#limits,
      );
      if (prior.stateDigest !== applying.candidate.priorStateDigest) {
        return rejected("StateInvalid", "abort", "candidate does not bind its exact prior idle state");
      }
      return await this.#commitTransition(access, current, prior, "abort");
    } catch (error) {
      return rejected("StateInvalid", "abort", errorMessage(error));
    }
  }

  async recoverApplying(): Promise<ApplyingRecoveryResult> {
    const acquired = await this.#store.acquireExclusiveSession();
    if (acquired.kind === "Rejected") {
      return Object.freeze({
        kind: "RecoveryRejected",
        failure: acquired.failure,
        synchronization: Object.freeze({ kind: "NotAcquired" }),
      });
    }
    let result: ApplyingRecoveryOperationResult;
    try {
      result = await this.#recoverApplyingWithAccess(acquired.session.access);
    } catch (error) {
      result = {
        kind: "RecoveryRejected",
        failure: failure("StateInvalid", "recover-applying", errorMessage(error)),
      };
    }
    let synchronization: CapsuleSynchronizationResultV1;
    try {
      await acquired.session.release();
      synchronization = Object.freeze({ kind: "Released" });
    } catch (error) {
      synchronization = Object.freeze({
        kind: "ReleaseFailed",
        failure: failure("AdmissionUnsafe", "recover-applying-release", errorMessage(error)),
      });
    }
    return Object.freeze({ ...result, synchronization }) as ApplyingRecoveryResult;
  }

  async #recoverApplyingWithAccess(access: CapsuleStateAccessV1): Promise<ApplyingRecoveryOperationResult> {
    let lastGeneration: CapsuleGeneration | null = null;
    for (let attempt = 0; attempt <= this.#limits.actions + 2; attempt += 1) {
      const read = await access.read();
      if (read.kind === "Rejected") {
        return lastGeneration === null
          ? { kind: "RecoveryRejected", failure: read.failure }
          : { kind: "ApplyingUnsettled", generation: lastGeneration, failure: read.failure };
      }
      const current = read.observation.state;
      lastGeneration = current.body.generation;
      if (current.body.state.kind !== "applying") return { kind: "NoApplyingState" };
      const applying = current.body.state;
      const stagedIndex = applying.candidate.actions.findIndex((action) => action.phase === "staged");
      const staged = stagedIndex < 0 ? undefined : applying.candidate.actions[stagedIndex];
      if (staged !== undefined) {
        try {
          const registration = this.#registry.require(
            applying.candidate.owner,
            applying.candidate.ownerProtocolVersion,
          );
          const parsed = this.#registry.parseAction(
            applying.candidate.owner,
            applying.candidate.ownerProtocolVersion,
            staged.action,
            staged.actionDigest,
            stagedIndex,
          );
          const classification = await registration.applyingRecovery.classifyStaged({
            action: parsed.action,
            targets: applying.candidate.targets,
          });
          if (classification.kind === "Ambiguous") {
            return {
              kind: "ApplyingUnsettled",
              generation: current.body.generation,
              failure: classification.failure,
            };
          }
          const transition = classification.kind === "NotApplied"
            ? await this.#discardStaged(access, applying.candidate.token, {
              actionHandle: staged.actionDigest,
            })
            : await this.#markApplied(access, applying.candidate.token, {
              actionHandle: staged.actionDigest,
              observedPost: classification.observedPost,
            });
          if (transition.kind === "Rejected" || transition.kind === "Unsettled") {
            return {
              kind: "ApplyingUnsettled",
              generation: transition.kind === "Unsettled"
                ? transition.generation
                : current.body.generation,
              failure: transition.failure,
            };
          }
          continue;
        } catch (error) {
          return {
            kind: "ApplyingUnsettled",
            generation: current.body.generation,
            failure: failure("StateInvalid", "recover-applying", errorMessage(error)),
          };
        }
      }
      const applied = applying.candidate.actions.some((action) => action.phase === "applied");
      const transition = applied
        ? await this.#settleWithAccess(access, { token: applying.candidate.token })
        : await this.#abortWithAccess(access, { token: applying.candidate.token });
      if (transition.kind === "Rejected" || transition.kind === "Unsettled") {
        return {
          kind: "ApplyingUnsettled",
          generation: transition.kind === "Unsettled"
            ? transition.generation
            : current.body.generation,
          failure: transition.failure,
        };
      }
      return applied
        ? { kind: "RecoveredCommitted", generation: transition.generation }
        : { kind: "RecoveredToPriorIdle" };
    }
    return {
      kind: "ApplyingUnsettled",
      generation: lastGeneration ?? zeroGeneration(),
      failure: failure("StateInvalid", "recover-applying", "recovery exceeded the bounded action frontier"),
    };
  }

  async #transitionApplying(
    access: CapsuleStateAccessV1,
    token: CapsuleToken,
    phase: string,
    transition: (state: Extract<CapsuleStateEnvelopeV1["body"]["state"], { kind: "applying" }>) =>
      Extract<CapsuleStateEnvelopeV1["body"]["state"], { kind: "applying" }>,
  ): Promise<CapsuleWriteOperationResult> {
    const read = await access.read();
    if (read.kind === "Rejected") return { kind: "Rejected", failure: read.failure };
    const current = read.observation.state;
    if (current.body.state.kind !== "applying") {
      return rejected("StateBlocked", phase, "capsule is not applying");
    }
    if (current.body.state.candidate.token !== token) return rejected("StaleToken", phase, "token is stale");
    try {
      const nextVariant = transition(current.body.state);
      const next = sealCapsuleState(
        this.#generationFor(current, token, phase),
        nextVariant,
        this.#limits,
      );
      return await this.#commitTransition(access, current, next, phase);
    } catch (error) {
      return rejected(
        isActionConflict(error) ? "ActionStateConflict" : capsuleInputFailureCode(error),
        phase,
        errorMessage(error),
      );
    }
  }

  async #commitTransition(
    access: CapsuleStateAccessV1,
    current: CapsuleStateEnvelopeV1,
    next: CapsuleStateEnvelopeV1,
    phase: string,
  ): Promise<CapsuleWriteOperationResult> {
    const result = await access.compareAndSet({
      expectedStateDigest: current.stateDigest,
      nextState: next,
    });
    if (result.kind === "Rejected") return { kind: "Rejected", failure: result.failure };
    if (result.kind === "Unsettled") {
      return Object.freeze({
        kind: "Unsettled",
        generation: next.body.generation,
        failure: result.failure,
        recoveryRequired: true,
      });
    }
    if (result.kind === "Conflict") return rejected("StateChanged", phase, "capsule changed during transition");
    return Object.freeze({ kind: "Accepted", generation: next.body.generation });
  }

  #parsePlan(input: CapsuleBeginInputV1): ParsedCandidatePlanV1 {
    const owner = requireOwner(input.owner);
    const ownerProtocolVersion = requireSafeInteger(
      input.ownerProtocolVersion,
      "ownerProtocolVersion",
      1,
    );
    const contentAuthority = requireString(input.contentAuthority, "contentAuthority", { max: 4_096 });
    const targets = parseTargetBindings(input.targets, "targets");
    if (!Array.isArray(input.actions) || input.actions.length === 0) {
      throw capsuleInputValidationError(
        "InvalidOwnerAction",
        "operation requires the complete nonempty planned action sequence",
      );
    }
    const admittedActions = input.actions.map((entry, index) =>
      this.#registry.admitAction(owner, ownerProtocolVersion, entry.action, index));
    this.#registry.validateActionSequence(
      owner,
      ownerProtocolVersion,
      admittedActions.map((action) => action.action),
      "complete",
    );
    const selectedTargets = this.#registry.selectTargetBindings(
      owner,
      ownerProtocolVersion,
      targets,
      admittedActions.map((action) => action.action),
    );
    if (!sameTargetBindings(selectedTargets, targets)) {
      throw capsuleInputValidationError(
        "InvalidOwnerAction",
        "complete candidate actions do not exhaust their target bindings",
      );
    }
    const actions = admittedActions.map((parsed): StoredPlannedActionV1 => {
      return Object.freeze({
        actionDigest: parsed.actionDigest,
        actionType: parsed.inspection.actionType,
        action: parsed.encodedAction,
        relativePaths: parsed.inspection.relativePaths,
        decodedPriorBytes: parsed.inspection.decodedPriorBytes,
        maximumObservedPostBytes: parsed.inspection.maximumObservedPostBytes,
        phase: "planned",
        observedPost: null,
      });
    });
    return Object.freeze({
      owner,
      ownerProtocolVersion,
      contentAuthority,
      targets,
      actions: Object.freeze(actions),
    });
  }

  #candidateFor(
    plan: ParsedCandidatePlanV1,
    prior: CapsuleStateEnvelopeV1,
    token: CapsuleToken,
  ): ApplyingCandidateV1 {
    return Object.freeze({
      ...plan,
      token,
      priorGeneration: prior.body.generation,
      priorStateDigest: prior.stateDigest,
    });
  }

  #tokenFor(binding: unknown): CapsuleToken {
    return taggedOpaque("ct1_", { binding, nonce: hex(this.#opaqueSource.nextBytes()) }) as CapsuleToken;
  }

  #generationFor(prior: CapsuleStateEnvelopeV1, token: CapsuleToken, phase: string): CapsuleGeneration {
    return taggedOpaque("cg1_", {
      nonce: hex(this.#opaqueSource.nextBytes()),
      phase,
      priorStateDigest: prior.stateDigest,
      token,
    }) as CapsuleGeneration;
  }
}

function sameTargetBindings(
  left: readonly Readonly<{ canonicalTarget: string; authorityGeneration: string; authorityDigest: string }>[],
  right: readonly Readonly<{ canonicalTarget: string; authorityGeneration: string; authorityDigest: string }>[],
): boolean {
  return left.length === right.length && left.every((binding, index) => {
    const peer = right[index];
    return peer !== undefined
      && binding.canonicalTarget === peer.canonicalTarget
      && binding.authorityGeneration === peer.authorityGeneration
      && binding.authorityDigest === peer.authorityDigest;
  });
}

function replaceAction(
  state: Extract<CapsuleStateEnvelopeV1["body"]["state"], { kind: "applying" }>,
  index: number,
  replacement: StoredPlannedActionV1,
): Extract<CapsuleStateEnvelopeV1["body"]["state"], { kind: "applying" }> {
  const actions = [...state.candidate.actions];
  actions[index] = replacement;
  return Object.freeze({
    kind: "applying",
    prior: state.prior,
    candidate: Object.freeze({ ...state.candidate, actions: Object.freeze(actions) }),
  });
}

function taggedOpaque(prefix: string, value: unknown): string {
  return `${prefix}${createHash("sha256").update(canonicalJsonBytes(value)).digest("hex")}`;
}

function hex(bytes: Uint8Array): string {
  if (bytes.byteLength < 16 || bytes.byteLength > 4_096) throw new Error("opaque source returned invalid entropy bytes");
  return Buffer.from(bytes).toString("hex");
}

function rejected(
  code: CapsuleFailure["code"],
  phase: string,
  message: string,
): Readonly<{ kind: "Rejected"; failure: CapsuleFailure }> {
  return Object.freeze({ kind: "Rejected", failure: failure(code, phase, message) });
}

function failure(code: CapsuleFailure["code"], phase: string, message: string): CapsuleFailure {
  return Object.freeze({ code, phase, message });
}

function actionConflict(message: string): Error {
  const error = new Error(message);
  error.name = "CapsuleActionConflict";
  return error;
}

function isActionConflict(error: unknown): boolean {
  return error instanceof Error && error.name === "CapsuleActionConflict";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function zeroGeneration(): CapsuleGeneration {
  return "cg1_0000000000000000000000000000000000000000000000000000000000000000";
}
