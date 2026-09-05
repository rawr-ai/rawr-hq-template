import type { CompiledSurfacePlan } from "../../../compiler/src/compiled-process-plan";
import { type HabitatDurationInput } from "../../../definition/src/effect";
import { readExecutionProjection } from "../../../definition/src/execution";
import type { SurfaceAdapter } from "../surface-adapter";
import type { NativeInvocationOptions } from "./agent-tools";

export interface LoweredDesktopBackground {
  readonly id: string;
  readonly cadence: HabitatDurationInput;
  run(options?: NativeInvocationOptions): Promise<unknown>;
}

export function createDesktopBackgroundAdapter(input: {
  readonly harness: string;
}): SurfaceAdapter<CompiledSurfacePlan, readonly LoweredDesktopBackground[]> {
  return Object.freeze<SurfaceAdapter<CompiledSurfacePlan, readonly LoweredDesktopBackground[]>>({
    role: "desktop",
    surface: "desktop/background",
    harness: input.harness,
    lower({ plan, serviceBindings, resources, executionRegistry, executionRuntime }) {
      if (
        plan.role !== "desktop" ||
        plan.surface !== "desktop/background" ||
        executionRuntime === undefined
      )
        throw new TypeError(
          "Desktop lowering requires its selected plan and process execution runtime."
        );
      const context = Object.freeze({ clients: serviceBindings, resources });
      const payload = Object.freeze(
        plan.executionDescriptorRefs.map((ref) => {
          const boundary = executionRegistry.get(ref);
          const projection = readExecutionProjection(boundary.descriptor);
          if (
            ref.boundary !== "plugin.desktop-background" ||
            projection?.kind !== "desktop.background"
          )
            throw new TypeError(
              "Desktop background boundary has no matching operational projection."
            );
          return Object.freeze({
            id: ref.backgroundId,
            cadence: projection.cadence,
            run(options: NativeInvocationOptions = {}) {
              return executionRuntime.execute({
                boundary,
                invocation: { ...options, input: undefined, context },
              });
            },
          });
        })
      );
      return Object.freeze({
        payload,
        payloadSchemas: Object.freeze([]),
        findings: Object.freeze([]),
        observations: Object.freeze([
          Object.freeze({
            kind: "surface.lowered" as const,
            surfacePlanId: plan.surfacePlanId,
            executionIds: Object.freeze(plan.executionDescriptorRefs.map((ref) => ref.executionId)),
          }),
        ]),
      });
    },
  });
}
