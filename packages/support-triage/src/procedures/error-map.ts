import type { ErrorMap } from "@orpc/contract";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemStatusSchema } from "../domain";

const optionalString = Type.Optional(
  Type.String({
    minLength: 1,
  }),
);

const queueIdDataSchema = schema(
  Type.Object(
    {
      queueId: optionalString,
    },
    { additionalProperties: false },
  ),
);

const requestedByDataSchema = schema(
  Type.Object(
    {
      requestedBy: optionalString,
    },
    { additionalProperties: false },
  ),
);

const workItemIdDataSchema = schema(
  Type.Object(
    {
      workItemId: optionalString,
    },
    { additionalProperties: false },
  ),
);

const statusTransitionDataSchema = schema(
  Type.Object(
    {
      workItemId: optionalString,
      from: Type.Optional(TriageWorkItemStatusSchema),
      to: Type.Optional(TriageWorkItemStatusSchema),
    },
    { additionalProperties: false },
  ),
);

export const supportTriageProcedureErrorMap = {
  INVALID_QUEUE_ID: {
    status: 400,
    message: "Invalid queueId",
    data: queueIdDataSchema,
  },
  INVALID_REQUESTED_BY: {
    status: 400,
    message: "Invalid requestedBy",
    data: requestedByDataSchema,
  },
  INVALID_WORK_ITEM_ID: {
    status: 400,
    message: "Invalid workItemId",
    data: workItemIdDataSchema,
  },
  INVALID_COMPLETION_INPUT: {
    status: 400,
    message: "Invalid completion input",
    data: workItemIdDataSchema,
  },
  WORK_ITEM_NOT_FOUND: {
    status: 404,
    message: "Work item not found",
    data: workItemIdDataSchema,
  },
  INVALID_STATUS_TRANSITION: {
    status: 409,
    message: "Invalid status transition",
    data: statusTransitionDataSchema,
  },
} as const satisfies ErrorMap;
