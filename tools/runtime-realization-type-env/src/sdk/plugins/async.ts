import type { EffectBody, RawrEffectYield } from "../effect";
import type {
  InvocationBoundEffectServiceClients,
  ServiceUses,
} from "../service";
import type {
  BoundaryTelemetry,
  EffectBoundaryContext,
  RuntimeResourceAccess,
} from "../../spine/artifacts";

export interface AsyncEventContext<TData = unknown> {
  readonly data: TData;
}

export interface InngestStepApi {
  run<TOutput>(id: string, fn: () => Promise<TOutput> | TOutput): Promise<TOutput>;
}

export interface AsyncStepExecutionContext<
  TServiceUses extends ServiceUses = ServiceUses,
  TEventData = unknown,
> {
  readonly event: AsyncEventContext<TEventData>;
  readonly clients: InvocationBoundEffectServiceClients<TServiceUses>;
  readonly resources: RuntimeResourceAccess;
  readonly telemetry: BoundaryTelemetry;
  readonly execution: EffectBoundaryContext;
}

export interface AsyncStepEffectDescriptor<
  TOutput,
  TError,
  TRequirements,
  TServiceUses extends ServiceUses = ServiceUses,
  TEventData = unknown,
> {
  readonly kind: "async.step-effect";
  readonly id: string;
  readonly effect: EffectBody<
    AsyncStepExecutionContext<TServiceUses, TEventData>,
    TOutput,
    TError,
    TRequirements
  >;
}

export function defineAsyncStepEffect<
  TOutput,
  TError = never,
  TRequirements = never,
  const TServiceUses extends ServiceUses = ServiceUses,
  TEventData = unknown,
>(input: {
  readonly id: string;
  readonly effect: AsyncStepEffectDescriptor<
    TOutput,
    TError,
    TRequirements,
    TServiceUses,
    TEventData
  >["effect"];
}): AsyncStepEffectDescriptor<TOutput, TError, TRequirements, TServiceUses, TEventData> {
  return {
    kind: "async.step-effect",
    id: input.id,
    effect: input.effect,
  };
}

export interface AsyncStepBridgeInput<
  TServiceUses extends ServiceUses = ServiceUses,
  TEventData = unknown,
> extends AsyncStepExecutionContext<TServiceUses, TEventData> {
  readonly step: InngestStepApi;
}

export interface AsyncStepEffectFacade {
  run<TOutput, TError, TRequirements>(
    descriptor: AsyncStepEffectDescriptor<TOutput, TError, TRequirements, any, any>,
  ): Promise<TOutput>;
}

export function stepEffect(
  input: AsyncStepBridgeInput,
): AsyncStepEffectFacade {
  return {
    async run(descriptor) {
      const result = descriptor.effect(input);
      if (Symbol.iterator in Object(result)) {
        const iterator = (result as Iterable<RawrEffectYield<unknown, unknown>>)[
          Symbol.iterator
        ]() as Iterator<
          RawrEffectYield<unknown, unknown>,
          unknown,
          unknown
        >;
        let next = iterator.next();
        while (!next.done) next = iterator.next(undefined);
        return next.value as never;
      }
      return undefined as never;
    },
  };
}

export interface WorkflowDefinition<TContext = any> {
  readonly kind: "async.workflow";
  readonly id: string;
  readonly run: (context: TContext) => Promise<unknown>;
}

export function defineWorkflow<const TDefinition extends WorkflowDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export interface AsyncWorkflowPluginDefinition {
  readonly kind: "plugin.async-workflow";
  readonly id: string;
  readonly workflows: readonly WorkflowDefinition[];
}

export function defineAsyncWorkflowPlugin<const TInput extends AsyncWorkflowPluginDefinition>(
  input: TInput,
): TInput {
  return input;
}
