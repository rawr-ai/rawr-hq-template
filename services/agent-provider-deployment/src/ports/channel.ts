import type { CompleteSetArtifactRef } from "@rawr/agent-plugin-release";

import type { ContentRecordLocator } from "../domain/mode";
import type { AdapterProtocol, CapabilityProfileDigest, ProjectionDigest, RendererProtocol } from "../domain/projection";
import type { LifecycleRecordDigest } from "../domain/receipt";
import type { DeploymentResult } from "../domain/result";
import type { ProviderId } from "../domain/target";

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
