import { Type } from "typebox";

import type { ArtifactRef } from "../../shared/release/index";
import type {
  ExportAgentPluginsRequest,
  ExportAgentPluginsResult,
} from "./internal/contract";

const ReleaseDigestSchema = Type.String({ pattern: "^rd1_[0-9a-f]{64}$" });
const ArtifactDigestSchema = Type.String({ pattern: "^ad1_[0-9a-f]{64}$" });
const ReleaseSetDigestSchema = Type.String({ pattern: "^rs1_[0-9a-f]{64}$" });

const ArtifactRefSchema = Type.Unsafe<ArtifactRef>(Type.Union([
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

export const ExportAgentPluginsRequestSchema = Type.Unsafe<ExportAgentPluginsRequest>(
  Type.Object(
    {
      protocolVersion: Type.Literal(1),
      artifactRef: ArtifactRefSchema,
      mode: Type.Union([Type.Literal("targeted-release"), Type.Literal("complete-set")]),
      layout: Type.Union([Type.Literal("codex-v1"), Type.Literal("claude-v1")]),
      destinations: Type.Array(Type.String({ minLength: 1 }), {
        minItems: 1,
        maxItems: 32,
      }),
      overwritePolicy: Type.Union([
        Type.Literal("managed-only"),
        Type.Literal("replace-planned"),
      ]),
    },
    { additionalProperties: false },
  ),
);

const ExportFailureCodeSchema = Type.Union([
  Type.Literal("InvalidRequest"),
  Type.Literal("ArtifactMissing"),
  Type.Literal("ArtifactMismatch"),
  Type.Literal("ArtifactSnapshotMismatch"),
  Type.Literal("NativeHomesUnavailable"),
  Type.Literal("NativeHomesInvalid"),
  Type.Literal("NativeHomeOverlap"),
  Type.Literal("DestinationUnsafe"),
  Type.Literal("DuplicateDestination"),
  Type.Literal("LedgerInvalid"),
  Type.Literal("LedgerGenerationChanged"),
  Type.Literal("LayoutMismatch"),
  Type.Literal("UnmanagedCollision"),
  Type.Literal("ManagedStateMismatch"),
  Type.Literal("PathUnsafe"),
  Type.Literal("PathChanged"),
  Type.Literal("TemporaryCreateFailed"),
  Type.Literal("TemporaryWriteFailed"),
  Type.Literal("TemporaryVerifyFailed"),
  Type.Literal("TemporaryCleanupBlocked"),
  Type.Literal("TemporaryCleanupFailed"),
  Type.Literal("MutationFailed"),
  Type.Literal("VerificationFailed"),
  Type.Literal("LedgerCommitFailed"),
  Type.Literal("UndoAdmissionFailed"),
  Type.Literal("UndoStageFailed"),
  Type.Literal("UndoSettlementFailed"),
  Type.Literal("InverseActionInvalid"),
  Type.Literal("InverseAuthorityMismatch"),
  Type.Literal("InverseStateMismatch"),
  Type.Literal("FailpointFailed"),
]);

const ExportFailureSchema = Type.Object(
  {
    code: ExportFailureCodeSchema,
    phase: Type.String(),
    message: Type.String(),
    path: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

const ExportFailureSetSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal("PrimaryOnly"),
      primary: ExportFailureSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("PrimaryAndCleanup"),
      primary: ExportFailureSchema,
      cleanup: ExportFailureSchema,
    },
    { additionalProperties: false },
  ),
]);

const ExportAppliedEventSchema = Type.Object(
  {
    mutation: Type.Union([
      Type.Literal("CreateDirectory"),
      Type.Literal("WritePayload"),
      Type.Literal("RetirePayload"),
      Type.Literal("RetireDirectory"),
      Type.Literal("WriteLedger"),
    ]),
    pluginId: Type.String(),
    relativePath: Type.String(),
    actionDigest: Type.String({ pattern: "^eia1_[0-9a-f]{64}$" }),
  },
  { additionalProperties: false },
);

const DestinationIdentitySchemas = {
  destination: Type.String(),
  layout: Type.Union([Type.Literal("codex-v1"), Type.Literal("claude-v1")]),
} as const;

const ReadOnlyConvergedDestinationSchema = Type.Object(
  {
    ...DestinationIdentitySchemas,
    kind: Type.Literal("ReadOnlyConverged"),
    ledgerGeneration: Type.Number(),
  },
  { additionalProperties: false },
);

const RejectedBeforeMutationDestinationSchema = Type.Object(
  {
    ...DestinationIdentitySchemas,
    kind: Type.Literal("RejectedBeforeMutation"),
    failures: ExportFailureSetSchema,
  },
  { additionalProperties: false },
);

const MutatedSettledDestinationSchema = Type.Object(
  {
    ...DestinationIdentitySchemas,
    kind: Type.Literal("MutatedSettled"),
    ledgerGeneration: Type.Number(),
    applied: Type.Array(ExportAppliedEventSchema),
    verifiedPaths: Type.Array(Type.String()),
    retiredPaths: Type.Array(Type.String()),
    preservedPaths: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

const MutatedUnsettledDestinationSchema = Type.Object(
  {
    ...DestinationIdentitySchemas,
    kind: Type.Literal("MutatedUnsettled"),
    applied: Type.Array(ExportAppliedEventSchema),
    failures: ExportFailureSetSchema,
    pendingCapsuleGeneration: Type.String(),
    recoveryRequired: Type.Literal(true),
  },
  { additionalProperties: false },
);

const ExportDestinationResultSchema = Type.Union([
  ReadOnlyConvergedDestinationSchema,
  RejectedBeforeMutationDestinationSchema,
  MutatedSettledDestinationSchema,
  MutatedUnsettledDestinationSchema,
]);

const ExportReleaseResultSchema = Type.Union([
  Type.Object({ kind: Type.Literal("Released") }, { additionalProperties: false }),
  Type.Object(
    { kind: Type.Literal("ReleaseFailed"), failure: ExportFailureSchema },
    { additionalProperties: false },
  ),
]);

const ExportSynchronizationResultSchema = Type.Union([
  ExportReleaseResultSchema,
  Type.Object({ kind: Type.Literal("NotAcquired") }, { additionalProperties: false }),
]);

export const ExportAgentPluginsResultSchema = Type.Unsafe<ExportAgentPluginsResult>(
  Type.Union([
    Type.Object(
      {
        protocolVersion: Type.Literal(1),
        kind: Type.Literal("ReadOnlyConverged"),
        destinations: Type.Array(ReadOnlyConvergedDestinationSchema),
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        protocolVersion: Type.Literal(1),
        kind: Type.Literal("RejectedBeforeMutation"),
        failure: ExportFailureSchema,
        destinations: Type.Array(ExportDestinationResultSchema),
        synchronization: ExportSynchronizationResultSchema,
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        protocolVersion: Type.Literal(1),
        kind: Type.Literal("MutatedSettled"),
        destinations: Type.Array(Type.Union([
          ReadOnlyConvergedDestinationSchema,
          RejectedBeforeMutationDestinationSchema,
          MutatedSettledDestinationSchema,
        ])),
        synchronization: ExportReleaseResultSchema,
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        protocolVersion: Type.Literal(1),
        kind: Type.Literal("MutatedUnsettled"),
        pendingCapsuleGeneration: Type.String(),
        destinations: Type.Array(ExportDestinationResultSchema),
        synchronization: ExportReleaseResultSchema,
      },
      { additionalProperties: false },
    ),
  ]),
);
