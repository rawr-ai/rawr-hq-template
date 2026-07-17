export type PromotionIssueCode =
  | "INVALID_SCHEMA"
  | "INVALID_CANONICAL_VALUE"
  | "INVALID_DIGEST"
  | "INVALID_GIT_IDENTITY"
  | "INVALID_LIFECYCLE_PATH"
  | "DUPLICATE_BINDING"
  | "MISSING_BINDING"
  | "EXTRA_BINDING"
  | "COUNT_LIMIT_EXCEEDED"
  | "ENVELOPE_TOO_LARGE"
  | "NON_CANONICAL_ENVELOPE"
  | "DIGEST_MISMATCH"
  | "EVIDENCE_MISMATCH"
  | "RECORD_MISMATCH";

export interface PromotionIssue {
  readonly code: PromotionIssueCode;
  readonly path: string;
  readonly message: string;
}

export type PromotionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly [PromotionIssue, ...PromotionIssue[]] };

export function success<T>(value: T): PromotionResult<T> {
  return { ok: true, value };
}

export function failure(
  code: PromotionIssueCode,
  path: string,
  message: string,
): PromotionResult<never> {
  return { ok: false, issues: [{ code, path, message }] };
}

export function failures(issues: readonly PromotionIssue[]): PromotionResult<never> {
  return issues.length === 0
    ? failure("INVALID_SCHEMA", "record", "Record validation did not produce a value")
    : { ok: false, issues: issues as readonly [PromotionIssue, ...PromotionIssue[]] };
}

export function issue(
  code: PromotionIssueCode,
  path: string,
  message: string,
): PromotionIssue {
  return { code, path, message };
}
