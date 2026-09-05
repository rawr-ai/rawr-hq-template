import { Effect } from "effect";

import { defineRuntimeProvider } from "../../../../packages/core/runtime/definition/src/provider";
import { providerFx } from "../../../../packages/core/runtime/definition/src/provider-effect-plan";
import { RuntimeSchema } from "../../../../packages/core/runtime/schema/src/runtime-schema";
import type { FlushTelemetryInput, TelemetryResource } from "../../contract";
import { TelemetryRuntimeResource } from "../../runtime";
import {
  acquireOpenTelemetryNode,
  OpenTelemetryNodeConfigSchema,
  type OpenTelemetryNodeLease,
} from "./index";

/** Private source assembly; the composing owner supplies the finalization deadline. */
export function defineOpenTelemetryNodeRuntimeProvider(input: {
  readonly releaseDeadline: () => FlushTelemetryInput;
}) {
  return defineRuntimeProvider({
    id: "telemetry.opentelemetry-node",
    title: "OpenTelemetry Node",
    provides: TelemetryRuntimeResource,
    requires: [],
    configSchema: RuntimeSchema.fromTypeBox(OpenTelemetryNodeConfigSchema, {
      redaction: { paths: ["traces.headers", "metrics.headers", "logs.headers"] },
    }),
    build: ({ config }) => {
      // Keep the provider lease private while exposing only its neutral capability.
      const leases = new WeakMap<
        TelemetryResource,
        { readonly lease: OpenTelemetryNodeLease; release?: Effect.Effect<void> }
      >();
      return providerFx.acquireRelease({
        acquire: Effect.map(
          Effect.suspend(() => acquireOpenTelemetryNode({ config })),
          (lease) => {
            leases.set(lease.telemetry, { lease });
            return lease.telemetry;
          }
        ),
        release: (telemetry) =>
          Effect.suspend(() => {
            const owned = leases.get(telemetry);
            if (owned === undefined) throw new TypeError("Telemetry lease identity is not owned.");
            // Sample once at finalization, never when declaring or acquiring the provider.
            owned.release ??= Effect.asVoid(owned.lease.release(input.releaseDeadline()));
            return owned.release;
          }),
      });
    },
  });
}
