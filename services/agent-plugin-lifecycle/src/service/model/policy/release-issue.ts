import {
  MAX_RELEASE_ISSUE_ACTUAL_LENGTH,
  MAX_RELEASE_ISSUE_CLAIM_KIND_LENGTH,
  MAX_RELEASE_ISSUE_CLAIM_LENGTH,
  MAX_RELEASE_ISSUE_CLAIMANT_LENGTH,
  MAX_RELEASE_ISSUE_CLAIMANTS,
  MAX_RELEASE_ISSUE_EXPECTED_LENGTH,
  MAX_RELEASE_ISSUE_MESSAGE_LENGTH,
  MAX_RELEASE_ISSUE_PATH_LENGTH,
  type ReleaseIssue,
  type ReleaseIssueCode,
} from "../dto/release-issue";

const TRUNCATED_RELEASE_ISSUE_SUFFIX = "...[truncated]";
const RELEASE_ISSUE_PATH_FALLBACK = "release";
const RELEASE_ISSUE_MESSAGE_FALLBACK = "Release validation failed";

/**
 * Constructs one immutable, boundary-safe release diagnostic.
 *
 * External values are bounded and missing required text receives stable
 * field-specific fallbacks, so every call returns a value admitted by the
 * canonical schema without duplicating construction policy.
 *
 * @param code Stable diagnostic classification from the release issue schema.
 * @param path Qualified field or semantic location that produced the issue.
 * @param message Human-readable explanation for operators and tests.
 * @param details Optional expected, observed, or ownership-specific context.
 */
export function releaseIssue(
  code: ReleaseIssueCode,
  path: string,
  message: string,
  details: Pick<ReleaseIssue, "expected" | "actual" | "claimKind" | "claim" | "claimants"> = {}
): ReleaseIssue {
  const expected =
    typeof details.expected === "string"
      ? boundedIssueText(details.expected, MAX_RELEASE_ISSUE_EXPECTED_LENGTH)
      : typeof details.expected === "number" && !Number.isFinite(details.expected)
        ? boundedIssueText(String(details.expected), MAX_RELEASE_ISSUE_EXPECTED_LENGTH)
        : details.expected;
  const actual = details.actual === undefined ? undefined : boundedIssueActual(details.actual);
  const claimKind =
    details.claimKind === undefined
      ? undefined
      : boundedIssueText(details.claimKind, MAX_RELEASE_ISSUE_CLAIM_KIND_LENGTH);
  const claim =
    details.claim === undefined
      ? undefined
      : boundedIssueText(details.claim, MAX_RELEASE_ISSUE_CLAIM_LENGTH);
  const claimants =
    details.claimants === undefined ? undefined : boundedIssueClaimants(details.claimants);
  return Object.freeze({
    code,
    path: boundedIssueText(
      path.length === 0 ? RELEASE_ISSUE_PATH_FALLBACK : path,
      MAX_RELEASE_ISSUE_PATH_LENGTH
    ),
    message: boundedIssueText(
      message.length === 0 ? RELEASE_ISSUE_MESSAGE_FALLBACK : message,
      MAX_RELEASE_ISSUE_MESSAGE_LENGTH
    ),
    ...(expected === undefined ? {} : { expected }),
    ...(actual === undefined ? {} : { actual }),
    ...(claimKind === undefined ? {} : { claimKind }),
    ...(claim === undefined ? {} : { claim }),
    ...(claimants === undefined ? {} : { claimants }),
  });
}

/**
 * Requalifies an admitted diagnostic beneath one caller-owned location.
 *
 * Reconstructing through the canonical constructor keeps composed parser
 * paths inside the same bounds as directly authored diagnostics.
 */
export function prefixReleaseIssuePath(prefix: string, diagnostic: ReleaseIssue): ReleaseIssue {
  return releaseIssue(
    diagnostic.code,
    `${prefix}.${diagnostic.path}`,
    diagnostic.message,
    diagnostic
  );
}

function boundedIssueActual(actual: string | number): string | number {
  if (
    typeof actual === "number" &&
    Number.isFinite(actual) &&
    Math.abs(actual) <= Number.MAX_SAFE_INTEGER
  ) {
    return actual;
  }
  return boundedIssueText(String(actual), MAX_RELEASE_ISSUE_ACTUAL_LENGTH);
}

function boundedIssueClaimants(claimants: readonly string[]): readonly string[] {
  const bounded: string[] = [];
  const admittedLength = Math.min(claimants.length, MAX_RELEASE_ISSUE_CLAIMANTS);
  for (let index = 0; index < admittedLength; index += 1) {
    const claimant = claimants[index];
    if (typeof claimant === "string") {
      bounded.push(boundedIssueText(claimant, MAX_RELEASE_ISSUE_CLAIMANT_LENGTH));
    }
  }
  return Object.freeze(bounded);
}

function boundedIssueText(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, maximumLength - TRUNCATED_RELEASE_ISSUE_SUFFIX.length)}${TRUNCATED_RELEASE_ISSUE_SUFFIX}`;
}

/**
 * Returns a canonical diagnostic order without mutating the caller's collection.
 *
 * The key includes every schema field with explicit scalar type tags, making
 * release validation independent of traversal or input order unless two
 * diagnostics are semantically identical.
 */
export function sortReleaseIssues(issues: readonly ReleaseIssue[]): ReleaseIssue[] {
  return issues
    .map((diagnostic) => ({ diagnostic, key: releaseIssueSortKey(diagnostic) }))
    .sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
    .map(({ diagnostic }) => diagnostic);
}

function releaseIssueSortKey(diagnostic: ReleaseIssue): string {
  return JSON.stringify([
    diagnostic.path,
    diagnostic.code,
    diagnostic.claimKind ?? null,
    diagnostic.claim ?? null,
    diagnostic.claimants ?? null,
    diagnostic.message,
    diagnostic.expected === undefined
      ? null
      : typeof diagnostic.expected === "number"
        ? ["number", Object.is(diagnostic.expected, -0) ? "-0" : String(diagnostic.expected)]
        : ["string", diagnostic.expected],
    diagnostic.actual === undefined
      ? null
      : typeof diagnostic.actual === "number"
        ? ["number", Object.is(diagnostic.actual, -0) ? "-0" : String(diagnostic.actual)]
        : ["string", diagnostic.actual],
  ]);
}
