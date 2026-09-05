import { Cause, Context, Effect, Layer } from "effect";

import type { BootResourceKey } from "../../../bootgraph/src/index";
import { Effect as HabitatEffect } from "../../../definition/src/effect";
import type { RuntimeObservationPort } from "../../../definition/src/observation";
import type { RuntimeProvider } from "../../../definition/src/provider";
import { readProviderEffectPlan } from "../../../definition/src/provider-effect-plan";
import type { ResourceRequirement } from "../../../definition/src/resource";
import { applyExecutionPolicy } from "./execution-policy";
import { createResourceMap } from "./resource-map";

export interface ReadyProvider {
  readonly key: BootResourceKey;
  readonly provider: RuntimeProvider;
  readonly config: unknown;
  readonly dependencies: readonly (readonly [ResourceRequirement, string])[];
}

export interface ProviderLifecycleInput {
  readonly processId: string;
  readonly providers: readonly ReadyProvider[];
  readonly observation: RuntimeObservationPort;
}

export interface ProvisionedResourceValues {
  has(selectionId: string): boolean;
  get(selectionId: string): unknown;
}

export const ProvisionedResourceValues = Context.Service<ProvisionedResourceValues>(
  "habitat/runtime/provisioned-resource-values"
);

function observeReleaseFailure(
  input: ProviderLifecycleInput,
  entry: ReadyProvider,
  cause: Cause.Cause<unknown>
): Effect.Effect<void> {
  return Effect.sync(() =>
    input.observation.publish({
      phase: "provisioning",
      boundary: "provider.release",
      kind: "provider.release.failed",
      correlationId: input.processId,
      payload: Object.freeze({
        selectionId: entry.key.selectionId,
        providerId: entry.provider.id,
        typedFailure: Cause.hasFails(cause),
        defect: Cause.hasDies(cause),
        interrupted: Cause.hasInterrupts(cause),
      }),
    })
  ).pipe(Effect.catchCause(() => Effect.void));
}

export function createProviderLifecycleLayer(
  input: ProviderLifecycleInput
): Layer.Layer<ProvisionedResourceValues, unknown, never> {
  return Layer.effectContext(
    Effect.gen(function* () {
      const values = new Map<string, unknown>();
      const resources: ProvisionedResourceValues = Object.freeze({
        has: (selectionId: string): boolean => values.has(selectionId),
        get(selectionId: string): unknown {
          if (!values.has(selectionId)) {
            throw new TypeError("A provisioned resource selection is not available.");
          }
          return values.get(selectionId);
        },
      });

      for (const entry of input.providers) {
        const dependencies = entry.dependencies.map(
          ([requirement, selectionId]): readonly [ResourceRequirement, unknown] => [
            requirement,
            resources.get(selectionId),
          ]
        );
        const plan = entry.provider.build({
          config: entry.config,
          resources: createResourceMap(dependencies),
          observation: input.observation,
        });
        const bodies = readProviderEffectPlan(plan);
        const acquire = applyExecutionPolicy(bodies.acquire, {
          retry: plan.acquire.policy?.retry,
          interruptible: plan.acquire.policy?.interruptible,
        });
        const adapter = Effect.acquireRelease(acquire, (value) =>
          // A callback throw must occur inside the native finalizer, not while constructing it.
          Effect.suspend(() =>
            applyExecutionPolicy(bodies.release(value), plan.release.policy)
          ).pipe(
            Effect.withSpan("provider.release", { attributes: plan.release.telemetry }),
            Effect.catchCause((cause) => observeReleaseFailure(input, entry, cause))
          )
        );
        // Native acquisition masking protects registration unless the author opts into interruption.
        const bounded =
          plan.acquire.policy?.timeout === undefined
            ? adapter
            : HabitatEffect.timeout(adapter, plan.acquire.policy.timeout.duration);
        const value = yield* bounded.pipe(
          Effect.withSpan("provider.acquire", { attributes: plan.acquire.telemetry })
        );
        values.set(entry.key.selectionId, value);
      }

      return Context.make(ProvisionedResourceValues, resources);
    })
  );
}
