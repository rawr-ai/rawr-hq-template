import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";

const optionalString = Type.Optional(
  Type.String({
    minLength: 1,
  }),
);

export const supportExampleWorkflowErrorMap = {
  INVALID_QUEUE_ID: {
    status: 400,
    message: "Invalid queueId",
    data: schema(
      Type.Object(
        {
          queueId: optionalString,
        },
        { additionalProperties: false },
      ),
    ),
  },
  INVALID_REQUESTED_BY: {
    status: 400,
    message: "Invalid requestedBy",
    data: schema(
      Type.Object(
        {
          requestedBy: optionalString,
        },
        { additionalProperties: false },
      ),
    ),
  },
  INVALID_SUPPORT_EXAMPLE_RUN_ID: {
    status: 400,
    message: "Invalid support-example runId",
    data: schema(
      Type.Object(
        {
          runId: optionalString,
        },
        { additionalProperties: false },
      ),
    ),
  },
  SUPPORT_EXAMPLE_RUN_NOT_FOUND: {
    status: 404,
    message: "Support-example run not found",
    data: schema(
      Type.Object(
        {
          runId: optionalString,
        },
        { additionalProperties: false },
      ),
    ),
  },
  SUPPORT_EXAMPLE_TRIGGER_FAILED: {
    status: 500,
    message: "Support-example trigger dispatch failed",
    data: schema(
      Type.Object(
        {
          runId: optionalString,
        },
        { additionalProperties: false },
      ),
    ),
  },
} as const;
