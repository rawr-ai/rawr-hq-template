import type { FlushTelemetryResult, TelemetryResource } from "@habitat-ai/resource-telemetry";
import {
  acquireOpenTelemetryNode,
  type OpenTelemetryNodeConfig,
  type OpenTelemetryNodeLease,
} from "@habitat-ai/resource-telemetry/providers/opentelemetry-node";
import { Effect, Exit, Scope } from "effect";
import type { DrainContext } from "evlog";
import type { Inngest } from "inngest";

/**
 * Process-owned telemetry value retained by the server host until shutdown.
 * It projects the provider's usable faces while keeping its Effect scope local
 * to the acquisition boundary.
 */
export type ServerTelemetryLifecycle = Readonly<{
  telemetry: TelemetryResource;
  effectContext: OpenTelemetryNodeLease["effectContext"];
  evlogDrain: (context: DrainContext) => Promise<void>;
  shutdown(deadlineMonotonicMilliseconds?: number): Promise<FlushTelemetryResult>;
}>;

/**
 * Acquires one selected Node telemetry provider under a process-lived Effect
 * scope. Repeated shutdown calls share the provider result and close the scope
 * only after the provider has stopped accepting observations.
 */
export async function acquireServerTelemetry(input: {
  config: OpenTelemetryNodeConfig;
  inngestClient: Inngest.Like;
}): Promise<ServerTelemetryLifecycle> {
  const scope = await Effect.runPromise(Scope.make());

  try {
    const lease = await Effect.runPromise(
      acquireOpenTelemetryNode({
        config: input.config,
        inngestClient: input.inngestClient,
      }).pipe(Scope.provide(scope))
    );
    const fallbackMilliseconds = input.config.enabled
      ? input.config.shutdownFallbackMilliseconds
      : 1_000;
    let shutdownPromise: Promise<FlushTelemetryResult> | undefined;

    return Object.freeze({
      telemetry: lease.telemetry,
      effectContext: lease.effectContext,
      evlogDrain: lease.evlogDrain,
      shutdown(deadlineMonotonicMilliseconds = performance.now() + fallbackMilliseconds) {
        shutdownPromise ??= Effect.runPromise(
          lease.shutdown({ deadlineMonotonicMilliseconds })
        ).finally(() => Effect.runPromise(Scope.close(scope, Exit.void)));
        return shutdownPromise;
      },
    });
  } catch (error) {
    await Effect.runPromise(Scope.close(scope, Exit.void));
    throw error;
  }
}
