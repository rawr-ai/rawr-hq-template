import { Exit } from "effect";
import type { Portable } from "../contracts/schema.js";
import type { PortableStageOutput } from "../contracts/stage-output.js";
import { equalStructuredData, stageOutputIdentityOf } from "./adoption.js";
import type { EvaluationResultShape, SolverTerminalShape } from "./stage-shapes.js";

const ObservationSettlementBinding = Symbol("@rawr/research-sdk/core/ObservationSettlement");
const ObservationProjectionBinding = Symbol("@rawr/research-sdk/core/ObservationProjection");

export interface BoundObservationSettlement<
  Handle,
  Terminal extends SolverTerminalShape<Handle>,
  ExecutionError,
> {
  readonly [ObservationSettlementBinding]: true;
  readonly handle: Handle & Portable<Handle>;
  readonly execution: Exit.Exit<PortableStageOutput<Terminal>, ExecutionError>;
}

export interface BoundObservationProjection<
  Handle,
  Terminal extends SolverTerminalShape<Handle>,
  Evaluation extends EvaluationResultShape,
> {
  readonly [ObservationProjectionBinding]: true;
  readonly handle: Handle & Portable<Handle>;
  readonly terminal: PortableStageOutput<Terminal>;
  readonly evaluation: PortableStageOutput<Evaluation>;
}

export type ObservationBindingConflict =
  | { readonly kind: "ObservationHandleMismatch" }
  | { readonly kind: "EvaluationIdentityMismatch" }
  | { readonly kind: "EvaluationPredecessorMismatch" };

export type ObservationBindingOutcome<Value> =
  | { readonly kind: "Ready"; readonly value: Value }
  | { readonly kind: "Conflict"; readonly conflict: ObservationBindingConflict };

export function bindObservationSettlement<
  Handle,
  Terminal extends SolverTerminalShape<Handle>,
  ExecutionError,
>(input: {
  readonly acquiredHandle: Handle & Portable<Handle>;
  readonly execution: Exit.Exit<PortableStageOutput<Terminal>, ExecutionError>;
}): ObservationBindingOutcome<BoundObservationSettlement<Handle, Terminal, ExecutionError>> {
  if (Exit.isFailure(input.execution)) {
    return {
      kind: "Ready",
      value: {
        [ObservationSettlementBinding]: true,
        handle: input.acquiredHandle,
        execution: input.execution,
      },
    };
  }

  const terminalHandle = input.execution.value.value.observation as Handle & Portable<Handle>;
  if (!equalStructuredData(input.acquiredHandle, terminalHandle)) {
    return {
      kind: "Conflict",
      conflict: { kind: "ObservationHandleMismatch" },
    };
  }

  return {
    kind: "Ready",
    value: {
      [ObservationSettlementBinding]: true,
      handle: terminalHandle,
      execution: input.execution,
    },
  };
}

export function bindObservationProjection<
  Handle,
  Terminal extends SolverTerminalShape<Handle>,
  Evaluation extends EvaluationResultShape,
>(
  terminal: PortableStageOutput<Terminal>,
  evaluation: PortableStageOutput<Evaluation>
): ObservationBindingOutcome<BoundObservationProjection<Handle, Terminal, Evaluation>> {
  if (
    !equalStructuredData(terminal.cell, evaluation.cell) ||
    !equalStructuredData(terminal.frozenInputDigest, evaluation.frozenInputDigest)
  ) {
    return {
      kind: "Conflict",
      conflict: { kind: "EvaluationIdentityMismatch" },
    };
  }

  const terminalDigest = terminal.outputDigest;
  const roots =
    evaluation.predecessors.kind === "Set"
      ? evaluation.predecessors.digests
      : evaluation.predecessors.rootDigests;

  if (
    !equalStructuredData(evaluation.value.terminalPredecessor, stageOutputIdentityOf(terminal)) ||
    !roots.some((digest) => equalStructuredData(digest, terminalDigest))
  ) {
    return {
      kind: "Conflict",
      conflict: { kind: "EvaluationPredecessorMismatch" },
    };
  }

  return {
    kind: "Ready",
    value: {
      [ObservationProjectionBinding]: true,
      handle: terminal.value.observation as Handle & Portable<Handle>,
      terminal,
      evaluation,
    },
  };
}
