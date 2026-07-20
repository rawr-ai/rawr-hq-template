import type { CanonicalNativeObservation } from "../../service/modules/providers/model/dto/canonical-convergence";
import {
  failure,
  success,
  type DeploymentResult,
} from "../../service/modules/providers/model/errors/deployment-result";
import type {
  ProviderId,
  ProviderTarget,
} from "../../service/modules/providers/model/dto/provider-target";
import {
  inspectNativeInventory,
  type NativeProviderInventoryBridge,
} from "./native";

export interface CanonicalNativeObserver {
  observe(target: ProviderTarget): Promise<DeploymentResult<CanonicalNativeObservation>>;
}

export function createCanonicalNativeObserver(input: Readonly<{
  provider: ProviderId;
  bridge: NativeProviderInventoryBridge;
}>): CanonicalNativeObserver {
  return Object.freeze({
    observe: async (target: ProviderTarget) => {
      const inspection = await inspectNativeInventory({
        provider: input.provider,
        bridge: input.bridge,
        target,
      });
      if (inspection.kind === "observed") {
        return success(Object.freeze({
          kind: "observed",
          inventory: inspection.inventory,
        }));
      }
      if (inspection.kind === "failed") return failure([inspection.issue]);
      return success(Object.freeze({
        kind: "ambiguous-provenance",
        target,
        reason: inspection.reason,
      }));
    },
  });
}
