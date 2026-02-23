import { ORPCError } from "@orpc/server";

export type SupportTriageDomainErrorCode =
  | "INVALID_QUEUE_ID"
  | "INVALID_REQUESTED_BY"
  | "INVALID_JOB_ID"
  | "JOB_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "INVALID_COMPLETION_INPUT";

export type SupportTriageBoundaryTransportCode = "BAD_REQUEST" | "CONFLICT" | "NOT_FOUND" | "INTERNAL_SERVER_ERROR";

export type SupportTriageBoundaryErrorOptions = {
  transportCode: SupportTriageBoundaryTransportCode;
  status: number;
  domainCode: string;
  message: string;
  data?: Record<string, unknown>;
};

export class SupportTriageDomainError extends Error {
  readonly code: SupportTriageDomainErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: SupportTriageDomainErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "SupportTriageDomainError";
    this.code = code;
    this.details = details;
  }
}

export function isSupportTriageDomainError(error: unknown): error is SupportTriageDomainError {
  return error instanceof SupportTriageDomainError;
}

/**
 * Shared boundary envelope for the support-triage capability.
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

/**
 * Canonical package boundary seam for translating support-triage domain failures into ORPC errors.
 */
export function throwSupportTriageDomainErrorAsBoundary(error: unknown): never {
  if (!isSupportTriageDomainError(error)) {
    throw error;
  }

  switch (error.code) {
    case "JOB_NOT_FOUND":
      return throwSupportTriageBoundaryError({
        transportCode: "NOT_FOUND",
        status: 404,
        domainCode: error.code,
        message: error.message,
        data: error.details,
      });
    case "INVALID_STATUS_TRANSITION":
      return throwSupportTriageBoundaryError({
        transportCode: "CONFLICT",
        status: 409,
        domainCode: error.code,
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
        domainCode: error.code,
        message: error.message,
        data: error.details,
      });
    default: {
      const exhaustiveCheck: never = error.code;
      return exhaustiveCheck;
    }
  }
}
