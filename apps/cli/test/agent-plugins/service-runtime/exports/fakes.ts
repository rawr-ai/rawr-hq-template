import { Buffer } from "node:buffer";

import {
  canonicalSerializeArtifactRef,
  type ArtifactRef,
  type VerifiedArtifactSnapshotV1,
} from "@rawr/agent-plugin-lifecycle/release";

import {
  createKnownNativeHomesSnapshot,
  type ArtifactReadResult,
  type ArtifactReader,
  type ExportAppliedObservationV1,
  type KnownNativeHomeV1,
  type KnownNativeHomesReader,
  type KnownNativeHomesSnapshotV1,
  type UndoApplyingSession,
  type UndoBeginResult,
  type UndoCandidateInput,
  type UndoPreflightResult,
  type UndoTerminalWriteResult,
  type UndoWriteResult,
  type UndoWriter,
} from "@rawr/agent-plugin-lifecycle/ports/exports";
import {
  exportInverseActionDigest,
  type ExportInverseActionDigest,
  type ExportInverseActionV1,
} from "@rawr/agent-plugin-lifecycle/ports/exports";

export class FakeArtifactReader implements ArtifactReader {
  readonly #snapshots = new Map<string, VerifiedArtifactSnapshotV1>();
  reads = 0;

  add(snapshot: VerifiedArtifactSnapshotV1): void {
    this.#snapshots.set(key(snapshot.ref), snapshot);
  }

  async read(ref: ArtifactRef): Promise<ArtifactReadResult> {
    this.reads += 1;
    const snapshot = this.#snapshots.get(key(ref));
    return snapshot === undefined ? { kind: "Missing", ref } : { kind: "Verified", snapshot };
  }
}

export class FakeKnownNativeHomesReader implements KnownNativeHomesReader {
  reads = 0;

  constructor(readonly snapshot: KnownNativeHomesSnapshotV1) {}

  async readCompleteSnapshot() {
    this.reads += 1;
    return { kind: "Verified" as const, snapshot: this.snapshot };
  }
}

interface FakeActionState {
  readonly digest: ExportInverseActionDigest;
  readonly handle: string;
  phase: "planned" | "staged" | "applied";
  observation?: ExportAppliedObservationV1;
}

export class FakeUndoWriter implements UndoWriter {
  preflightCalls = 0;
  readonly preflightInputs: UndoCandidateInput[] = [];
  beginCalls = 0;
  stageCalls = 0;
  discardCalls = 0;
  markCalls = 0;
  settleCalls = 0;
  abortCalls = 0;
  suspendCalls = 0;
  readonly committed: Array<Readonly<{ action: ExportInverseActionV1; observation: ExportAppliedObservationV1 }>> = [];
  #tokenCounter = 0;
  #generationCounter = 0;
  #candidate: { token: string; actions: FakeActionState[]; source: readonly ExportInverseActionV1[] } | undefined;

  constructor(readonly options: Readonly<{ preflightActionLimit?: number }> = {}) {}

  async preflight(input: Parameters<UndoWriter["preflight"]>[0]): Promise<UndoPreflightResult> {
    this.preflightCalls += 1;
    this.preflightInputs.push(input);
    if (this.options.preflightActionLimit !== undefined && input.actions.length > this.options.preflightActionLimit) {
      return {
        kind: "Rejected",
        failure: {
          code: "CapsuleBoundExceeded",
          phase: "fake-preflight",
          message: "complete candidate exceeds the configured test bound",
        },
      };
    }
    return { kind: "Accepted" };
  }

  async begin(input: Parameters<UndoWriter["begin"]>[0]): Promise<UndoBeginResult> {
    this.beginCalls += 1;
    if (this.#candidate !== undefined) {
      return {
        ...rejected("UndoAdmissionFailed", "fake-begin", "candidate already active"),
        synchronization: Object.freeze({ kind: "NotAcquired" }),
      };
    }
    const token = `fake-token-${++this.#tokenCounter}`;
    const actions = input.actions.map((entry, index) => ({
      digest: exportInverseActionDigest(entry.action),
      handle: `fake-handle-${this.#tokenCounter}-${index}`,
      phase: "planned" as const,
    }));
    this.#candidate = { token, actions, source: input.actions.map((entry) => entry.action) };
    const session = this.#session(token);
    return {
      kind: "Accepted",
      generation: this.#nextGeneration(),
      admittedActions: actions.map((entry) => ({ actionHandle: entry.handle })),
      session,
    };
  }

  #session(token: string): UndoApplyingSession {
    let closed = false;
    const close = (): void => {
      closed = true;
    };
    const rejectedClosed = (): UndoWriteResult => rejected("UndoStageFailed", "fake-session", "session is closed");
    return Object.freeze({
      stage: (input: Parameters<UndoApplyingSession["stage"]>[0]) =>
        closed ? Promise.resolve(rejectedClosed()) : this.#stage(token, input),
      discardStaged: (input: Parameters<UndoApplyingSession["discardStaged"]>[0]) =>
        closed ? Promise.resolve(rejectedClosed()) : this.#discardStaged(token, input),
      markApplied: (input: Parameters<UndoApplyingSession["markApplied"]>[0]) =>
        closed ? Promise.resolve(rejectedClosed()) : this.#markApplied(token, input),
      settle: async (): Promise<UndoTerminalWriteResult> => {
        if (closed) return terminal(rejectedClosed());
        const result = await this.#settle(token);
        close();
        return terminal(result);
      },
      abort: async (): Promise<UndoTerminalWriteResult> => {
        if (closed) return terminal(rejectedClosed());
        const result = await this.#abort(token);
        close();
        return terminal(result);
      },
      suspend: async () => {
        this.suspendCalls += 1;
        close();
        return Object.freeze({ kind: "Released" as const });
      },
    });
  }

  async #stage(token: string, input: Parameters<UndoApplyingSession["stage"]>[0]): Promise<UndoWriteResult> {
    this.stageCalls += 1;
    const action = this.#next(token, input.actionHandle);
    if (action === undefined || action.phase !== "planned") return rejected("UndoStageFailed", "fake-stage", "action is not next planned");
    action.phase = "staged";
    return { kind: "Accepted", generation: this.#nextGeneration() };
  }

  async #discardStaged(
    token: string,
    input: Parameters<UndoApplyingSession["discardStaged"]>[0],
  ): Promise<UndoWriteResult> {
    this.discardCalls += 1;
    const action = this.#find(token, input.actionHandle);
    if (action === undefined || action.phase !== "staged") return rejected("UndoStageFailed", "fake-discard", "action is not staged");
    action.phase = "planned";
    return { kind: "Accepted", generation: this.#nextGeneration() };
  }

  async #markApplied(
    token: string,
    input: Parameters<UndoApplyingSession["markApplied"]>[0],
  ): Promise<UndoWriteResult> {
    this.markCalls += 1;
    const action = this.#find(token, input.actionHandle);
    if (action === undefined || action.phase !== "staged") return rejected("UndoStageFailed", "fake-mark", "action is not staged");
    action.phase = "applied";
    action.observation = input.observedPost;
    return { kind: "Accepted", generation: this.#nextGeneration() };
  }

  async #settle(token: string): Promise<UndoWriteResult> {
    this.settleCalls += 1;
    if (this.#candidate?.token !== token || this.#candidate.actions.some((action) => action.phase === "staged")) {
      return rejected("UndoSettlementFailed", "fake-settle", "candidate is unsettled");
    }
    this.#candidate.actions.forEach((action, index) => {
      if (action.phase === "applied" && action.observation !== undefined) {
        this.committed.push(Object.freeze({ action: this.#candidate!.source[index]!, observation: action.observation }));
      }
    });
    this.#candidate = undefined;
    return { kind: "Accepted", generation: this.#nextGeneration() };
  }

  async #abort(token: string): Promise<UndoWriteResult> {
    this.abortCalls += 1;
    if (this.#candidate?.token !== token || this.#candidate.actions.some((action) => action.phase !== "planned")) {
      return rejected("UndoSettlementFailed", "fake-abort", "candidate cannot abort");
    }
    this.#candidate = undefined;
    return { kind: "Accepted", generation: this.#nextGeneration() };
  }

  #find(token: string, handle: string): FakeActionState | undefined {
    return this.#candidate?.token === token ? this.#candidate.actions.find((action) => action.handle === handle) : undefined;
  }

  #next(token: string, handle: string): FakeActionState | undefined {
    if (this.#candidate?.token !== token) return undefined;
    const next = this.#candidate.actions.find((action) => action.phase !== "applied");
    return next?.handle === handle ? next : undefined;
  }

  #nextGeneration(): string {
    this.#generationCounter += 1;
    return `fake-generation-${this.#generationCounter}`;
  }
}

export function knownHomes(homes: readonly KnownNativeHomeV1[] = []): KnownNativeHomesSnapshotV1 {
  const result = createKnownNativeHomesSnapshot(homes);
  if (!result.ok) throw new Error(result.failure.message);
  return result.snapshot;
}

function key(ref: ArtifactRef): string {
  return Buffer.from(canonicalSerializeArtifactRef(ref)).toString("base64");
}

function rejected(code: "UndoAdmissionFailed" | "UndoStageFailed" | "UndoSettlementFailed", phase: string, message: string) {
  return { kind: "Rejected" as const, failure: { code, phase, message } };
}

function terminal(result: UndoWriteResult): UndoTerminalWriteResult {
  return Object.freeze({
    ...result,
    synchronization: Object.freeze({ kind: "Released" }),
  }) as UndoTerminalWriteResult;
}
