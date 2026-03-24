import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { RunStatusSchema } from "../../../domain/schemas";

const InvalidRunIdDataSchema = Type.Object(
  {
    runId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  },
  { additionalProperties: false },
);

const RunNotFoundDataSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const RunQueueFailedDataSchema = Type.Object(
  {
    run: RunStatusSchema,
  },
  { additionalProperties: false },
);

export const INVALID_RUN_ID = {
  status: 400,
  message: "runId must be a string when provided",
  data: schema(InvalidRunIdDataSchema),
} as const;

export const RUN_NOT_FOUND = {
  status: 404,
  message: "run not found",
  data: schema(RunNotFoundDataSchema),
} as const;

export const RUN_QUEUE_FAILED = {
  status: 500,
  message: "Workflow run failed",
  data: schema(RunQueueFailedDataSchema),
} as const;
