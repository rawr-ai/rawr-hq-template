import type { RuntimeSchema } from "../../schema/src/runtime-schema";
import type {
  HabitatDurationInput,
  HabitatEffect,
  HabitatRetryPolicy,
  HabitatTimeoutPolicy,
} from "./effect";
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

const executionProjection = Symbol("habitat.execution-projection");

export type ExecutionProjection<TInput = unknown> =
  | {
      readonly kind: "cli.command";
      readonly input: RuntimeSchema<TInput>;
      readonly source: unknown;
    }
  | {
      readonly kind: "agent.tool";
      readonly input: RuntimeSchema<TInput>;
      readonly description: string;
    }
  | {
      readonly kind: "desktop.background";
      readonly cadence: HabitatDurationInput;
    }
  | {
      readonly kind: "web.route";
      readonly path: string;
    };

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
  readonly [executionProjection]?: ExecutionProjection<TInput>;
  run(
    input: ProcedureExecutionContext<TInput, TContext>
  ): HabitatEffect<TOutput, TError, TRequirements>;
}

/** Private cold carriage for native lowering, without another descriptor lookup table. */
export function attachExecutionProjection<TInput, TOutput, TError, TContext, TRequirements>(
  descriptor: EffectExecutionDescriptor<TInput, TOutput, TError, TContext, TRequirements>,
  projection: ExecutionProjection<TInput>
): EffectExecutionDescriptor<TInput, TOutput, TError, TContext, TRequirements> {
  Object.defineProperty(descriptor, executionProjection, {
    value: Object.freeze({ ...projection }),
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return Object.freeze(descriptor);
}

export function readExecutionProjection<TInput, TOutput, TError, TContext, TRequirements>(
  descriptor: EffectExecutionDescriptor<TInput, TOutput, TError, TContext, TRequirements>
): ExecutionProjection<TInput> | undefined {
  return descriptor[executionProjection];
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
  /** Selected construction-bound clients; the body supplies service-owned invocation data. */
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
  TId extends string = string,
> {
  readonly kind: "async.step-effect";
  readonly id: TId;
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
  const TId extends string = string,
>(descriptor: {
  readonly id: TId;
  readonly policy: EffectExecutionPolicy;
  readonly effect: (context: TContext) => TProgram;
}): AsyncStepEffectDescriptor<
  AsyncStepProgramOutput<TProgram>,
  AsyncStepProgramError<TProgram>,
  AsyncStepProgramRequirements<TProgram>,
  TContext,
  TId
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
