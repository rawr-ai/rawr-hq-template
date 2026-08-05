import { ReadonlyObject, type Static, Type } from "typebox";
import { ContentWorkspacePolicySchema } from "../../../../model/dto/content-workspace";
import { ReleaseSelectionSchema } from "../../../../model/dto/release-derivation";
import { ReleaseDigestSchema, ReleaseSetDigestSchema } from "../../../../model/dto/release-digest";
import {
  GitCommitIdSchema,
  GitTreeIdSchema,
  PluginIdSchema,
  RepositoryIdentitySchema,
} from "../../../../model/dto/release-identity";

/** Identifies the only package format accepted and emitted by this module. */
export const COWORK_PACKAGE_FORMAT = "cowork-v1" as const;
/** Bounds the caller-selected destination path carried through package results. */
export const MAX_PACKAGING_OUTPUT_PATH_LENGTH = 4_096;
/** Bounds resource phase labels before they cross the Packaging result boundary. */
export const MAX_PACKAGING_FAILURE_PHASE_LENGTH = 256;
/** Bounds external diagnostics before they cross the Packaging result boundary. */
export const MAX_PACKAGING_FAILURE_MESSAGE_LENGTH = 4_096;

/** Validates the content-derived identity of rendered Cowork package bytes. */
export const PackageDigestSchema = Type.TemplateLiteral("pkg1_${string}", {
  pattern: "^pkg1_[0-9a-f]{64}$",
});

/** Enumerates Packaging-owned failure classifications without leaking resource error tags. */
export const PackagingFailureCodeSchema = Type.Union([
  Type.Literal("InvalidRequest"),
  Type.Literal("SourceIneligible"),
  Type.Literal("ReleaseConstructionFailed"),
  Type.Literal("PackageRenderFailed"),
  Type.Literal("OutputParentUnsafe"),
  Type.Literal("OutputUnsafe"),
  Type.Literal("OutputChanged"),
  Type.Literal("TemporaryCreateFailed"),
  Type.Literal("TemporaryWriteFailed"),
  Type.Literal("TemporaryVerifyFailed"),
  Type.Literal("TemporaryCleanupBlocked"),
  Type.Literal("TemporaryCleanupFailed"),
  Type.Literal("OutputCommitFailed"),
  Type.Literal("OutputVerifyFailed"),
  Type.Literal("FailpointFailed"),
]);

/** Defines one bounded failure returned by a Packaging settlement outcome. */
export const PackagingFailureSchema = ReadonlyObject(
  Type.Object({
    code: PackagingFailureCodeSchema,
    phase: Type.String({ maxLength: MAX_PACKAGING_FAILURE_PHASE_LENGTH }),
    message: Type.String({ maxLength: MAX_PACKAGING_FAILURE_MESSAGE_LENGTH }),
  }),
  { additionalProperties: false }
);

/** Describes the projectable structure of an absolute package destination. */
export const PackageOutputPathSchema = Type.String({
  minLength: 2,
  maxLength: MAX_PACKAGING_OUTPUT_PATH_LENGTH,
  pattern:
    "^/(?!.*//)(?!.*(?:/\\.{1,2})(?:/|$))(?!.*\\\\)(?!.*[\\u0000-\\u001f\\u007f])[^/]+(?:/[^/]+)*$",
});

/** Defines the complete caller input for deterministic package construction and publication. */
export const PackageAgentPluginRequestSchema = ReadonlyObject(
  Type.Object({
    contentWorkspace: ContentWorkspacePolicySchema,
    mode: ReleaseSelectionSchema,
    format: Type.Literal(COWORK_PACKAGE_FORMAT),
    outputPath: PackageOutputPathSchema,
  }),
  { additionalProperties: false }
);

/** Identifies whether a package contains one release or a complete release set. */
export const PackagedReleaseIdentitySchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("release"),
      pluginId: PluginIdSchema,
      releaseDigest: ReleaseDigestSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("complete-set"),
      releaseSetDigest: ReleaseSetDigestSchema,
    }),
    { additionalProperties: false }
  ),
]);

const packageResultIdentityProperties = {
  repositoryIdentity: RepositoryIdentitySchema,
  sourceCommit: GitCommitIdSchema,
  sourceTree: GitTreeIdSchema,
  release: PackagedReleaseIdentitySchema,
  format: Type.Literal(COWORK_PACKAGE_FORMAT),
  outputPath: PackageOutputPathSchema,
  packageDigest: PackageDigestSchema,
} as const;

/** Defines the four closed outcomes observable after a package operation. */
export const PackageAgentPluginResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("RejectedBeforeOutputMutation"),
      primaryFailure: PackagingFailureSchema,
      cleanupFailure: Type.Optional(PackagingFailureSchema),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("ReadOnlyConverged"),
      ...packageResultIdentityProperties,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("OutputReplacedVerified"),
      ...packageResultIdentityProperties,
      priorOutput: Type.Union([Type.Literal("Absent"), Type.Literal("Replaced")]),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("OutputUnsettled"),
      ...packageResultIdentityProperties,
      primaryFailure: PackagingFailureSchema,
      cleanupFailure: Type.Optional(PackagingFailureSchema),
    }),
    { additionalProperties: false }
  ),
]);

/** Content-derived identity of the rendered package bytes. */
export type PackageDigest = Static<typeof PackageDigestSchema>;
/** Packaging-owned classification for a public operation failure. */
export type PackagingFailureCode = Static<typeof PackagingFailureCodeSchema>;
/** Bounded public failure returned inside a package settlement outcome. */
export type PackagingFailure = Static<typeof PackagingFailureSchema>;
/** Release or complete-set identity carried by a rendered package. */
export type PackagedReleaseIdentity = Static<typeof PackagedReleaseIdentitySchema>;
/** TypeBox-derived request accepted by the package operation. */
export type PackageAgentPluginRequest = Static<typeof PackageAgentPluginRequestSchema>;
/** TypeBox-derived closed result returned by the package operation. */
export type PackageAgentPluginResult = Static<typeof PackageAgentPluginResultSchema>;
