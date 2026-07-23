import type { ContentAuthority } from "../../../../shared/release";

import type {
  CanonicalNativeMutationAction,
  CanonicalNativeObservation,
} from "../dto/canonical-convergence";
import type { ProviderTarget } from "../dto/provider-target";
import type { DeploymentResult } from "../errors/deployment-result";
import type { CapabilityObservation } from "../policy/projection";
import type { NativeMutationAttempt } from "./provider";

/** The complete native boundary available to canonical sync and status. */
export interface CanonicalNativeRuntime {
  inspectCapabilities(
    target: ProviderTarget,
    contentAuthority: ContentAuthority
  ): Promise<DeploymentResult<CapabilityObservation>>;
  observe(
    target: ProviderTarget,
    contentAuthority: ContentAuthority
  ): Promise<DeploymentResult<CanonicalNativeObservation>>;
  apply(action: CanonicalNativeMutationAction): Promise<NativeMutationAttempt>;
}
