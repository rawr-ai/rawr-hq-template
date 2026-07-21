import { type Static, type TSchema, Type } from "typebox";

import {
  BoundedReadonlyArray,
  EmptyReadonlyArray,
  NonEmptyReadonlyArray,
} from "../../model/dto/structural";
import {
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  MAX_RELEASE_MEMBERS,
} from "../../shared/release";
import {
  CanonicalStatusInputSchema,
  CanonicalSyncInputSchema,
  CompleteSetArtifactRefSchema,
  CompleteTestInputSchema,
  ReleaseArtifactRefSchema,
  TargetedTestInputSchema,
} from "./model/dto/mode";
import { ProviderProjectionBindingSchema } from "./model/dto/outcome";
import {
  MAX_PROVIDER_TARGETS,
  ProviderHomeSchema,
  ProviderIdSchema,
} from "./model/dto/provider-target";
import { MAX_PROVIDER_ISSUE_TEXT_LENGTH } from "./model/errors/deployment-result";

const MAX_PROVIDER_RESULT_TEXT_LENGTH = MAX_PROVIDER_ISSUE_TEXT_LENGTH;
const MAX_PROVIDER_IDENTITY_LENGTH = 512;
const MAX_PROVIDER_PROTOCOL_LENGTH = 256;
const MAX_PROVIDER_PATH_LENGTH = 1_024;
const MAX_PROVIDER_CAPABILITIES = 6;
const MAX_PROVIDER_RESULT_ITEMS = 200_000;

const ProviderResultTextSchema = Type.String({
  maxLength: MAX_PROVIDER_RESULT_TEXT_LENGTH,
});
const ProviderIdentityTextSchema = Type.String({
  maxLength: MAX_PROVIDER_IDENTITY_LENGTH,
});
const NonEmptyProviderIdentitySchema = Type.String({
  minLength: 1,
  maxLength: MAX_PROVIDER_IDENTITY_LENGTH,
});
const NonEmptyProviderProtocolSchema = Type.String({
  minLength: 1,
  maxLength: MAX_PROVIDER_PROTOCOL_LENGTH,
});
const ProviderPathSchema = Type.String({
  minLength: 1,
  maxLength: MAX_PROVIDER_PATH_LENGTH,
});
const GitObjectIdSchema = Type.String({
  minLength: 40,
  maxLength: 64,
  pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$",
});

function fixedDigestSchema(prefix: string) {
  const length = prefix.length + 64;
  return Type.String({
    minLength: length,
    maxLength: length,
    pattern: `^${prefix}[0-9a-f]{64}$`,
  });
}

const ContentDigestSchema = fixedDigestSchema("sha256_");
const ProjectionDigestSchema = fixedDigestSchema("ap1_");
const CapabilityProfileDigestSchema = fixedDigestSchema("cp1_");
const ProviderTargetDigestSchema = fixedDigestSchema("pt1_");
const TargetIdentityDigestSchema = fixedDigestSchema("ti1_");
const ProviderMemberFingerprintSchema = fixedDigestSchema("pm1_");
const ProviderSourceDigestSchema = fixedDigestSchema("ps1_");
const MarketplaceProjectionDigestSchema = fixedDigestSchema("mp1_");
const ProviderRequestDigestSchema = fixedDigestSchema("prq1_");
const TargetReceiptDigestSchema = fixedDigestSchema("tr1_");
const VisibleFingerprintSchema = fixedDigestSchema("vf1_");
const MechanicalEvidenceDigestSchema = fixedDigestSchema("me1_");

export {
  CanonicalStatusInputSchema,
  CanonicalSyncInputSchema,
  CompleteTestInputSchema,
  TargetedTestInputSchema,
};

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
    path: ProviderResultTextSchema,
    message: ProviderResultTextSchema,
    expected: ProviderResultTextSchema,
    actual: ProviderResultTextSchema,
  },
  { additionalProperties: false },
);

const ProviderTargetSchema = Type.Object(
  {
    provider: ProviderIdSchema,
    home: ProviderHomeSchema,
    targetDigest: ProviderTargetDigestSchema,
  },
  { additionalProperties: false },
);

const ProviderArtifactAuthoritySchema = Type.Object(
  {
    protocol: Type.Literal("agent-plugin-artifact-authority@v1"),
    contentAuthority: NonEmptyProviderIdentitySchema,
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
    adapterProtocol: NonEmptyProviderProtocolSchema,
    required: BoundedReadonlyArray(ProviderCapabilitySchema, {
      maxItems: MAX_PROVIDER_CAPABILITIES,
    }),
    capabilityProfileDigest: CapabilityProfileDigestSchema,
  },
  { additionalProperties: false },
);

const ProviderPackageFileSchema = Type.Object(
  {
    path: ProviderPathSchema,
    mode: Type.Union([Type.Literal(0o644), Type.Literal(0o755)]),
    contentDigest: ContentDigestSchema,
  },
  { additionalProperties: false },
);

const ProviderVisibleClaimSetSchema = Type.Object(
  {
    pluginIdentity: ProviderIdentityTextSchema,
    skills: BoundedReadonlyArray(ProviderIdentityTextSchema, {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
    }),
    hooks: BoundedReadonlyArray(ProviderIdentityTextSchema, {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
    }),
  },
  { additionalProperties: false },
);

const ProviderProjectionMemberSchema = Type.Object(
  {
    pluginId: NonEmptyProviderIdentitySchema,
    releaseRef: ReleaseArtifactRefSchema,
    artifactAuthority: ProviderArtifactAuthoritySchema,
    providerSourceIdentity: NonEmptyProviderIdentitySchema,
    nativeIdentity: ProviderIdentityTextSchema,
    files: BoundedReadonlyArray(ProviderPackageFileSchema, {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
    }),
    visible: ProviderVisibleClaimSetSchema,
    memberFingerprint: ProviderMemberFingerprintSchema,
  },
  { additionalProperties: false },
);

const ProviderMarketplaceProjectionSchema = Type.Object(
  {
    identity: NonEmptyProviderIdentitySchema,
    sourceDigest: ProviderSourceDigestSchema,
    files: BoundedReadonlyArray(ProviderPackageFileSchema, {
      maxItems: MAX_PROVIDER_RESULT_ITEMS,
    }),
  },
  { additionalProperties: false },
);

const ProjectionSourceSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal("targeted"),
      releases: BoundedReadonlyArray(ReleaseArtifactRefSchema, {
        maxItems: MAX_RELEASE_MEMBERS,
      }),
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
    rendererProtocol: NonEmptyProviderProtocolSchema,
    adapterProtocol: NonEmptyProviderProtocolSchema,
    artifactAuthority: ProviderArtifactAuthoritySchema,
    source: ProjectionSourceSchema,
    marketplace: ProviderMarketplaceProjectionSchema,
    capabilityProfile: CapabilityProfileSchema,
    members: BoundedReadonlyArray(ProviderProjectionMemberSchema, {
      maxItems: MAX_RELEASE_MEMBERS,
    }),
    projectionDigest: ProjectionDigestSchema,
  },
  { additionalProperties: false },
);

const ProviderMarketplaceMemberSourceSchema = Type.Object(
  {
    pluginId: NonEmptyProviderIdentitySchema,
    nativeIdentity: ProviderIdentityTextSchema,
    providerSourceIdentity: NonEmptyProviderIdentitySchema,
    sourceProjectionDigest: ProjectionDigestSchema,
    memberFingerprint: ProviderMemberFingerprintSchema,
  },
  { additionalProperties: false },
);

const ProviderMarketplaceStateFields = {
  provider: ProviderIdSchema,
  adapterProtocol: NonEmptyProviderProtocolSchema,
  marketplaceIdentity: NonEmptyProviderIdentitySchema,
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
    members: BoundedReadonlyArray(ProviderMarketplaceMemberSourceSchema, {
      maxItems: MAX_RELEASE_MEMBERS,
    }),
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
  pluginId: NonEmptyProviderIdentitySchema,
  nativeIdentity: ProviderIdentityTextSchema,
  artifactAuthority: ProviderArtifactAuthoritySchema,
  providerSourceIdentity: NonEmptyProviderIdentitySchema,
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
    visibleSkills: BoundedReadonlyArray(ProviderIdentityTextSchema, {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
    }),
    visibleHooks: BoundedReadonlyArray(ProviderIdentityTextSchema, {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
    }),
  },
  { additionalProperties: false },
);

const TargetIdentitySidecarSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    provider: ProviderIdSchema,
    canonicalHome: ProviderHomeSchema,
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
  adapterProtocol: NonEmptyProviderProtocolSchema,
  capabilityProfileDigest: CapabilityProfileDigestSchema,
  visibleFingerprint: VisibleFingerprintSchema,
  verifiedMembers: BoundedReadonlyArray(VerifiedMemberIdentitySchema, {
    maxItems: MAX_RELEASE_MEMBERS,
  }),
} as const;

const TargetReceiptScopeSchema = Type.Union([
  Type.Object(
    {
      ...ReceiptScopeCommonFields,
      kind: Type.Literal("targeted-test"),
      releases: BoundedReadonlyArray(ReleaseArtifactRefSchema, {
        maxItems: MAX_RELEASE_MEMBERS,
      }),
      evaluationProfile: Type.String({ minLength: 1, maxLength: 256 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      ...ReceiptScopeCommonFields,
      kind: Type.Literal("complete-test"),
      releaseSet: CompleteSetArtifactRefSchema,
      evaluationProfile: Type.String({ minLength: 1, maxLength: 256 }),
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
        managedMembers: BoundedReadonlyArray(ManagedMemberClaimSchema, {
          maxItems: MAX_RELEASE_MEMBERS,
        }),
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
      claims: BoundedReadonlyArray(ManagedMemberClaimSchema, {
        maxItems: MAX_RELEASE_MEMBERS,
      }),
      marketplace: Type.Union([ProviderMarketplaceRegistrationSchema, Type.Null()]),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("verify-retired"),
      target: ProviderTargetSchema,
      nativeIdentity: ProviderIdentityTextSchema,
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
    steps: BoundedReadonlyArray(ProviderPlanStepSchema, {
      maxItems: MAX_PROVIDER_RESULT_ITEMS,
    }),
    issues: BoundedReadonlyArray(ProviderIssueSchema, {
      maxItems: MAX_PROVIDER_RESULT_ITEMS,
    }),
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
      issues: NonEmptyReadonlyArray(ProviderIssueSchema, {
        maxItems: MAX_PROVIDER_RESULT_ITEMS,
      }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      phase: Type.Literal("verified"),
      target: ProviderTargetSchema,
      visibleFingerprint: VisibleFingerprintSchema,
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
      issues: BoundedReadonlyArray(ProviderIssueSchema, {
        maxItems: MAX_PROVIDER_RESULT_ITEMS,
      }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      phase: Type.Literal("failed"),
      target: ProviderTargetSchema,
      issues: BoundedReadonlyArray(ProviderIssueSchema, {
        maxItems: MAX_PROVIDER_RESULT_ITEMS,
      }),
    },
    { additionalProperties: false },
  ),
]);

const ProviderTargetOutcomeFields = {
  target: ProviderTargetSchema,
  events: BoundedReadonlyArray(ProviderEventSchema, {
    maxItems: MAX_PROVIDER_RESULT_ITEMS,
  }),
  issues: BoundedReadonlyArray(ProviderIssueSchema, {
    maxItems: MAX_PROVIDER_RESULT_ITEMS,
  }),
  visibleFingerprint: Type.Union([VisibleFingerprintSchema, Type.Null()]),
} as const;

const FailedProviderTargetOutcomeSchema = Type.Object(
  {
    ...ProviderTargetOutcomeFields,
    status: Type.Union([Type.Literal("blocked"), Type.Literal("failed")]),
    projectionBinding: Type.Null(),
  },
  { additionalProperties: false },
);

const CompleteTestProviderTargetOutcomeSchema = Type.Union([
  FailedProviderTargetOutcomeSchema,
  Type.Object(
    {
      ...ProviderTargetOutcomeFields,
      status: Type.Union([Type.Literal("mutated"), Type.Literal("read-only-converged")]),
      projectionBinding: ProviderProjectionBindingSchema,
    },
    { additionalProperties: false },
  ),
]);

const TargetedTestProviderTargetOutcomeSchema = Type.Union([
  FailedProviderTargetOutcomeSchema,
  Type.Object(
    {
      ...ProviderTargetOutcomeFields,
      status: Type.Union([Type.Literal("mutated"), Type.Literal("read-only-converged")]),
      projectionBinding: Type.Null(),
    },
    { additionalProperties: false },
  ),
]);

function providerOperationOutcomeSchema<TTarget extends TSchema>(target: TTarget) {
  return Type.Object(
    {
      status: Type.Union([
        Type.Literal("Blocked"),
        Type.Literal("Failed"),
        Type.Literal("Mutated"),
        Type.Literal("PartialFailure"),
        Type.Literal("ReadOnlyConverged"),
      ]),
      targets: BoundedReadonlyArray(target, {
        maxItems: MAX_PROVIDER_TARGETS,
      }),
      evidence: Type.Union([MechanicalEvidenceDigestSchema, Type.Null()]),
      issues: BoundedReadonlyArray(ProviderIssueSchema, {
        maxItems: MAX_PROVIDER_RESULT_ITEMS,
      }),
    },
    { additionalProperties: false },
  );
}

const CompleteTestProviderOperationOutcomeSchema = providerOperationOutcomeSchema(
  CompleteTestProviderTargetOutcomeSchema,
);
const TargetedTestProviderOperationOutcomeSchema = providerOperationOutcomeSchema(
  TargetedTestProviderTargetOutcomeSchema,
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
    issues: BoundedReadonlyArray(ProviderIssueSchema, {
      maxItems: MAX_PROVIDER_RESULT_ITEMS,
    }),
  },
  { additionalProperties: false },
);

const CanonicalSetMarketplaceRecordSchema = Type.Object(
  {
    kind: Type.Literal("SetMarketplace"),
    target: ProviderTargetSchema,
    marketplaceIdentity: NonEmptyProviderIdentitySchema,
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
    marketplaceIdentity: NonEmptyProviderIdentitySchema,
    pluginId: NonEmptyProviderIdentitySchema,
    nativeIdentity: NonEmptyProviderIdentitySchema,
    memberFingerprint: ProviderMemberFingerprintSchema,
  },
  { additionalProperties: false },
);

const CanonicalConfiguredExposureRetirementRecordSchema = Type.Object(
  {
    kind: Type.Literal("RetireConfiguredExposure"),
    target: ProviderTargetSchema,
    marketplaceIdentity: NonEmptyProviderIdentitySchema,
    exposureIdentity: NonEmptyProviderIdentitySchema,
    nativeIdentity: NonEmptyProviderIdentitySchema,
    providerSourceIdentity: NonEmptyProviderIdentitySchema,
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
      appliedPrefix: EmptyReadonlyArray(CanonicalMutationRecordSchema),
      issues: NonEmptyReadonlyArray(ProviderIssueSchema, {
        maxItems: MAX_PROVIDER_RESULT_ITEMS,
      }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("read-only-converged"),
      status: Type.Literal("CONVERGED"),
      target: ProviderTargetSchema,
      appliedPrefix: EmptyReadonlyArray(CanonicalMutationRecordSchema),
      issues: EmptyReadonlyArray(ProviderIssueSchema),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("mutated"),
      status: Type.Literal("CONVERGED"),
      target: ProviderTargetSchema,
      appliedPrefix: NonEmptyReadonlyArray(CanonicalMutationRecordSchema, {
        maxItems: MAX_PROVIDER_RESULT_ITEMS,
      }),
      issues: EmptyReadonlyArray(ProviderIssueSchema),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("failed"),
      status: Type.Literal("DRIFTED"),
      target: ProviderTargetSchema,
      appliedPrefix: BoundedReadonlyArray(CanonicalMutationRecordSchema, {
        maxItems: MAX_PROVIDER_RESULT_ITEMS,
      }),
      issues: NonEmptyReadonlyArray(ProviderIssueSchema, {
        maxItems: MAX_PROVIDER_RESULT_ITEMS,
      }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("uncertain"),
      status: Type.Literal("DRIFTED"),
      target: ProviderTargetSchema,
      appliedPrefix: BoundedReadonlyArray(CanonicalMutationRecordSchema, {
        maxItems: MAX_PROVIDER_RESULT_ITEMS,
      }),
      attempted: CanonicalMutationRecordSchema,
      lastKnown: Type.Union([
        Type.Literal("bridge-invoked"),
        Type.Literal("bridge-returned"),
      ]),
      issues: NonEmptyReadonlyArray(ProviderIssueSchema, {
        maxItems: MAX_PROVIDER_RESULT_ITEMS,
      }),
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
    targets: BoundedReadonlyArray(CanonicalSyncTargetOutcomeSchema, {
      maxItems: MAX_PROVIDER_TARGETS,
    }),
    issues: BoundedReadonlyArray(ProviderIssueSchema, {
      maxItems: MAX_PROVIDER_RESULT_ITEMS,
    }),
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
      {
        ok: Type.Literal(false),
        issues: NonEmptyReadonlyArray(ProviderIssueSchema, {
          maxItems: MAX_PROVIDER_RESULT_ITEMS,
        }),
      },
      { additionalProperties: false },
    ),
  ]);
}

export const CompleteTestResultSchema = providerResultSchema(
  CompleteTestProviderOperationOutcomeSchema,
);
export const TargetedTestResultSchema = providerResultSchema(
  TargetedTestProviderOperationOutcomeSchema,
);
export type CompleteTestProcedureResult = Static<typeof CompleteTestResultSchema>;
export type TargetedTestProcedureResult = Static<typeof TargetedTestResultSchema>;
export const CanonicalSyncResultSchema = providerResultSchema(CanonicalSyncOutcomeSchema);
export const CanonicalStatusResultSchema = providerResultSchema(BoundedReadonlyArray(
  CanonicalStatusOutcomeSchema,
  { maxItems: MAX_PROVIDER_TARGETS },
));
export type CanonicalSyncProcedureResult = Static<typeof CanonicalSyncResultSchema>;
export type CanonicalStatusProcedureResult = Static<typeof CanonicalStatusResultSchema>;
