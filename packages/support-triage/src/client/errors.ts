import type { ErrorMap } from "@orpc/contract";
import type { ORPCErrorConstructorMap } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemStatusSchema, isSupportTriageDomainError } from "../domain";

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

export const supportTriageClientErrorMap = {
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

type SupportTriageClientErrorConstructors = ORPCErrorConstructorMap<typeof supportTriageClientErrorMap>;

/**
 * Convert a transport-neutral support-triage domain error into a typed oRPC client error.
 */
export function throwSupportTriageDomainErrorAsClientError(
  error: unknown,
  errors: SupportTriageClientErrorConstructors,
): never {
  if (!isSupportTriageDomainError(error)) {
    throw error;
  }

  switch (error.code) {
    case "INVALID_QUEUE_ID":
      throw errors.INVALID_QUEUE_ID({
        message: error.message,
        data: error.details ?? {},
      });
    case "INVALID_REQUESTED_BY":
      throw errors.INVALID_REQUESTED_BY({
        message: error.message,
        data: error.details ?? {},
      });
    case "INVALID_WORK_ITEM_ID":
      throw errors.INVALID_WORK_ITEM_ID({
        message: error.message,
        data: error.details ?? {},
      });
    case "INVALID_COMPLETION_INPUT":
      throw errors.INVALID_COMPLETION_INPUT({
        message: error.message,
        data: error.details ?? {},
      });
    case "WORK_ITEM_NOT_FOUND":
      throw errors.WORK_ITEM_NOT_FOUND({
        message: error.message,
        data: error.details ?? {},
      });
    case "INVALID_STATUS_TRANSITION":
      throw errors.INVALID_STATUS_TRANSITION({
        message: error.message,
        data: error.details ?? {},
      });
  }
}
