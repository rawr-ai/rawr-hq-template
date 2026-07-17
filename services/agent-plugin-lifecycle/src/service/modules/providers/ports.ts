import type { MechanicalEvidencePublisher } from "./internal/ports/evidence";
import type { ProviderUndoWriter as ProviderUndoWriterPort } from "./internal/ports/undo-writer";
import type { VerifiedReleaseReader } from "./internal/ports/artifact";
import type { ProviderTargetMutator, ProviderTargetReader } from "./internal/ports/provider";
import type {
  CompleteTargetIdentityReader,
  ProviderMarketplaceMaterializer,
  ProviderPriorProjectionReader,
  ProviderProjectionMaterializer,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "./internal/ports/state";

/**
 * Write-only admission into the controller-owned undo capsule.
 *
 * The lifecycle service cannot read, replay, clear, or select a capsule.
 */
export type {
  ProviderAppliedObservation,
  ProviderUndoCandidate,
  ProviderUndoSession,
  ProviderUndoWriter,
} from "./internal/ports/undo-writer";

export interface ProviderLifecycleRuntime {
  readonly releases: VerifiedReleaseReader;
  readonly provider: ProviderTargetReader;
  readonly providerMutator: ProviderTargetMutator;
  readonly receipts: TargetReceiptReader;
  readonly receiptWriter: TargetReceiptWriter;
  readonly identities: TargetIdentityReader & CompleteTargetIdentityReader;
  readonly identityWriter: TargetIdentityWriter;
  readonly projectionMaterializer: ProviderProjectionMaterializer;
  readonly marketplaceMaterializer: ProviderMarketplaceMaterializer;
  readonly priorProjections: ProviderPriorProjectionReader;
  readonly undoWriter: ProviderUndoWriterPort;
  readonly evidence: MechanicalEvidencePublisher;
}

export type { VerifiedReleaseReader } from "./internal/ports/artifact";
export type {
  AcceptedProviderProjectionBinding,
  CanonicalChannelReader,
  CanonicalChannelResolution,
} from "./internal/ports/channel";
export type {
  MechanicalEvidenceHandle,
  MechanicalEvidenceObservation,
  MechanicalEvidencePublisher,
} from "./internal/ports/evidence";
export type {
  NativeMutationObservation,
  NativeMemberRestorationPort,
  NativeProviderMutationAction,
  ProviderTargetMutator,
  ProviderTargetReader,
  ProviderVisibilityObservation,
} from "./internal/ports/provider";
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
} from "./internal/ports/state";
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
} from "./internal/ports/projection-storage";
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
} from "./internal/ports/target-record-storage";

export type { CanonicalValue } from "./internal/domain/canonical";
export type {
  MechanicalEvidenceDigest,
  MechanicalEvidenceSource,
  MechanicalProviderEvidence,
  MechanicalProviderEvidenceBody,
  MechanicalTargetFactDigest,
  ProviderVerificationFact,
} from "./internal/domain/evidence";
export type {
  MarketplaceProjectionDigest,
  ProviderMarketplaceMemberSource,
  ProviderMarketplaceObservation,
  ProviderMarketplaceRegistration,
  ProviderMarketplaceState,
} from "./internal/domain/marketplace";
export type {
  CanonicalStatusRequest,
  CanonicalSync,
  CompleteTest,
  ContentRecordLocator,
  ContentWorkspaceRoot,
  EvaluationProfile,
  ManagedRetireRequest,
  ProviderDeploymentRequest,
  ProviderRequestDigest,
  TargetedTest,
} from "./internal/domain/mode";
export type {
  CompleteNativeHomesDigest,
  CompleteNativeHomesObservation,
} from "./internal/domain/native-homes";
export type {
  CanonicalStatusOutcome,
  CanonicalTargetStatus,
  ProviderEvent,
  ProviderOperationOutcome,
  TargetOperationOutcome,
} from "./internal/domain/outcome";
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
} from "./internal/domain/projection";
export type {
  CanonicalAcceptedScope,
  CompleteTestScope,
  LifecycleRecordDigest,
  ManagedMemberClaim,
  ReceiptLineage,
  TargetReceipt,
  TargetReceiptBody,
  TargetReceiptDigest,
  TargetReceiptScope,
  TargetedTestScope,
  VerifiedMemberIdentity,
  VisibleFingerprint,
} from "./internal/domain/receipt";
export type {
  DeploymentResult,
  NonEmptyReadonlyArray,
  ProviderDeploymentIssue,
  ProviderDeploymentIssueCode,
} from "./internal/domain/result";
export type {
  DeploymentAuthority,
  InventoryFingerprint,
  NativeMemberObservation,
  NativeStandaloneExposureObservation,
  PlanTargetInput,
  ProviderInventory,
  ProviderMutationAction,
  ProviderMutationPostState,
  ProviderPlanStep,
  ProviderTargetPlan,
  ReceiptObservation,
  TargetIdentityDigest,
  TargetIdentityObservation,
  TargetIdentitySidecar,
} from "./internal/domain/state";
export type {
  ProviderHome,
  ProviderId,
  ProviderTarget,
  ProviderTargetDigest,
} from "./internal/domain/target";
export type {
  ProviderMemberRestoreContext,
  ProviderOwnerRuntime,
} from "./internal/ports/owner";
export type {
  ClaudeNativeResourceSession,
  ClaudeProviderAdapter,
  CodexNativeResourceSession,
  CodexProviderAdapter,
  NativeProviderAdapter,
  NativeProviderResourcePort,
  NativeResourceCapabilityProbe,
  NativeResourceJsonObservation,
  NativeResourcePackageEntry,
  NativeResourcePackageObservation,
  NativeResourceMarketplaceReadInput,
  NativeResourcePackageReadLimits,
  NativeResourcePluginReadInput,
  NativeResourceSessionInput,
  PathlessProjectionStorage,
  ResourceClaudeProviderAdapterOptions,
  ResourceCodexProviderAdapterOptions,
} from "./internal";
