import type { ContentAuthority } from "../../../shared/release";

import type {
  CanonicalNativeMutationAction,
  CanonicalNativeObservation,
} from "../model/dto/canonical-convergence";
import type { CapabilityObservation } from "../model/policy/projection";
import type { DeploymentResult } from "../model/errors/deployment-result";
import type { ProviderTarget } from "../model/dto/provider-target";
import type { NativeMutationAttempt } from "./provider";

/** The complete native boundary available to canonical sync and status. */
export interface CanonicalNativeRuntime {
  inspectCapabilities(
    target: ProviderTarget,
    contentAuthority: ContentAuthority,
  ): Promise<DeploymentResult<CapabilityObservation>>;
  observe(
    target: ProviderTarget,
    contentAuthority: ContentAuthority,
  ): Promise<DeploymentResult<CanonicalNativeObservation>>;
  apply(
    action: CanonicalNativeMutationAction,
  ): Promise<NativeMutationAttempt>;
}
