import { Effect, Exit } from "effect";
import { describe, expect, test } from "vitest";
import type { EvaluationResult, SolverTerminal } from "../src/contracts/index.js";
import {
  bindObservationProjection,
  bindObservationSettlement,
  equalStructuredData,
  type Observe,
} from "../src/core/index.js";
import { cellKey, digestIdentity, solverTerminal } from "./fixtures.js";

function evaluationResult(
  terminalDigest = solverTerminal().outputDigest
): EvaluationResult<{ readonly score: number }> {
  const value = { score: 92 };
  return {
    stage: "EvaluationResult",
    cell: solverTerminal().cell,
    frozenInputDigest: solverTerminal().frozenInputDigest,
    implementationRevision: "sdk-1",
    predecessors: { kind: "Set", digests: [terminalDigest] },
    outputDigest: digestIdentity("research-sdk.evaluation-result-value.v1", value),
    value,
  };
}

describe("observation subject binding", () => {
  test("makes callback-bearing acquired handles unrepresentable", () => {
    if (false) {
      type CallbackTerminal = SolverTerminal<() => void, { readonly kind: "Completed" }>;
      type CallbackAcquire = Observe<
        unknown,
        () => void,
        CallbackTerminal,
        unknown,
        unknown,
        never,
        never,
        never
      >["acquire"];

      // @ts-expect-error observation handles must be portable durable data
      const acquire: CallbackAcquire = () => Effect.succeed(() => {});
      void acquire;
    }

    expect(true).toBe(true);
  });

  test("settles a successful execution only against its terminal-bound handle", () => {
    const terminal = solverTerminal();
    const equalHandle = { traceId: terminal.value.observation.traceId };
    const ready = bindObservationSettlement({
      acquiredHandle: equalHandle,
      execution: Exit.succeed(terminal),
      equalsHandle: equalStructuredData,
    });
    const mismatch = bindObservationSettlement({
      acquiredHandle: { traceId: "another-trace" },
      execution: Exit.succeed(terminal),
      equalsHandle: equalStructuredData,
    });

    expect(ready.kind).toBe("Ready");
    if (ready.kind === "Ready") {
      expect(ready.value.handle).toBe(terminal.value.observation);
    }
    expect(mismatch).toEqual({
      kind: "Conflict",
      conflict: { kind: "ObservationHandleMismatch" },
    });
  });

  test("keeps the acquired handle when execution fails before a terminal", () => {
    const acquiredHandle = { traceId: "orphan-trace" };
    const binding = bindObservationSettlement({
      acquiredHandle,
      execution: Exit.fail("execution-failed"),
      equalsHandle: equalStructuredData,
    });

    expect(binding.kind).toBe("Ready");
    if (binding.kind === "Ready") {
      expect(binding.value.handle).toBe(acquiredHandle);
      expect(Exit.isFailure(binding.value.execution)).toBe(true);
    }
  });

  test("derives projection subject from the terminal and requires its predecessor", () => {
    const terminal = solverTerminal();
    const ready = bindObservationProjection(terminal, evaluationResult(terminal.outputDigest));
    const mismatch = bindObservationProjection(
      terminal,
      evaluationResult(digestIdentity("research-sdk.solver-terminal-value.v1", "another-terminal"))
    );

    expect(ready.kind).toBe("Ready");
    if (ready.kind === "Ready") {
      expect(ready.value.handle).toBe(terminal.value.observation);
      expect(ready.value.terminal).toBe(terminal);
    }
    expect(mismatch).toEqual({
      kind: "Conflict",
      conflict: { kind: "EvaluationPredecessorMismatch" },
    });
  });

  test("rejects a cross-cell evaluation even when it cites the terminal digest", () => {
    const terminal = solverTerminal();
    const evaluation = {
      ...evaluationResult(terminal.outputDigest),
      cell: cellKey("another-instance"),
    };

    expect(bindObservationProjection(terminal, evaluation)).toEqual({
      kind: "Conflict",
      conflict: { kind: "EvaluationIdentityMismatch" },
    });
  });

  test("rejects an evaluation bound to a different frozen input", () => {
    const terminal = solverTerminal();
    const evaluation = {
      ...evaluationResult(terminal.outputDigest),
      frozenInputDigest: digestIdentity("research-sdk.frozen-input.v1", "another-input"),
    };

    expect(bindObservationProjection(terminal, evaluation)).toEqual({
      kind: "Conflict",
      conflict: { kind: "EvaluationIdentityMismatch" },
    });
  });
});
