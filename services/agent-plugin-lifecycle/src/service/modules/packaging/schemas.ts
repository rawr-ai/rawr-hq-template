import { Type } from "typebox";

import type { ArtifactRef } from "../../shared/release/index";
import type {
  PackageAgentPluginRequest,
  PackageAgentPluginResult,
} from "./model/dto/packaging-lifecycle";

const ReleaseDigestSchema = Type.String({ pattern: "^rd1_[0-9a-f]{64}$" });
const ArtifactDigestSchema = Type.String({ pattern: "^ad1_[0-9a-f]{64}$" });
const ReleaseSetDigestSchema = Type.String({ pattern: "^rs1_[0-9a-f]{64}$" });
const PackageDigestSchema = Type.String({ pattern: "^pkg1_[0-9a-f]{64}$" });

const PackagingFailureCodeSchema = Type.Union([
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

const PackagingFailureSchema = Type.Object(
  {
    code: PackagingFailureCodeSchema,
    phase: Type.String(),
    message: Type.String(),
  },
  { additionalProperties: false },
);

export const ArtifactRefSchema = Type.Unsafe<ArtifactRef>(Type.Union([
  Type.Object(
    {
      kind: Type.Literal("release"),
      releaseDigest: ReleaseDigestSchema,
      artifactDigest: ArtifactDigestSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("complete-set"),
      releaseSetDigest: ReleaseSetDigestSchema,
    },
    { additionalProperties: false },
  ),
]));

export const PackageAgentPluginRequestSchema = Type.Unsafe<PackageAgentPluginRequest>(
  Type.Object(
    {
      artifactRef: ArtifactRefSchema,
      format: Type.Literal("cowork-v1"),
      outputPath: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
);

export const PackageAgentPluginResultSchema = Type.Unsafe<PackageAgentPluginResult>(
  Type.Union([
    Type.Object(
      {
        kind: Type.Literal("RejectedBeforeOutputMutation"),
        primaryFailure: PackagingFailureSchema,
        cleanupFailure: Type.Optional(PackagingFailureSchema),
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        kind: Type.Literal("ReadOnlyConverged"),
        artifactRef: ArtifactRefSchema,
        format: Type.Literal("cowork-v1"),
        outputPath: Type.String({ minLength: 1 }),
        packageDigest: PackageDigestSchema,
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        kind: Type.Literal("OutputReplacedVerified"),
        artifactRef: ArtifactRefSchema,
        format: Type.Literal("cowork-v1"),
        outputPath: Type.String({ minLength: 1 }),
        packageDigest: PackageDigestSchema,
        priorOutput: Type.Union([Type.Literal("Absent"), Type.Literal("Replaced")]),
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        kind: Type.Literal("OutputUnsettled"),
        artifactRef: ArtifactRefSchema,
        format: Type.Literal("cowork-v1"),
        outputPath: Type.String({ minLength: 1 }),
        packageDigest: PackageDigestSchema,
        primaryFailure: PackagingFailureSchema,
        cleanupFailure: Type.Optional(PackagingFailureSchema),
      },
      { additionalProperties: false },
    ),
  ]),
);
