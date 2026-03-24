import { Type } from "typebox";
import {
  CoordinationIdInputSchema,
  CoordinationIdSchema,
  DeskRunEventSchema,
  JsonValueSchema,
  RunStatusSchema,
} from "../../../domain/schemas";

export const QueueRunInputSchema = Type.Object(
  {
    workflowId: CoordinationIdInputSchema,
    runId: Type.Optional(CoordinationIdInputSchema),
    input: Type.Optional(JsonValueSchema),
  },
  { additionalProperties: false },
);
export const QueueRunOutputSchema = Type.Object(
  {
    run: RunStatusSchema,
    eventIds: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

export const GetRunStatusInputSchema = Type.Object(
  { runId: CoordinationIdInputSchema },
  { additionalProperties: false },
);
export const GetRunStatusOutputSchema = Type.Object(
  { run: RunStatusSchema },
  { additionalProperties: false },
);

export const GetRunTimelineInputSchema = Type.Object(
  { runId: CoordinationIdInputSchema },
  { additionalProperties: false },
);
export const GetRunTimelineOutputSchema = Type.Object(
  {
    runId: CoordinationIdSchema,
    timeline: Type.Array(DeskRunEventSchema),
  },
  { additionalProperties: false },
);
