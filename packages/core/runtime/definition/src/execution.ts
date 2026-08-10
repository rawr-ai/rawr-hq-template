import type { HabitatEffect, HabitatRetryPolicy, HabitatTimeoutPolicy } from "./effect";

export type ExecutionBoundaryKind =
  | "plugin.async-step"
  | "plugin.cli-command"
  | "plugin.web-surface"
  | "plugin.agent-tool"
  | "plugin.desktop-background";

export type ProviderEffectBoundaryKind = "provider.acquire" | "provider.release";

export type RuntimeEffectBoundaryKind =
  | ExecutionBoundaryKind
  | ProviderEffectBoundaryKind
  | "resource.operation";

export interface EffectExecutionPolicy {
  readonly retry?: HabitatRetryPolicy;
  readonly timeout?: HabitatTimeoutPolicy;
  readonly interruptible?: boolean;
}

export type ExecutionDescriptor<
  TInput,
  TOutput,
  TError,
  TContext,
  TRequirements = unknown,
> = EffectExecutionDescriptor<TInput, TOutput, TError, TContext, TRequirements>;

export interface EffectExecutionDescriptor<
  TInput,
  TOutput,
  TError,
  TContext,
  TRequirements = unknown,
> {
  readonly kind: "execution.effect";
  readonly executionId: string;
  readonly boundary: ExecutionBoundaryKind;
  readonly policy: EffectExecutionPolicy;
  run(input: {
    readonly input: TInput;
    readonly context: TContext;
  }): HabitatEffect<TOutput, TError, TRequirements>;
}

export function defineEffectExecution<TInput, TOutput, TError, TContext, TRequirements>(
  descriptor: EffectExecutionDescriptor<TInput, TOutput, TError, TContext, TRequirements>
): EffectExecutionDescriptor<TInput, TOutput, TError, TContext, TRequirements> {
  return Object.freeze({
    ...descriptor,
    policy: Object.freeze({ ...descriptor.policy }),
  });
}
