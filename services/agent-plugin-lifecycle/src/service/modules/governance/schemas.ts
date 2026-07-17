import { type Static, Type } from "typebox";

import type {
  AttestPromotionResult,
  CurrentMainResolution,
  GovernedAcceptanceResult,
} from "./internal";

const GitObjectIdSchema = Type.String({ pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$" });
const CanonicalIdSchema = Type.String({
  minLength: 1,
  maxLength: 512,
  pattern: "^[a-z0-9][a-z0-9._:@/+\\-]*$",
});
const CanonicalRefSchema = Type.String({
  minLength: 1,
  pattern: "^refs/(?:heads|tags)/[A-Za-z0-9][A-Za-z0-9._/-]*$",
});
const RelativePathSchema = Type.String({ minLength: 1, maxLength: 4_096 });
const RepositoryIdentitySchema = Type.String({ minLength: 1 });
const ContentAuthoritySchema = Type.String({ minLength: 1 });
const ReleaseSetDigestSchema = Type.String({ pattern: "^rs1_[0-9a-f]{64}$" });
const ReleaseInputDigestSchema = Type.String({ pattern: "^ri1_[0-9a-f]{64}$" });
const AcceptanceRequestDigestSchema = Type.String({ pattern: "^arq1_[0-9a-f]{64}$" });
const AcceptanceEvidenceDigestSchema = Type.String({ pattern: "^ace1_[0-9a-f]{64}$" });
const LifecyclePolicyDigestSchema = Type.String({ pattern: "^lpy1_[0-9a-f]{64}$" });
const PromotionAttestationDigestSchema = Type.String({ pattern: "^pat1_[0-9a-f]{64}$" });
const CurrentMainDigestSchema = Type.String({ pattern: "^cm1_[0-9a-f]{64}$" });
const ProviderProjectionDigestSchema = Type.String({ pattern: "^ap1_[0-9a-f]{64}$" });
const CapabilityProfileDigestSchema = Type.String({ pattern: "^cp1_[0-9a-f]{64}$" });
const TargetIdentityDigestSchema = Type.String({ pattern: "^pt1_[0-9a-f]{64}$" });
const MechanicalEvidenceDigestSchema = Type.String({ pattern: "^me1_[0-9a-f]{64}$" });

export const GitLocatorSchema = Type.Object(
  {
    workspacePath: Type.String({ minLength: 1 }),
    expectedRepositoryIdentity: RepositoryIdentitySchema,
  },
  { additionalProperties: false },
);

export const ExactGitBlobPointerSchema = Type.Object(
  {
    repositoryIdentity: RepositoryIdentitySchema,
    ref: CanonicalRefSchema,
    commit: GitObjectIdSchema,
    tree: GitObjectIdSchema,
    path: RelativePathSchema,
    blob: GitObjectIdSchema,
  },
  { additionalProperties: false },
);

const ProviderAcceptanceBindingSchema = Type.Object(
  {
    provider: Type.Union([Type.Literal("codex"), Type.Literal("claude")]),
    projectionDigest: ProviderProjectionDigestSchema,
    adapterProtocol: CanonicalIdSchema,
    capabilityProfileDigest: CapabilityProfileDigestSchema,
  },
  { additionalProperties: false },
);

const MechanicalEvidenceHandleSchema = Type.Object(
  {
    protocol: Type.Literal("agent-plugin-mechanical-evidence/v1"),
    digest: MechanicalEvidenceDigestSchema,
    byteLength: Type.Integer({ minimum: 1, maximum: 64 * 1024 * 1024 }),
  },
  { additionalProperties: false },
);

const LifecyclePolicyBodySchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    policyIdentity: CanonicalIdSchema,
    repositoryIdentity: RepositoryIdentitySchema,
    contentAuthority: ContentAuthoritySchema,
    canonicalRef: CanonicalRefSchema,
    releaseInputPath: RelativePathSchema,
    requestRoot: RelativePathSchema,
    acceptanceRoot: Type.Literal("plugins/agents/.lifecycle/acceptances"),
    promotionRoot: Type.Literal("plugins/agents/.lifecycle/promotions"),
    currentMainPath: Type.Literal("plugins/agents/.lifecycle/channels/current-main.json"),
    issuerIdentity: CanonicalIdSchema,
    issuerProtocol: Type.Literal("independent-agent-plugin-acceptance/v1"),
    issuerSchemaProtocol: CanonicalIdSchema,
    cleanTaskNamespace: CanonicalIdSchema,
    humanApproverIdentity: CanonicalIdSchema,
  },
  { additionalProperties: false },
);

const LifecyclePolicySchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    policyDigest: LifecyclePolicyDigestSchema,
    body: LifecyclePolicyBodySchema,
  },
  { additionalProperties: false },
);

const AcceptanceRequestBodySchema = Type.Object(
  {
    schemaVersion: Type.Literal(2),
    repositoryIdentity: RepositoryIdentitySchema,
    contentAuthority: ContentAuthoritySchema,
    policyIdentity: CanonicalIdSchema,
    releaseSetDigest: ReleaseSetDigestSchema,
    releaseInputObject: ExactGitBlobPointerSchema,
    hostedApproval: Type.Object(
      {
        provider: Type.Literal("github"),
        pullRequest: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
      },
      { additionalProperties: false },
    ),
    projections: Type.Array(ProviderAcceptanceBindingSchema, { maxItems: 128 }),
    evidence: Type.Array(MechanicalEvidenceHandleSchema, { maxItems: 128 }),
    evaluationProfile: CanonicalIdSchema,
    freshAgentTarget: TargetIdentityDigestSchema,
    acceptancePath: RelativePathSchema,
  },
  { additionalProperties: false },
);

const AcceptanceRequestSchema = Type.Object(
  {
    schemaVersion: Type.Literal(2),
    requestDigest: AcceptanceRequestDigestSchema,
    body: AcceptanceRequestBodySchema,
  },
  { additionalProperties: false },
);

const IssuerTaskIdentitySchema = Type.Object(
  {
    taskId: CanonicalIdSchema,
    context: Type.Literal("clean"),
    forkedFrom: Type.Null(),
  },
  { additionalProperties: false },
);

const AcceptanceEvidenceBodySchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    requestDigest: AcceptanceRequestDigestSchema,
    requestPath: RelativePathSchema,
    outcome: Type.Union([Type.Literal("accepted"), Type.Literal("rejected")]),
    issuerIdentity: CanonicalIdSchema,
    issuerProtocol: Type.Literal("independent-agent-plugin-acceptance/v1"),
    issuerSchemaProtocol: CanonicalIdSchema,
    issuerTask: IssuerTaskIdentitySchema,
    issuedAt: Type.String({
      pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$",
    }),
    issuerImplementationIdentity: CanonicalIdSchema,
    policyIdentity: CanonicalIdSchema,
  },
  { additionalProperties: false },
);

const AcceptanceEvidenceSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    acceptanceDigest: AcceptanceEvidenceDigestSchema,
    body: AcceptanceEvidenceBodySchema,
  },
  { additionalProperties: false },
);

const HostedApprovalObservationSchema = Type.Object(
  {
    provider: Type.Literal("github"),
    pullRequest: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
    recordId: CanonicalIdSchema,
    object: ExactGitBlobPointerSchema,
    approverIdentity: CanonicalIdSchema,
    decision: Type.Union([Type.Literal("approved"), Type.Literal("rejected")]),
    outcome: Type.Literal("accepted"),
  },
  { additionalProperties: false },
);

const GovernedAcceptanceObservationSchema = Type.Object(
  {
    policy: LifecyclePolicySchema,
    request: AcceptanceRequestSchema,
    evidence: AcceptanceEvidenceSchema,
    policyObject: ExactGitBlobPointerSchema,
    requestObject: ExactGitBlobPointerSchema,
    acceptanceObject: ExactGitBlobPointerSchema,
    approval: HostedApprovalObservationSchema,
  },
  { additionalProperties: false },
);

const ReleaseInputIdentitySchema = Type.Object(
  {
    object: ExactGitBlobPointerSchema,
    releaseInputDigest: ReleaseInputDigestSchema,
  },
  { additionalProperties: false },
);

const PromotionAttestationBodySchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    policyIdentity: CanonicalIdSchema,
    acceptanceRequestDigest: AcceptanceRequestDigestSchema,
    acceptanceEvidenceDigest: AcceptanceEvidenceDigestSchema,
    releaseSetDigest: ReleaseSetDigestSchema,
    acceptedInput: ReleaseInputIdentitySchema,
    landedInput: ReleaseInputIdentitySchema,
    projections: Type.Array(ProviderAcceptanceBindingSchema, { maxItems: 128 }),
    equivalence: Type.Literal("equivalent"),
  },
  { additionalProperties: false },
);

const PromotionAttestationSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    attestationDigest: PromotionAttestationDigestSchema,
    body: PromotionAttestationBodySchema,
  },
  { additionalProperties: false },
);

const CurrentMainBodySchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    channel: Type.Literal("current-main"),
    contentAuthority: ContentAuthoritySchema,
    policyIdentity: CanonicalIdSchema,
    policyDigest: LifecyclePolicyDigestSchema,
    releaseSetDigest: ReleaseSetDigestSchema,
    projections: Type.Array(ProviderAcceptanceBindingSchema, { maxItems: 128 }),
    requestObject: ExactGitBlobPointerSchema,
    acceptanceObject: ExactGitBlobPointerSchema,
    promotionObject: ExactGitBlobPointerSchema,
    acceptanceRequestDigest: AcceptanceRequestDigestSchema,
    acceptanceEvidenceDigest: AcceptanceEvidenceDigestSchema,
    promotionAttestationDigest: PromotionAttestationDigestSchema,
  },
  { additionalProperties: false },
);

const CurrentMainRecordSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    currentMainDigest: CurrentMainDigestSchema,
    body: CurrentMainBodySchema,
  },
  { additionalProperties: false },
);

const CurrentChannelObservationSchema = Type.Object(
  {
    record: CurrentMainRecordSchema,
    policy: LifecyclePolicySchema,
    acceptance: GovernedAcceptanceObservationSchema,
    promotion: PromotionAttestationSchema,
  },
  { additionalProperties: false },
);

export const ValidateAcceptanceInputSchema = Type.Object(
  {
    locator: GitLocatorSchema,
    policyObject: ExactGitBlobPointerSchema,
    requestObject: ExactGitBlobPointerSchema,
    acceptanceObject: ExactGitBlobPointerSchema,
  },
  { additionalProperties: false },
);

export const AttestPromotionInputSchema = Type.Object(
  {
    locator: GitLocatorSchema,
    policyObject: ExactGitBlobPointerSchema,
    requestObject: ExactGitBlobPointerSchema,
    acceptanceObject: ExactGitBlobPointerSchema,
    landedReleaseInputObject: ExactGitBlobPointerSchema,
  },
  { additionalProperties: false },
);

export const ResolveCurrentMainInputSchema = Type.Object(
  { locator: GitLocatorSchema },
  { additionalProperties: false },
);

const GovernedAcceptedSchema = Type.Object(
  { kind: Type.Literal("GovernedAccepted"), observation: GovernedAcceptanceObservationSchema },
  { additionalProperties: false },
);

const RejectedAcceptanceSchema = Type.Object(
  { kind: Type.Literal("RejectedAcceptance"), evidence: AcceptanceEvidenceSchema },
  { additionalProperties: false },
);

const InvalidAcceptanceSchema = Type.Object(
  {
    kind: Type.Literal("InvalidAcceptance"),
    code: Type.Union([
      Type.Literal("INVALID_ACCEPTANCE_RECORD"),
      Type.Literal("INVALID_MECHANICAL_EVIDENCE"),
    ]),
    reason: Type.String(),
  },
  { additionalProperties: false },
);

const BlockedAcceptanceSchema = Type.Object(
  {
    kind: Type.Literal("BlockedAcceptanceAuthority"),
    code: Type.Literal("BLOCKED_ACCEPTANCE_AUTHORITY"),
    reason: Type.String(),
  },
  { additionalProperties: false },
);

export type ValidateAcceptanceProcedureResult = GovernedAcceptanceResult;
export type AttestPromotionProcedureResult =
  | Exclude<GovernedAcceptanceResult, { readonly kind: "GovernedAccepted" }>
  | AttestPromotionResult;
export type ResolveCurrentMainProcedureResult = CurrentMainResolution;

export const ValidateAcceptanceResultSchema = Type.Unsafe<ValidateAcceptanceProcedureResult>(
  Type.Union([
    GovernedAcceptedSchema,
    RejectedAcceptanceSchema,
    InvalidAcceptanceSchema,
    BlockedAcceptanceSchema,
  ]),
);

export const AttestPromotionResultSchema = Type.Unsafe<AttestPromotionProcedureResult>(
  Type.Union([
    RejectedAcceptanceSchema,
    InvalidAcceptanceSchema,
    BlockedAcceptanceSchema,
    Type.Object(
      { kind: Type.Literal("PromotionAttested"), attestation: PromotionAttestationSchema },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        kind: Type.Literal("ReleaseInputChanged"),
        acceptedDigest: ReleaseInputDigestSchema,
        landedDigest: ReleaseInputDigestSchema,
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        kind: Type.Literal("InvalidReleaseInput"),
        side: Type.Union([Type.Literal("accepted"), Type.Literal("landed")]),
        reason: Type.String(),
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        kind: Type.Literal("BlockedRepository"),
        state: Type.Union([
          Type.Literal("DIRTY_REPOSITORY"),
          Type.Literal("WRONG_REPOSITORY"),
          Type.Literal("UNREACHABLE_REPOSITORY"),
          Type.Literal("WRONG_GIT_OBJECT"),
        ]),
        reason: Type.String(),
      },
      { additionalProperties: false },
    ),
  ]),
);

const CurrentMainReasonSchema = (kind: CurrentMainResolution["kind"]) => Type.Object(
  { kind: Type.Literal(kind), reason: Type.String() },
  { additionalProperties: false },
);

export const ResolveCurrentMainResultSchema = Type.Unsafe<ResolveCurrentMainProcedureResult>(
  Type.Union([
    Type.Object(
      { kind: Type.Literal("CURRENT_ELIGIBLE"), observation: CurrentChannelObservationSchema },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        kind: Type.Literal("ACCEPTED_PENDING_CONVERGENCE"),
        observation: CurrentChannelObservationSchema,
      },
      { additionalProperties: false },
    ),
    CurrentMainReasonSchema("CONTENT_AHEAD_OF_ACCEPTANCE"),
    CurrentMainReasonSchema("BLOCKED_ACCEPTANCE_AUTHORITY"),
    CurrentMainReasonSchema("STALE_RECORD"),
    CurrentMainReasonSchema("FORGED_RECORD"),
    CurrentMainReasonSchema("DIRTY_REPOSITORY"),
    CurrentMainReasonSchema("WRONG_REPOSITORY"),
    CurrentMainReasonSchema("UNREACHABLE_REPOSITORY"),
  ]),
);

export type GitLocatorInput = Static<typeof GitLocatorSchema>;
export type ExactGitBlobPointerInput = Static<typeof ExactGitBlobPointerSchema>;
