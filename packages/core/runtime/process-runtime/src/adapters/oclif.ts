import type { CompiledSurfacePlan } from "../../../compiler/src/index";
import { type RuntimeSchema, readExecutionProjection } from "../../../definition/src/index";
import type { ExecutionDescriptorRef } from "../../../derivation/src/index";
import type { SurfaceAdapter } from "../surface-adapter";
import type { NativeInvocationOptions } from "./agent-tools";

export interface LoweredCliCommand {
  readonly ref: Extract<ExecutionDescriptorRef, { readonly boundary: "plugin.cli-command" }>;
  readonly source: unknown;
  invoke(input: unknown, options?: NativeInvocationOptions): Promise<unknown>;
}

/** Native discovery data stays cold; only the selected compiled callbacks gain execution access. */
export function createOclifAdapter(input: {
  readonly harness: string;
}): SurfaceAdapter<CompiledSurfacePlan, readonly LoweredCliCommand[]> {
  return Object.freeze<SurfaceAdapter<CompiledSurfacePlan, readonly LoweredCliCommand[]>>({
    role: "cli",
    surface: "cli/commands",
    harness: input.harness,
    lower({ plan, serviceBindings, resources, executionRegistry, executionRuntime }) {
      if (plan.role !== "cli" || plan.surface !== "cli/commands" || executionRuntime === undefined)
        throw new TypeError(
          "CLI lowering requires its selected plan and process execution runtime."
        );
      const context = Object.freeze({ clients: serviceBindings, resources });
      const payloadSchemas: RuntimeSchema[] = [];
      const payload = Object.freeze(
        plan.executionDescriptorRefs.map((ref) => {
          const boundary = executionRegistry.get(ref);
          const projection = readExecutionProjection(boundary.descriptor);
          if (ref.boundary !== "plugin.cli-command" || projection?.kind !== "cli.command")
            throw new TypeError("CLI command boundary has no matching native source projection.");
          payloadSchemas.push(projection.input);
          return Object.freeze({
            ref,
            source: projection.source,
            invoke(raw: unknown, options: NativeInvocationOptions = {}) {
              return executionRuntime.execute({
                boundary,
                invocation: { ...options, input: raw, context },
              });
            },
          });
        })
      );
      return Object.freeze({
        payload,
        payloadSchemas: Object.freeze(payloadSchemas),
        findings: Object.freeze([]),
        observations: Object.freeze([
          Object.freeze({
            kind: "surface.lowered" as const,
            surfacePlanId: plan.surfacePlanId,
            executionIds: Object.freeze(payload.map(({ ref }) => ref.executionId)),
          }),
        ]),
      });
    },
  });
}
