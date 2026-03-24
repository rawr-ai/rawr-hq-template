import type {
  CoordinationWorkflowV1,
  JsonValue,
  RunStatusV1,
  RunTraceLinkV1,
} from "../../../domain/types";

export type QueueCoordinationRunRequest = Readonly<{
  workflow: CoordinationWorkflowV1;
  runId: string;
  input: JsonValue;
}>;

export type QueueCoordinationRunResult = Readonly<{
  run: RunStatusV1;
  eventIds: string[];
}>;

export type CoordinationRunsRuntime = Readonly<{
  queueRun: (input: QueueCoordinationRunRequest) => Promise<QueueCoordinationRunResult>;
  createTraceLinks: (input: {
    runId: string;
    inngestRunId?: string;
    inngestEventId?: string;
  }) => RunTraceLinkV1[];
}>;
