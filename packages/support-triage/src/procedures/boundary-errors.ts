import { ORPCError } from "@orpc/server";
import { isSupportTriageDomainError, type SupportTriageDomainErrorCode } from "../errors";

function statusForDomainCode(code: SupportTriageDomainErrorCode): number {
  switch (code) {
    case "JOB_NOT_FOUND":
      return 404;
    case "INVALID_STATUS_TRANSITION":
      return 409;
    case "INVALID_COMPLETION_INPUT":
    case "INVALID_QUEUE_ID":
    case "INVALID_REQUESTED_BY":
    case "INVALID_JOB_ID":
      return 400;
    default: {
      const exhaustiveCheck: never = code;
      return exhaustiveCheck;
    }
  }
}

/**
 * Convert a domain error into an oRPC typed boundary error.
 *
 * Canonical policy: boundary APIs must throw `ORPCError` with status/code.
 * We keep the domain layer oRPC-free by mapping here, at the procedures boundary.
 */
export function throwSupportTriageDomainErrorAsOrpc(error: unknown): never {
  if (!isSupportTriageDomainError(error)) {
    throw error;
  }

  throw new ORPCError(error.code, {
    status: statusForDomainCode(error.code),
    message: error.message,
    data: error.details,
  });
}

