import type { CompleteSetArtifactRef } from "../../../shared/release";

import type { ContentRecordLocator } from "../model/dto/mode";
import type { AdapterProtocol, CapabilityProfileDigest, ProjectionDigest, RendererProtocol } from "../model/policy/projection";
import type { LifecycleRecordDigest } from "../model/policy/receipt";
import type { DeploymentResult } from "../model/errors/deployment-result";
import type { ProviderId } from "../model/dto/provider-target";

export interface AcceptedProviderProjectionBinding {
  readonly provider: ProviderId;
  readonly rendererProtocol: RendererProtocol;
  readonly adapterProtocol: AdapterProtocol;
  readonly capabilityProfileDigest: CapabilityProfileDigest;
  readonly projectionDigest: ProjectionDigest;
}

export type CanonicalChannelResolution =
  | Readonly<{ kind: "content-ahead-of-acceptance" }>
  | Readonly<{ kind: "blocked-acceptance-authority" }>
  | Readonly<{
    kind: "accepted-pending-convergence" | "current-eligible";
    releaseSet: CompleteSetArtifactRef;
    acceptanceDigest: LifecycleRecordDigest;
    promotionDigest: LifecycleRecordDigest;
    projections: readonly AcceptedProviderProjectionBinding[];
  }>;

export interface CanonicalChannelReader {
  resolve(locator: ContentRecordLocator): Promise<DeploymentResult<CanonicalChannelResolution>>;
}
