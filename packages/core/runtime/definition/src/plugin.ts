import type { AnyRouter } from "@orpc/server";
import { implement } from "@orpc/server";

import type { RuntimeSchema } from "../../schema/src/runtime-schema";
import type { AppRole } from "./app";
import type { AsyncStepEffectDescriptor } from "./execution";
import type { ResourceRequirement } from "./resource";
import type { ServiceUse } from "./service";

export interface PluginProjectionInput {
  readonly pluginId: string;
}

export interface PluginProjection {
  readonly kind: "plugin.projection";
  readonly facts: Readonly<Record<string, unknown>>;
}

export type PluginProjectionFunction = (input: PluginProjectionInput) => PluginProjection;

export type PluginFactoryArgs<TOptions> = [TOptions] extends [void] ? [] : [options: TOptions];

export interface PluginFactory<
  TOptions = void,
  TDefinition extends PluginDefinition = PluginDefinition,
> {
  (...args: PluginFactoryArgs<TOptions>): TDefinition;
}

export interface PluginDefinition<
  TRole extends AppRole = AppRole,
  TSurface extends string = string,
  TCapability extends string = string,
> {
  readonly kind: "plugin.definition";
  readonly id: string;
  readonly role: TRole;
  readonly surface: TSurface;
  readonly capability: TCapability;
  readonly instance?: string;
  readonly serviceUses: readonly ServiceUse[];
  readonly resourceRequirements: readonly ResourceRequirement[];
  readonly project: PluginProjectionFunction;
}

export function definePlugin<
  const TRole extends AppRole,
  const TSurface extends string,
  const TCapability extends string,
>(
  input: Omit<PluginDefinition<TRole, TSurface, TCapability>, "kind">
): PluginDefinition<TRole, TSurface, TCapability> {
  return Object.freeze({
    ...input,
    kind: "plugin.definition",
    serviceUses: Object.freeze([...input.serviceUses]),
    resourceRequirements: Object.freeze([...input.resourceRequirements]),
  });
}

export type PluginServiceUses = Readonly<Record<string, ServiceUse>>;

const forbiddenPluginClassificationFields = [
  "id",
  "kind",
  "role",
  "surface",
  "exposure",
  "visibility",
  "publication",
  "public",
  "adapter",
] as const;

type LanePluginInput<
  TCapability extends string,
  TServices extends PluginServiceUses,
  TResources extends readonly ResourceRequirement[],
> = {
  readonly capability: TCapability;
  readonly instance?: string;
  readonly services: TServices;
  readonly resourceRequirements?: TResources;
};

type PluginInputResolver<TOptions, TInput> = TInput | ((options: TOptions) => TInput);

function assertNoPluginClassificationFields(input: object): void {
  for (const field of forbiddenPluginClassificationFields) {
    if (Object.hasOwn(input, field)) {
      throw new TypeError(`Plugin lane classification is fixed; '${field}' is not an input field.`);
    }
  }
}

function makePluginFactory<TOptions, TInput, TDefinition extends PluginDefinition>(
  input: PluginInputResolver<TOptions, TInput>,
  build: (resolved: TInput) => TDefinition
): PluginFactory<TOptions, TDefinition> {
  if (typeof input === "function") {
    const resolve = input as (options: TOptions) => TInput;
    return Object.freeze((options: TOptions) => build(resolve(options))) as PluginFactory<
      TOptions,
      TDefinition
    >;
  }

  return Object.freeze(() => build(input)) as PluginFactory<TOptions, TDefinition>;
}

function frozenProjection(facts: Readonly<Record<string, unknown>>): PluginProjection {
  return Object.freeze({
    kind: "plugin.projection",
    facts: Object.freeze({ ...facts }),
  });
}

export type ServerApiPluginInput<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TApi extends AnyRouter = AnyRouter,
  TResources extends readonly ResourceRequirement[] = readonly [],
> = LanePluginInput<TCapability, TServices, TResources> & {
  readonly internal?: never;
  readonly routeBase: `/${string}`;
  readonly api: () => TApi;
};

export interface ServerApiPluginDefinition<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TApi extends AnyRouter = AnyRouter,
  TResources extends readonly ResourceRequirement[] = readonly ResourceRequirement[],
> extends PluginDefinition<"server", "server/api", TCapability> {
  readonly id: `server.api.${TCapability}`;
  readonly services: TServices;
  readonly routeBase: `/${string}`;
  readonly resourceRequirements: TResources;
  readonly api: () => TApi;
}

export type ServerInternalPluginInput<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TRouter extends AnyRouter = AnyRouter,
  TResources extends readonly ResourceRequirement[] = readonly [],
> = LanePluginInput<TCapability, TServices, TResources> & {
  readonly routeBase: `/${string}`;
  readonly internal: () => TRouter;
};

export interface ServerInternalPluginDefinition<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TRouter extends AnyRouter = AnyRouter,
  TResources extends readonly ResourceRequirement[] = readonly ResourceRequirement[],
> extends PluginDefinition<"server", "server/internal", TCapability> {
  readonly id: `server.internal.${TCapability}`;
  readonly services: TServices;
  readonly routeBase: `/${string}`;
  readonly resourceRequirements: TResources;
  readonly internal: () => TRouter;
}

function buildServerApiPlugin<
  const TCapability extends string,
  const TServices extends PluginServiceUses,
  TApi extends AnyRouter,
  const TResources extends readonly ResourceRequirement[],
>(
  input: ServerApiPluginInput<TCapability, TServices, TApi, TResources>
): ServerApiPluginDefinition<TCapability, TServices, TApi, TResources> {
  assertNoPluginClassificationFields(input);
  const resources = Object.freeze([...(input.resourceRequirements ?? [])]) as unknown as TResources;
  const services = Object.freeze({ ...input.services }) as TServices;
  const routeBase = input.routeBase;
  const base = definePlugin({
    id: `server.api.${input.capability}` as const,
    role: "server",
    surface: "server/api",
    capability: input.capability,
    ...(input.instance === undefined ? {} : { instance: input.instance }),
    serviceUses: Object.freeze(Object.values(services)),
    resourceRequirements: resources,
    project: ({ pluginId }) => frozenProjection({ pluginId, routeBase, lane: "server/api" }),
  });

  return Object.freeze({
    ...base,
    id: `server.api.${input.capability}` as `server.api.${TCapability}`,
    services,
    routeBase,
    resourceRequirements: resources,
    api: input.api,
  });
}

function buildServerInternalPlugin<
  const TCapability extends string,
  const TServices extends PluginServiceUses,
  TRouter extends AnyRouter,
  const TResources extends readonly ResourceRequirement[],
>(
  input: ServerInternalPluginInput<TCapability, TServices, TRouter, TResources>
): ServerInternalPluginDefinition<TCapability, TServices, TRouter, TResources> {
  assertNoPluginClassificationFields(input);
  const resources = Object.freeze([...(input.resourceRequirements ?? [])]) as unknown as TResources;
  const services = Object.freeze({ ...input.services }) as TServices;
  const routeBase = input.routeBase;
  const base = definePlugin({
    id: `server.internal.${input.capability}` as const,
    role: "server",
    surface: "server/internal",
    capability: input.capability,
    ...(input.instance === undefined ? {} : { instance: input.instance }),
    serviceUses: Object.freeze(Object.values(services)),
    resourceRequirements: resources,
    project: ({ pluginId }) => frozenProjection({ pluginId, routeBase, lane: "server/internal" }),
  });

  return Object.freeze({
    ...base,
    id: `server.internal.${input.capability}` as `server.internal.${TCapability}`,
    services,
    routeBase,
    resourceRequirements: resources,
    internal: input.internal,
  });
}

export interface ServerApiPluginBuilder {
  factory(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    TApi extends AnyRouter,
    const TResources extends readonly ResourceRequirement[] = readonly [],
  >(
    input: ServerApiPluginInput<TCapability, TServices, TApi, TResources>
  ) => PluginFactory<void, ServerApiPluginDefinition<TCapability, TServices, TApi, TResources>>;
  factory<TOptions>(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    TApi extends AnyRouter,
    const TResources extends readonly ResourceRequirement[] = readonly [],
  >(
    input: (options: TOptions) => ServerApiPluginInput<TCapability, TServices, TApi, TResources>
  ) => PluginFactory<TOptions, ServerApiPluginDefinition<TCapability, TServices, TApi, TResources>>;
}

export interface ServerInternalPluginBuilder {
  factory(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    TRouter extends AnyRouter,
    const TResources extends readonly ResourceRequirement[] = readonly [],
  >(
    input: ServerInternalPluginInput<TCapability, TServices, TRouter, TResources>
  ) => PluginFactory<
    void,
    ServerInternalPluginDefinition<TCapability, TServices, TRouter, TResources>
  >;
  factory<TOptions>(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    TRouter extends AnyRouter,
    const TResources extends readonly ResourceRequirement[] = readonly [],
  >(
    input: (
      options: TOptions
    ) => ServerInternalPluginInput<TCapability, TServices, TRouter, TResources>
  ) => PluginFactory<
    TOptions,
    ServerInternalPluginDefinition<TCapability, TServices, TRouter, TResources>
  >;
}

export const defineServerApiPlugin: ServerApiPluginBuilder = Object.freeze({
  factory: () =>
    ((input: PluginInputResolver<unknown, ServerApiPluginInput>) =>
      makePluginFactory(input, buildServerApiPlugin)) as never,
});

export const defineServerInternalPlugin: ServerInternalPluginBuilder = Object.freeze({
  factory: () =>
    ((input: PluginInputResolver<unknown, ServerInternalPluginInput>) =>
      makePluginFactory(input, buildServerInternalPlugin)) as never,
});

export const implementServerApiPlugin: typeof implement = implement;
export const implementServerInternalPlugin: typeof implement = implement;

type AnyAsyncStepEffectDescriptor = AsyncStepEffectDescriptor<unknown, unknown, unknown, never>;
type AsyncStepMembership = readonly AnyAsyncStepEffectDescriptor[];

export interface AsyncWorkflowDefinition<
  TId extends string = string,
  TInput = unknown,
  TSteps extends AsyncStepMembership = AsyncStepMembership,
> {
  readonly kind: "async.workflow";
  readonly id: TId;
  readonly inputSchema: RuntimeSchema<TInput>;
  readonly steps: TSteps;
}

export interface AsyncScheduleDefinition<
  TId extends string = string,
  TSteps extends AsyncStepMembership = AsyncStepMembership,
> {
  readonly kind: "async.schedule";
  readonly id: TId;
  readonly cron: string;
  readonly steps: TSteps;
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
}

export function defineWorkflow<
  const TId extends string,
  TInput,
  const TSteps extends AsyncStepMembership,
>(input: {
  readonly id: TId;
  readonly inputSchema: RuntimeSchema<TInput>;
  readonly steps: TSteps;
}): AsyncWorkflowDefinition<TId, TInput, TSteps> {
  return Object.freeze({
    kind: "async.workflow",
    id: input.id,
    inputSchema: input.inputSchema,
    steps: Object.freeze([...input.steps]) as unknown as TSteps,
  });
}

export function defineSchedule<
  const TId extends string,
  const TSteps extends AsyncStepMembership,
>(input: {
  readonly id: TId;
  readonly cron: string;
  readonly steps: TSteps;
}): AsyncScheduleDefinition<TId, TSteps> {
  return Object.freeze({
    kind: "async.schedule",
    id: input.id,
    cron: input.cron,
    steps: Object.freeze([...input.steps]) as unknown as TSteps,
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
}): AsyncConsumerDefinition<TId, TEvent, TSteps> {
  return Object.freeze({
    kind: "async.consumer",
    id: input.id,
    eventName: input.eventName,
    eventSchema: input.eventSchema,
    steps: Object.freeze([...input.steps]) as unknown as TSteps,
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
    serviceUses: Object.freeze(Object.values(services)),
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
