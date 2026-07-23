import { ReadonlyObject, Refine, type Static, Type } from "typebox";

import {
  ContentWorkspacePolicySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  PluginIdSchema,
  RepositoryIdentitySchema,
} from "../../../../model/dto/releases/content-workspace";
import { isCanonicalAbsolutePath } from "../../../../model/dto/structural";
import { BuildModeSchema } from "../../../releases/model/dto/release-lifecycle";

const ReleaseDigestSchema = Type.String({ pattern: "^rd1_[0-9a-f]{64}$" });
const ReleaseSetDigestSchema = Type.String({ pattern: "^rs1_[0-9a-f]{64}$" });

export const COWORK_PACKAGE_FORMAT = "cowork-v1" as const;
export const MAX_PACKAGING_OUTPUT_PATH_LENGTH = 4_096;
export const MAX_PACKAGING_FAILURE_PHASE_LENGTH = 256;
export const MAX_PACKAGING_FAILURE_MESSAGE_LENGTH = 4_096;

export const PackageDigestSchema = Type.TemplateLiteral("pkg1_${string}", {
  pattern: "^pkg1_[0-9a-f]{64}$",
});

export const PackagingFailureCodeSchema = Type.Union([
  Type.Literal("InvalidRequest"),
  Type.Literal("SourceIneligible"),
  Type.Literal("SourceReadFailed"),
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

export const PackagingFailureSchema = ReadonlyObject(
  Type.Object({
    code: PackagingFailureCodeSchema,
    phase: Type.String({ maxLength: MAX_PACKAGING_FAILURE_PHASE_LENGTH }),
    message: Type.String({ maxLength: MAX_PACKAGING_FAILURE_MESSAGE_LENGTH }),
  }),
  { additionalProperties: false }
);

export const PackageOutputPathSchema = Refine(
  Type.String({
    minLength: 2,
    maxLength: MAX_PACKAGING_OUTPUT_PATH_LENGTH,
    pattern:
      "^/(?!.*//)(?!.*(?:/\\.{1,2})(?:/|$))(?!.*\\\\)(?!.*[\\u0000-\\u001f\\u007f])[^/]+(?:/[^/]+)*$",
  }),
  (value) => isCanonicalAbsolutePath(value, MAX_PACKAGING_OUTPUT_PATH_LENGTH),
  () => "Expected a canonical non-root absolute package output path"
);

export const PackageAgentPluginRequestSchema = ReadonlyObject(
  Type.Object({
    contentWorkspace: ContentWorkspacePolicySchema,
    mode: BuildModeSchema,
    format: Type.Literal(COWORK_PACKAGE_FORMAT),
    outputPath: PackageOutputPathSchema,
  }),
  { additionalProperties: false }
);

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

export type PackageDigest = Static<typeof PackageDigestSchema>;
export type PackagingFailureCode = Static<typeof PackagingFailureCodeSchema>;
export type PackagingFailure = Static<typeof PackagingFailureSchema>;
export type PackagedReleaseIdentity = Static<typeof PackagedReleaseIdentitySchema>;
export type PackageAgentPluginRequest = Static<typeof PackageAgentPluginRequestSchema>;
export type PackageAgentPluginResult = Static<typeof PackageAgentPluginResultSchema>;
