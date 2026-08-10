import {
  definePlugin,
  type PluginDefinition,
  type PluginFactory,
  type PluginFactoryArgs,
  type ResourceRequirement,
  type ServiceUse,
} from "../../../../runtime/definition/src";
import type { RuntimeSchema } from "../../runtime/schema";

export type AsyncServiceUses = Readonly<Record<string, ServiceUse>>;

export interface AsyncEventDefinition<TPayload = unknown> {
  readonly name: string;
  readonly payload: RuntimeSchema<TPayload>;
}

export interface AsyncEventContext<TPayload = unknown> {
  readonly name: string;
  readonly data: TPayload;
  readonly runId: string;
  readonly attempt: number;
}

export interface AsyncFunctionContext<TPayload = unknown> {
  readonly event: AsyncEventContext<TPayload>;
  readonly signal: AbortSignal;
}

export interface WorkflowDefinition<TPayload = unknown, TOutput = unknown> {
  readonly kind: "async.workflow";
  readonly id: string;
  readonly event: AsyncEventDefinition<TPayload>;
  readonly run: (context: AsyncFunctionContext<TPayload>) => Promise<TOutput>;
}

export interface ScheduleDefinition<TOutput = unknown> {
  readonly kind: "async.schedule";
  readonly id: string;
  readonly cron: string;
  readonly run: (context: AsyncFunctionContext<Record<never, never>>) => Promise<TOutput>;
}

export interface ConsumerDefinition<TPayload = unknown, TOutput = unknown> {
  readonly kind: "async.consumer";
  readonly id: string;
  readonly event: AsyncEventDefinition<TPayload>;
  readonly run: (context: AsyncFunctionContext<TPayload>) => Promise<TOutput>;
}

/** Declares a host-neutral durable workflow while leaving retry, replay, and history to Inngest. */
export function defineWorkflow<TPayload, TOutput>(
  input: Omit<WorkflowDefinition<TPayload, TOutput>, "kind">
): WorkflowDefinition<TPayload, TOutput> {
  return Object.freeze({ ...input, kind: "async.workflow" });
}

/** Declares a host-neutral durable schedule without constructing a timer. */
export function defineSchedule<TOutput>(
  input: Omit<ScheduleDefinition<TOutput>, "kind">
): ScheduleDefinition<TOutput> {
  return Object.freeze({ ...input, kind: "async.schedule" });
}

/** Declares a host-neutral durable event consumer without constructing a native client. */
export function defineConsumer<TPayload, TOutput>(
  input: Omit<ConsumerDefinition<TPayload, TOutput>, "kind">
): ConsumerDefinition<TPayload, TOutput> {
  return Object.freeze({ ...input, kind: "async.consumer" });
}

type AsyncDefinition<TKind extends "async.workflow" | "async.schedule" | "async.consumer"> =
  Readonly<{
    kind: TKind;
    id: string;
  }>;

type AnyAsyncDefinition = AsyncDefinition<"async.workflow" | "async.schedule" | "async.consumer">;

interface AsyncPluginAuthoringBase<TServices extends AsyncServiceUses> {
  readonly capability: string;
  readonly services: TServices;
  readonly resources?: readonly ResourceRequirement[];
  readonly instance?: string;
  readonly id?: string;
}

type AsyncDefinitions<TOptions, TDefinition extends AnyAsyncDefinition> =
  | readonly TDefinition[]
  | ((options: TOptions) => readonly TDefinition[]);

type AsyncPluginAuthoring<
  TOptions,
  TServices extends AsyncServiceUses,
  TMemberKey extends "workflows" | "schedules" | "consumers",
  TDefinition extends AnyAsyncDefinition,
> = AsyncPluginAuthoringBase<TServices> &
  Readonly<Record<TMemberKey, AsyncDefinitions<TOptions, TDefinition>>>;

const resolveDefinitions = <TOptions, TDefinition extends AnyAsyncDefinition>(
  definitions: AsyncDefinitions<TOptions, TDefinition>,
  options: TOptions
): readonly TDefinition[] =>
  typeof definitions === "function" ? definitions(options) : definitions;

const defineAsyncPluginBuilder = <
  const TSurface extends "async.workflow" | "async.schedule" | "async.consumer",
  const TMemberKey extends "workflows" | "schedules" | "consumers",
>(
  surface: TSurface,
  memberKey: TMemberKey
) =>
  Object.freeze({
    factory<TOptions = void>() {
      return <
        const TCapability extends string,
        const TServices extends AsyncServiceUses,
        const TDefinitions extends readonly AsyncDefinition<TSurface>[],
      >(
        input: AsyncPluginAuthoring<TOptions, TServices, TMemberKey, TDefinitions[number]> & {
          readonly capability: TCapability;
        }
      ): PluginFactory<TOptions, PluginDefinition<"async", TSurface, TCapability>> =>
        (...args: PluginFactoryArgs<TOptions>) =>
          definePlugin({
            id: input.id ?? `${surface}.${input.capability}`,
            role: "async",
            surface,
            capability: input.capability,
            ...(input.instance === undefined ? {} : { instance: input.instance }),
            serviceUses: Object.freeze(Object.values(input.services)),
            resourceRequirements: Object.freeze([...(input.resources ?? [])]),
            project: () => ({
              kind: "plugin.projection",
              facts: Object.freeze({
                [memberKey]: Object.freeze([
                  ...resolveDefinitions(input[memberKey], args[0] as TOptions),
                ]),
              }),
            }),
          });
    },
  });

/** Authors durable workflow projections selected by the async role. */
export const defineAsyncWorkflowPlugin = defineAsyncPluginBuilder("async.workflow", "workflows");

/** Authors durable schedule projections selected by the async role. */
export const defineAsyncSchedulePlugin = defineAsyncPluginBuilder("async.schedule", "schedules");

/** Authors durable consumer projections selected by the async role. */
export const defineAsyncConsumerPlugin = defineAsyncPluginBuilder("async.consumer", "consumers");

export { useService } from "../../../../runtime/definition/src/service";
