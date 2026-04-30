import type { EffectBody, RawrEffectYield } from "../../effect";
import type {
  BoundaryTelemetry,
  EffectBoundaryContext,
  RuntimeResourceAccess,
} from "../../execution";
import type { ServiceUses } from "../../service";

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
  readonly clients: Record<keyof TServiceUses, unknown>;
  readonly resources: RuntimeResourceAccess;
  readonly telemetry: BoundaryTelemetry;
  readonly execution: EffectBoundaryContext;
}

export interface AsyncStepEffectDescriptor<
  TOutput,
  TError = never,
  TRequirements = never,
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

export function stepEffect(input: AsyncStepBridgeInput): AsyncStepEffectFacade {
  return {
    run(descriptor) {
      return input.step.run(descriptor.id, async () => {
        const result = descriptor.effect(input);
        if (typeof result === "object" && result !== null && Symbol.iterator in result) {
          const iterator = (result as Iterable<RawrEffectYield<unknown, unknown>>)[
            Symbol.iterator
          ]() as Iterator<RawrEffectYield<unknown, unknown>, unknown, unknown>;
          let next = iterator.next();
          while (!next.done) next = iterator.next(undefined);
          return next.value as never;
        }
        return undefined as never;
      });
    },
  };
}
