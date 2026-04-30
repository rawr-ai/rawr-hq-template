import type { EffectBody } from "../../effect";
import type { EffectBoundaryContext, RuntimeResourceAccess } from "../../execution";

export interface AgentToolExecutionContext<TInput = unknown> {
  readonly input: TInput;
  readonly resources: RuntimeResourceAccess;
  readonly execution: EffectBoundaryContext;
}

export interface AgentToolDefinition<TInput = unknown, TOutput = unknown, TError = never> {
  readonly kind: "agent.tool-effect";
  readonly id: string;
  readonly effect: EffectBody<AgentToolExecutionContext<TInput>, TOutput, TError>;
}

export function defineTool<TInput = unknown, TOutput = unknown, TError = never>(input: {
  readonly id: string;
  readonly effect: EffectBody<AgentToolExecutionContext<TInput>, TOutput, TError>;
}): AgentToolDefinition<TInput, TOutput, TError> {
  return {
    kind: "agent.tool-effect",
    id: input.id,
    effect: input.effect,
  };
}
