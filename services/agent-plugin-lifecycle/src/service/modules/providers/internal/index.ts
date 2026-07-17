export {
  parseCanonicalStatusRequest,
  parseManagedRetireRequest,
  parseProviderDeploymentRequest,
  type CanonicalStatusRequest,
  type CanonicalSync,
  type CompleteTest,
  type ContentRecordLocator,
  type EvaluationProfile,
  type ManagedRetireRequest,
  type ProviderDeploymentRequest,
  type ProviderRequestDigest,
  type TargetedTest,
} from "./domain/mode";

export {
  CLAUDE_RENDERER_PROTOCOL,
  CODEX_RENDERER_PROTOCOL,
  PROVIDER_ARTIFACT_AUTHORITY_PROTOCOL,
  PROVIDER_PROJECTION_SCHEMA_VERSION,
  artifactAuthorityValue,
  evaluateCapabilities,
  parseAdapterProtocol,
  parseCapabilityProfileDigest,
  parseProjectionDigest,
  providerSourceIdentity,
  providerSourceTreeValue,
  renderCompleteProjection,
  renderTargetedProjection,
  type AdapterProtocol,
  type AgentProviderProjection,
  type CapabilityEvaluation,
  type CapabilityObservation,
  type CapabilityProfile,
  type CapabilityProfileDigest,
  type ProjectionDigest,
  type ProviderArtifactAuthority,
  type ProviderCapability,
  type ProviderMemberFingerprint,
  type ProviderMarketplaceProjection,
  type ProviderPackageFile,
  type ProviderProjectionMember,
  type ProviderSourceIdentity,
  type ProviderSourceDigest,
  type ProviderVisibleClaimSet,
  type RendererProtocol,
} from "./domain/projection";

export {
  createProviderMarketplaceRegistration,
  marketplaceObservationValue,
  marketplaceState,
  marketplaceStateValue,
  sameMarketplaceState,
  type MarketplaceProjectionDigest,
  type ProviderMarketplaceMemberSource,
  type ProviderMarketplaceObservation,
  type ProviderMarketplaceRegistration,
  type ProviderMarketplaceState,
} from "./domain/marketplace";

export {
  canonicalSerializeTargetReceipt,
  createTargetReceipt,
  decodeTargetReceipt,
  parseLifecycleRecordDigest,
  verifyTargetReceipt,
  visibleFingerprint,
  type CanonicalAcceptedScope,
  type CompleteTestScope,
  type LifecycleRecordDigest,
  type ManagedMemberClaim,
  type ReceiptLineage,
  type TargetReceipt,
  type TargetReceiptBody,
  type TargetReceiptDigest,
  type TargetReceiptScope,
  type TargetedTestScope,
  type VerifiedMemberIdentity,
  type VisibleFingerprint,
} from "./domain/receipt";

export {
  createProviderInventory,
  createTargetIdentitySidecar,
  hasCanonicalProjectionCollision,
  hasProjectionCollision,
  hasProjectionExposureCollision,
  planManagedRetire,
  planTarget,
  type DeploymentAuthority,
  type InventoryFingerprint,
  type NativeMemberObservation,
  type NativeStandaloneExposureObservation,
  type PlanTargetInput,
  type ProviderInventory,
  type ProviderMutationAction,
  type ProviderMutationPostState,
  type ProviderPlanStep,
  type ProviderTargetPlan,
  type ReceiptObservation,
  type TargetIdentityDigest,
  type TargetIdentityObservation,
  type TargetIdentitySidecar,
} from "./domain/state";

export {
  CONTROLLER_PROTOCOL,
  PROVIDER_EVIDENCE_SCHEMA_PROTOCOL,
  createMechanicalProviderEvidence,
  mechanicalTargetFactDigest,
  parseMechanicalEvidenceDigest,
  type MechanicalEvidenceDigest,
  type MechanicalTargetFactDigest,
  type MechanicalEvidenceSource,
  type MechanicalProviderEvidence,
  type MechanicalProviderEvidenceBody,
  type ProviderVerificationFact,
} from "./domain/evidence";
export { decodeMechanicalProviderEvidence } from "./domain/evidence-codec";
export {
  createCompleteNativeHomesObservation,
  type CompleteNativeHomesDigest,
  type CompleteNativeHomesObservation,
} from "./domain/native-homes";

export type {
  CanonicalStatusOutcome,
  CanonicalTargetStatus,
  ProviderEvent,
  ProviderOperationOutcome,
  TargetOperationOutcome,
} from "./domain/outcome";
export type {
  DeploymentResult,
  NonEmptyReadonlyArray,
  ProviderDeploymentIssue,
  ProviderDeploymentIssueCode,
} from "./domain/result";
export {
  parseProviderTarget,
  parseProviderTargets,
  type ProviderHome,
  type ProviderId,
  type ProviderTarget,
  type ProviderTargetDigest,
} from "./domain/target";

export type { VerifiedReleaseReader } from "./ports/artifact";
export type {
  ProviderAppliedObservation,
  ProviderUndoCandidate,
  ProviderUndoSession,
  ProviderUndoWriter,
} from "./ports/undo-writer";
export type {
  AcceptedProviderProjectionBinding,
  CanonicalChannelReader,
  CanonicalChannelResolution,
} from "./ports/channel";
export type {
  MechanicalEvidenceHandle,
  MechanicalEvidenceObservation,
  MechanicalEvidencePublisher,
} from "./ports/evidence";
export type {
  NativeMutationObservation,
  NativeMemberRestorationPort,
  NativeMemberRestorationSource,
  NativeProviderMutationAction,
  ProviderTargetMutator,
  ProviderTargetReader,
  ProviderVisibilityObservation,
} from "./ports/provider";
export type {
  CompleteTargetIdentityReader,
  MarketplaceMaterializationObservation,
  PriorProjectionSourceObservation,
  ProjectionMaterializationObservation,
  ProviderMarketplaceMaterializer,
  ProviderMarketplaceSource,
  ProviderMarketplaceSourceReader,
  ProviderPriorProjectionReader,
  ProviderProjectionMaterializer,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "./ports/state";

export {
  createTargetedTest,
  type TargetedTestApplication,
  type TargetedTestDependencies,
} from "./applications/targeted-test";
export {
  createCompleteTest,
  type CompleteTestApplication,
  type CompleteTestDependencies,
} from "./applications/complete-test";
export {
  createCanonicalSync,
  type CanonicalSyncApplication,
  type CanonicalSyncDependencies,
} from "./applications/canonical-sync";
export {
  createCanonicalStatus,
  type CanonicalStatusApplication,
  type CanonicalStatusDependencies,
} from "./applications/canonical-status";
export { createGovernedCanonicalChannelReader } from "./applications/governed-channel";
export {
  createManagedRetire,
  type ManagedRetireApplication,
  type ManagedRetireDependencies,
} from "./applications/managed-retire";
export {
  createCompleteNativeHomesReader,
  type CompleteNativeHomesApplication,
  type CompleteNativeHomesDependencies,
} from "./applications/complete-native-homes";
