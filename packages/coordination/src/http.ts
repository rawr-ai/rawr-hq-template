import type { JsonValue, ValidationResultV1 } from "./types";

export type CoordinationErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"
  | "INVALID_WORKFLOW_ID"
  | "INVALID_RUN_ID"
  | "MISSING_WORKFLOW_PAYLOAD"
  | "WORKFLOW_VALIDATION_FAILED"
  | "WORKFLOW_NOT_FOUND"
  | "RUN_NOT_FOUND"
  | "RUN_QUEUE_FAILED";

export type CoordinationError = Readonly<{
  code: CoordinationErrorCode | string;
  message: string;
  retriable: boolean;
  details?: JsonValue;
}>;

export type CoordinationFailure = Readonly<{
  ok: false;
  error: CoordinationError;
}>;

export type CoordinationSuccess<TPayload extends Record<string, unknown>> = Readonly<
  {
    ok: true;
  } & TPayload
>;

export type CoordinationEnvelope<TPayload extends Record<string, unknown>> =
  | CoordinationSuccess<TPayload>
  | CoordinationFailure;

export function coordinationSuccess<TPayload extends Record<string, unknown>>(
  payload: TPayload,
): CoordinationSuccess<TPayload> {
  return { ok: true, ...payload };
}

export function coordinationFailure(input: {
  code: CoordinationErrorCode | string;
  message: string;
  retriable?: boolean;
  details?: JsonValue;
}): CoordinationFailure {
  return {
    ok: false,
    error: {
      code: input.code,
      message: input.message,
      retriable: input.retriable ?? false,
      details: input.details,
    },
  };
}

export function isCoordinationFailure(value: unknown): value is CoordinationFailure {
  if (!value || typeof value !== "object") return false;
  if (!("ok" in value) || (value as Record<string, unknown>).ok !== false) return false;
  if (!("error" in value)) return false;
  const error = (value as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return false;
  return typeof (error as Record<string, unknown>).message === "string";
}

export function validationFailure(details: ValidationResultV1): CoordinationFailure {
  return coordinationFailure({
    code: "WORKFLOW_VALIDATION_FAILED",
    message: "Workflow validation failed",
    retriable: false,
    details: details as unknown as JsonValue,
  });
}

export function coordinationErrorMessage(value: unknown, fallback: string): string {
  if (isCoordinationFailure(value)) {
    return value.error.message;
  }
  return fallback;
}
