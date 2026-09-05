import type { CompiledSurfacePlan } from "../../../compiler/src/index";
import { type RuntimeSchema, readExecutionProjection } from "../../../definition/src/index";
import type { ProcessExecutionInvocation } from "../execution-runtime";
import type { SurfaceAdapter } from "../surface-adapter";

export type NativeInvocationOptions = Omit<
  ProcessExecutionInvocation<unknown, unknown>,
  "input" | "context"
>;

export interface LoweredAgentTool {
  readonly id: string;
  readonly description: string;
  readonly inputSchema: RuntimeSchema;
  invoke(input: unknown, options?: NativeInvocationOptions): Promise<unknown>;
}

/** No host is selected implicitly; the selected host names its own mounting contract. */
export function createAgentToolsAdapter(input: {
  readonly harness: string;
}): SurfaceAdapter<CompiledSurfacePlan, readonly LoweredAgentTool[]> {
  return Object.freeze<SurfaceAdapter<CompiledSurfacePlan, readonly LoweredAgentTool[]>>({
    role: "agent",
    surface: "agent/tools",
    harness: input.harness,
    lower({ plan, serviceBindings, resources, executionRegistry, executionRuntime }) {
      if (plan.role !== "agent" || plan.surface !== "agent/tools" || executionRuntime === undefined)
        throw new TypeError(
          "Agent tool lowering requires its selected plan and process execution runtime."
        );
      const context = Object.freeze({ clients: serviceBindings, resources });
      const payload = Object.freeze(
        plan.executionDescriptorRefs.map((ref) => {
          const boundary = executionRegistry.get(ref);
          const projection = readExecutionProjection(boundary.descriptor);
          if (ref.boundary !== "plugin.agent-tool" || projection?.kind !== "agent.tool")
            throw new TypeError("Agent tool boundary has no matching operational projection.");
          return Object.freeze({
            id: ref.toolId,
            description: projection.description,
            inputSchema: projection.input,
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
        payloadSchemas: Object.freeze(payload.map((tool) => tool.inputSchema)),
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
