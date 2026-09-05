import type { WithEffectContext } from "@orpc/experimental-effect";
import type { AnyRouter, Router } from "@orpc/server";

import type { AppRole } from "./app";
import type { RuntimeResourceMap } from "./provider";
import type { ResourceRequirement } from "./resource";
import type { ServiceClients, ServiceUses } from "./service";
import {
  readWorkflowDispatcherUse,
  type WorkflowDispatcherClientRequirement,
  type WorkflowDispatchers,
  type WorkflowDispatcherUses,
} from "./workflow-dispatcher-use";

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
  TServices extends ServiceUses = ServiceUses,
> {
  readonly kind: "plugin.definition";
  readonly id: string;
  readonly role: TRole;
  readonly surface: TSurface;
  readonly capability: TCapability;
  readonly instance?: string;
  readonly services: TServices;
  readonly resourceRequirements: readonly ResourceRequirement[];
  readonly project: PluginProjectionFunction;
}

export function definePlugin<
  const TRole extends AppRole,
  const TSurface extends string,
  const TCapability extends string,
  const TServices extends ServiceUses,
>(
  input: Omit<PluginDefinition<TRole, TSurface, TCapability, TServices>, "kind">
): PluginDefinition<TRole, TSurface, TCapability, TServices> {
  return Object.freeze({
    ...input,
    kind: "plugin.definition",
    services: Object.freeze({ ...input.services }) as TServices,
    resourceRequirements: Object.freeze([...input.resourceRequirements]),
  });
}

export type PluginServiceUses = ServiceUses;

/** Native request context contains only this plugin's declared capabilities. */
export type ServerPluginContext<
  TServices extends ServiceUses = ServiceUses,
  TWorkflows extends WorkflowDispatcherUses = Readonly<Record<never, never>>,
> = {
  readonly request: Request;
  readonly clients: ServiceClients<TServices>;
  readonly resources: RuntimeResourceMap;
  readonly workflows: WorkflowDispatchers<TWorkflows>;
} & WithEffectContext<never>;

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

export type LanePluginInput<
  TCapability extends string,
  TServices extends PluginServiceUses,
  TResources extends readonly ResourceRequirement[],
> = {
  readonly capability: TCapability;
  readonly instance?: string;
  readonly services: TServices;
  readonly resourceRequirements?: TResources;
};

export type PluginInputResolver<TOptions, TInput> = TInput | ((options: TOptions) => TInput);

export function assertNoPluginClassificationFields(input: object): void {
  for (const field of forbiddenPluginClassificationFields) {
    if (Object.hasOwn(input, field)) {
      throw new TypeError(`Plugin lane classification is fixed; '${field}' is not an input field.`);
    }
  }
}

export function makePluginFactory<TOptions, TInput, TDefinition extends PluginDefinition>(
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

export function frozenProjection(facts: Readonly<Record<string, unknown>>): PluginProjection {
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
  TWorkflows extends WorkflowDispatcherUses = Readonly<Record<never, never>>,
> = LanePluginInput<TCapability, TServices, TResources> & {
  readonly internal?: never;
  readonly routeBase: `/${string}`;
  readonly workflows?: TWorkflows;
  readonly api: () => TApi & Router<ServerPluginContext<NoInfer<TServices>, NoInfer<TWorkflows>>>;
};

type ServerPluginResourceRequirements<
  TResources extends readonly ResourceRequirement[],
  TWorkflows extends WorkflowDispatcherUses,
> = keyof TWorkflows extends never
  ? TResources
  : readonly (TResources[number] | WorkflowDispatcherClientRequirement)[];

export interface ServerApiPluginDefinition<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TApi extends AnyRouter = AnyRouter,
  TResources extends readonly ResourceRequirement[] = readonly ResourceRequirement[],
  TWorkflows extends WorkflowDispatcherUses = WorkflowDispatcherUses,
> extends PluginDefinition<"server", "server/api", TCapability> {
  readonly id: `server.api.${TCapability}`;
  readonly services: TServices;
  readonly routeBase: `/${string}`;
  readonly resourceRequirements: ServerPluginResourceRequirements<TResources, TWorkflows>;
  readonly workflows: TWorkflows;
  readonly api: () => TApi;
}

export type ServerInternalPluginInput<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TRouter extends AnyRouter = AnyRouter,
  TResources extends readonly ResourceRequirement[] = readonly [],
  TWorkflows extends WorkflowDispatcherUses = Readonly<Record<never, never>>,
> = LanePluginInput<TCapability, TServices, TResources> & {
  readonly routeBase: `/${string}`;
  readonly workflows?: TWorkflows;
  readonly internal: () => TRouter &
    Router<ServerPluginContext<NoInfer<TServices>, NoInfer<TWorkflows>>>;
};

export interface ServerInternalPluginDefinition<
  TCapability extends string = string,
  TServices extends PluginServiceUses = PluginServiceUses,
  TRouter extends AnyRouter = AnyRouter,
  TResources extends readonly ResourceRequirement[] = readonly ResourceRequirement[],
  TWorkflows extends WorkflowDispatcherUses = WorkflowDispatcherUses,
> extends PluginDefinition<"server", "server/internal", TCapability> {
  readonly id: `server.internal.${TCapability}`;
  readonly services: TServices;
  readonly routeBase: `/${string}`;
  readonly resourceRequirements: ServerPluginResourceRequirements<TResources, TWorkflows>;
  readonly workflows: TWorkflows;
  readonly internal: () => TRouter;
}

function includeWorkflowClientRequirements<
  TResources extends readonly ResourceRequirement[],
  TWorkflows extends WorkflowDispatcherUses,
>(
  requirements: TResources | undefined,
  workflows: TWorkflows
): ServerPluginResourceRequirements<TResources, TWorkflows> {
  const resources: ResourceRequirement[] = [...(requirements ?? [])];
  for (const use of Object.values(workflows)) {
    const source = readWorkflowDispatcherUse(use);
    if (source === undefined) throw new TypeError("A workflow dispatcher use has no cold source.");
    if (!resources.includes(source.client)) resources.push(source.client);
  }
  return Object.freeze(resources) as ServerPluginResourceRequirements<TResources, TWorkflows>;
}

function buildServerApiPlugin<
  const TCapability extends string,
  const TServices extends PluginServiceUses,
  TApi extends AnyRouter,
  const TResources extends readonly ResourceRequirement[],
  const TWorkflows extends WorkflowDispatcherUses,
>(
  input: ServerApiPluginInput<TCapability, TServices, TApi, TResources, TWorkflows>
): ServerApiPluginDefinition<TCapability, TServices, TApi, TResources, TWorkflows> {
  assertNoPluginClassificationFields(input);
  const workflows = Object.freeze({ ...input.workflows }) as TWorkflows;
  const resources = includeWorkflowClientRequirements(input.resourceRequirements, workflows);
  const services = Object.freeze({ ...input.services }) as TServices;
  const routeBase = input.routeBase;
  const base = definePlugin({
    id: `server.api.${input.capability}` as const,
    role: "server",
    surface: "server/api",
    capability: input.capability,
    ...(input.instance === undefined ? {} : { instance: input.instance }),
    services,
    resourceRequirements: resources,
    project: ({ pluginId }) => frozenProjection({ pluginId, routeBase, lane: "server/api" }),
  });

  return Object.freeze({
    ...base,
    id: `server.api.${input.capability}` as `server.api.${TCapability}`,
    services,
    routeBase,
    resourceRequirements: resources,
    workflows,
    api: input.api,
  });
}

function buildServerInternalPlugin<
  const TCapability extends string,
  const TServices extends PluginServiceUses,
  TRouter extends AnyRouter,
  const TResources extends readonly ResourceRequirement[],
  const TWorkflows extends WorkflowDispatcherUses,
>(
  input: ServerInternalPluginInput<TCapability, TServices, TRouter, TResources, TWorkflows>
): ServerInternalPluginDefinition<TCapability, TServices, TRouter, TResources, TWorkflows> {
  assertNoPluginClassificationFields(input);
  const workflows = Object.freeze({ ...input.workflows }) as TWorkflows;
  const resources = includeWorkflowClientRequirements(input.resourceRequirements, workflows);
  const services = Object.freeze({ ...input.services }) as TServices;
  const routeBase = input.routeBase;
  const base = definePlugin({
    id: `server.internal.${input.capability}` as const,
    role: "server",
    surface: "server/internal",
    capability: input.capability,
    ...(input.instance === undefined ? {} : { instance: input.instance }),
    services,
    resourceRequirements: resources,
    project: ({ pluginId }) => frozenProjection({ pluginId, routeBase, lane: "server/internal" }),
  });

  return Object.freeze({
    ...base,
    id: `server.internal.${input.capability}` as `server.internal.${TCapability}`,
    services,
    routeBase,
    resourceRequirements: resources,
    workflows,
    internal: input.internal,
  });
}

export interface ServerApiPluginBuilder {
  factory(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    TApi extends AnyRouter,
    const TResources extends readonly ResourceRequirement[] = readonly [],
    const TWorkflows extends WorkflowDispatcherUses = Readonly<Record<never, never>>,
  >(
    input: ServerApiPluginInput<TCapability, TServices, TApi, TResources, TWorkflows>
  ) => PluginFactory<
    void,
    ServerApiPluginDefinition<TCapability, TServices, TApi, TResources, TWorkflows>
  >;
  factory<TOptions>(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    TApi extends AnyRouter,
    const TResources extends readonly ResourceRequirement[] = readonly [],
    const TWorkflows extends WorkflowDispatcherUses = Readonly<Record<never, never>>,
  >(
    input: (
      options: TOptions
    ) => ServerApiPluginInput<TCapability, TServices, TApi, TResources, TWorkflows>
  ) => PluginFactory<
    TOptions,
    ServerApiPluginDefinition<TCapability, TServices, TApi, TResources, TWorkflows>
  >;
}

export interface ServerInternalPluginBuilder {
  factory(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    TRouter extends AnyRouter,
    const TResources extends readonly ResourceRequirement[] = readonly [],
    const TWorkflows extends WorkflowDispatcherUses = Readonly<Record<never, never>>,
  >(
    input: ServerInternalPluginInput<TCapability, TServices, TRouter, TResources, TWorkflows>
  ) => PluginFactory<
    void,
    ServerInternalPluginDefinition<TCapability, TServices, TRouter, TResources, TWorkflows>
  >;
  factory<TOptions>(): <
    const TCapability extends string,
    const TServices extends PluginServiceUses,
    TRouter extends AnyRouter,
    const TResources extends readonly ResourceRequirement[] = readonly [],
    const TWorkflows extends WorkflowDispatcherUses = Readonly<Record<never, never>>,
  >(
    input: (
      options: TOptions
    ) => ServerInternalPluginInput<TCapability, TServices, TRouter, TResources, TWorkflows>
  ) => PluginFactory<
    TOptions,
    ServerInternalPluginDefinition<TCapability, TServices, TRouter, TResources, TWorkflows>
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

export interface WebRouteProjection<TModule = unknown> {
  readonly id: string;
  readonly path: string;
  readonly module: () => Promise<TModule>;
}

export interface WebAppPluginInput<
  TCapability extends string = string,
  TRoutes extends readonly WebRouteProjection[] = readonly WebRouteProjection[],
> {
  readonly capability: TCapability;
  readonly instance?: string;
  readonly routes: TRoutes;
}

type WebRouteProjectionSnapshots<TRoutes extends readonly WebRouteProjection[]> = {
  readonly [TIndex in keyof TRoutes]: TRoutes[TIndex] extends WebRouteProjection
    ? Readonly<Pick<TRoutes[TIndex], "id" | "path" | "module">>
    : never;
};

type EmptyWebPluginServices = Readonly<Record<never, never>>;

export interface WebAppPluginDefinition<
  TCapability extends string = string,
  TRoutes extends readonly WebRouteProjection[] = readonly WebRouteProjection[],
> extends PluginDefinition<"web", "web/app", TCapability, EmptyWebPluginServices> {
  readonly id: `web.app.${TCapability}`;
  readonly services: EmptyWebPluginServices;
  readonly resourceRequirements: readonly [];
  readonly routes: WebRouteProjectionSnapshots<TRoutes>;
}

function assertNoWebAppCompositionFields(input: object): void {
  for (const field of ["services", "resourceRequirements"] as const) {
    if (Object.hasOwn(input, field)) {
      throw new TypeError(`Web app projection does not accept '${field}'.`);
    }
  }
}

function buildWebAppPlugin<
  const TCapability extends string,
  const TRoutes extends readonly WebRouteProjection[],
>(input: WebAppPluginInput<TCapability, TRoutes>): WebAppPluginDefinition<TCapability, TRoutes> {
  assertNoPluginClassificationFields(input);
  assertNoWebAppCompositionFields(input);

  const services = Object.freeze({}) as EmptyWebPluginServices;
  const resourceRequirements = Object.freeze([]) as readonly [];
  const routes = Object.freeze(
    input.routes.map((route) =>
      Object.freeze({
        id: route.id,
        path: route.path,
        module: route.module,
      })
    )
  ) as unknown as WebRouteProjectionSnapshots<TRoutes>;
  const projectedRoutes = Object.freeze(routes.map(({ id, path }) => Object.freeze({ id, path })));
  const base = definePlugin({
    id: `web.app.${input.capability}` as const,
    role: "web",
    surface: "web/app",
    capability: input.capability,
    ...(input.instance === undefined ? {} : { instance: input.instance }),
    services,
    resourceRequirements,
    project: ({ pluginId }) =>
      frozenProjection({
        pluginId,
        lane: "web/app",
        routes: projectedRoutes,
      }),
  });

  return Object.freeze({
    ...base,
    id: `web.app.${input.capability}` as `web.app.${TCapability}`,
    services,
    resourceRequirements,
    routes,
  });
}

export interface WebAppPluginBuilder {
  factory(): <
    const TCapability extends string,
    const TRoutes extends readonly WebRouteProjection[],
  >(
    input: WebAppPluginInput<TCapability, TRoutes>
  ) => PluginFactory<void, WebAppPluginDefinition<TCapability, TRoutes>>;
  factory<TOptions>(): <
    const TCapability extends string,
    const TRoutes extends readonly WebRouteProjection[],
  >(
    input: (options: TOptions) => WebAppPluginInput<TCapability, TRoutes>
  ) => PluginFactory<TOptions, WebAppPluginDefinition<TCapability, TRoutes>>;
}

export const defineWebAppPlugin: WebAppPluginBuilder = Object.freeze({
  factory: () =>
    ((input: PluginInputResolver<unknown, WebAppPluginInput>) =>
      makePluginFactory(input, buildWebAppPlugin)) as never,
});
