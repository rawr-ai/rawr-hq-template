import type { Effect } from "effect";
import type { Portable } from "../contracts/schema.js";
import type { PortableStageOutput } from "../contracts/stage-output.js";
import type { BoundObservationProjection, BoundObservationSettlement } from "./observation.js";
import type {
  EvaluationResultShape,
  PreparedCellShape,
  SolverTerminalShape,
} from "./stage-shapes.js";

export interface Prepare<Input, Output extends PreparedCellShape, Error, Requirements = never> {
  readonly prepare: (
    input: Input
  ) => Effect.Effect<PortableStageOutput<Output>, Error, Requirements>;
}

export interface Execute<Input, Terminal extends SolverTerminalShape, Error, Requirements = never> {
  readonly execute: (
    input: Input
  ) => Effect.Effect<PortableStageOutput<Terminal>, Error, Requirements>;
}

export interface Observe<
  AcquireInput,
  Handle,
  Terminal extends SolverTerminalShape<Handle>,
  Settlement,
  ProjectionResult,
  AcquireError,
  SettleError,
  ProjectError,
  Requirements = never,
> {
  readonly acquire: (
    input: AcquireInput
  ) => Effect.Effect<Handle & Portable<Handle>, AcquireError, Requirements>;
  readonly settle: <ExecutionError>(input: {
    readonly subject: BoundObservationSettlement<Handle, Terminal, ExecutionError>;
  }) => Effect.Effect<Settlement, SettleError, Requirements>;
  readonly project: <Evaluation extends EvaluationResultShape>(
    input: BoundObservationProjection<Handle, Terminal, Evaluation>
  ) => Effect.Effect<ProjectionResult, ProjectError, Requirements>;
}

export interface Evaluate<
  Input,
  Output extends EvaluationResultShape,
  Error,
  Requirements = never,
> {
  readonly evaluate: (
    input: Input
  ) => Effect.Effect<PortableStageOutput<Output>, Error, Requirements>;
}
