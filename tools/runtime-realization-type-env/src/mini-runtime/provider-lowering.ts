import { Effect as VendorEffect } from "effect";
import type { ProviderEffectPlan } from "../sdk/runtime/providers";
import type { RuntimeDiagnostic } from "../spine/artifacts";
import type { RawrEffect } from "../sdk/effect";

export interface ProviderLoweringExperiment<TValue = unknown> {
  readonly kind: "provider.lowering-experiment";
  readonly plan: ProviderEffectPlan<TValue>;
  readonly acquire: RawrEffect<TValue, unknown, never>;
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

export function lowerOpaqueProviderPlan<TValue>(
  plan: ProviderEffectPlan<TValue>,
  value: TValue,
): ProviderLoweringExperiment<TValue> {
  return {
    kind: "provider.lowering-experiment",
    plan,
    acquire: VendorEffect.succeed(value),
    diagnostics: [
      {
        code: "runtime.provider.effect-plan-shape-open",
        message:
          "ProviderEffectPlan lowering is executable in the lab only as an experiment until the public plan shape is locked.",
      },
    ],
  };
}
