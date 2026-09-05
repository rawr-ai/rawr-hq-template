import type { CompiledSurfacePlan } from "../../../compiler/src/compiled-process-plan";
import type { InngestMountPayload } from "../async-payload";
import type { SurfaceAdapter } from "../surface-adapter";

function createAdapter(
  surface: "async/workflow" | "async/schedule" | "async/consumer",
  input: { readonly harness: string }
): SurfaceAdapter<CompiledSurfacePlan, InngestMountPayload> {
  if (typeof input.harness !== "string" || input.harness.length === 0)
    throw new TypeError("An Inngest adapter requires a harness id.");
  return Object.freeze<SurfaceAdapter<CompiledSurfacePlan, InngestMountPayload>>({
    role: "async",
    surface,
    harness: input.harness,
    lower({ plan, nativeAsync }) {
      if (plan.role !== "async" || plan.surface !== surface || nativeAsync === undefined)
        throw new TypeError("Inngest lowering requires an exact selected async source.");
      return Object.freeze({
        payload: nativeAsync.bundle(),
        payloadSchemas: Object.freeze([]),
        findings: Object.freeze([]),
        observations: Object.freeze([
          {
            kind: "surface.lowered" as const,
            surfacePlanId: plan.surfacePlanId,
            executionIds: Object.freeze(plan.executionDescriptorRefs.map((ref) => ref.executionId)),
          },
        ]),
      });
    },
  });
}

export const createInngestWorkflowAdapter = (input: { readonly harness: string }) =>
  createAdapter("async/workflow", input);
export const createInngestScheduleAdapter = (input: { readonly harness: string }) =>
  createAdapter("async/schedule", input);
export const createInngestConsumerAdapter = (input: { readonly harness: string }) =>
  createAdapter("async/consumer", input);
