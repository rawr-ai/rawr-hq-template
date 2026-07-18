export type ReleaseIssueCode =
  | "EXPECTED_ARRAY"
  | "EXPECTED_BYTES"
  | "EXPECTED_INTEGER"
  | "EXPECTED_OBJECT"
  | "EXPECTED_STRING"
  | "UNKNOWN_FIELD"
  | "INVALID_SCHEMA_VERSION"
  | "INVALID_STRING"
  | "INVALID_CONTENT_AUTHORITY"
  | "INVALID_REPOSITORY_IDENTITY"
  | "INVALID_GIT_OBJECT_ID"
  | "INVALID_PLUGIN_ID"
  | "INVALID_OWNERSHIP_IDENTITY"
  | "INVALID_RELATIVE_PATH"
  | "INVALID_MODE"
  | "INVALID_DIGEST"
  | "INVALID_BASE64"
  | "DUPLICATE_VALUE"
  | "DUPLICATE_PAYLOAD_PATH"
  | "DUPLICATE_PLUGIN_ID"
  | "DUPLICATE_OWNERSHIP_CLAIM"
  | "OWNERSHIP_CONFLICT"
  | "MISSING_OWNER"
  | "SKILL_INVENTORY_MISMATCH"
  | "SKILL_OWNERSHIP_MISMATCH"
  | "FORBIDDEN_UNIT_KIND"
  | "COUNT_LIMIT_EXCEEDED"
  | "PAYLOAD_BYTES_LIMIT_EXCEEDED"
  | "ENVELOPE_TOO_LARGE"
  | "INVALID_UTF8"
  | "INVALID_JSON"
  | "NON_CANONICAL_ENVELOPE"
  | "RELEASE_INPUT_DIGEST_MISMATCH"
  | "PAYLOAD_DIGEST_MISMATCH"
  | "PAYLOAD_MANIFEST_MISMATCH"
  | "RELEASE_DIGEST_MISMATCH"
  | "ARTIFACT_DIGEST_MISMATCH"
  | "RELEASE_SET_DIGEST_MISMATCH"
  | "MEMBER_NOT_DECLARED"
  | "MISSING_EXPECTED_MEMBER"
  | "EXTRA_MEMBER"
  | "SOURCE_IDENTITY_MISMATCH"
  | "RELEASE_INPUT_IDENTITY_MISMATCH"
  | "OWNERSHIP_INDEX_MISMATCH"
  | "INVALID_ARTIFACT_REF";

export interface ReleaseIssue {
  readonly code: ReleaseIssueCode;
  readonly path: string;
  readonly message: string;
  readonly expected?: string | number;
  readonly actual?: string | number;
  readonly claimKind?: string;
  readonly claim?: string;
  readonly claimants?: readonly string[];
}

export function issue(
  code: ReleaseIssueCode,
  path: string,
  message: string,
  details: Pick<ReleaseIssue, "expected" | "actual" | "claimKind" | "claim" | "claimants"> = {},
): ReleaseIssue {
  return Object.freeze({
    code,
    path,
    message,
    ...details,
    ...(details.claimants === undefined ? {} : { claimants: Object.freeze([...details.claimants]) }),
  });
}

export function sortReleaseIssues(issues: readonly ReleaseIssue[]): ReleaseIssue[] {
  return [...issues].sort((left, right) => {
    const leftKey = `${left.path}\u0000${left.code}\u0000${left.claimKind ?? ""}\u0000${left.claim ?? ""}\u0000${left.claimants?.join("\u0000") ?? ""}`;
    const rightKey = `${right.path}\u0000${right.code}\u0000${right.claimKind ?? ""}\u0000${right.claim ?? ""}\u0000${right.claimants?.join("\u0000") ?? ""}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}
