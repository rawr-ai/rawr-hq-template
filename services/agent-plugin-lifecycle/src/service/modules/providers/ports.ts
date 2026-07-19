import type { MechanicalEvidencePublisher } from "./ports/evidence";
import type { VerifiedReleaseReader } from "./ports/artifact";
import type { CanonicalNativeRuntime } from "./ports/canonical-native";
import type { CurrentMainSelectionReader } from "./ports/current-main";
import type { ProviderTargetMutator, ProviderTargetReader } from "./ports/provider";
import type {
  CompleteTargetIdentityReader,
  ProviderMarketplaceMaterializer,
  ProviderProjectionMaterializer,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "./ports/state";

export interface ProviderLifecycleRuntime {
  readonly currentMain: CurrentMainSelectionReader;
  readonly canonicalNative: CanonicalNativeRuntime;
  readonly releases: VerifiedReleaseReader;
  readonly provider: ProviderTargetReader;
  readonly providerMutator: ProviderTargetMutator;
  readonly receipts: TargetReceiptReader;
  readonly receiptWriter: TargetReceiptWriter;
  readonly identities: TargetIdentityReader & CompleteTargetIdentityReader;
  readonly identityWriter: TargetIdentityWriter;
  readonly projectionMaterializer: ProviderProjectionMaterializer;
  readonly marketplaceMaterializer: ProviderMarketplaceMaterializer;
  readonly evidence: MechanicalEvidencePublisher;
}

export type { VerifiedReleaseReader } from "./ports/artifact";
export type { CanonicalNativeRuntime } from "./ports/canonical-native";
export type { CurrentMainSelectionReader } from "./ports/current-main";
export type {
  MechanicalEvidenceHandle,
  MechanicalEvidenceObservation,
  MechanicalEvidencePublisher,
} from "./ports/evidence";
export type {
  NativeMutationAttempt,
  NativeProviderMutationAction,
  ProviderTargetMutator,
  ProviderTargetReader,
  ProviderVisibilityObservation,
} from "./ports/provider";
export type {
  CompleteTargetIdentityReader,
  MarketplaceMaterializationObservation,
  ProjectionMaterializationObservation,
  ProviderMarketplaceMaterializer,
  ProviderMarketplaceSource,
  ProviderMarketplaceSourceReader,
  ProviderProjectionMaterializer,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "./ports/state";
export type {
  FlatProjectionRecordCollection,
  ImmutableProviderTreeCollection,
  ImmutableProviderTreeFile,
  ImmutableProviderTreeKey,
  ImmutableProviderTreeObservation,
  ImmutableProviderTreePublication,
  ProjectionRecordKey,
  ProjectionRecordObservation,
  ProjectionRecordPublication,
} from "./ports/projection-storage";
export type {
  PathlessTargetRecordCollection,
  TargetRecordCapture,
  TargetRecordCaptureHandle,
  TargetRecordKey,
  TargetRecordKind,
  TargetRecordMutation,
  TargetRecordObservation,
  TargetRecordPlanDigest,
  TargetRecordPlanInput,
  TargetRecordReadToken,
  TargetRecordRestoreObservation,
  TargetRecordScanEntry,
  TargetRecordWriteObservation,
} from "./ports/target-record-storage";

export type { CanonicalValue } from "./model/helpers/canonical";
export type {
  MechanicalEvidenceDigest,
  MechanicalEvidenceSource,
  MechanicalProviderEvidence,
  MechanicalProviderEvidenceBody,
  MechanicalTargetFactDigest,
  ProviderVerificationFact,
} from "./model/dto/mechanical-evidence";
export type {
  MarketplaceProjectionDigest,
  ProviderMarketplaceMemberSource,
  ProviderMarketplaceObservation,
  ProviderMarketplaceRegistration,
  ProviderMarketplaceState,
} from "./model/policy/marketplace";
export type {
  CanonicalStatusRequest,
  CanonicalSync,
  CompleteTest,
  ContentRecordLocator,
  ContentWorkspaceRoot,
  EvaluationProfile,
  ProviderDeploymentRequest,
  ProviderRequestDigest,
  TargetedTest,
} from "./model/dto/mode";
export type {
  CompleteNativeHomesDigest,
  CompleteNativeHomesObservation,
} from "./model/dto/native-homes";
export type {
  CanonicalMutationRecord,
  CanonicalStatusOutcome,
  CanonicalSyncOutcome,
  CanonicalSyncTargetOutcome,
  CanonicalTargetStatus,
  ProviderEvent,
  ProviderOperationOutcome,
  TargetOperationOutcome,
} from "./model/dto/outcome";
export type {
  CanonicalConvergencePlan,
  CanonicalExecutionResult,
  CanonicalNativeMutationAction,
  CanonicalNativeObservation,
  CanonicalObservedConvergencePlan,
} from "./model/dto/canonical-convergence";
export type {
  AdapterProtocol,
  AgentProviderProjection,
  CapabilityEvaluation,
  CapabilityObservation,
  CapabilityProfile,
  CapabilityProfileDigest,
  ProjectionDigest,
  ProjectionSource,
  ProviderArtifactAuthority,
  ProviderCapability,
  ProviderMarketplaceProjection,
  ProviderMemberFingerprint,
  ProviderPackageFile,
  ProviderProjectionMember,
  ProviderSourceDigest,
  ProviderSourceIdentity,
  ProviderVisibleClaimSet,
  RendererProtocol,
} from "./model/policy/projection";
export type {
  CompleteTestScope,
  ManagedMemberClaim,
  ReceiptLineage,
  TargetReceipt,
  TargetReceiptBody,
  TargetReceiptDigest,
  TargetReceiptScope,
  TargetedTestScope,
  VerifiedMemberIdentity,
  VisibleFingerprint,
} from "./model/policy/receipt";
export type {
  DeploymentResult,
  NonEmptyReadonlyArray,
  ProviderDeploymentIssue,
  ProviderDeploymentIssueCode,
} from "./model/errors/deployment-result";
export type {
  DeploymentAuthority,
  InventoryFingerprint,
  NativeMemberObservation,
  NativeStandaloneExposureObservation,
  PlanTargetInput,
  ProviderInventory,
  ProviderMutationAction,
  ProviderPlanStep,
  ProviderTargetPlan,
  ReceiptObservation,
  TargetIdentityDigest,
  TargetIdentityObservation,
  TargetIdentitySidecar,
} from "./model/policy/state-machine";
export type {
  ProviderHome,
  ProviderId,
  ProviderTarget,
  ProviderTargetDigest,
} from "./model/dto/provider-target";
