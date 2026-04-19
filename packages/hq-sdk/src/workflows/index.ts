import type { Inngest } from "inngest";
import type { AnyContractRouterObject, AnyProcedureRouterObject } from "../orpc/router-shapes";
import { createContextualRouterBuilder } from "../orpc/factory/implementer";
import { mergeNamedSurfaceTrees } from "../composition/merge-named-surface-trees";
import type { Context } from "@orpc/server";
export {
  createInternalTraceForwardingOptions as createWorkflowTraceForwardingOptions,
} from "../orpc/boundary/trace-forwarding";

export type WorkflowSurfaceContribution<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
> = Readonly<{
  contract: TContract;
  router: TRouter;
}>;

export type WorkflowPublishedContribution<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
> = WorkflowSurfaceContribution<TContract, TRouter> & Readonly<{
  routeBase: `/${string}`;
}>;

export type WorkflowRuntimeInput<TRuntime = unknown> = Readonly<{
  client: Inngest;
  runtime: TRuntime;
}>;

type BivariantRuntimeFactory<TInput, TResult> = {
  bivarianceHack(input: TInput): TResult;
}["bivarianceHack"];

export type WorkflowRuntimeContribution<
  TInput = WorkflowRuntimeInput,
  TFunction = unknown,
> = Readonly<{
  createInngestFunctions: BivariantRuntimeFactory<TInput, readonly TFunction[]>;
}>;

export type WorkflowPluginRegistration<
  TCapability extends string = string,
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
  TRuntimeInput = WorkflowRuntimeInput,
  TFunction = unknown,
> = Readonly<{
  capability: TCapability;
  namespace: "workflows";
  internal?: WorkflowSurfaceContribution<TContract, TRouter>;
  published?: WorkflowPublishedContribution<TContract, TRouter>;
  runtime?: WorkflowRuntimeContribution<TRuntimeInput, TFunction>;
}>;

export type WorkflowSurfaceMetadata = Readonly<{
  capability: string;
  routeBase: `/${string}` | null;
  hasInternalRouter: boolean;
  hasPublishedRouter: boolean;
  hasRuntimeFunctions: boolean;
}>;

type WorkflowRuntimeInputOf<TPlugin> =
  TPlugin extends {
    runtime?: WorkflowRuntimeContribution<infer TInput, unknown>;
  } ? TInput : never;

type UnionToIntersection<T> =
  (T extends unknown ? (input: T) => void : never) extends (input: infer TIntersected) => void
    ? TIntersected
    : never;

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

type ComposedWorkflowRuntimeInput<TPlugins extends readonly WorkflowPluginRegistration[]> = Simplify<
  WorkflowRuntimeInput & UnionToIntersection<Exclude<WorkflowRuntimeInputOf<TPlugins[number]>, never>>
>;

function mergeWorkflowInternalContracts(
  plugins: readonly WorkflowPluginRegistration[],
): AnyContractRouterObject {
  return mergeNamedSurfaceTrees(
    plugins.flatMap((plugin) => (plugin.internal ? [plugin.internal.contract] : [])),
    { kind: "workflow", surface: "contract" },
  );
}

function mergeWorkflowInternalRouters(
  plugins: readonly WorkflowPluginRegistration[],
): AnyProcedureRouterObject {
  return mergeNamedSurfaceTrees(
    plugins.flatMap((plugin) => (plugin.internal ? [plugin.internal.router] : [])),
    { kind: "workflow", surface: "router" },
  );
}

function mergeWorkflowPublishedContracts(
  plugins: readonly WorkflowPluginRegistration[],
): AnyContractRouterObject {
  return mergeNamedSurfaceTrees(
    plugins.flatMap((plugin) => (plugin.published ? [plugin.published.contract] : [])),
    { kind: "workflow", surface: "contract" },
  );
}

function mergeWorkflowPublishedRouters(
  plugins: readonly WorkflowPluginRegistration[],
): AnyProcedureRouterObject {
  return mergeNamedSurfaceTrees(
    plugins.flatMap((plugin) => (plugin.published ? [plugin.published.router] : [])),
    { kind: "workflow", surface: "router" },
  );
}

export function defineWorkflowPlugin<
  const TCapability extends string,
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
  TRuntimeInput = WorkflowRuntimeInput,
  TFunction = unknown,
>(
  input: Omit<
    WorkflowPluginRegistration<TCapability, TContract, TRouter, TRuntimeInput, TFunction>,
    "namespace"
  >,
): WorkflowPluginRegistration<TCapability, TContract, TRouter, TRuntimeInput, TFunction> {
  return {
    namespace: "workflows",
    ...input,
  };
}

export function createWorkflowRouterBuilder<
  const TContract extends AnyContractRouterObject,
  TContext extends Context,
>(contract: TContract) {
  return createContextualRouterBuilder<TContract, TContext>(contract);
}

export function composeWorkflowPlugins<const TPlugins extends readonly WorkflowPluginRegistration[]>(
  plugins: TPlugins,
) {
  return {
    surfaces: plugins.map(
      (plugin) =>
        ({
          capability: plugin.capability,
          routeBase: plugin.published?.routeBase ?? null,
          hasInternalRouter: plugin.internal !== undefined,
          hasPublishedRouter: plugin.published !== undefined,
          hasRuntimeFunctions: plugin.runtime !== undefined,
        }) satisfies WorkflowSurfaceMetadata,
    ),
    internalContract: mergeWorkflowInternalContracts(plugins),
    internalRouter: mergeWorkflowInternalRouters(plugins),
    publishedContract: mergeWorkflowPublishedContracts(plugins),
    publishedRouter: mergeWorkflowPublishedRouters(plugins),
    createInngestFunctions(
      input: ComposedWorkflowRuntimeInput<TPlugins>,
    ): readonly unknown[] {
      return plugins.flatMap((plugin) => plugin.runtime?.createInngestFunctions(input) ?? []);
    },
  } as const;
}

export type {
  AnyContractRouterObject,
  AnyProcedureRouterObject,
} from "../orpc/router-shapes";
