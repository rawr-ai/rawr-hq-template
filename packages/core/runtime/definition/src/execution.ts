import type { HabitatEffect, HabitatRetryPolicy, HabitatTimeoutPolicy } from "./effect";

export type ExecutionBoundaryKind =
  | "plugin.server-mcp-tool"
  | "plugin.server-mcp-resource"
  | "plugin.server-mcp-prompt"
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

export type ExecutionDescriptor<TInput, TOutput, TError, TContext> = EffectExecutionDescriptor<
  TInput,
  TOutput,
  TError,
  TContext
>;

export interface EffectExecutionDescriptor<
  TInput,
  TOutput,
  TError,
  TContext,
  TBoundary extends ExecutionBoundaryKind = ExecutionBoundaryKind,
> {
  readonly kind: "execution.effect";
  readonly executionId: string;
  readonly boundary: TBoundary;
  readonly policy: EffectExecutionPolicy;
  run(input: {
    readonly input: TInput;
    readonly context: TContext;
  }): HabitatEffect<TOutput, TError, unknown>;
}

export function defineEffectExecution<
  TInput,
  TOutput,
  TError,
  TContext,
  const TBoundary extends ExecutionBoundaryKind = ExecutionBoundaryKind,
>(
  descriptor: Omit<EffectExecutionDescriptor<TInput, TOutput, TError, TContext, TBoundary>, "kind">
): EffectExecutionDescriptor<TInput, TOutput, TError, TContext, TBoundary> {
  return Object.freeze({
    ...descriptor,
    kind: "execution.effect",
    policy: Object.freeze({ ...descriptor.policy }),
  });
}
