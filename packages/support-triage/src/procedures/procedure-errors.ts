import type { ORPCErrorConstructorMap } from "@orpc/server";
import type { TriageWorkItemStatus } from "../domain";
import { isSupportTriageDomainError } from "../errors";
import { supportTriageProcedureErrorMap } from "./error-map";

type SupportTriageProcedureErrorConstructors = ORPCErrorConstructorMap<
  typeof supportTriageProcedureErrorMap
>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(details: Record<string, unknown> | null, key: string): string | undefined {
  const value = details?.[key];
  return typeof value === "string" ? value : undefined;
}

function readStatus(details: Record<string, unknown> | null, key: string): TriageWorkItemStatus | undefined {
  const value = details?.[key];
  if (value === "queued" || value === "running" || value === "completed" || value === "failed") {
    return value;
  }
  return undefined;
}

/**
 * Convert a transport-neutral support-triage domain error into a typed oRPC procedure error.
 */
export function throwSupportTriageDomainErrorAsProcedureError(
  error: unknown,
  errors: SupportTriageProcedureErrorConstructors,
): never {
  if (!isSupportTriageDomainError(error)) {
    throw error;
  }

  const details = asRecord(error.details);

  switch (error.code) {
    case "INVALID_QUEUE_ID":
      throw errors.INVALID_QUEUE_ID({
        message: error.message,
        data: {
          queueId: readString(details, "queueId"),
        },
      });
    case "INVALID_REQUESTED_BY":
      throw errors.INVALID_REQUESTED_BY({
        message: error.message,
        data: {
          requestedBy: readString(details, "requestedBy"),
        },
      });
    case "INVALID_WORK_ITEM_ID":
      throw errors.INVALID_WORK_ITEM_ID({
        message: error.message,
        data: {
          workItemId: readString(details, "workItemId"),
        },
      });
    case "INVALID_COMPLETION_INPUT":
      throw errors.INVALID_COMPLETION_INPUT({
        message: error.message,
        data: {
          workItemId: readString(details, "workItemId"),
        },
      });
    case "WORK_ITEM_NOT_FOUND":
      throw errors.WORK_ITEM_NOT_FOUND({
        message: error.message,
        data: {
          workItemId: readString(details, "workItemId"),
        },
      });
    case "INVALID_STATUS_TRANSITION":
      throw errors.INVALID_STATUS_TRANSITION({
        message: error.message,
        data: {
          workItemId: readString(details, "workItemId"),
          from: readStatus(details, "from"),
          to: readStatus(details, "to"),
        },
      });
    default: {
      const exhaustiveCheck: never = error.code;
      throw exhaustiveCheck;
    }
  }
}
