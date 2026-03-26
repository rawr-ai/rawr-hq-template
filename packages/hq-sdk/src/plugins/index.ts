import {
  defineApiPlugin,
  type ApiPluginContribution,
  type ApiPluginRegistration,
  type ApiSurfaceDeclaration,
  type AnyContractRouterObject,
  type AnyProcedureRouterObject,
} from "../apis";
import {
  defineWorkflowPlugin,
  type WorkflowPluginContribution,
  type WorkflowPluginRegistration,
  type WorkflowPublishedDeclaration,
  type WorkflowRuntimeInput,
  type WorkflowSurfaceDeclaration,
} from "../workflows";

export type ServerApiPluginExposure<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
> = Readonly<{
  internal: ApiSurfaceDeclaration<TContract>;
  published?: ApiSurfaceDeclaration<TContract>;
}>;

export type ServerApiPluginDefinition<
  TCapability extends string,
  TBound,
  TResources,
  TContract extends AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject,
> = Readonly<{
  capability: TCapability;
  exposure: ServerApiPluginExposure<TContract>;
  resources?: (input: { bound: TBound }) => TResources;
  routes: (input: {
    bound: TBound;
    resources: TResources;
    exposure: ServerApiPluginExposure<TContract>;
  }) => ApiPluginContribution<TContract, TRouter>;
}>;

export type ServerApiPlugin<
  TCapability extends string = string,
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
  TBound = never,
  TResources = TBound,
> = ApiPluginRegistration<TContract, TRouter, TBound> & Readonly<{
  capability: TCapability;
  exposure: ServerApiPluginExposure<TContract>;
}>;

export function defineServerApiPlugin<
  const TCapability extends string,
  TBound = never,
  TResources = TBound,
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
>(
  input: ServerApiPluginDefinition<TCapability, TBound, TResources, TContract, TRouter>,
): ServerApiPlugin<TCapability, TContract, TRouter, TBound, TResources> {
  return {
    capability: input.capability,
    exposure: input.exposure,
    ...defineApiPlugin<TContract, TRouter, TBound>({
      declaration: {
        namespace: "orpc",
        internal: input.exposure.internal,
        published: input.exposure.published,
      },
      contribute(bound) {
        const resources = input.resources ? input.resources({ bound }) : (bound as unknown as TResources);
        return input.routes({
          bound,
          resources,
          exposure: input.exposure,
        });
      },
    }),
  };
}

export type AsyncWorkflowPluginExposure<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
> = Readonly<{
  internal?: WorkflowSurfaceDeclaration<TContract>;
  published?: WorkflowPublishedDeclaration<TContract>;
  runtime?: Readonly<{ kind: "inngest-functions" }>;
}>;

export type AsyncWorkflowPluginDefinition<
  TCapability extends string,
  TBound,
  TResources,
  TContract extends AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject,
  TRuntimeInput,
  TFunction,
> = Readonly<{
  capability: TCapability;
  exposure: AsyncWorkflowPluginExposure<TContract>;
  resources?: (input: { bound: TBound }) => TResources;
  routes?: (input: {
    bound: TBound;
    resources: TResources;
    exposure: AsyncWorkflowPluginExposure<TContract>;
  }) => Pick<WorkflowPluginContribution<TContract, TRouter, TRuntimeInput, TFunction>, "internal" | "published">;
  workflows?: (input: {
    bound: TBound;
    resources: TResources;
    runtime: TRuntimeInput;
    exposure: AsyncWorkflowPluginExposure<TContract>;
  }) => readonly TFunction[];
}>;

export type AsyncWorkflowPlugin<
  TCapability extends string = string,
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
  TRuntimeInput = WorkflowRuntimeInput,
  TFunction = unknown,
  TBound = never,
> = WorkflowPluginRegistration<TCapability, TContract, TRouter, TRuntimeInput, TFunction, TBound> & Readonly<{
  exposure: AsyncWorkflowPluginExposure<TContract>;
}>;

export function defineAsyncWorkflowPlugin<
  const TCapability extends string,
  TBound = never,
  TResources = TBound,
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
  TRuntimeInput = WorkflowRuntimeInput,
  TFunction = unknown,
>(
  input: AsyncWorkflowPluginDefinition<
    TCapability,
    TBound,
    TResources,
    TContract,
    TRouter,
    TRuntimeInput,
    TFunction
  >,
): AsyncWorkflowPlugin<TCapability, TContract, TRouter, TRuntimeInput, TFunction, TBound> {
  return {
    exposure: input.exposure,
    ...defineWorkflowPlugin<TCapability, TContract, TRouter, TRuntimeInput, TFunction, TBound>({
      capability: input.capability,
      declaration: {
        namespace: "workflows",
        capability: input.capability,
        internal: input.exposure.internal,
        published: input.exposure.published,
        runtime: input.exposure.runtime,
      },
      contribute(bound) {
        const resources = input.resources ? input.resources({ bound }) : (bound as unknown as TResources);
        const routed = input.routes?.({
          bound,
          resources,
          exposure: input.exposure,
        });

        return {
          ...routed,
          runtime: input.workflows
            ? {
              createInngestFunctions(runtime: TRuntimeInput) {
                return input.workflows!({
                  bound,
                  resources,
                  runtime,
                  exposure: input.exposure,
                });
              },
            }
            : undefined,
        } satisfies WorkflowPluginContribution<TContract, TRouter, TRuntimeInput, TFunction>;
      },
    }),
  };
}

export function defineServerInternalPlugin<TPlugin extends Readonly<Record<string, unknown>>>(plugin: TPlugin): TPlugin {
  return plugin;
}
export function defineAsyncConsumerPlugin<TPlugin extends Readonly<Record<string, unknown>>>(plugin: TPlugin): TPlugin {
  return plugin;
}
export function defineAsyncSchedulePlugin<TPlugin extends Readonly<Record<string, unknown>>>(plugin: TPlugin): TPlugin {
  return plugin;
}
export function defineWebAppPlugin<TPlugin extends Readonly<Record<string, unknown>>>(plugin: TPlugin): TPlugin {
  return plugin;
}
export function defineCliCommandPlugin<TPlugin extends Readonly<Record<string, unknown>>>(plugin: TPlugin): TPlugin {
  return plugin;
}
export function defineAgentToolPlugin<TPlugin extends Readonly<Record<string, unknown>>>(plugin: TPlugin): TPlugin {
  return plugin;
}
