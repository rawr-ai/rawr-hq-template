import type { DeploymentResult } from "../errors/deployment-result";
import type {
  MarketplaceProjectionDigest,
  ProviderMarketplaceRegistration,
} from "../policy/marketplace";
import type { AgentProviderProjection } from "../policy/projection";
import type {
  ReceiptObservation,
  TargetIdentityObservation,
  TargetIdentitySidecar,
} from "../policy/state-machine";
import type { TargetReceipt } from "../policy/receipt";
import type { ProviderId, ProviderTarget } from "../dto/provider-target";

export interface TargetReceiptReader {
  read(target: ProviderTarget): Promise<DeploymentResult<ReceiptObservation>>;
}

export interface TargetReceiptWriter {
  publish(target: ProviderTarget, prior: ReceiptObservation, receipt: TargetReceipt): Promise<DeploymentResult<TargetReceipt>>;
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
