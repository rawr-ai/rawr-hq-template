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
  NativeMemberRestorationSource,
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

// Native controller adapters consume the service-owned provider vocabulary
// through this boundary; implementations remain at the CLI runtime edge.
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
