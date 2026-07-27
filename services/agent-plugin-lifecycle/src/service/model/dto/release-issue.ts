import { ReadonlyObject, type Static, Type } from "typebox";

/**
 * Enumerates the stable diagnostic vocabulary emitted while validating release content.
 *
 * Release codecs, ownership policy, and lifecycle operations share these codes so
 * callers can distinguish diagnostic categories without parsing bounded messages.
 */
export const RELEASE_ISSUE_CODES = [
  "EXPECTED_ARRAY",
  "EXPECTED_BYTES",
  "EXPECTED_INTEGER",
  "EXPECTED_OBJECT",
  "EXPECTED_STRING",
  "UNKNOWN_FIELD",
  "INVALID_SCHEMA_VERSION",
  "INVALID_STRING",
  "INVALID_CONTENT_AUTHORITY",
  "INVALID_REPOSITORY_IDENTITY",
  "INVALID_GIT_OBJECT_ID",
  "INVALID_PLUGIN_ID",
  "INVALID_OWNERSHIP_IDENTITY",
  "INVALID_RELATIVE_PATH",
  "INVALID_MODE",
  "INVALID_DIGEST",
  "INVALID_BASE64",
  "DUPLICATE_VALUE",
  "DUPLICATE_PAYLOAD_PATH",
  "DUPLICATE_PLUGIN_ID",
  "DUPLICATE_OWNERSHIP_CLAIM",
  "OWNERSHIP_CONFLICT",
  "MISSING_OWNER",
  "SKILL_INVENTORY_MISMATCH",
  "SKILL_OWNERSHIP_MISMATCH",
  "FORBIDDEN_UNIT_KIND",
  "COUNT_LIMIT_EXCEEDED",
  "PAYLOAD_BYTES_LIMIT_EXCEEDED",
  "ENVELOPE_TOO_LARGE",
  "INVALID_UTF8",
  "INVALID_JSON",
  "NON_CANONICAL_ENVELOPE",
  "RELEASE_INPUT_DIGEST_MISMATCH",
  "PAYLOAD_DIGEST_MISMATCH",
  "PAYLOAD_MANIFEST_MISMATCH",
  "RELEASE_DIGEST_MISMATCH",
  "RELEASE_SET_DIGEST_MISMATCH",
  "MEMBER_NOT_DECLARED",
  "MISSING_EXPECTED_MEMBER",
  "EXTRA_MEMBER",
  "SOURCE_IDENTITY_MISMATCH",
  "RELEASE_INPUT_IDENTITY_MISMATCH",
  "OWNERSHIP_INDEX_MISMATCH",
] as const;

/** Maximum qualified diagnostic path admitted at the lifecycle boundary. */
export const MAX_RELEASE_ISSUE_PATH_LENGTH = 4_096;

/** Maximum human-readable diagnostic message admitted at the lifecycle boundary. */
export const MAX_RELEASE_ISSUE_MESSAGE_LENGTH = 4_096;

/** Maximum expected-value text retained in a release diagnostic. */
export const MAX_RELEASE_ISSUE_EXPECTED_LENGTH = 4_096;

/** Maximum observed-value text retained in a release diagnostic. */
export const MAX_RELEASE_ISSUE_ACTUAL_LENGTH = 4_096;

/** Maximum ownership namespace text retained in a release diagnostic. */
export const MAX_RELEASE_ISSUE_CLAIM_KIND_LENGTH = 32;

/** Maximum ownership identity text retained in a release diagnostic. */
export const MAX_RELEASE_ISSUE_CLAIM_LENGTH = 512;

/** Maximum contender identity text retained in a release diagnostic. */
export const MAX_RELEASE_ISSUE_CLAIMANT_LENGTH = 512;

/** Maximum contender identities retained in one ownership diagnostic. */
export const MAX_RELEASE_ISSUE_CLAIMANTS = 200_000;

/**
 * Defines the exact machine-readable release diagnostic code vocabulary.
 *
 * The inferred type is the single code authority used by release policy and
 * public result schemas.
 */
export const ReleaseIssueCodeSchema = Type.Enum(RELEASE_ISSUE_CODES, {
  description: "Stable code classifying one release validation diagnostic.",
});

/**
 * Defines the closed, bounded release diagnostic returned by lifecycle operations.
 *
 * TypeBox owns both boundary validation and the inferred TypeScript shape;
 * policy only constructs and orders values that satisfy this schema.
 */
export const ReleaseIssueSchema = ReadonlyObject(
  Type.Object({
    code: ReleaseIssueCodeSchema,
    path: Type.String({
      minLength: 1,
      maxLength: MAX_RELEASE_ISSUE_PATH_LENGTH,
      description: "Qualified field or semantic location where the diagnostic originated.",
    }),
    message: Type.String({
      minLength: 1,
      maxLength: MAX_RELEASE_ISSUE_MESSAGE_LENGTH,
      description: "Bounded human-readable explanation of the diagnostic.",
    }),
    expected: Type.Optional(
      Type.Union([Type.String({ maxLength: MAX_RELEASE_ISSUE_EXPECTED_LENGTH }), Type.Number()], {
        description: "Expected value or numeric bound relevant to the diagnostic.",
      })
    ),
    actual: Type.Optional(
      Type.Union(
        [
          Type.String({ maxLength: MAX_RELEASE_ISSUE_ACTUAL_LENGTH }),
          Type.Number({
            minimum: -Number.MAX_SAFE_INTEGER,
            maximum: Number.MAX_SAFE_INTEGER,
          }),
        ],
        { description: "Observed value retained as safe numeric data or bounded text." }
      )
    ),
    claimKind: Type.Optional(
      Type.String({
        maxLength: MAX_RELEASE_ISSUE_CLAIM_KIND_LENGTH,
        description: "Ownership namespace in which a claim conflict occurred.",
      })
    ),
    claim: Type.Optional(
      Type.String({
        maxLength: MAX_RELEASE_ISSUE_CLAIM_LENGTH,
        description: "Ownership identity involved in the diagnostic.",
      })
    ),
    claimants: Type.Optional(
      ReadonlyObject(
        Type.Array(
          Type.String({
            maxLength: MAX_RELEASE_ISSUE_CLAIMANT_LENGTH,
            description: "Bounded identity of one contender for the claim.",
          })
        ),
        {
          maxItems: MAX_RELEASE_ISSUE_CLAIMANTS,
          description: "Canonical contenders associated with an ownership diagnostic.",
        }
      )
    ),
  }),
  {
    additionalProperties: false,
    description: "Closed diagnostic produced while validating agent-plugin release content.",
  }
);

/** Machine-readable code inferred from the canonical release diagnostic schema. */
export type ReleaseIssueCode = Static<typeof ReleaseIssueCodeSchema>;

/** Closed release diagnostic inferred from the canonical TypeBox schema. */
export type ReleaseIssue = Static<typeof ReleaseIssueSchema>;
