import { ReadonlyObject, Type, type Static } from "typebox";

import { ArtifactRefInputSchema } from "../../../../shared/release/index";

export const COWORK_PACKAGE_FORMAT = "cowork-v1" as const;

export const PackageDigestSchema = Type.TemplateLiteral("pkg1_${string}", {
  pattern: "^pkg1_[0-9a-f]{64}$",
});

export const PackagingFailureCodeSchema = Type.Union([
  Type.Literal("InvalidRequest"),
  Type.Literal("ArtifactMissing"),
  Type.Literal("ArtifactMismatch"),
  Type.Literal("ArtifactSnapshotMismatch"),
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

export const PackagingFailureSchema = ReadonlyObject(Type.Object(
  {
    code: PackagingFailureCodeSchema,
    phase: Type.String(),
    message: Type.String(),
  },
), { additionalProperties: false });

export const PackageAgentPluginRequestSchema = ReadonlyObject(Type.Object(
  {
    artifactRef: ArtifactRefInputSchema,
    format: Type.Literal(COWORK_PACKAGE_FORMAT),
    outputPath: Type.String({ minLength: 1 }),
  },
), { additionalProperties: false });

const packageResultIdentityProperties = {
  artifactRef: ArtifactRefInputSchema,
  format: Type.Literal(COWORK_PACKAGE_FORMAT),
  outputPath: Type.String({ minLength: 1 }),
  packageDigest: PackageDigestSchema,
} as const;

export const PackageAgentPluginResultSchema = Type.Union([
  ReadonlyObject(Type.Object(
    {
      kind: Type.Literal("RejectedBeforeOutputMutation"),
      primaryFailure: PackagingFailureSchema,
      cleanupFailure: Type.Optional(PackagingFailureSchema),
    },
  ), { additionalProperties: false }),
  ReadonlyObject(Type.Object(
    {
      kind: Type.Literal("ReadOnlyConverged"),
      ...packageResultIdentityProperties,
    },
  ), { additionalProperties: false }),
  ReadonlyObject(Type.Object(
    {
      kind: Type.Literal("OutputReplacedVerified"),
      ...packageResultIdentityProperties,
      priorOutput: Type.Union([Type.Literal("Absent"), Type.Literal("Replaced")]),
    },
  ), { additionalProperties: false }),
  ReadonlyObject(Type.Object(
    {
      kind: Type.Literal("OutputUnsettled"),
      ...packageResultIdentityProperties,
      primaryFailure: PackagingFailureSchema,
      cleanupFailure: Type.Optional(PackagingFailureSchema),
    },
  ), { additionalProperties: false }),
]);

export type PackageDigest = Static<typeof PackageDigestSchema>;
export type PackagingFailureCode = Static<typeof PackagingFailureCodeSchema>;
export type PackagingFailure = Static<typeof PackagingFailureSchema>;
export type PackageAgentPluginRequest = Static<typeof PackageAgentPluginRequestSchema>;
export type PackageAgentPluginResult = Static<typeof PackageAgentPluginResultSchema>;
