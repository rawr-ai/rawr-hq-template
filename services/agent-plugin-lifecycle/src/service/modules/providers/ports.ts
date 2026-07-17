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

// The service owns native lifecycle interpretation. Runtime bindings provide
// only the selected resource implementation and explicit acquisition inputs.
export * from "./internal/domain/canonical";
export * from "./internal/domain/evidence";
export * from "./internal/domain/evidence-codec";
export * from "./internal/domain/marketplace";
export * from "./internal/domain/mode";
export * from "./internal/domain/native-homes";
export * from "./internal/domain/outcome";
export * from "./internal/domain/projection";
export {
  canonicalSerializeTargetReceipt,
  createTargetReceipt,
  decodeTargetReceipt,
  parseLifecycleRecordDigest,
  receiptBodyValue,
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
} from "./internal/domain/receipt";
export * from "./internal/domain/result";
export * from "./internal/domain/state";
export * from "./internal/domain/target";
export type {
  ProviderMemberRestoreContext,
  ProviderOwnerRuntime,
} from "./internal/ports/owner";
export {
  CLAUDE_ADAPTER_PROTOCOL,
  CODEX_ADAPTER_PROTOCOL,
  createResourceClaudeProviderAdapter,
  createResourceCodexProviderAdapter,
  createPathlessProjectionStorage,
  createPathlessTargetState,
  type ClaudeNativeResourceSession,
  type ClaudeProviderAdapter,
  type CodexNativeResourceSession,
  type CodexProviderAdapter,
  type NativeProviderAdapter,
  type NativeProviderResourcePort,
  type NativeResourceCapabilityProbe,
  type NativeResourceJsonObservation,
  type NativeResourcePackageEntry,
  type NativeResourcePackageObservation,
  type NativeResourceMarketplaceReadInput,
  type NativeResourcePackageReadLimits,
  type NativeResourcePluginReadInput,
  type NativeResourceSessionInput,
  type ResourceClaudeProviderAdapterOptions,
  type ResourceCodexProviderAdapterOptions,
  type PathlessProjectionStorage,
} from "./internal";
