import type { HabitatEffect, HabitatRetryPolicy, HabitatTimeoutPolicy } from "./effect";
import type { ProcedureExecutionContext } from "./execution-context";

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
  run(
    input: ProcedureExecutionContext<TInput, TContext>
  ): HabitatEffect<TOutput, TError, TRequirements>;
}

type AnyHabitatEffect = HabitatEffect<unknown, unknown, unknown>;

export type AsyncStepEffectProgram =
  | AnyHabitatEffect
  | Generator<AnyHabitatEffect, unknown, unknown>;

type AsyncStepProgramOutput<TProgram> =
  TProgram extends HabitatEffect<infer TOutput, unknown, unknown>
    ? TOutput
    : TProgram extends Generator<unknown, infer TOutput, unknown>
      ? TOutput
      : never;

type AsyncStepProgramYield<TProgram> =
  TProgram extends HabitatEffect<unknown, unknown, unknown>
    ? TProgram
    : TProgram extends Generator<infer TYield, unknown, unknown>
      ? TYield
      : never;

type AsyncStepProgramError<TProgram> =
  AsyncStepProgramYield<TProgram> extends infer TYield
    ? TYield extends HabitatEffect<unknown, infer TError, unknown>
      ? TError
      : never
    : never;

type AsyncStepProgramRequirements<TProgram> =
  AsyncStepProgramYield<TProgram> extends infer TYield
    ? TYield extends HabitatEffect<unknown, unknown, infer TRequirements>
      ? TRequirements
      : never
    : never;

export interface AsyncStepExecutionContext<
  TEvent = unknown,
  TClients extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
  TResources = unknown,
  TTelemetry = unknown,
  TExecution = unknown,
> {
  readonly event: TEvent;
  readonly clients: TClients;
  readonly resources: TResources;
  readonly telemetry: TTelemetry;
  readonly execution: TExecution;
}

export interface AsyncStepEffectDescriptor<
  TOutput = unknown,
  TError = unknown,
  TRequirements = unknown,
  TContext extends AsyncStepExecutionContext = AsyncStepExecutionContext,
> {
  readonly kind: "async.step-effect";
  readonly id: string;
  readonly policy: EffectExecutionPolicy;
  readonly effect: (
    context: TContext
  ) =>
    | HabitatEffect<TOutput, TError, TRequirements>
    | Generator<AnyHabitatEffect, TOutput, unknown>;
}

export function defineAsyncStepEffect<
  TContext extends AsyncStepExecutionContext = AsyncStepExecutionContext,
  TProgram extends AsyncStepEffectProgram = AsyncStepEffectProgram,
>(descriptor: {
  readonly id: string;
  readonly policy: EffectExecutionPolicy;
  readonly effect: (context: TContext) => TProgram;
}): AsyncStepEffectDescriptor<
  AsyncStepProgramOutput<TProgram>,
  AsyncStepProgramError<TProgram>,
  AsyncStepProgramRequirements<TProgram>,
  TContext
>;
export function defineAsyncStepEffect(descriptor: {
  readonly id: string;
  readonly policy: EffectExecutionPolicy;
  readonly effect: (context: never) => AsyncStepEffectProgram;
}): AsyncStepEffectDescriptor<unknown, unknown, unknown, never> {
  const retry =
    descriptor.policy.retry === undefined
      ? undefined
      : Object.freeze({ ...descriptor.policy.retry });
  const timeout =
    descriptor.policy.timeout === undefined
      ? undefined
      : Object.freeze({ ...descriptor.policy.timeout });

  return Object.freeze({
    ...descriptor,
    kind: "async.step-effect",
    policy: Object.freeze({
      ...descriptor.policy,
      ...(retry === undefined ? {} : { retry }),
      ...(timeout === undefined ? {} : { timeout }),
    }),
  });
}

export function defineEffectExecution<TInput, TOutput, TError, TContext, TRequirements>(
  descriptor: EffectExecutionDescriptor<TInput, TOutput, TError, TContext, TRequirements>
): EffectExecutionDescriptor<TInput, TOutput, TError, TContext, TRequirements> {
  return Object.freeze({
    ...descriptor,
    policy: Object.freeze({ ...descriptor.policy }),
  });
}
