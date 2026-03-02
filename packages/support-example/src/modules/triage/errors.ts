import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { TriageWorkItemStatusSchema } from "../../domain";

const optionalString = Type.Optional(
  Type.String({
    minLength: 1,
  }),
);

export const supportExampleTriageErrorMap = {
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
  INVALID_WORK_ITEM_ID: {
    status: 400,
    message: "Invalid workItemId",
    data: schema(
      Type.Object(
        {
          workItemId: optionalString,
        },
        { additionalProperties: false },
      ),
    ),
  },
  INVALID_COMPLETION_INPUT: {
    status: 400,
    message: "Invalid completion input",
    data: schema(
      Type.Object(
        {
          workItemId: optionalString,
        },
        { additionalProperties: false },
      ),
    ),
  },
  WORK_ITEM_NOT_FOUND: {
    status: 404,
    message: "Work item not found",
    data: schema(
      Type.Object(
        {
          workItemId: optionalString,
        },
        { additionalProperties: false },
      ),
    ),
  },
  INVALID_STATUS_TRANSITION: {
    status: 409,
    message: "Invalid status transition",
    data: schema(
      Type.Object(
        {
          workItemId: optionalString,
          from: Type.Optional(TriageWorkItemStatusSchema),
          to: Type.Optional(TriageWorkItemStatusSchema),
        },
        { additionalProperties: false },
      ),
    ),
  },
} as const;
