import type { GetFunctionInput, Inngest } from "inngest";
import type { Jsonify } from "inngest/types";

import type { AsyncStepEffectDescriptor } from "./execution";

export type AsyncStepMembership = readonly AsyncStepEffectDescriptor<
  unknown,
  unknown,
  unknown,
  never
>[];

type AsyncStepJsonOutput<TOutput> = Jsonify<Awaited<TOutput extends void ? null : TOutput>>;

/** Native standard-JSON output, including the same shape on memoized replay. */
export type AsyncStepResult<TDescriptor extends AsyncStepMembership[number]> =
  TDescriptor extends AsyncStepEffectDescriptor<infer TOutput, unknown, unknown, never>
    ? AsyncStepJsonOutput<TOutput>
    : never;

export interface AsyncStepRunner<TSteps extends AsyncStepMembership = AsyncStepMembership> {
  run<TDescriptor extends TSteps[number]>(
    descriptor: TDescriptor
  ): Promise<AsyncStepResult<TDescriptor>>;
}

const asyncStepBridge = Symbol("habitat.async-step-bridge");

/** Invocation capability only; no service, resource, or execution-runtime authority. */
export interface AsyncStepBridgeContext<TSteps extends AsyncStepMembership = AsyncStepMembership> {
  readonly [asyncStepBridge]: AsyncStepRunner<TSteps>;
}

export type AsyncRunContext<
  TEvent = unknown,
  TSteps extends AsyncStepMembership = AsyncStepMembership,
> = Omit<GetFunctionInput<Inngest>, "event"> & {
  event: Omit<GetFunctionInput<Inngest>["event"], "data"> & { data: TEvent };
} & AsyncStepBridgeContext<TSteps>;

function hasAsyncStepBridge<TSteps extends AsyncStepMembership>(
  context: object
): context is AsyncStepBridgeContext<TSteps> {
  return Object.hasOwn(context, asyncStepBridge);
}

/** Mounting supplies a fresh native invocation context and its exact admitted runner. */
export function attachAsyncStepBridge<TContext extends object, TSteps extends AsyncStepMembership>(
  context: TContext,
  runner: AsyncStepRunner<TSteps>
): TContext & AsyncStepBridgeContext<TSteps> {
  if (hasAsyncStepBridge(context))
    throw new TypeError("An async invocation already has its step capability.");
  Object.defineProperty(context, asyncStepBridge, {
    value: Object.freeze(runner),
    enumerable: false,
    writable: false,
    configurable: false,
  });
  if (!hasAsyncStepBridge<TSteps>(context))
    throw new TypeError("An async invocation lost its step capability.");
  return context;
}

/** Private SDK delegation target; ownership is carried by the invocation, not a registry. */
export function readAsyncStepBridge<TSteps extends AsyncStepMembership>(
  context: AsyncStepBridgeContext<TSteps>
): AsyncStepRunner<TSteps> {
  if (!hasAsyncStepBridge<TSteps>(context))
    throw new TypeError("Async step execution requires its own invocation capability.");
  return context[asyncStepBridge];
}
