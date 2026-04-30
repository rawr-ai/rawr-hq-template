import type { EffectBody } from "../../effect";
import type { EffectBoundaryContext, RuntimeResourceAccess } from "../../execution";

export interface DesktopExecutionContext<TInput = unknown> {
  readonly input: TInput;
  readonly resources: RuntimeResourceAccess;
  readonly execution: EffectBoundaryContext;
}

export interface DesktopEffectDescriptor<TInput = unknown, TOutput = unknown, TError = never> {
  readonly kind: "desktop.effect";
  readonly id: string;
  readonly surface: "background" | "window" | "menubar";
  readonly effect: EffectBody<DesktopExecutionContext<TInput>, TOutput, TError>;
}

export function defineDesktopBackground<TInput = unknown, TOutput = unknown, TError = never>(input: {
  readonly id: string;
  readonly effect: EffectBody<DesktopExecutionContext<TInput>, TOutput, TError>;
}): DesktopEffectDescriptor<TInput, TOutput, TError> {
  return {
    kind: "desktop.effect",
    surface: "background",
    id: input.id,
    effect: input.effect,
  };
}
