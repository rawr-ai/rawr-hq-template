import { ReadonlyObject, Type, type Static } from "typebox";

const CANONICAL_ID_PATTERN = "^[a-z0-9][a-z0-9._:@/+\\-]*$";
const CONTENT_AUTHORITY_PATTERN = "^[a-z0-9][a-z0-9._:-]*$";
const REPOSITORY_IDENTITY_PATTERN = "^[a-z][a-z0-9+.-]*:[a-z0-9][a-z0-9._~/-]*$";
const GIT_OBJECT_ID_PATTERN = "^(?:[0-9a-f]{40}|[0-9a-f]{64})$";
const RELEASE_INPUT_DIGEST_PATTERN = "^ri1_[0-9a-f]{64}$";
const RELEASE_SET_DIGEST_PATTERN = "^rs1_[0-9a-f]{64}$";
const PROJECTION_DIGEST_PATTERN = "^ap1_[0-9a-f]{64}$";
const CAPABILITY_PROFILE_DIGEST_PATTERN = "^cp1_[0-9a-f]{64}$";
const CURRENT_MAIN_DIGEST_PATTERN = "^cm2_[0-9a-f]{64}$";

const CanonicalIdSchema = Type.String({
  minLength: 1,
  maxLength: 512,
  pattern: CANONICAL_ID_PATTERN,
});
const CurrentMainDigestSchema = Type.TemplateLiteral("cm2_${string}", {
  pattern: CURRENT_MAIN_DIGEST_PATTERN,
});

export const CurrentMainSelectionLocatorSchema = ReadonlyObject(Type.Object(
  {
    workspacePath: Type.String({ minLength: 1 }),
    expectedRepositoryIdentity: Type.String({ minLength: 1, maxLength: 512 }),
  },
), { additionalProperties: false });

export const ClaudeCanonicalChannelProjectionSchema = ReadonlyObject(Type.Object(
  {
    provider: Type.Literal("claude"),
    projectionDigest: Type.String({ pattern: PROJECTION_DIGEST_PATTERN }),
    rendererProtocol: CanonicalIdSchema,
    adapterProtocol: CanonicalIdSchema,
    capabilityProfileDigest: Type.String({ pattern: CAPABILITY_PROFILE_DIGEST_PATTERN }),
  },
), { additionalProperties: false });

export const CodexCanonicalChannelProjectionSchema = ReadonlyObject(Type.Object(
  {
    provider: Type.Literal("codex"),
    projectionDigest: Type.String({ pattern: PROJECTION_DIGEST_PATTERN }),
    rendererProtocol: CanonicalIdSchema,
    adapterProtocol: CanonicalIdSchema,
    capabilityProfileDigest: Type.String({ pattern: CAPABILITY_PROFILE_DIGEST_PATTERN }),
  },
), { additionalProperties: false });

export const CanonicalChannelProjectionTupleSchema = ReadonlyObject(Type.Tuple([
  ClaudeCanonicalChannelProjectionSchema,
  CodexCanonicalChannelProjectionSchema,
]));

export const CanonicalChannelSelectionSchema = ReadonlyObject(Type.Object(
  {
    currentMainDigest: CurrentMainDigestSchema,
    contentAuthority: Type.String({
      minLength: 1,
      maxLength: 512,
      pattern: CONTENT_AUTHORITY_PATTERN,
    }),
    sourceRepositoryIdentity: Type.String({
      minLength: 1,
      maxLength: 512,
      pattern: REPOSITORY_IDENTITY_PATTERN,
    }),
    sourceCommit: Type.String({ pattern: GIT_OBJECT_ID_PATTERN }),
    sourceTree: Type.String({ pattern: GIT_OBJECT_ID_PATTERN }),
    releaseInputDigest: Type.String({ pattern: RELEASE_INPUT_DIGEST_PATTERN }),
    releaseSetDigest: Type.String({ pattern: RELEASE_SET_DIGEST_PATTERN }),
    evaluationProfile: CanonicalIdSchema,
    projections: CanonicalChannelProjectionTupleSchema,
  },
), { additionalProperties: false });

const selectionFailure = <const TKind extends string>(kind: TKind) => ReadonlyObject(Type.Object(
  { kind: Type.Literal(kind), reason: Type.String({ minLength: 1 }) },
), { additionalProperties: false });

export const CurrentMainSelectionResultSchema = Type.Union([
  ReadonlyObject(Type.Object(
    {
      kind: Type.Literal("CURRENT_ELIGIBLE"),
      selection: CanonicalChannelSelectionSchema,
    },
  ), { additionalProperties: false }),
  selectionFailure("DIRTY_REPOSITORY"),
  selectionFailure("WRONG_REPOSITORY"),
  selectionFailure("UNREACHABLE_REPOSITORY"),
  selectionFailure("STALE_RECORD"),
  selectionFailure("FORGED_RECORD"),
]);

/** The explicit content workspace and repository identity inspected for current-main. */
export type CurrentMainSelectionLocator = Static<typeof CurrentMainSelectionLocatorSchema>;

/** Governance-owned observation consumed by provider convergence. */
export type CanonicalChannelSelection = Static<typeof CanonicalChannelSelectionSchema>;

export type CurrentMainSelectionResult = Static<typeof CurrentMainSelectionResultSchema>;

export type CurrentMainSelectionFailureKind = Exclude<
  CurrentMainSelectionResult["kind"],
  "CURRENT_ELIGIBLE"
>;
