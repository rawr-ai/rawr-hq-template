import { type Static, type TSchema, Type } from "typebox";
import { CellKeySchema, DigestIdentitySchema, NonEmptyStringSchema } from "./identity.js";
import { closedObject, type Portable, type PortableSchema } from "./schema.js";
import {
  createStageOutputIdentitySchema,
  createStageOutputKeySchema,
  type StageOutput,
  type StageOutputIdentity,
} from "./stage-output.js";

export const CapturedArtifactSchema = closedObject(
  {},
  {
    kind: Type.Literal("Captured"),
    artifactDigest: DigestIdentitySchema,
    byteLength: Type.Integer({ minimum: 0 }),
  }
);

export const EmptyArtifactSchema = closedObject(
  {},
  {
    kind: Type.Literal("Empty"),
  }
);

export const SubmittedArtifactSchema = Type.Union([CapturedArtifactSchema, EmptyArtifactSchema]);

export const ExecutionAttemptIdentitySchema = closedObject(
  {},
  {
    attemptId: NonEmptyStringSchema,
    attemptDigest: DigestIdentitySchema,
  }
);

export const ProcessTerminationUnconfirmedSchema = closedObject(
  {},
  {
    kind: Type.Literal("ProcessTerminationUnconfirmed"),
    processLocator: Type.String({ minLength: 1 }),
    requestedSignal: Type.String({ minLength: 1 }),
    detailDigest: DigestIdentitySchema,
  }
);

export const UnresolvedExecutionResidueSchema = closedObject(
  {},
  {
    cell: CellKeySchema,
    residueDigest: DigestIdentitySchema,
    outcome: ProcessTerminationUnconfirmedSchema,
    sandboxLocator: Type.String({ minLength: 1 }),
  }
);

export type SubmittedArtifact = Static<typeof SubmittedArtifactSchema>;
export type ExecutionAttemptIdentity = Static<typeof ExecutionAttemptIdentitySchema>;
export type ProcessTerminationUnconfirmed = Static<typeof ProcessTerminationUnconfirmedSchema>;
export type UnresolvedExecutionResidue = Static<typeof UnresolvedExecutionResidueSchema>;
export type UnresolvedExecutionResidueValue = Omit<UnresolvedExecutionResidue, "residueDigest">;

export interface SolverTerminalValue<Observation, AgentExecution> {
  readonly attempt: ExecutionAttemptIdentity;
  readonly observation: Observation & Portable<Observation>;
  readonly agentExecution: AgentExecution & Portable<AgentExecution>;
  readonly artifact: SubmittedArtifact;
}

export interface EvaluationResultValue<Result> {
  readonly terminalPredecessor: StageOutputIdentity<"SolverTerminal">;
  readonly result: Result & Portable<Result>;
}

export type SolverTerminal<Observation, AgentExecution> = StageOutput<
  "SolverTerminal",
  SolverTerminalValue<Observation, AgentExecution>
>;

export type PreparedCell<Value> = StageOutput<"PreparedCell", Value>;
export type EvaluationResult<Result> = StageOutput<
  "EvaluationResult",
  EvaluationResultValue<Result>
>;

export function createPreparedCellSchema<const ValueSchema extends TSchema>(
  value: ValueSchema & PortableSchema<ValueSchema>
) {
  return closedObject(createStageOutputKeySchema("PreparedCell").properties, {
    outputDigest: DigestIdentitySchema,
    value,
  });
}

export function createSolverTerminalSchema<
  const ObservationSchema extends TSchema,
  const AgentExecutionSchema extends TSchema,
>(
  observation: ObservationSchema & PortableSchema<ObservationSchema>,
  agentExecution: AgentExecutionSchema & PortableSchema<AgentExecutionSchema>
) {
  return closedObject(createStageOutputKeySchema("SolverTerminal").properties, {
    outputDigest: DigestIdentitySchema,
    value: closedObject(
      {},
      {
        attempt: ExecutionAttemptIdentitySchema,
        observation,
        agentExecution,
        artifact: SubmittedArtifactSchema,
      }
    ),
  });
}

export function createEvaluationResultSchema<const ValueSchema extends TSchema>(
  result: ValueSchema & PortableSchema<ValueSchema>
) {
  return closedObject(createStageOutputKeySchema("EvaluationResult").properties, {
    outputDigest: DigestIdentitySchema,
    value: closedObject(
      {},
      {
        terminalPredecessor: createStageOutputIdentitySchema("SolverTerminal"),
        result,
      }
    ),
  });
}
