import type {
  ExportAppliedObservationV1,
  UndoApplyingSession,
  UndoBeginResult,
  UndoCandidateInput,
  UndoPreflightResult,
  UndoTerminalWriteResult,
  UndoWriteResult,
  UndoWriter,
} from "@rawr/agent-plugin-lifecycle/ports/exports";

interface CandidateAction {
  readonly handle: string;
  readonly source: UndoCandidateInput["actions"][number];
  phase: "planned" | "staged" | "applied";
  observation?: ExportAppliedObservationV1;
}

interface ActiveCandidate {
  readonly token: string;
  readonly input: UndoCandidateInput;
  readonly actions: CandidateAction[];
  nextStageIndex: number;
}

export interface SettledOneSlotCandidate {
  readonly input: UndoCandidateInput;
  readonly applied: readonly Readonly<{
    action: UndoCandidateInput["actions"][number]["action"];
    observation: ExportAppliedObservationV1;
  }>[];
}

export class OneSlotUndoWriter implements UndoWriter {
  beginCalls = 0;
  settleCalls = 0;
  abortCalls = 0;
  settled: SettledOneSlotCandidate | undefined;
  #active: ActiveCandidate | undefined;
  #generation = 0;

  get active(): Readonly<{
    input: UndoCandidateInput;
    actions: readonly Readonly<{ phase: CandidateAction["phase"]; action: CandidateAction["source"]["action"] }>[];
  }> | undefined {
    if (this.#active === undefined) return undefined;
    return Object.freeze({
      input: this.#active.input,
      actions: Object.freeze(this.#active.actions.map((entry) => Object.freeze({
        phase: entry.phase,
        action: entry.source.action,
      }))),
    });
  }

  async preflight(): Promise<UndoPreflightResult> {
    return Object.freeze({ kind: "Accepted" });
  }

  async begin(input: UndoCandidateInput): Promise<UndoBeginResult> {
    this.beginCalls += 1;
    if (this.#active !== undefined) {
      return Object.freeze({
        ...rejected("UndoAdmissionFailed", "one-slot-begin", "candidate already active"),
        synchronization: Object.freeze({ kind: "NotAcquired" }),
      });
    }
    const token = `one-slot-token-${this.beginCalls}`;
    const actions = input.actions.map((source, index): CandidateAction => ({
      handle: `one-slot-action-${index}`,
      source,
      phase: "planned",
    }));
    this.#active = { token, input, actions, nextStageIndex: 0 };
    return Object.freeze({
      kind: "Accepted",
      generation: this.#nextGeneration(),
      admittedActions: Object.freeze(actions.map((entry) => Object.freeze({ actionHandle: entry.handle }))),
      session: this.#session(token),
    });
  }

  #session(token: string): UndoApplyingSession {
    let closed = false;
    const rejectedClosed = (): UndoWriteResult => rejected(
      "UndoStageFailed",
      "one-slot-session",
      "session is closed",
    );
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
        closed = true;
        return terminal(result);
      },
      abort: async (): Promise<UndoTerminalWriteResult> => {
        if (closed) return terminal(rejectedClosed());
        const result = await this.#abort(token);
        closed = true;
        return terminal(result);
      },
      suspend: async () => {
        closed = true;
        return Object.freeze({ kind: "Released" as const });
      },
    });
  }

  async #stage(
    token: string,
    input: Parameters<UndoApplyingSession["stage"]>[0],
  ): Promise<UndoWriteResult> {
    const candidate = this.#active;
    const action = candidate?.actions[candidate.nextStageIndex];
    if (candidate?.token !== token || action?.handle !== input.actionHandle || action.phase !== "planned") {
      return rejected("UndoStageFailed", "one-slot-stage", "action is not the next planned entry");
    }
    action.phase = "staged";
    candidate.nextStageIndex += 1;
    return Object.freeze({ kind: "Accepted", generation: this.#nextGeneration() });
  }

  async #discardStaged(
    token: string,
    input: Parameters<UndoApplyingSession["discardStaged"]>[0],
  ): Promise<UndoWriteResult> {
    const action = this.#find(token, input.actionHandle);
    if (action?.phase !== "staged") return rejected("UndoStageFailed", "one-slot-discard", "action is not staged");
    action.phase = "planned";
    return Object.freeze({ kind: "Accepted", generation: this.#nextGeneration() });
  }

  async #markApplied(
    token: string,
    input: Parameters<UndoApplyingSession["markApplied"]>[0],
  ): Promise<UndoWriteResult> {
    const action = this.#find(token, input.actionHandle);
    if (action?.phase !== "staged") return rejected("UndoStageFailed", "one-slot-mark", "action is not staged");
    action.phase = "applied";
    action.observation = input.observedPost;
    return Object.freeze({ kind: "Accepted", generation: this.#nextGeneration() });
  }

  async #settle(token: string): Promise<UndoWriteResult> {
    this.settleCalls += 1;
    const candidate = this.#active;
    if (candidate?.token !== token || candidate.actions.some((action) => action.phase === "staged")) {
      return rejected("UndoSettlementFailed", "one-slot-settle", "candidate is missing or still staged");
    }
    this.settled = Object.freeze({
      input: candidate.input,
      applied: Object.freeze(candidate.actions.flatMap((entry) => (
        entry.phase === "applied" && entry.observation !== undefined
          ? [Object.freeze({ action: entry.source.action, observation: entry.observation })]
          : []
      ))),
    });
    this.#active = undefined;
    return Object.freeze({ kind: "Accepted", generation: this.#nextGeneration() });
  }

  async #abort(token: string): Promise<UndoWriteResult> {
    this.abortCalls += 1;
    const candidate = this.#active;
    if (candidate?.token !== token || candidate.actions.some((action) => action.phase !== "planned")) {
      return rejected("UndoSettlementFailed", "one-slot-abort", "candidate cannot be discarded");
    }
    this.#active = undefined;
    return Object.freeze({ kind: "Accepted", generation: this.#nextGeneration() });
  }

  #find(token: string, handle: string): CandidateAction | undefined {
    return this.#active?.token === token
      ? this.#active.actions.find((entry) => entry.handle === handle)
      : undefined;
  }

  #nextGeneration(): string {
    this.#generation += 1;
    return `one-slot-generation-${this.#generation}`;
  }
}

function rejected(
  code: "UndoAdmissionFailed" | "UndoStageFailed" | "UndoSettlementFailed",
  phase: string,
  message: string,
): Extract<UndoWriteResult, { kind: "Rejected" }> {
  return Object.freeze({ kind: "Rejected", failure: Object.freeze({ code, phase, message }) });
}

function terminal(result: UndoWriteResult): UndoTerminalWriteResult {
  return Object.freeze({
    ...result,
    synchronization: Object.freeze({ kind: "Released" }),
  }) as UndoTerminalWriteResult;
}
