import type {
  FailureEventArgs,
  GetFunctionInput,
  Inngest,
  InngestFunction,
  ScheduledTimerEventPayload,
} from "inngest";

import type { RuntimeSchema } from "../../schema/src/runtime-schema";
import type { AsyncRunContext, AsyncStepMembership } from "./async-context";
import {
  assertNoPluginClassificationFields,
  definePlugin,
  frozenProjection,
  type LanePluginInput,
  makePluginFactory,
  type PluginDefinition,
  type PluginFactory,
  type PluginInputResolver,
  type PluginServiceUses,
} from "./plugin";
import type { ResourceRequirement } from "./resource";
import type { WorkflowAdmissionDefinition } from "./workflow-admission";

/** Native configuration; either middleware placement must preserve standard-JSON output. */
export type AsyncFunctionOptions = Readonly<
  Omit<
    InngestFunction.Options<
      InngestFunction.Trigger<string>[],
      (context: Omit<GetFunctionInput<Inngest>, "event"> & FailureEventArgs) => unknown
    >,
    "id" | "triggers"
  >
> & {
  readonly id?: never;
  readonly triggers?: never;
  readonly run?: never;
};

function snapshotOptions(
  options: AsyncFunctionOptions | undefined
): AsyncFunctionOptions | undefined {
  if (options === undefined) return undefined;
  for (const key of ["id", "triggers", "run"] as const) {
    if (Object.hasOwn(options, key))
      throw new TypeError(`Async function options cannot replace authored '${key}'.`);
  }
  // Only the option record is snapshotted. Nested native data and callbacks remain exact refs.
  const snapshot: AsyncFunctionOptions = {};
  for (const key of Reflect.ownKeys(options)) {
    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (descriptor === undefined || !("value" in descriptor))
      throw new TypeError("Native async options require cold own data, not accessors.");
    Object.defineProperty(snapshot, key, descriptor);
  }
  return Object.freeze(snapshot);
}

export interface AsyncWorkflowDefinition<
  TId extends string = string,
  TInput = unknown,
  TSteps extends AsyncStepMembership = AsyncStepMembership,
> extends WorkflowAdmissionDefinition<TId, TInput> {
  readonly steps: TSteps;
  readonly options?: AsyncFunctionOptions;
  run(context: AsyncRunContext<TInput, TSteps>): unknown;
}

export interface AsyncScheduleDefinition<
  TId extends string = string,
  TSteps extends AsyncStepMembership = AsyncStepMembership,
> {
  readonly kind: "async.schedule";
  readonly id: TId;
  readonly cron: string;
  readonly steps: TSteps;
  readonly options?: AsyncFunctionOptions;
  run(context: AsyncRunContext<ScheduledTimerEventPayload["data"], TSteps>): unknown;
}

export interface AsyncConsumerDefinition<
  TId extends string = string,
  TEvent = unknown,
  TSteps extends AsyncStepMembership = AsyncStepMembership,
> {
  readonly kind: "async.consumer";
  readonly id: TId;
  readonly eventName: string;
  readonly eventSchema: RuntimeSchema<TEvent>;
  readonly steps: TSteps;
  readonly options?: AsyncFunctionOptions;
  run(context: AsyncRunContext<TEvent, TSteps>): unknown;
}

export function defineWorkflow<
  const TId extends string,
  TInput,
  const TSteps extends AsyncStepMembership,
>(input: {
  readonly id: TId;
  readonly eventName: string;
  readonly inputSchema: RuntimeSchema<TInput>;
  readonly steps: TSteps;
  readonly options?: AsyncFunctionOptions;
  readonly run: (context: AsyncRunContext<NoInfer<TInput>, NoInfer<TSteps>>) => unknown;
}): AsyncWorkflowDefinition<TId, TInput, TSteps> {
  const options = snapshotOptions(input.options);
  return Object.freeze({
    kind: "async.workflow",
    id: input.id,
    eventName: input.eventName,
    inputSchema: input.inputSchema,
    steps: Object.freeze([...input.steps]) as unknown as TSteps,
    run: input.run,
    ...(options === undefined ? {} : { options }),
  });
}

export function defineSchedule<
  const TId extends string,
  const TSteps extends AsyncStepMembership,
>(input: {
  readonly id: TId;
  readonly cron: string;
  readonly steps: TSteps;
  readonly options?: AsyncFunctionOptions;
  readonly run: (
    context: AsyncRunContext<ScheduledTimerEventPayload["data"], NoInfer<TSteps>>
  ) => unknown;
}): AsyncScheduleDefinition<TId, TSteps> {
  const options = snapshotOptions(input.options);
  return Object.freeze({
    kind: "async.schedule",
    id: input.id,
    cron: input.cron,
    steps: Object.freeze([...input.steps]) as unknown as TSteps,
    run: input.run,
    ...(options === undefined ? {} : { options }),
  });
}

export function defineConsumer<
  const TId extends string,
  TEvent,
  const TSteps extends AsyncStepMembership,
>(input: {
  readonly id: TId;
  readonly eventName: string;
  readonly eventSchema: RuntimeSchema<TEvent>;
  readonly steps: TSteps;
  readonly options?: AsyncFunctionOptions;
  readonly run: (context: AsyncRunContext<NoInfer<TEvent>, NoInfer<TSteps>>) => unknown;
}): AsyncConsumerDefinition<TId, TEvent, TSteps> {
  const options = snapshotOptions(input.options);
  return Object.freeze({
    kind: "async.consumer",
    id: input.id,
    eventName: input.eventName,
    eventSchema: input.eventSchema,
    steps: Object.freeze([...input.steps]) as unknown as TSteps,
    run: input.run,
    ...(options === undefined ? {} : { options }),
  });
}

type AsyncDeclarationIdentity =
  | Pick<AsyncWorkflowDefinition, "id" | "kind">
  | Pick<AsyncScheduleDefinition, "id" | "kind">
  | Pick<AsyncConsumerDefinition, "id" | "kind">;

type AsyncLanePluginInput<
  TCapability extends string,
  TServices extends PluginServiceUses,
  TResources extends readonly ResourceRequirement[],
> = LanePluginInput<TCapability, TServices, TResources>;

export type AsyncWorkflowPluginInput<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TWorkflows extends readonly AsyncWorkflowDefinition[] = readonly AsyncWorkflowDefinition[],
  TResources extends readonly ResourceRequirement[] = readonly [],
> = AsyncLanePluginInput<TCapability, TServices, TResources> & {
  readonly workflows: TWorkflows;
};

export type AsyncSchedulePluginInput<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TSchedules extends readonly AsyncScheduleDefinition[] = readonly AsyncScheduleDefinition[],
  TResources extends readonly ResourceRequirement[] = readonly [],
> = AsyncLanePluginInput<TCapability, TServices, TResources> & {
  readonly schedules: TSchedules;
};

export type AsyncConsumerPluginInput<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TConsumers extends readonly AsyncConsumerDefinition[] = readonly AsyncConsumerDefinition[],
  TResources extends readonly ResourceRequirement[] = readonly [],
> = AsyncLanePluginInput<TCapability, TServices, TResources> & {
  readonly consumers: TConsumers;
};

export interface AsyncWorkflowPluginDefinition<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TWorkflows extends readonly AsyncWorkflowDefinition[] = readonly AsyncWorkflowDefinition[],
  TResources extends readonly ResourceRequirement[] = readonly ResourceRequirement[],
> extends PluginDefinition<"async", "async/workflow", TCapability> {
  readonly id: `async.workflow.${TCapability}`;
  readonly services: TServices;
  readonly workflows: TWorkflows;
  readonly resourceRequirements: TResources;
}

export interface AsyncSchedulePluginDefinition<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TSchedules extends readonly AsyncScheduleDefinition[] = readonly AsyncScheduleDefinition[],
  TResources extends readonly ResourceRequirement[] = readonly ResourceRequirement[],
> extends PluginDefinition<"async", "async/schedule", TCapability> {
  readonly id: `async.schedule.${TCapability}`;
  readonly services: TServices;
  readonly schedules: TSchedules;
  readonly resourceRequirements: TResources;
}

export interface AsyncConsumerPluginDefinition<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TConsumers extends readonly AsyncConsumerDefinition[] = readonly AsyncConsumerDefinition[],
  TResources extends readonly ResourceRequirement[] = readonly ResourceRequirement[],
> extends PluginDefinition<"async", "async/consumer", TCapability> {
  readonly id: `async.consumer.${TCapability}`;
  readonly services: TServices;
  readonly consumers: TConsumers;
  readonly resourceRequirements: TResources;
}

function buildAsyncPlugin<
  const TCapability extends string,
  const TServices extends PluginServiceUses,
  const TDefinitions extends readonly AsyncDeclarationIdentity[],
  const TResources extends readonly ResourceRequirement[],
  const TSurface extends "async/workflow" | "async/schedule" | "async/consumer",
  const TKey extends "workflows" | "schedules" | "consumers",
>(
  input: AsyncLanePluginInput<TCapability, TServices, TResources> &
    Readonly<Record<TKey, TDefinitions>>,
  surface: TSurface,
  key: TKey
): PluginDefinition<"async", TSurface, TCapability> &
  Readonly<Record<TKey, TDefinitions>> & {
    readonly services: TServices;
    readonly resourceRequirements: TResources;
  } {
  assertNoPluginClassificationFields(input);
  const resources = Object.freeze([...(input.resourceRequirements ?? [])]) as unknown as TResources;
  const services = Object.freeze({ ...input.services }) as TServices;
  const definitions = Object.freeze([...input[key]]) as unknown as TDefinitions;
  const lane = surface.slice("async/".length);
  const base = definePlugin({
    id: `async.${lane}.${input.capability}`,
    role: "async",
    surface,
    capability: input.capability,
    ...(input.instance === undefined ? {} : { instance: input.instance }),
    services,
    resourceRequirements: resources,
    project: ({ pluginId }) =>
      frozenProjection({
        pluginId,
        lane: surface,
        definitions: Object.freeze(definitions.map((definition) => definition.id)),
      }),
  });

  return Object.freeze({
    ...base,
    services,
    resourceRequirements: resources,
    [key]: definitions,
  }) as PluginDefinition<"async", TSurface, TCapability> &
    Readonly<Record<TKey, TDefinitions>> & {
      readonly services: TServices;
      readonly resourceRequirements: TResources;
    };
}

export interface AsyncWorkflowPluginBuilder {
  factory(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    const TWorkflows extends readonly AsyncWorkflowDefinition[],
    const TResources extends readonly ResourceRequirement[] = readonly [],
  >(
    input: AsyncWorkflowPluginInput<TCapability, TServices, TWorkflows, TResources>
  ) => PluginFactory<
    void,
    AsyncWorkflowPluginDefinition<TCapability, TServices, TWorkflows, TResources>
  >;
  factory<TOptions>(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    const TWorkflows extends readonly AsyncWorkflowDefinition[],
    const TResources extends readonly ResourceRequirement[] = readonly [],
  >(
    input: (
      options: TOptions
    ) => AsyncWorkflowPluginInput<TCapability, TServices, TWorkflows, TResources>
  ) => PluginFactory<
    TOptions,
    AsyncWorkflowPluginDefinition<TCapability, TServices, TWorkflows, TResources>
  >;
}

export interface AsyncSchedulePluginBuilder {
  factory(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    const TSchedules extends readonly AsyncScheduleDefinition[],
    const TResources extends readonly ResourceRequirement[] = readonly [],
  >(
    input: AsyncSchedulePluginInput<TCapability, TServices, TSchedules, TResources>
  ) => PluginFactory<
    void,
    AsyncSchedulePluginDefinition<TCapability, TServices, TSchedules, TResources>
  >;
  factory<TOptions>(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    const TSchedules extends readonly AsyncScheduleDefinition[],
    const TResources extends readonly ResourceRequirement[] = readonly [],
  >(
    input: (
      options: TOptions
    ) => AsyncSchedulePluginInput<TCapability, TServices, TSchedules, TResources>
  ) => PluginFactory<
    TOptions,
    AsyncSchedulePluginDefinition<TCapability, TServices, TSchedules, TResources>
  >;
}

export interface AsyncConsumerPluginBuilder {
  factory(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    const TConsumers extends readonly AsyncConsumerDefinition[],
    const TResources extends readonly ResourceRequirement[] = readonly [],
  >(
    input: AsyncConsumerPluginInput<TCapability, TServices, TConsumers, TResources>
  ) => PluginFactory<
    void,
    AsyncConsumerPluginDefinition<TCapability, TServices, TConsumers, TResources>
  >;
  factory<TOptions>(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    const TConsumers extends readonly AsyncConsumerDefinition[],
    const TResources extends readonly ResourceRequirement[] = readonly [],
  >(
    input: (
      options: TOptions
    ) => AsyncConsumerPluginInput<TCapability, TServices, TConsumers, TResources>
  ) => PluginFactory<
    TOptions,
    AsyncConsumerPluginDefinition<TCapability, TServices, TConsumers, TResources>
  >;
}

export const defineAsyncWorkflowPlugin: AsyncWorkflowPluginBuilder = Object.freeze({
  factory: () =>
    ((input: PluginInputResolver<unknown, AsyncWorkflowPluginInput>) =>
      makePluginFactory(input, (resolved) =>
        buildAsyncPlugin(resolved, "async/workflow", "workflows")
      )) as never,
});

export const defineAsyncSchedulePlugin: AsyncSchedulePluginBuilder = Object.freeze({
  factory: () =>
    ((input: PluginInputResolver<unknown, AsyncSchedulePluginInput>) =>
      makePluginFactory(input, (resolved) =>
        buildAsyncPlugin(resolved, "async/schedule", "schedules")
      )) as never,
});

export const defineAsyncConsumerPlugin: AsyncConsumerPluginBuilder = Object.freeze({
  factory: () =>
    ((input: PluginInputResolver<unknown, AsyncConsumerPluginInput>) =>
      makePluginFactory(input, (resolved) =>
        buildAsyncPlugin(resolved, "async/consumer", "consumers")
      )) as never,
});
