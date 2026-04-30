import type { EffectBody } from "../../effect";
import type { EffectBoundaryContext, RuntimeResourceAccess } from "../../execution";

export interface WebLocalExecutionContext<TInput = unknown> {
  readonly input: TInput;
  readonly resources: RuntimeResourceAccess;
  readonly execution: EffectBoundaryContext;
}

export interface WebLocalEffectDescriptor<TInput = unknown, TOutput = unknown, TError = never> {
  readonly kind: "web.local-effect";
  readonly id: string;
  readonly effect: EffectBody<WebLocalExecutionContext<TInput>, TOutput, TError>;
}

export function defineWebLocalEffect<TInput = unknown, TOutput = unknown, TError = never>(input: {
  readonly id: string;
  readonly effect: EffectBody<WebLocalExecutionContext<TInput>, TOutput, TError>;
}): WebLocalEffectDescriptor<TInput, TOutput, TError> {
  return {
    kind: "web.local-effect",
    id: input.id,
    effect: input.effect,
  };
}
