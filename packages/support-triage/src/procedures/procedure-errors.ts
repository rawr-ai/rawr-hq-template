import type { ORPCErrorConstructorMap } from "@orpc/server";
import { isSupportTriageDomainError } from "../errors";
import { supportTriageProcedureErrorMap } from "./error-map";

type SupportTriageProcedureErrorConstructors = ORPCErrorConstructorMap<
  typeof supportTriageProcedureErrorMap
>;

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
