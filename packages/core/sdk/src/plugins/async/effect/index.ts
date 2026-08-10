import type { HabitatEffect } from "../../../../../runtime/definition/src";
import type { AsyncEventContext } from "../index";

export interface AsyncStepExecutionContext<TPayload = unknown> {
  readonly event: AsyncEventContext<TPayload>;
}

export type AsyncStepEffectDescriptor<TPayload, TOutput, TError, TRequirements> = Readonly<{
  readonly kind: "async.step-effect";
  readonly id: string;
  readonly effect: (
    context: AsyncStepExecutionContext<TPayload>
  ) => HabitatEffect<TOutput, TError, TRequirements>;
}>;

/** Declares an Effect body that the runtime may execute only inside a native durable step. */
export function defineAsyncStepEffect<TPayload, TOutput, TError, TRequirements>(input: {
  readonly id: string;
  readonly effect: (
    context: AsyncStepExecutionContext<TPayload>
  ) => HabitatEffect<TOutput, TError, TRequirements>;
}): AsyncStepEffectDescriptor<TPayload, TOutput, TError, TRequirements> {
  return Object.freeze({
    kind: "async.step-effect",
    id: input.id,
    effect: input.effect,
  });
}
