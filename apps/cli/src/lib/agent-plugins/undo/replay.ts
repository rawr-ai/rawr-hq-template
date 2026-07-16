import { createHash, randomBytes } from "node:crypto";

import { bytesEqual, canonicalJsonBytes } from "./canonical";
import type {
  CapsuleFailure,
  CapsuleGeneration,
  CapsuleSynchronizationResultV1,
  CapsuleToken,
  UndoResult,
} from "./contract";
import type { CapsuleOpaqueSourceV1 } from "./writer";
import { ClosedOwnerProtocolRegistryV1 } from "./protocol-registry";
import {
  normalizeCapsuleLimits,
  PRODUCTION_CAPSULE_LIMITS,
  persistedFailure,
  publicReplayOutcomes,
  sealCapsuleState,
  type CapsuleStateEnvelopeV1,
  type CapsuleStateLimitsV1,
  type PersistedReplayOutcomeV1,
  type StoredCommittedActionV1,
} from "./state";
import type { CapsuleStateAccessV1, CapsuleStateStoreV1 } from "./store";

type WithoutSynchronization<T> = T extends unknown ? Omit<T, "synchronization"> : never;
type UndoOperationResult = WithoutSynchronization<UndoResult>;

export interface CapsuleUndoControllerOptionsV1 {
  readonly store: CapsuleStateStoreV1;
  readonly registry: ClosedOwnerProtocolRegistryV1;
  readonly opaqueSource?: CapsuleOpaqueSourceV1;
  readonly limits?: CapsuleStateLimitsV1;
}

export class CapsuleUndoControllerV1 {
  readonly #store: CapsuleStateStoreV1;
  readonly #registry: ClosedOwnerProtocolRegistryV1;
  readonly #opaqueSource: CapsuleOpaqueSourceV1;
  readonly #limits: CapsuleStateLimitsV1;

  constructor(options: CapsuleUndoControllerOptionsV1) {
    this.#store = options.store;
    this.#registry = options.registry;
    this.#opaqueSource = options.opaqueSource ?? Object.freeze({ nextBytes: () => randomBytes(32) });
    this.#limits = normalizeCapsuleLimits(options.limits ?? PRODUCTION_CAPSULE_LIMITS);
  }

  async undo(): Promise<UndoResult> {
    const acquired = await this.#store.acquireExclusiveSession();
    if (acquired.kind === "Rejected") {
      return Object.freeze({
        kind: "RejectedBeforeReplay",
        failure: acquired.failure,
        synchronization: Object.freeze({ kind: "NotAcquired" }),
      });
    }
    let result: UndoOperationResult;
    try {
      result = await this.#undoWithAccess(acquired.session.access);
    } catch (error) {
      result = Object.freeze({
        kind: "RejectedBeforeReplay",
        failure: failure("StateInvalid", "undo", errorMessage(error)),
      });
    }
    let synchronization: CapsuleSynchronizationResultV1;
    try {
      await acquired.session.release();
      synchronization = Object.freeze({ kind: "Released" });
    } catch (error) {
      synchronization = Object.freeze({
        kind: "ReleaseFailed",
        failure: failure("AdmissionUnsafe", "undo-release", errorMessage(error)),
      });
    }
    return Object.freeze({ ...result, synchronization }) as UndoResult;
  }

  async #undoWithAccess(access: CapsuleStateAccessV1): Promise<UndoOperationResult> {
    const read = await access.read();
    if (read.kind === "Rejected") {
      return Object.freeze({ kind: "RejectedBeforeReplay", failure: read.failure });
    }
    const observed = read.observation.state;
    if (observed.body.state.kind === "applying") {
      return Object.freeze({
        kind: "RejectedBeforeReplay",
        failure: failure("StateBlocked", "undo-admission", "an applying operation requires recovery"),
      });
    }
    let admittedUndoing: CapsuleStateEnvelopeV1;
    if (observed.body.state.kind === "idle") {
      if (observed.body.state.committed === null) return Object.freeze({ kind: "NoCommittedCapsule" });
      const token = this.#undoToken(observed);
      const next = sealCapsuleState(
        this.#generationFor(observed, token, "begin-undo"),
        Object.freeze({
          kind: "undoing",
          committed: observed.body.state.committed,
          token,
          outcomes: Object.freeze(
            observed.body.state.committed.capsule.actions.map(() => Object.freeze({ kind: "Pending" as const })),
          ),
          verificationFailure: null,
        }),
        this.#limits,
      );
      const admission = await access.compareAndSet({
        expectedStateDigest: observed.stateDigest,
        nextState: next,
      });
      if (admission.kind === "Rejected") {
        return Object.freeze({ kind: "RejectedBeforeReplay", failure: admission.failure });
      }
      if (admission.kind === "Unsettled") {
        const state = admission.observation?.state ?? next;
        const outcomes = state.body.state.kind === "undoing"
          ? publicReplayOutcomes(state.body.state.outcomes)
          : [];
        return unsettled(next.body.generation, outcomes, admission.failure);
      }
      if (admission.kind === "Conflict") {
        return Object.freeze({
          kind: "RejectedBeforeReplay",
          failure: failure("StateChanged", "undo-admission", "capsule changed during undo admission"),
        });
      }
      admittedUndoing = next;
    } else {
      admittedUndoing = observed;
    }
    return this.#resumeUndoing(access, admittedUndoing);
  }

  async #resumeUndoing(
    access: CapsuleStateAccessV1,
    initial: CapsuleStateEnvelopeV1,
  ): Promise<UndoOperationResult> {
    let lastKnown = initial;
    for (let attempt = 0; attempt <= this.#limits.actions + 2; attempt += 1) {
      const read = await access.read();
      if (read.kind === "Rejected") {
        const lastOutcomes = lastKnown.body.state.kind === "undoing"
          ? publicReplayOutcomes(lastKnown.body.state.outcomes)
          : [];
        return unsettled(lastKnown.body.generation, lastOutcomes, read.failure);
      }
      const current = read.observation.state;
      lastKnown = current;
      if (current.body.state.kind !== "undoing") {
        return unsettled(
          current.body.generation,
          [],
          failure("StateChanged", "undo-recovery", "undo generation changed before replay completed"),
        );
      }
      const undoing = current.body.state;
      let registration;
      try {
        registration = this.#registry.require(
          undoing.committed.capsule.owner,
          undoing.committed.capsule.ownerProtocolVersion,
        );
      } catch (error) {
        return unsettled(
          current.body.generation,
          publicReplayOutcomes(undoing.outcomes),
          failure("UnknownOwnerProtocol", "undo-dispatch", errorMessage(error)),
        );
      }
      const index = nextReplayIndex(undoing.outcomes);
      if (index >= 0) {
        const stored = undoing.committed.capsule.actions[index]!;
        let parsedAction;
        let observedPost;
        try {
          parsedAction = this.#registry.parseAction(
            undoing.committed.capsule.owner,
            undoing.committed.capsule.ownerProtocolVersion,
            stored.action,
            stored.actionDigest,
            index,
          );
          observedPost = this.#registry.parseObservedPost(
            undoing.committed.capsule.owner,
            undoing.committed.capsule.ownerProtocolVersion,
            parsedAction.action,
            stored.observedPost,
            parsedAction.inspection.maximumObservedPostBytes,
          );
        } catch (error) {
          const invalid = failure("StateInvalid", "undo-parse-action", errorMessage(error));
          return await this.#persistFailure(access, current, index, "Blocked", invalid);
        }

        let classification;
        try {
          classification = await registration.replay.classify({
            action: parsedAction.action,
            observedPost: observedPost.parsed,
            targets: undoing.committed.capsule.targets,
          });
        } catch (error) {
          return await this.#persistFailure(
            access,
            current,
            index,
            "Failed",
            failure("ReplayFailed", "undo-classify", errorMessage(error)),
          );
        }
        if (classification.kind === "Ambiguous") {
          return await this.#persistFailure(access, current, index, "Blocked", classification.failure);
        }
        if (classification.kind === "AlreadyRestored" || classification.kind === "Prior") {
          const transition = await this.#persistOutcome(
            access,
            current,
            index,
            Object.freeze({ kind: "AlreadyRestored" }),
          );
          if (transition.kind === "Failure") return transition.result;
          lastKnown = transition.state;
          continue;
        }
        try {
          const liveObserved = this.#registry.parseObservedPost(
            undoing.committed.capsule.owner,
            undoing.committed.capsule.ownerProtocolVersion,
            parsedAction.action,
            classification.observedPost,
            parsedAction.inspection.maximumObservedPostBytes,
          );
          if (!bytesEqual(canonicalJsonBytes(liveObserved.encoded), canonicalJsonBytes(stored.observedPost))) {
            return await this.#persistFailure(
              access,
              current,
              index,
              "Blocked",
              failure("ReplayBlocked", "undo-classify", "live post-state binding differs from the committed action"),
            );
          }
        } catch (error) {
          return await this.#persistFailure(
            access,
            current,
            index,
            "Blocked",
            failure("ReplayBlocked", "undo-classify", errorMessage(error)),
          );
        }

        let restored;
        try {
          restored = await registration.replay.restore({
            action: parsedAction.action,
            observedPost: observedPost.parsed,
            targets: undoing.committed.capsule.targets,
          });
        } catch (error) {
          return await this.#persistFailure(
            access,
            current,
            index,
            "Failed",
            failure("ReplayFailed", "undo-restore", errorMessage(error)),
          );
        }
        if (restored.kind === "Blocked" || restored.kind === "Failed") {
          return await this.#persistFailure(access, current, index, restored.kind, restored.failure);
        }
        const outcome = restored.kind === "Restored"
          ? Object.freeze({ kind: "Restored" as const })
          : Object.freeze({ kind: "AlreadyRestored" as const });
        const transition = await this.#persistOutcome(access, current, index, outcome);
        if (transition.kind === "Failure") return transition.result;
        lastKnown = transition.state;
        continue;
      }

      const parsedPairs: Array<Readonly<{ action: unknown; observedPost: unknown }>> = [];
      try {
        for (const stored of undoing.committed.capsule.actions) {
          parsedPairs.push(this.#parsePair(undoing.committed.capsule, stored));
        }
      } catch (error) {
        return unsettled(
          current.body.generation,
          publicReplayOutcomes(undoing.outcomes),
          failure("StateInvalid", "undo-final-parse", errorMessage(error)),
        );
      }
      let verification;
      try {
        verification = await registration.replay.verifyPrior({
          actions: parsedPairs,
          targets: undoing.committed.capsule.targets,
        });
      } catch (error) {
        verification = {
          kind: "Blocked" as const,
          failure: failure("ReplayFailed", "undo-final-verify", errorMessage(error)),
        };
      }
      if (verification.kind === "Blocked") {
        const next = sealCapsuleState(
          this.#generationFor(current, undoing.token, "undo-verification-blocked"),
          Object.freeze({ ...undoing, verificationFailure: persistedFailure(verification.failure) }),
          this.#limits,
        );
        const transition = await this.#cas(access, current, next, "undo-final-verify");
        if (transition !== null) return transition;
        return unsettled(next.body.generation, publicReplayOutcomes(undoing.outcomes), verification.failure);
      }

      const cleared = sealCapsuleState(
        this.#generationFor(current, undoing.token, "undo-clear"),
        Object.freeze({ kind: "idle", committed: null }),
        this.#limits,
      );
      const transition = await this.#cas(access, current, cleared, "undo-clear");
      if (transition !== null) return transition;
      return Object.freeze({ kind: "RestoredAndCleared" });
    }
    const finalOutcomes = lastKnown.body.state.kind === "undoing"
      ? publicReplayOutcomes(lastKnown.body.state.outcomes)
      : [];
    return unsettled(
      lastKnown.body.generation,
      finalOutcomes,
      failure("ReplayFailed", "undo-recovery", "replay exceeded the bounded action frontier"),
    );
  }

  #parsePair(
    capsule: Extract<CapsuleStateEnvelopeV1["body"]["state"], { kind: "undoing" }>["committed"]["capsule"],
    stored: StoredCommittedActionV1,
  ): Readonly<{ action: unknown; observedPost: unknown }> {
    const action = this.#registry.parseAction(
      capsule.owner,
      capsule.ownerProtocolVersion,
      stored.action,
      stored.actionDigest,
      capsule.actions.indexOf(stored),
    );
    const observedPost = this.#registry.parseObservedPost(
      capsule.owner,
      capsule.ownerProtocolVersion,
      action.action,
      stored.observedPost,
      action.inspection.maximumObservedPostBytes,
    );
    return Object.freeze({ action: action.action, observedPost: observedPost.parsed });
  }

  async #persistFailure(
    access: CapsuleStateAccessV1,
    current: CapsuleStateEnvelopeV1,
    index: number,
    kind: "Blocked" | "Failed",
    actionFailure: CapsuleFailure,
  ): Promise<UndoOperationResult> {
    const transition = await this.#persistOutcome(
      access,
      current,
      index,
      Object.freeze({ kind, failure: persistedFailure(actionFailure) }),
    );
    if (transition.kind === "Failure") return transition.result;
    const state = transition.state.body.state;
    if (state.kind !== "undoing") {
      return unsettled(
        transition.state.body.generation,
        [],
        failure("StateChanged", "undo-persist-failure", "capsule left undoing unexpectedly"),
      );
    }
    return unsettled(
      transition.state.body.generation,
      publicReplayOutcomes(state.outcomes),
      actionFailure,
    );
  }

  async #persistOutcome(
    access: CapsuleStateAccessV1,
    current: CapsuleStateEnvelopeV1,
    index: number,
    outcome: PersistedReplayOutcomeV1,
  ): Promise<
    | Readonly<{ kind: "Committed"; state: CapsuleStateEnvelopeV1 }>
    | Readonly<{ kind: "Failure"; result: UndoOperationResult }>
  > {
    if (current.body.state.kind !== "undoing") {
      return {
        kind: "Failure",
        result: unsettled(
          current.body.generation,
          [],
          failure("StateChanged", "undo-persist-outcome", "capsule is not undoing"),
        ),
      };
    }
    const outcomes = [...current.body.state.outcomes];
    outcomes[index] = outcome;
    const next = sealCapsuleState(
      this.#generationFor(current, current.body.state.token, "undo-action-settlement"),
      Object.freeze({
        ...current.body.state,
        outcomes: Object.freeze(outcomes),
        verificationFailure: null,
      }),
      this.#limits,
    );
    const failed = await this.#cas(access, current, next, "undo-action-settlement");
    return failed === null ? { kind: "Committed", state: next } : { kind: "Failure", result: failed };
  }

  async #cas(
    access: CapsuleStateAccessV1,
    current: CapsuleStateEnvelopeV1,
    next: CapsuleStateEnvelopeV1,
    phase: string,
  ): Promise<UndoOperationResult | null> {
    const result = await access.compareAndSet({
      expectedStateDigest: current.stateDigest,
      nextState: next,
    });
    if (result.kind === "Committed") return null;
    const currentState = result.kind === "Conflict"
      ? result.observation.state
      : result.kind === "Unsettled"
        ? result.observation?.state ?? result.intendedState
        : current;
    const outcomes = currentState.body.state.kind === "undoing"
      ? publicReplayOutcomes(currentState.body.state.outcomes)
      : [];
    return unsettled(
      currentState.body.generation,
      outcomes,
      result.kind === "Rejected" || result.kind === "Unsettled"
        ? result.failure
        : failure("StateChanged", phase, "capsule generation changed during replay"),
    );
  }

  #undoToken(state: CapsuleStateEnvelopeV1): CapsuleToken {
    if (state.body.state.kind !== "idle" || state.body.state.committed === null) {
      throw new Error("undo token requires an idle committed capsule");
    }
    return taggedOpaque("ct1_", {
      capsuleDigest: state.body.state.committed.capsuleDigest,
      nonce: hex(this.#opaqueSource.nextBytes()),
      stateDigest: state.stateDigest,
      targets: state.body.state.committed.capsule.targets,
    }) as CapsuleToken;
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

function nextReplayIndex(outcomes: readonly PersistedReplayOutcomeV1[]): number {
  for (let index = outcomes.length - 1; index >= 0; index -= 1) {
    const kind = outcomes[index]!.kind;
    if (kind !== "Restored" && kind !== "AlreadyRestored") return index;
  }
  return -1;
}

function unsettled(
  generation: CapsuleGeneration,
  outcomes: readonly ReturnType<typeof publicReplayOutcomes>[number][],
  replayFailure: CapsuleFailure,
): UndoOperationResult {
  return Object.freeze({
    kind: "ReplayUnsettled",
    generation,
    outcomes: Object.freeze([...outcomes]),
    failure: replayFailure,
  });
}

function failure(code: CapsuleFailure["code"], phase: string, message: string): CapsuleFailure {
  return Object.freeze({ code, phase, message });
}

function taggedOpaque(prefix: string, value: unknown): string {
  return `${prefix}${createHash("sha256").update(canonicalJsonBytes(value)).digest("hex")}`;
}

function hex(bytes: Uint8Array): string {
  if (bytes.byteLength < 16 || bytes.byteLength > 4_096) throw new Error("opaque source returned invalid entropy bytes");
  return Buffer.from(bytes).toString("hex");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
