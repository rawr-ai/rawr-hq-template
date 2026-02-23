import { ORPCError } from "@orpc/server";
import { isSupportTriageDomainError, type SupportTriageDomainErrorCode } from "@rawr/support-triage";

export type SupportTriageBoundaryTransportCode = "BAD_REQUEST" | "CONFLICT" | "NOT_FOUND" | "INTERNAL_SERVER_ERROR";

export type SupportTriageBoundaryErrorOptions = {
  transportCode: SupportTriageBoundaryTransportCode;
  status: number;
  domainCode: string;
  message: string;
  data?: Record<string, unknown>;
};

/**
 * API boundary envelope for the support-triage capability.
 * Domain code remains stable in `data.code`; transport code/status map to route semantics.
 */
export function throwSupportTriageBoundaryError(input: SupportTriageBoundaryErrorOptions): never {
  throw new ORPCError(input.transportCode, {
    status: input.status,
    message: input.message,
    data: {
      code: input.domainCode,
      ...(input.data ?? {}),
    },
  });
}

export function throwSupportTriageDomainErrorAsBoundary(error: unknown): never {
  if (!isSupportTriageDomainError(error)) {
    throw error;
  }

  const code: SupportTriageDomainErrorCode = error.code;
  switch (code) {
    case "JOB_NOT_FOUND":
      return throwSupportTriageBoundaryError({
        transportCode: "NOT_FOUND",
        status: 404,
        domainCode: code,
        message: error.message,
        data: error.details,
      });
    case "INVALID_STATUS_TRANSITION":
      return throwSupportTriageBoundaryError({
        transportCode: "CONFLICT",
        status: 409,
        domainCode: code,
        message: error.message,
        data: error.details,
      });
    case "INVALID_COMPLETION_INPUT":
    case "INVALID_QUEUE_ID":
    case "INVALID_REQUESTED_BY":
    case "INVALID_JOB_ID":
      return throwSupportTriageBoundaryError({
        transportCode: "BAD_REQUEST",
        status: 400,
        domainCode: code,
        message: error.message,
        data: error.details,
      });
    default: {
      const exhaustiveCheck: never = code;
      return exhaustiveCheck;
    }
  }
}

