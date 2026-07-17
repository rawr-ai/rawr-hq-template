import type { DeploymentResult } from "../domain/result";
import type {
  MarketplaceProjectionDigest,
  ProviderMarketplaceRegistration,
} from "../domain/marketplace";
import type { AgentProviderProjection, ProjectionDigest } from "../domain/projection";
import type {
  NativeMemberObservation,
  ReceiptObservation,
  TargetIdentityObservation,
  TargetIdentitySidecar,
} from "../domain/state";
import type { TargetReceipt } from "../domain/receipt";
import type { ProviderId, ProviderTarget } from "../domain/target";

export interface TargetReceiptReader {
  read(target: ProviderTarget): Promise<DeploymentResult<ReceiptObservation>>;
}

export interface TargetReceiptWriter {
  publish(target: ProviderTarget, prior: ReceiptObservation, receipt: TargetReceipt): Promise<DeploymentResult<TargetReceipt>>;
  remove(target: ProviderTarget, prior: TargetReceipt): Promise<DeploymentResult<null>>;
}

export interface TargetIdentityReader {
  read(target: ProviderTarget): Promise<DeploymentResult<TargetIdentityObservation>>;
}

export interface TargetIdentityWriter {
  admit(target: ProviderTarget, sidecar: TargetIdentitySidecar): Promise<DeploymentResult<TargetIdentitySidecar>>;
}

export interface CompleteTargetIdentityReader {
  readAll(): Promise<DeploymentResult<readonly TargetIdentitySidecar[]>>;
}

export interface ProjectionMaterializationObservation {
  readonly kind: "existing" | "published";
  readonly projectionDigest: AgentProviderProjection["projectionDigest"];
}

export interface ProviderProjectionMaterializer {
  materialize(
    projection: AgentProviderProjection,
  ): Promise<DeploymentResult<ProjectionMaterializationObservation>>;
}

export interface MarketplaceMaterializationObservation {
  readonly kind: "existing" | "published";
  readonly projectionDigest: MarketplaceProjectionDigest;
  readonly sourceDigest: ProviderMarketplaceRegistration["sourceDigest"];
}

export interface ProviderMarketplaceMaterializer {
  materialize(
    provider: ProviderId,
    registration: ProviderMarketplaceRegistration,
  ): Promise<DeploymentResult<MarketplaceMaterializationObservation>>;
}

export interface ProviderMarketplaceSource {
  readonly projectionDigest: MarketplaceProjectionDigest;
  readonly sourceDigest: ProviderMarketplaceRegistration["sourceDigest"];
}

export interface ProviderMarketplaceSourceReader {
  read(
    target: ProviderTarget,
    registration: ProviderMarketplaceRegistration,
  ): Promise<DeploymentResult<ProviderMarketplaceSource>>;
}

export interface PriorProjectionSourceObservation {
  readonly projectionDigest: ProjectionDigest;
  readonly memberFingerprint: NativeMemberObservation["memberFingerprint"];
}

export interface ProviderPriorProjectionReader {
  readArchivedMember(
    projectionDigest: ProjectionDigest,
    prior: NativeMemberObservation,
  ): Promise<DeploymentResult<PriorProjectionSourceObservation>>;
}
