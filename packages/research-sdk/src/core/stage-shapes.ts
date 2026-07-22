import type { SubmittedArtifact } from "../contracts/execution.js";
import type { PortableData } from "../contracts/schema.js";
import type { StageOutputShape } from "../contracts/stage-output.js";

export interface PreparedCellShape extends StageOutputShape<"PreparedCell"> {
  readonly value: PortableData;
}

export interface SolverTerminalShape<Observation = PortableData>
  extends StageOutputShape<"SolverTerminal"> {
  readonly value: {
    readonly observation: Observation;
    readonly agentExecution: PortableData;
    readonly artifact: SubmittedArtifact;
  };
}

export interface EvaluationResultShape extends StageOutputShape<"EvaluationResult"> {
  readonly value: PortableData;
}
