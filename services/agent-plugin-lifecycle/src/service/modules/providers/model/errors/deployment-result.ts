export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export const MAX_PROVIDER_ISSUE_TEXT_LENGTH = 4_096;

const TRUNCATED_PROVIDER_ISSUE_SUFFIX = "...[truncated]";

export type DeploymentResult<T, E = ProviderDeploymentIssue> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; issues: NonEmptyReadonlyArray<E> }>;

export interface ProviderDeploymentIssue {
  readonly code: ProviderDeploymentIssueCode;
  readonly path: string;
  readonly message: string;
  readonly expected: string;
  readonly actual: string;
}

export type ProviderDeploymentIssueCode =
  | "ADAPTER_PROTOCOL_MISMATCH"
  | "ARTIFACT_KIND_MISMATCH"
  | "ARTIFACT_READ_FAILED"
  | "BLOCKED_COLLISION"
  | "CAPABILITY_MISMATCH"
  | "CHANNEL_NOT_ELIGIBLE"
  | "DUPLICATE_MEMBER"
  | "DUPLICATE_TARGET"
  | "EVIDENCE_FAILED"
  | "EXPECTED_ARRAY"
  | "EXPECTED_INTEGER"
  | "EXPECTED_OBJECT"
  | "EXPECTED_STRING"
  | "INVALID_ARTIFACT_REF"
  | "INVALID_DIGEST"
  | "INVALID_EVALUATION_PROFILE"
  | "INVALID_HOME"
  | "INVALID_LOCATOR"
  | "INVALID_MODE"
  | "INVALID_PLUGIN_ID"
  | "INVALID_PROTOCOL"
  | "INVALID_RECEIPT"
  | "INVALID_TARGET"
  | "MISSING_FIELD"
  | "MUTATION_FAILED"
  | "PROJECTION_MISMATCH"
  | "RECEIPT_FAILED"
  | "RECEIPT_TARGET_MISMATCH"
  | "UNKNOWN_FIELD"
  | "UNSUPPORTED_PROVIDER"
  | "VISIBILITY_FAILED";

export function success<T>(value: T): DeploymentResult<T, never> {
  return Object.freeze({ ok: true, value });
}

export function failure<E>(issues: NonEmptyReadonlyArray<E>): DeploymentResult<never, E> {
  return Object.freeze({ ok: false, issues });
}

export function issue(
  code: ProviderDeploymentIssueCode,
  path: string,
  message: string,
  expected = "",
  actual = "",
): ProviderDeploymentIssue {
  return Object.freeze({
    code,
    path: boundedIssueText(path),
    message: boundedIssueText(message),
    expected: boundedIssueText(expected),
    actual: boundedIssueText(actual),
  });
}

function boundedIssueText(value: string): string {
  if (value.length <= MAX_PROVIDER_ISSUE_TEXT_LENGTH) return value;
  return `${value.slice(
    0,
    MAX_PROVIDER_ISSUE_TEXT_LENGTH - TRUNCATED_PROVIDER_ISSUE_SUFFIX.length,
  )}${TRUNCATED_PROVIDER_ISSUE_SUFFIX}`;
}

export function firstIssue(
  issues: readonly ProviderDeploymentIssue[],
  fallback: ProviderDeploymentIssue,
): NonEmptyReadonlyArray<ProviderDeploymentIssue> {
  const first = issues[0];
  return first === undefined ? [fallback] : [first, ...issues.slice(1)];
}

export function collect<T>(
  result: DeploymentResult<T>,
  issues: ProviderDeploymentIssue[],
): T | undefined {
  if (!result.ok) {
    issues.push(...result.issues);
    return undefined;
  }
  return result.value;
}
