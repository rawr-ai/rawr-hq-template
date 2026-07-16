export type ControllerIssueCode =
  | "EXPECTED_ARRAY"
  | "EXPECTED_BYTES"
  | "EXPECTED_INTEGER"
  | "EXPECTED_OBJECT"
  | "EXPECTED_STRING"
  | "INVALID_CONTROLLER_DIGEST"
  | "INVALID_COUNT"
  | "INVALID_MODE"
  | "MANIFEST_TOO_LARGE"
  | "INVALID_PLATFORM"
  | "INVALID_ARCHITECTURE"
  | "INVALID_RELEASE_RELATIVE_PATH"
  | "INVALID_SCHEMA_VERSION"
  | "INVALID_SHA256_DIGEST"
  | "INVALID_STRING"
  | "DUPLICATE_VALUE"
  | "SURFACE_COLLISION"
  | "UNKNOWN_FIELD"
  | "MISSING_PAYLOAD_ENTRY"
  | "UNEXPECTED_PAYLOAD_ENTRY"
  | "PAYLOAD_ENTRY_MISMATCH"
  | "PAYLOAD_KIND_MISMATCH"
  | "PAYLOAD_MODE_MISMATCH"
  | "PAYLOAD_DIGEST_MISMATCH"
  | "PAYLOAD_LINK_TARGET_MISMATCH"
  | "SHARED_PAYLOAD_INODE"
  | "MEMBER_PAYLOAD_DIGEST_MISMATCH"
  | "DEPENDENCY_LOCK_DIGEST_MISMATCH"
  | "RUNTIME_DIGEST_MISMATCH"
  | "UNSAFE_LINK_TARGET"
  | "CONTROLLER_DIGEST_MISMATCH"
  | "RELEASE_DIRECTORY_MISMATCH"
  | "NON_CANONICAL_ENVELOPE"
  | "INVALID_JSON"
  | "INVALID_UTF8"
  | "ENVELOPE_TOO_LARGE"
  | "INVALID_SELECTION"
  | "INVALID_SELECTION_LENGTH";

export interface ControllerIssue {
  readonly code: ControllerIssueCode;
  readonly path: string;
  readonly message: string;
  readonly expected?: string | number;
  readonly actual?: string | number;
  readonly offset?: number;
}

export function issue(
  code: ControllerIssueCode,
  path: string,
  message: string,
  details: Pick<ControllerIssue, "expected" | "actual" | "offset"> = {},
): ControllerIssue {
  return { code, path, message, ...details };
}
