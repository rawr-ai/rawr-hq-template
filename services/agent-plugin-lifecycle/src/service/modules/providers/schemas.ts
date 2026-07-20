import { Refine, type TSchema, Type } from "typebox";

import type { CompleteNativeHomesObservation } from "./model/dto/native-homes";
import type {
  CanonicalStatusOutcome,
  CanonicalSyncOutcome,
  ProviderOperationOutcome,
} from "./model/dto/outcome";
import type { DeploymentResult } from "./model/errors/deployment-result";

const ProviderIdSchema = Type.Union([Type.Literal("claude"), Type.Literal("codex")]);
const NonEmptyStringSchema = Type.String({ minLength: 1 });
const GitObjectIdSchema = Type.String({ pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$" });
const ReleaseDigestSchema = Type.String({ pattern: "^rd1_[0-9a-f]{64}$" });
const ArtifactDigestSchema = Type.String({ pattern: "^ad1_[0-9a-f]{64}$" });
const ReleaseSetDigestSchema = Type.String({ pattern: "^rs1_[0-9a-f]{64}$" });
const ContentDigestSchema = Type.String({ pattern: "^sha256_[0-9a-f]{64}$" });
const ProjectionDigestSchema = Type.String({ pattern: "^ap1_[0-9a-f]{64}$" });
const CapabilityProfileDigestSchema = Type.String({ pattern: "^cp1_[0-9a-f]{64}$" });
const ProviderTargetDigestSchema = Type.String({ pattern: "^pt1_[0-9a-f]{64}$" });
const TargetIdentityDigestSchema = Type.String({ pattern: "^ti1_[0-9a-f]{64}$" });
const ProviderMemberFingerprintSchema = Type.String({ pattern: "^pm1_[0-9a-f]{64}$" });
const ProviderSourceDigestSchema = Type.String({ pattern: "^ps1_[0-9a-f]{64}$" });
const MarketplaceProjectionDigestSchema = Type.String({ pattern: "^mp1_[0-9a-f]{64}$" });
const ProviderRequestDigestSchema = Type.String({ pattern: "^prq1_[0-9a-f]{64}$" });
const TargetReceiptDigestSchema = Type.String({ pattern: "^tr1_[0-9a-f]{64}$" });
const VisibleFingerprintSchema = Type.String({ pattern: "^vf1_[0-9a-f]{64}$" });
const MechanicalEvidenceDigestSchema = Type.String({ pattern: "^me1_[0-9a-f]{64}$" });
const CompleteNativeHomesDigestSchema = Type.String({ pattern: "^nh1_[0-9a-f]{64}$" });

const ProviderTargetInputSchema = Type.Object(
  {
    provider: ProviderIdSchema,
    home: NonEmptyStringSchema,
  },
  { additionalProperties: false },
);

const ReleaseArtifactRefSchema = Type.Object(
  {
    kind: Type.Literal("release"),
    releaseDigest: ReleaseDigestSchema,
    artifactDigest: ArtifactDigestSchema,
  },
  { additionalProperties: false },
);

const CompleteSetArtifactRefSchema = Type.Object(
  {
    kind: Type.Literal("complete-set"),
    releaseSetDigest: ReleaseSetDigestSchema,
  },
  { additionalProperties: false },
);

const ContentRecordLocatorInputSchema = Type.Object(
  {
    repositoryIdentity: NonEmptyStringSchema,
    workspaceRoot: NonEmptyStringSchema,
  },
  { additionalProperties: false },
);

const ProviderTargetsInputSchema = Type.Array(ProviderTargetInputSchema, {
  minItems: 1,
  maxItems: 64,
});

export const TargetedTestInputSchema = Type.Object(
  {
    kind: Type.Literal("targeted-test"),
    releases: Type.Array(ReleaseArtifactRefSchema, { minItems: 1, maxItems: 1_024 }),
    evaluationProfile: NonEmptyStringSchema,
    targets: ProviderTargetsInputSchema,
  },
  { additionalProperties: false },
);

export const CompleteTestInputSchema = Type.Object(
  {
    kind: Type.Literal("complete-test"),
    releaseSet: CompleteSetArtifactRefSchema,
    evaluationProfile: NonEmptyStringSchema,
    targets: ProviderTargetsInputSchema,
  },
  { additionalProperties: false },
);

export const CanonicalSyncInputSchema = Type.Object(
  {
    kind: Type.Literal("canonical-sync"),
    channel: Type.Literal("current-main"),
    locator: ContentRecordLocatorInputSchema,
    targets: ProviderTargetsInputSchema,
  },
  { additionalProperties: false },
);

export const CanonicalStatusInputSchema = Type.Object(
  {
    kind: Type.Literal("canonical-status"),
    channel: Type.Literal("current-main"),
    locator: ContentRecordLocatorInputSchema,
    targets: ProviderTargetsInputSchema,
  },
  { additionalProperties: false },
);

export const EmptyInputSchema = Type.Object({}, { additionalProperties: false });

export const ProviderDeploymentIssueCodeSchema = Type.Union([
  Type.Literal("ADAPTER_PROTOCOL_MISMATCH"),
  Type.Literal("ARTIFACT_KIND_MISMATCH"),
  Type.Literal("ARTIFACT_READ_FAILED"),
  Type.Literal("BLOCKED_COLLISION"),
  Type.Literal("CAPABILITY_MISMATCH"),
  Type.Literal("CHANNEL_NOT_ELIGIBLE"),
  Type.Literal("DUPLICATE_MEMBER"),
  Type.Literal("DUPLICATE_TARGET"),
  Type.Literal("EVIDENCE_FAILED"),
  Type.Literal("EXPECTED_ARRAY"),
  Type.Literal("EXPECTED_INTEGER"),
  Type.Literal("EXPECTED_OBJECT"),
  Type.Literal("EXPECTED_STRING"),
  Type.Literal("INVALID_ARTIFACT_REF"),
  Type.Literal("INVALID_DIGEST"),
  Type.Literal("INVALID_EVALUATION_PROFILE"),
  Type.Literal("INVALID_HOME"),
  Type.Literal("INVALID_LOCATOR"),
  Type.Literal("INVALID_MODE"),
  Type.Literal("INVALID_PLUGIN_ID"),
  Type.Literal("INVALID_PROTOCOL"),
  Type.Literal("INVALID_RECEIPT"),
  Type.Literal("INVALID_TARGET"),
  Type.Literal("MISSING_FIELD"),
  Type.Literal("MUTATION_FAILED"),
  Type.Literal("PROJECTION_MISMATCH"),
  Type.Literal("RECEIPT_FAILED"),
  Type.Literal("RECEIPT_TARGET_MISMATCH"),
  Type.Literal("UNKNOWN_FIELD"),
  Type.Literal("UNSUPPORTED_PROVIDER"),
  Type.Literal("VISIBILITY_FAILED"),
]);

const ProviderIssueSchema = Type.Object(
  {
    code: ProviderDeploymentIssueCodeSchema,
    path: Type.String(),
    message: Type.String(),
    expected: Type.String(),
    actual: Type.String(),
  },
  { additionalProperties: false },
);

const ProviderTargetSchema = Type.Object(
  {
    provider: ProviderIdSchema,
    home: Type.String(),
    targetDigest: ProviderTargetDigestSchema,
  },
  { additionalProperties: false },
);

const ProviderArtifactAuthoritySchema = Type.Object(
  {
    protocol: Type.Literal("agent-plugin-artifact-authority@v1"),
    contentAuthority: NonEmptyStringSchema,
    sourceCommit: GitObjectIdSchema,
  },
  { additionalProperties: false },
);

const ProviderCapabilitySchema = Type.Union([
  Type.Literal("native-plugin-enable"),
  Type.Literal("native-plugin-install"),
  Type.Literal("native-plugin-retire"),
  Type.Literal("visible-hook-inventory"),
  Type.Literal("visible-plugin-inventory"),
  Type.Literal("visible-skill-inventory"),
]);

const CapabilityProfileSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    provider: ProviderIdSchema,
    adapterProtocol: NonEmptyStringSchema,
    required: Type.Array(ProviderCapabilitySchema),
    capabilityProfileDigest: CapabilityProfileDigestSchema,
  },
  { additionalProperties: false },
);

const Uint8ArraySchema = Refine(
  Type.Unsafe<Uint8Array>(Type.Unknown()),
  (value) => value instanceof Uint8Array,
  () => "Expected Uint8Array",
);

const ProviderPackageFileSchema = Type.Object(
  {
    path: NonEmptyStringSchema,
    mode: Type.Union([Type.Literal(0o644), Type.Literal(0o755)]),
    contentDigest: ContentDigestSchema,
    bytes: Uint8ArraySchema,
  },
  { additionalProperties: false },
);

const ProviderVisibleClaimSetSchema = Type.Object(
  {
    pluginIdentity: Type.String(),
    skills: Type.Array(Type.String()),
    hooks: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

const ProviderProjectionMemberSchema = Type.Object(
  {
    pluginId: NonEmptyStringSchema,
    releaseRef: ReleaseArtifactRefSchema,
    artifactAuthority: ProviderArtifactAuthoritySchema,
    providerSourceIdentity: NonEmptyStringSchema,
    nativeIdentity: Type.String(),
    files: Type.Array(ProviderPackageFileSchema),
    visible: ProviderVisibleClaimSetSchema,
    memberFingerprint: ProviderMemberFingerprintSchema,
  },
  { additionalProperties: false },
);

const ProviderMarketplaceProjectionSchema = Type.Object(
  {
    identity: NonEmptyStringSchema,
    sourceDigest: ProviderSourceDigestSchema,
    files: Type.Array(ProviderPackageFileSchema),
  },
  { additionalProperties: false },
);

const ProjectionSourceSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal("targeted"),
      releases: Type.Array(ReleaseArtifactRefSchema),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("complete-set"),
      releaseSet: CompleteSetArtifactRefSchema,
    },
    { additionalProperties: false },
  ),
]);

const AgentProviderProjectionSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    provider: ProviderIdSchema,
    rendererProtocol: NonEmptyStringSchema,
    adapterProtocol: NonEmptyStringSchema,
    artifactAuthority: ProviderArtifactAuthoritySchema,
    source: ProjectionSourceSchema,
    marketplace: ProviderMarketplaceProjectionSchema,
    capabilityProfile: CapabilityProfileSchema,
    members: Type.Array(ProviderProjectionMemberSchema),
    projectionDigest: ProjectionDigestSchema,
  },
  { additionalProperties: false },
);

const ProviderMarketplaceMemberSourceSchema = Type.Object(
  {
    pluginId: NonEmptyStringSchema,
    nativeIdentity: Type.String(),
    providerSourceIdentity: NonEmptyStringSchema,
    sourceProjectionDigest: ProjectionDigestSchema,
    memberFingerprint: ProviderMemberFingerprintSchema,
  },
  { additionalProperties: false },
);

const ProviderMarketplaceStateFields = {
  provider: ProviderIdSchema,
  adapterProtocol: NonEmptyStringSchema,
  marketplaceIdentity: NonEmptyStringSchema,
  projectionDigest: MarketplaceProjectionDigestSchema,
  sourceDigest: ProviderSourceDigestSchema,
} as const;

const ProviderMarketplaceStateSchema = Type.Object(
  ProviderMarketplaceStateFields,
  { additionalProperties: false },
);

const ProviderMarketplaceRegistrationSchema = Type.Object(
  {
    ...ProviderMarketplaceStateFields,
    members: Type.Array(ProviderMarketplaceMemberSourceSchema),
  },
  { additionalProperties: false },
);

const ProviderMarketplaceObservationSchema = Type.Union([
  Type.Object({ kind: Type.Literal("absent") }, { additionalProperties: false }),
  Type.Object(
    { kind: Type.Literal("present"), state: ProviderMarketplaceStateSchema },
    { additionalProperties: false },
  ),
]);

const VerifiedMemberIdentityFields = {
  pluginId: NonEmptyStringSchema,
  nativeIdentity: Type.String(),
  artifactAuthority: ProviderArtifactAuthoritySchema,
  providerSourceIdentity: NonEmptyStringSchema,
  memberFingerprint: ProviderMemberFingerprintSchema,
} as const;

const VerifiedMemberIdentitySchema = Type.Object(
  VerifiedMemberIdentityFields,
  { additionalProperties: false },
);

const ManagedMemberClaimSchema = Type.Object(
  {
    ...VerifiedMemberIdentityFields,
    sourceProjectionDigest: ProjectionDigestSchema,
  },
  { additionalProperties: false },
);

const NativeMemberObservationSchema = Type.Object(
  {
    ...VerifiedMemberIdentityFields,
    enablement: Type.Union([Type.Literal("disabled"), Type.Literal("enabled")]),
    visibleSkills: Type.Array(Type.String()),
    visibleHooks: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

const TargetIdentitySidecarSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    provider: ProviderIdSchema,
    canonicalHome: Type.String(),
    targetDigest: ProviderTargetDigestSchema,
    identityDigest: TargetIdentityDigestSchema,
  },
  { additionalProperties: false },
);

const TargetIdentityObservationSchema = Type.Union([
  Type.Object({ kind: Type.Literal("absent") }, { additionalProperties: false }),
  Type.Object(
    { kind: Type.Literal("present"), sidecar: TargetIdentitySidecarSchema },
    { additionalProperties: false },
  ),
]);

const ReceiptScopeCommonFields = {
  requestDigest: ProviderRequestDigestSchema,
  projectionDigest: ProjectionDigestSchema,
  adapterProtocol: NonEmptyStringSchema,
  capabilityProfileDigest: CapabilityProfileDigestSchema,
  visibleFingerprint: VisibleFingerprintSchema,
  verifiedMembers: Type.Array(VerifiedMemberIdentitySchema),
} as const;

const TargetReceiptScopeSchema = Type.Union([
  Type.Object(
    {
      ...ReceiptScopeCommonFields,
      kind: Type.Literal("targeted-test"),
      releases: Type.Array(ReleaseArtifactRefSchema),
      evaluationProfile: NonEmptyStringSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      ...ReceiptScopeCommonFields,
      kind: Type.Literal("complete-test"),
      releaseSet: CompleteSetArtifactRefSchema,
      evaluationProfile: NonEmptyStringSchema,
    },
    { additionalProperties: false },
  ),
]);

const ReceiptLineageSchema = Type.Union([
  Type.Object({ kind: Type.Literal("initial") }, { additionalProperties: false }),
  Type.Object(
    { kind: Type.Literal("successor"), priorReceiptDigest: TargetReceiptDigestSchema },
    { additionalProperties: false },
  ),
]);

const TargetReceiptSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    receiptDigest: TargetReceiptDigestSchema,
    body: Type.Object(
      {
        schemaVersion: Type.Literal(1),
        provider: ProviderIdSchema,
        targetDigest: ProviderTargetDigestSchema,
        generation: Type.Number(),
        lineage: ReceiptLineageSchema,
        marketplace: ProviderMarketplaceStateSchema,
        scope: TargetReceiptScopeSchema,
        managedMembers: Type.Array(ManagedMemberClaimSchema),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

const ReceiptObservationSchema = Type.Union([
  Type.Object({ kind: Type.Literal("absent") }, { additionalProperties: false }),
  Type.Object(
    { kind: Type.Literal("present"), receipt: TargetReceiptSchema },
    { additionalProperties: false },
  ),
]);

const AdmitTargetIdentityActionSchema = Type.Object(
  {
    kind: Type.Literal("AdmitTargetIdentity"),
    target: ProviderTargetSchema,
    sidecar: TargetIdentitySidecarSchema,
  },
  { additionalProperties: false },
);

const SetMarketplaceActionSchema = Type.Object(
  {
    kind: Type.Literal("SetMarketplace"),
    role: Type.Union([Type.Literal("transition"), Type.Literal("final")]),
    target: ProviderTargetSchema,
    expected: ProviderMarketplaceObservationSchema,
    registration: Type.Union([ProviderMarketplaceRegistrationSchema, Type.Null()]),
  },
  { additionalProperties: false },
);

const InstallMemberActionSchema = Type.Object(
  {
    kind: Type.Literal("InstallMember"),
    target: ProviderTargetSchema,
    activeMarketplace: Type.Union([ProviderMarketplaceRegistrationSchema, Type.Null()]),
    member: ProviderProjectionMemberSchema,
  },
  { additionalProperties: false },
);

const EnableMemberActionSchema = Type.Object(
  {
    kind: Type.Literal("EnableMember"),
    target: ProviderTargetSchema,
    activeMarketplace: Type.Union([ProviderMarketplaceRegistrationSchema, Type.Null()]),
    member: ProviderProjectionMemberSchema,
  },
  { additionalProperties: false },
);

const RetireMemberActionSchema = Type.Object(
  {
    kind: Type.Literal("RetireMember"),
    target: ProviderTargetSchema,
    activeMarketplace: Type.Union([ProviderMarketplaceRegistrationSchema, Type.Null()]),
    member: NativeMemberObservationSchema,
  },
  { additionalProperties: false },
);

const PublishReceiptActionSchema = Type.Object(
  {
    kind: Type.Literal("PublishReceipt"),
    target: ProviderTargetSchema,
    prior: ReceiptObservationSchema,
    receipt: TargetReceiptSchema,
  },
  { additionalProperties: false },
);

const NativeProviderMutationActionSchema = Type.Union([
  SetMarketplaceActionSchema,
  InstallMemberActionSchema,
  EnableMemberActionSchema,
  RetireMemberActionSchema,
]);

const ProviderMutationActionSchema = Type.Union([
  AdmitTargetIdentityActionSchema,
  NativeProviderMutationActionSchema,
  PublishReceiptActionSchema,
]);

const ProviderPlanStepSchema = Type.Union([
  Type.Object(
    { kind: Type.Literal("mutate"), action: ProviderMutationActionSchema },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("verify"),
      target: ProviderTargetSchema,
      projection: AgentProviderProjectionSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("verify-managed"),
      target: ProviderTargetSchema,
      claims: Type.Array(ManagedMemberClaimSchema),
      marketplace: Type.Union([ProviderMarketplaceRegistrationSchema, Type.Null()]),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("verify-retired"),
      target: ProviderTargetSchema,
      nativeIdentity: Type.String(),
    },
    { additionalProperties: false },
  ),
]);

const ProviderTargetPlanSchema = Type.Object(
  {
    target: ProviderTargetSchema,
    state: Type.Union([
      Type.Literal("blocked"),
      Type.Literal("mutating"),
      Type.Literal("read-only"),
    ]),
    projection: Type.Union([AgentProviderProjectionSchema, Type.Null()]),
    steps: Type.Array(ProviderPlanStepSchema),
    issues: Type.Array(ProviderIssueSchema),
  },
  { additionalProperties: false },
);

const ProviderEventSchema = Type.Union([
  Type.Object(
    {
      phase: Type.Literal("planned"),
      target: ProviderTargetSchema,
      plan: ProviderTargetPlanSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      phase: Type.Literal("applied"),
      target: ProviderTargetSchema,
      action: ProviderMutationActionSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      phase: Type.Literal("uncertain"),
      target: ProviderTargetSchema,
      action: NativeProviderMutationActionSchema,
      lastKnown: Type.Union([
        Type.Literal("bridge-invoked"),
        Type.Literal("bridge-returned"),
      ]),
      issues: Type.Array(ProviderIssueSchema, { minItems: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      phase: Type.Literal("verified"),
      target: ProviderTargetSchema,
      visibleFingerprint: Type.String(),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      phase: Type.Literal("retired"),
      target: ProviderTargetSchema,
      action: RetireMemberActionSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      phase: Type.Literal("skipped"),
      target: ProviderTargetSchema,
      reason: Type.Literal("read-only-converged"),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      phase: Type.Literal("blocked"),
      target: ProviderTargetSchema,
      issues: Type.Array(ProviderIssueSchema),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      phase: Type.Literal("failed"),
      target: ProviderTargetSchema,
      issues: Type.Array(ProviderIssueSchema),
    },
    { additionalProperties: false },
  ),
]);

const ProviderTargetOutcomeSchema = Type.Object(
  {
    target: ProviderTargetSchema,
    status: Type.Union([
      Type.Literal("blocked"),
      Type.Literal("failed"),
      Type.Literal("mutated"),
      Type.Literal("read-only-converged"),
    ]),
    events: Type.Array(ProviderEventSchema),
    issues: Type.Array(ProviderIssueSchema),
    visibleFingerprint: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

const ProviderOperationOutcomeSchema = Type.Object(
  {
    status: Type.Union([
      Type.Literal("Blocked"),
      Type.Literal("Failed"),
      Type.Literal("Mutated"),
      Type.Literal("PartialFailure"),
      Type.Literal("ReadOnlyConverged"),
    ]),
    targets: Type.Array(ProviderTargetOutcomeSchema),
    evidence: Type.Union([MechanicalEvidenceDigestSchema, Type.Null()]),
    issues: Type.Array(ProviderIssueSchema),
  },
  { additionalProperties: false },
);

const CanonicalStatusOutcomeSchema = Type.Object(
  {
    target: ProviderTargetSchema,
    status: Type.Union([
      Type.Literal("BLOCKED_SELECTION"),
      Type.Literal("CONVERGED"),
      Type.Literal("DRIFTED"),
      Type.Literal("BLOCKED_COLLISION"),
      Type.Literal("INCOMPATIBLE_PROVIDER"),
    ]),
    issues: Type.Array(ProviderIssueSchema),
  },
  { additionalProperties: false },
);

const CanonicalSetMarketplaceRecordSchema = Type.Object(
  {
    kind: Type.Literal("SetMarketplace"),
    target: ProviderTargetSchema,
    marketplaceIdentity: NonEmptyStringSchema,
    projectionDigest: MarketplaceProjectionDigestSchema,
    sourceDigest: ProviderSourceDigestSchema,
  },
  { additionalProperties: false },
);

const CanonicalMemberMutationRecordSchema = Type.Object(
  {
    kind: Type.Union([
      Type.Literal("InstallMember"),
      Type.Literal("EnableMember"),
      Type.Literal("RetireMember"),
    ]),
    target: ProviderTargetSchema,
    marketplaceIdentity: NonEmptyStringSchema,
    pluginId: NonEmptyStringSchema,
    nativeIdentity: NonEmptyStringSchema,
    memberFingerprint: ProviderMemberFingerprintSchema,
  },
  { additionalProperties: false },
);

const CanonicalConfiguredExposureRetirementRecordSchema = Type.Object(
  {
    kind: Type.Literal("RetireConfiguredExposure"),
    target: ProviderTargetSchema,
    marketplaceIdentity: NonEmptyStringSchema,
    exposureIdentity: NonEmptyStringSchema,
    nativeIdentity: NonEmptyStringSchema,
    providerSourceIdentity: NonEmptyStringSchema,
  },
  { additionalProperties: false },
);

const CanonicalMutationRecordSchema = Type.Union([
  CanonicalSetMarketplaceRecordSchema,
  CanonicalMemberMutationRecordSchema,
  CanonicalConfiguredExposureRetirementRecordSchema,
]);

const CanonicalSyncTargetOutcomeSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal("blocked"),
      status: Type.Union([
        Type.Literal("BLOCKED_SELECTION"),
        Type.Literal("BLOCKED_COLLISION"),
        Type.Literal("INCOMPATIBLE_PROVIDER"),
      ]),
      target: ProviderTargetSchema,
      appliedPrefix: Type.Array(CanonicalMutationRecordSchema, { maxItems: 0 }),
      issues: Type.Array(ProviderIssueSchema, { minItems: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("read-only-converged"),
      status: Type.Literal("CONVERGED"),
      target: ProviderTargetSchema,
      appliedPrefix: Type.Array(CanonicalMutationRecordSchema, { maxItems: 0 }),
      issues: Type.Array(ProviderIssueSchema, { maxItems: 0 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("mutated"),
      status: Type.Literal("CONVERGED"),
      target: ProviderTargetSchema,
      appliedPrefix: Type.Array(CanonicalMutationRecordSchema, { minItems: 1 }),
      issues: Type.Array(ProviderIssueSchema, { maxItems: 0 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("failed"),
      status: Type.Literal("DRIFTED"),
      target: ProviderTargetSchema,
      appliedPrefix: Type.Array(CanonicalMutationRecordSchema),
      issues: Type.Array(ProviderIssueSchema, { minItems: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("uncertain"),
      status: Type.Literal("DRIFTED"),
      target: ProviderTargetSchema,
      appliedPrefix: Type.Array(CanonicalMutationRecordSchema),
      attempted: CanonicalMutationRecordSchema,
      lastKnown: Type.Union([
        Type.Literal("bridge-invoked"),
        Type.Literal("bridge-returned"),
      ]),
      issues: Type.Array(ProviderIssueSchema, { minItems: 1 }),
    },
    { additionalProperties: false },
  ),
]);

const CanonicalSyncOutcomeSchema = Type.Object(
  {
    status: Type.Union([
      Type.Literal("Blocked"),
      Type.Literal("Failed"),
      Type.Literal("Mutated"),
      Type.Literal("PartialFailure"),
      Type.Literal("ReadOnlyConverged"),
    ]),
    targets: Type.Array(CanonicalSyncTargetOutcomeSchema),
    issues: Type.Array(ProviderIssueSchema),
  },
  { additionalProperties: false },
);

const CompleteNativeHomesObservationSchema = Type.Object(
  {
    protocol: Type.Literal("agent-provider-native-homes@v1"),
    homes: Type.Array(TargetIdentitySidecarSchema),
    observationDigest: CompleteNativeHomesDigestSchema,
  },
  { additionalProperties: false },
);

function providerResultSchema<T extends TSchema>(value: T) {
  return Type.Union([
    Type.Object(
      { ok: Type.Literal(true), value },
      { additionalProperties: false },
    ),
    Type.Object(
      { ok: Type.Literal(false), issues: Type.Array(ProviderIssueSchema, { minItems: 1 }) },
      { additionalProperties: false },
    ),
  ]);
}

export type ProviderOperationProcedureResult = DeploymentResult<ProviderOperationOutcome>;
export type CanonicalSyncProcedureResult = DeploymentResult<CanonicalSyncOutcome>;
export type CanonicalStatusProcedureResult = DeploymentResult<readonly CanonicalStatusOutcome[]>;
export type CompleteNativeHomesProcedureResult = DeploymentResult<CompleteNativeHomesObservation>;

export const ProviderOperationResultSchema = Type.Unsafe<ProviderOperationProcedureResult>(
  providerResultSchema(ProviderOperationOutcomeSchema),
);
export const CanonicalSyncResultSchema = Type.Unsafe<CanonicalSyncProcedureResult>(
  providerResultSchema(CanonicalSyncOutcomeSchema),
);
export const CanonicalStatusResultSchema = Type.Unsafe<CanonicalStatusProcedureResult>(
  providerResultSchema(Type.Array(CanonicalStatusOutcomeSchema)),
);
export const CompleteNativeHomesResultSchema = Type.Unsafe<CompleteNativeHomesProcedureResult>(
  providerResultSchema(CompleteNativeHomesObservationSchema),
);
