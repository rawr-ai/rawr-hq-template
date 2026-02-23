export type SupportTriageDomainErrorCode =
  | "INVALID_QUEUE_ID"
  | "INVALID_REQUESTED_BY"
  | "INVALID_JOB_ID"
  | "JOB_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "INVALID_COMPLETION_INPUT";

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
