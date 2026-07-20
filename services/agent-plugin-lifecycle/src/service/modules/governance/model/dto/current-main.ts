import { Type, type Static } from "typebox";

export const CURRENT_MAIN_V2_SCHEMA_VERSION = 2 as const;
export const CURRENT_MAIN_V2_CHANNEL = "current-main" as const;
export const CURRENT_MAIN_V2_PROTOCOL = "agent-plugin-current-main@v2" as const;
export const MAX_CURRENT_MAIN_V2_ENVELOPE_BYTES = 2 * 1024 * 1024;

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

const ProjectionDigestSchema = Type.String({ pattern: PROJECTION_DIGEST_PATTERN });
const CapabilityProfileDigestSchema = Type.String({ pattern: CAPABILITY_PROFILE_DIGEST_PATTERN });

export const ClaudeCurrentMainProjectionV2Schema = Type.Object(
  {
    provider: Type.Literal("claude"),
    projectionDigest: ProjectionDigestSchema,
    rendererProtocol: CanonicalIdSchema,
    adapterProtocol: CanonicalIdSchema,
    capabilityProfileDigest: CapabilityProfileDigestSchema,
  },
  { additionalProperties: false },
);

export const CodexCurrentMainProjectionV2Schema = Type.Object(
  {
    provider: Type.Literal("codex"),
    projectionDigest: ProjectionDigestSchema,
    rendererProtocol: CanonicalIdSchema,
    adapterProtocol: CanonicalIdSchema,
    capabilityProfileDigest: CapabilityProfileDigestSchema,
  },
  { additionalProperties: false },
);

export const CurrentMainProjectionTupleV2Schema = Type.Tuple([
  ClaudeCurrentMainProjectionV2Schema,
  CodexCurrentMainProjectionV2Schema,
]);

export const CurrentMainBodyV2Schema = Type.Object(
  {
    schemaVersion: Type.Literal(CURRENT_MAIN_V2_SCHEMA_VERSION),
    channel: Type.Literal(CURRENT_MAIN_V2_CHANNEL),
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
    projections: CurrentMainProjectionTupleV2Schema,
  },
  { additionalProperties: false },
);

export const CurrentMainEnvelopeV2Schema = Type.Object(
  {
    schemaVersion: Type.Literal(CURRENT_MAIN_V2_SCHEMA_VERSION),
    currentMainDigest: Type.String({ pattern: CURRENT_MAIN_DIGEST_PATTERN }),
    body: CurrentMainBodyV2Schema,
  },
  { additionalProperties: false },
);

export type ClaudeCurrentMainProjectionV2 = Readonly<
  Static<typeof ClaudeCurrentMainProjectionV2Schema>
>;
export type CodexCurrentMainProjectionV2 = Readonly<
  Static<typeof CodexCurrentMainProjectionV2Schema>
>;
export type CurrentMainProjectionTupleV2 = readonly [
  ClaudeCurrentMainProjectionV2,
  CodexCurrentMainProjectionV2,
];
export type CurrentMainBodyV2 = Readonly<
  Omit<Static<typeof CurrentMainBodyV2Schema>, "projections"> & {
    readonly projections: CurrentMainProjectionTupleV2;
  }
>;
export type CurrentMainEnvelopeV2 = Readonly<
  Omit<Static<typeof CurrentMainEnvelopeV2Schema>, "body"> & {
    readonly body: CurrentMainBodyV2;
  }
>;

export type CurrentMainV2CodecFailureCode =
  | "InvalidSchema"
  | "EnvelopeTooLarge"
  | "DigestMismatch"
  | "NonCanonical";

export interface CurrentMainV2CodecFailure {
  readonly code: CurrentMainV2CodecFailureCode;
  readonly path: string;
  readonly message: string;
}

export type CurrentMainV2CodecResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; failure: CurrentMainV2CodecFailure }>;

export interface CanonicalCurrentMainV2 {
  readonly protocol: typeof CURRENT_MAIN_V2_PROTOCOL;
  readonly currentMainDigest: `cm2_${string}`;
  readonly byteLength: number;
  readonly bytes: Uint8Array;
  readonly record: CurrentMainEnvelopeV2;
}
