import type { CanonicalNativeObservation } from "../model/dto/canonical-convergence";
import type { ContentAuthority } from "../../../shared/release";
import { failure, issue, success, type DeploymentResult } from "../model/errors/deployment-result";
import type { ProviderId, ProviderTarget } from "../model/dto/provider-target";
import { inspectNativeInventory, type NativeProviderInventoryBridge } from "./native";

export interface CanonicalNativeObserver {
  observe(
    target: ProviderTarget,
    contentAuthority: ContentAuthority
  ): Promise<DeploymentResult<CanonicalNativeObservation>>;
}

export function createCanonicalNativeObserver(
  input: Readonly<{
    provider: ProviderId;
    contentAuthority: ContentAuthority;
    bridge: NativeProviderInventoryBridge;
  }>
): CanonicalNativeObserver {
  return Object.freeze({
    observe: async (target: ProviderTarget, contentAuthority: ContentAuthority) => {
      if (contentAuthority !== input.contentAuthority) {
        return failure([
          issue(
            "BLOCKED_COLLISION",
            "target.inventory.contentAuthority",
            "Canonical observer is bound to another content authority",
            input.contentAuthority,
            contentAuthority
          ),
        ]);
      }
      const inspection = await inspectNativeInventory({
        provider: input.provider,
        bridge: input.bridge,
        target,
      });
      if (inspection.kind === "observed") {
        return success(
          Object.freeze({
            kind: "observed",
            inventory: inspection.inventory,
          })
        );
      }
      if (inspection.kind === "failed") return failure([inspection.issue]);
      return success(
        Object.freeze({
          kind: "ambiguous-provenance",
          target,
          reason: inspection.reason,
        })
      );
    },
  });
}
