import { schema } from "@rawr/hq-sdk";
import {
  GetRunStatusInputSchema,
  GetRunStatusOutputSchema,
  GetRunTimelineInputSchema,
  GetRunTimelineOutputSchema,
  QueueRunInputSchema,
  QueueRunOutputSchema,
} from "../../../domain/schemas";
import { ocBase } from "../../base";
import {
  INVALID_WORKFLOW_ID,
  WORKFLOW_NOT_FOUND,
} from "../../shared/errors";
import { INVALID_RUN_ID, RUN_NOT_FOUND, RUN_QUEUE_FAILED } from "./errors";

export const contract = {
  queueRun: ocBase
    .meta({ entity: "run", idempotent: false })
    .input(schema(QueueRunInputSchema))
    .output(schema(QueueRunOutputSchema))
    .errors({
      INVALID_WORKFLOW_ID,
      INVALID_RUN_ID,
      WORKFLOW_NOT_FOUND,
      RUN_QUEUE_FAILED,
    }),

  getRunStatus: ocBase
    .meta({ entity: "run", idempotent: true })
    .input(schema(GetRunStatusInputSchema))
    .output(schema(GetRunStatusOutputSchema))
    .errors({
      INVALID_RUN_ID,
      RUN_NOT_FOUND,
    }),

  getRunTimeline: ocBase
    .meta({ entity: "run", idempotent: true })
    .input(schema(GetRunTimelineInputSchema))
    .output(schema(GetRunTimelineOutputSchema))
    .errors({
      INVALID_RUN_ID,
      RUN_NOT_FOUND,
    }),
};
