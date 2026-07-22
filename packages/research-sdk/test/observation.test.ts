import { Effect, Exit } from "effect";
import { describe, expect, test } from "vitest";
import type {
  EvaluationResult,
  PortableStageOutput,
  SolverTerminal,
  StageOutputShape,
} from "../src/contracts/index.js";
import {
  bindObservationProjection,
  bindObservationSettlement,
  classifyAdoption,
  classifyEvaluationAdoption,
  classifyEvaluationPublication,
  classifyPublication,
  type Observe,
  reconcileEvaluationPublicationAfterUnknown,
  reconcilePublicationAfterUnknown,
  stageOutputIdentityOf,
  stageOutputKeyOf,
} from "../src/core/index.js";
import { cellKey, digestIdentity, solverTerminal } from "./fixtures.js";

function evaluationResult(
  terminal = solverTerminal(),
  citedDigest = terminal.outputDigest
): EvaluationResult<{ readonly score: number }> {
  const value = {
    terminalPredecessor: stageOutputIdentityOf(terminal),
    result: { score: 92 },
  };
  return {
    stage: "EvaluationResult",
    cell: terminal.cell,
    frozenInputDigest: terminal.frozenInputDigest,
    implementationRevision: "sdk-1",
    predecessors: { kind: "Set", digests: [citedDigest] },
    outputDigest: digestIdentity("research-sdk.evaluation-result-value.v1", value),
    value,
  };
}

function digestEvaluationResultValue(value: EvaluationResult<{ readonly score: number }>["value"]) {
  return digestIdentity("research-sdk.evaluation-result-value.v1", value);
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
    });
    const callerAttemptedOverride = {
      acquiredHandle: { traceId: "another-trace" },
      execution: Exit.succeed(terminal),
      equalsHandle: () => true,
    };
    const mismatch = bindObservationSettlement(callerAttemptedOverride);

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
    });

    expect(binding.kind).toBe("Ready");
    if (binding.kind === "Ready") {
      expect(binding.value.handle).toBe(acquiredHandle);
      expect(Exit.isFailure(binding.value.execution)).toBe(true);
    }
  });

  test("derives projection subject from the terminal and requires its predecessor", () => {
    const terminal = solverTerminal();
    const ready = bindObservationProjection(terminal, evaluationResult(terminal));
    const mismatch = bindObservationProjection(
      terminal,
      evaluationResult(
        terminal,
        digestIdentity("research-sdk.solver-terminal-value.v1", "another-terminal")
      )
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
      ...evaluationResult(terminal),
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
      ...evaluationResult(terminal),
      frozenInputDigest: digestIdentity("research-sdk.frozen-input.v1", "another-input"),
    };

    expect(bindObservationProjection(terminal, evaluation)).toEqual({
      kind: "Conflict",
      conflict: { kind: "EvaluationIdentityMismatch" },
    });
  });

  test("rejects equal terminal values from a different implementation revision", () => {
    const original = solverTerminal();
    const differentRevision = {
      ...original,
      implementationRevision: "sdk-2",
    };

    expect(bindObservationProjection(differentRevision, evaluationResult(original))).toEqual({
      kind: "Conflict",
      conflict: { kind: "EvaluationPredecessorMismatch" },
    });
  });

  test("rejects equal terminal values with a different predecessor closure", () => {
    const original = solverTerminal();
    const differentPredecessors = {
      ...original,
      predecessors: {
        kind: "Set" as const,
        digests: [digestIdentity("research-sdk.prepared-cell.v1", "another-predecessor")],
      },
    };

    expect(bindObservationProjection(differentPredecessors, evaluationResult(original))).toEqual({
      kind: "Conflict",
      conflict: { kind: "EvaluationPredecessorMismatch" },
    });
  });

  test("durable publication cannot alias equal scores bound to another exact terminal", () => {
    const original = solverTerminal();
    const candidate = evaluationResult(original);
    const otherTerminals = [
      { ...original, implementationRevision: "sdk-2" },
      {
        ...original,
        predecessors: {
          kind: "Set" as const,
          digests: [digestIdentity("research-sdk.prepared-cell.v1", "another-predecessor")],
        },
      },
    ];

    for (const otherTerminal of otherTerminals) {
      const existing = evaluationResult(otherTerminal);

      expect(existing.value.result).toEqual(candidate.value.result);
      expect(stageOutputKeyOf(existing)).toEqual(stageOutputKeyOf(candidate));
      expect(existing.value.terminalPredecessor).not.toEqual(candidate.value.terminalPredecessor);
      expect(
        classifyEvaluationPublication({
          terminal: original,
          candidate,
          outcome: { kind: "Existing", value: existing },
          digestEvaluationValue: digestEvaluationResultValue,
        })
      ).toEqual({
        kind: "Conflict",
        conflict: { kind: "DivergentExistingOutput" },
      });
      expect(
        reconcileEvaluationPublicationAfterUnknown({
          terminal: original,
          candidate,
          read: { kind: "Found", value: existing },
          digestEvaluationValue: digestEvaluationResultValue,
        })
      ).toEqual({
        kind: "Conflict",
        conflict: { kind: "DivergentExistingOutput" },
      });
    }
  });

  test("adopts an evaluation only when it binds the exact terminal envelope", () => {
    const terminal = solverTerminal();
    const evaluation = evaluationResult(terminal);
    const differentRevision = { ...terminal, implementationRevision: "sdk-2" };

    expect(
      classifyEvaluationAdoption({
        expectedEvaluation: stageOutputKeyOf(evaluation),
        stored: { kind: "Found", value: evaluation },
        terminal,
        digestEvaluationValue: digestEvaluationResultValue,
      })
    ).toEqual({ kind: "Adopted", value: evaluation });

    expect(
      classifyEvaluationAdoption({
        expectedEvaluation: stageOutputKeyOf(evaluation),
        stored: { kind: "Found", value: evaluationResult(differentRevision) },
        terminal,
        digestEvaluationValue: digestEvaluationResultValue,
      })
    ).toEqual({
      kind: "Conflict",
      conflict: { kind: "EvaluationPredecessorMismatch" },
    });
  });

  test("rejects an unbound evaluation before publication or read-after-unknown", () => {
    const terminal = solverTerminal();
    const differentRevision = { ...terminal, implementationRevision: "sdk-2" };
    const unbound = evaluationResult(differentRevision);
    const expectedConflict = {
      kind: "Conflict" as const,
      conflict: { kind: "EvaluationPredecessorMismatch" as const },
    };

    expect(
      classifyEvaluationPublication({
        terminal,
        candidate: unbound,
        outcome: { kind: "Created" },
        digestEvaluationValue: digestEvaluationResultValue,
      })
    ).toEqual(expectedConflict);
    expect(
      reconcileEvaluationPublicationAfterUnknown({
        terminal,
        candidate: unbound,
        read: { kind: "Absent" },
        digestEvaluationValue: digestEvaluationResultValue,
      })
    ).toEqual(expectedConflict);
  });

  test("generic durable-output paths fail closed for evaluation results", () => {
    const evaluation = evaluationResult();

    if (false) {
      classifyAdoption(
        // @ts-expect-error evaluation adoption requires the exact terminal envelope
        stageOutputKeyOf(evaluation),
        { kind: "Found", value: evaluation },
        digestEvaluationResultValue
      );
      // @ts-expect-error evaluation publication requires the exact terminal envelope
      classifyPublication(evaluation, { kind: "Created" }, digestEvaluationResultValue);
      reconcilePublicationAfterUnknown(
        // @ts-expect-error evaluation reconciliation requires the exact terminal envelope
        evaluation,
        { kind: "Found", value: evaluation },
        digestEvaluationResultValue
      );
    }

    const widened = evaluation as PortableStageOutput<StageOutputShape>;
    const digestWidened = () => evaluation.outputDigest;
    const expectedConflict = {
      kind: "Conflict" as const,
      conflict: { kind: "EvaluationResultRequiresExactTerminalBinding" as const },
    };

    expect(
      classifyAdoption(
        // @ts-expect-error broad stages cannot use generic semantic-stage adoption
        stageOutputKeyOf(widened),
        { kind: "Found", value: widened },
        digestWidened
      )
    ).toEqual(expectedConflict);
    // @ts-expect-error broad stages cannot use generic semantic-stage publication
    expect(classifyPublication(widened, { kind: "Created" }, digestWidened)).toEqual(
      expectedConflict
    );
    expect(
      reconcilePublicationAfterUnknown(
        // @ts-expect-error broad stages cannot use generic semantic-stage reconciliation
        widened,
        { kind: "Found", value: widened },
        digestWidened
      )
    ).toEqual(expectedConflict);

    if (false) {
      const mixed = evaluation as PortableStageOutput<
        StageOutputShape<"PreparedCell" | "EvaluationResult">
      >;
      classifyAdoption(
        // @ts-expect-error a mixed stage union containing EvaluationResult is not generic
        stageOutputKeyOf(mixed),
        { kind: "Found", value: mixed },
        digestWidened
      );
      classifyPublication(
        // @ts-expect-error a mixed stage union containing EvaluationResult is not generic
        mixed,
        { kind: "Created" },
        digestWidened
      );
      reconcilePublicationAfterUnknown(
        // @ts-expect-error a mixed stage union containing EvaluationResult is not generic
        mixed,
        { kind: "Found", value: mixed },
        digestWidened
      );
    }
  });
});
