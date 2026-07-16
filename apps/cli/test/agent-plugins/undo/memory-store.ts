import type { CapsuleFailure } from "../../../src/lib/agent-plugins/undo/contract";
import { encodeCapsuleState, type CapsuleStateEnvelopeV1 } from "../../../src/lib/agent-plugins/undo/state";
import type {
  CapsuleExclusiveSessionV1,
  CapsuleStateAccessV1,
  CapsuleStateObservationV1,
  CapsuleStateStoreV1,
  CapsuleStoreCasResultV1,
  CapsuleStoreExclusiveResultV1,
  CapsuleStoreReadResultV1,
} from "../../../src/lib/agent-plugins/undo/store";

export class InMemoryCapsuleStateStoreV1 implements CapsuleStateStoreV1 {
  #state: CapsuleStateEnvelopeV1;
  #injectedFailure: CapsuleFailure | null = null;
  #injectedCasUnsettled: CapsuleFailure | null = null;
  #injectedReleaseFailure: Error | null = null;
  #nextAccessBarrier: Readonly<{
    entered: () => void;
    wait: Promise<void>;
  }> | null = null;
  #sessionActive = false;

  constructor(initialState: CapsuleStateEnvelopeV1) {
    this.#state = initialState;
  }

  injectNextFailure(failure: CapsuleFailure): void {
    this.#injectedFailure = failure;
  }

  injectNextReleaseFailure(message: string): void {
    this.#injectedReleaseFailure = new Error(message);
  }

  injectNextCasUnsettled(failure: CapsuleFailure): void {
    this.#injectedCasUnsettled = failure;
  }

  holdNextAccess(): Readonly<{ entered: Promise<void>; release(): void }> {
    let markEntered!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#nextAccessBarrier = Object.freeze({ entered: markEntered, wait });
    return Object.freeze({ entered, release });
  }

  async read(): Promise<CapsuleStoreReadResultV1> {
    const acquired = await this.acquireExclusiveSession();
    if (acquired.kind === "Rejected") return acquired;
    try {
      return await acquired.session.access.read();
    } finally {
      await acquired.session.release();
    }
  }

  async compareAndSet(input: Readonly<{
    expectedStateDigest: `cs1_${string}`;
    nextState: CapsuleStateEnvelopeV1;
  }>): Promise<CapsuleStoreCasResultV1> {
    const acquired = await this.acquireExclusiveSession();
    if (acquired.kind === "Rejected") return acquired;
    try {
      return await acquired.session.access.compareAndSet(input);
    } finally {
      await acquired.session.release();
    }
  }

  acquireExclusiveSession(): Promise<CapsuleStoreExclusiveResultV1> {
    if (this.#sessionActive) {
      return Promise.resolve({
        kind: "Rejected",
        failure: capsuleFailure("AdmissionBusy", "admission", "capsule admission is busy"),
      });
    }
    this.#sessionActive = true;
    let released = false;
    let inFlight = false;
    const run = async <T extends CapsuleStoreReadResultV1 | CapsuleStoreCasResultV1>(
      phase: string,
      operation: () => T,
    ): Promise<T> => {
      if (released) return rejectedReleased(phase) as T;
      if (inFlight) return rejectedBusy(phase) as T;
      inFlight = true;
      try {
        const barrier = this.#nextAccessBarrier;
        this.#nextAccessBarrier = null;
        if (barrier !== null) {
          barrier.entered();
          await barrier.wait;
        }
        return operation();
      } finally {
        inFlight = false;
      }
    };
    const access: CapsuleStateAccessV1 = Object.freeze({
      read: (): Promise<CapsuleStoreReadResultV1> => run("read", () => {
        const failure = this.#takeFailure();
        if (failure !== null) return { kind: "Rejected", failure };
        return { kind: "Observed", observation: observation(this.#state) };
      }),
      compareAndSet: (
        input: Parameters<CapsuleStateAccessV1["compareAndSet"]>[0],
      ): Promise<CapsuleStoreCasResultV1> => run("compare-and-set", () => {
        const failure = this.#takeFailure();
        if (failure !== null) return { kind: "Rejected", failure };
        if (this.#state.stateDigest !== input.expectedStateDigest) {
          return { kind: "Conflict", observation: observation(this.#state) };
        }
        const unsettled = this.#injectedCasUnsettled;
        this.#injectedCasUnsettled = null;
        if (unsettled !== null) {
          this.#state = input.nextState;
          return {
            kind: "Unsettled",
            intendedState: input.nextState,
            observation: observation(this.#state),
            failure: unsettled,
          };
        }
        this.#state = input.nextState;
        return { kind: "Committed", observation: observation(this.#state) };
      }),
    });
    const session: CapsuleExclusiveSessionV1 = Object.freeze({
      access,
      release: async () => {
        if (released) return;
        if (inFlight) throw new Error("capsule exclusive session has an access call in flight");
        released = true;
        this.#sessionActive = false;
        const releaseFailure = this.#injectedReleaseFailure;
        this.#injectedReleaseFailure = null;
        if (releaseFailure !== null) throw releaseFailure;
      },
    });
    return Promise.resolve({ kind: "Acquired", session });
  }

  #takeFailure(): CapsuleFailure | null {
    const failure = this.#injectedFailure;
    this.#injectedFailure = null;
    return failure;
  }
}

function rejectedBusy(phase: string): Readonly<{ kind: "Rejected"; failure: CapsuleFailure }> {
  return {
    kind: "Rejected",
    failure: capsuleFailure("AdmissionBusy", phase, "capsule exclusive session already has a call in flight"),
  };
}

function rejectedReleased(phase: string): Readonly<{ kind: "Rejected"; failure: CapsuleFailure }> {
  return {
    kind: "Rejected",
    failure: capsuleFailure("AdmissionUnsafe", phase, "capsule exclusive session is released"),
  };
}

function capsuleFailure(
  code: CapsuleFailure["code"],
  phase: string,
  message: string,
): CapsuleFailure {
  return Object.freeze({ code, phase, message });
}

/*
 * Kept outside the class so every observed result owns a fresh byte copy just
 * like the filesystem store.
 */
function observation(state: CapsuleStateEnvelopeV1): CapsuleStateObservationV1 {
  return Object.freeze({ state, bytes: encodeCapsuleState(state).slice() });
}
