import type { RouterContract } from "@orpc/contract";
import type { AnyRouter } from "@orpc/server";
import type { Inngest } from "inngest";
import { mergeNamedSurfaceTrees } from "../composition/merge-named-surface-trees";

type ContractTree = { [key: string]: RouterContract };
type RouterTree = { [key: string]: AnyRouter };

export { createInternalTraceForwardingOptions as createWorkflowTraceForwardingOptions } from "../orpc/boundary/trace-forwarding";

export type WorkflowSurfaceContribution<
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
> = Readonly<{
  contract: TContract;
  router: TRouter;
}>;

export type WorkflowSurfaceDeclaration<TContract extends ContractTree = ContractTree> = Readonly<{
  contract: TContract;
}>;

export type WorkflowPublishedContribution<
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
> = WorkflowSurfaceContribution<TContract, TRouter> &
  Readonly<{
    routeBase: `/${string}`;
  }>;

export type WorkflowPublishedDeclaration<TContract extends ContractTree = ContractTree> =
  WorkflowSurfaceDeclaration<TContract> &
    Readonly<{
      routeBase: `/${string}`;
    }>;

export type WorkflowRuntimeDeclaration = Readonly<{
  kind: "inngest-functions";
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

export type WorkflowPluginDeclaration<
  TCapability extends string = string,
  TContract extends ContractTree = ContractTree,
> = Readonly<{
  capability: TCapability;
  namespace: "workflows";
  internal?: WorkflowSurfaceDeclaration<TContract>;
  published?: WorkflowPublishedDeclaration<TContract>;
  runtime?: WorkflowRuntimeDeclaration;
}>;

export type WorkflowPluginContribution<
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
  TRuntimeInput = WorkflowRuntimeInput,
  TFunction = unknown,
> = Readonly<{
  internal?: WorkflowSurfaceContribution<TContract, TRouter>;
  published?: WorkflowPublishedContribution<TContract, TRouter>;
  runtime?: WorkflowRuntimeContribution<TRuntimeInput, TFunction>;
}>;

export type WorkflowPluginContributionBuilder<
  TBound = never,
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
  TRuntimeInput = WorkflowRuntimeInput,
  TFunction = unknown,
> = BivariantRuntimeFactory<
  TBound,
  WorkflowPluginContribution<TContract, TRouter, TRuntimeInput, TFunction>
>;

export type WorkflowPluginRegistration<
  TCapability extends string = string,
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
  TRuntimeInput = WorkflowRuntimeInput,
  TFunction = unknown,
  TBound = never,
> = WorkflowPluginContribution<TContract, TRouter, TRuntimeInput, TFunction> &
  Readonly<{
    capability: TCapability;
    namespace: "workflows";
    declaration?: WorkflowPluginDeclaration<TCapability, TContract>;
    contribute?: WorkflowPluginContributionBuilder<
      TBound,
      TContract,
      TRouter,
      TRuntimeInput,
      TFunction
    >;
  }>;

export type WorkflowSurfaceMetadata = Readonly<{
  capability: string;
  routeBase: `/${string}` | null;
  hasInternalRouter: boolean;
  hasPublishedRouter: boolean;
  hasRuntimeFunctions: boolean;
}>;

type WorkflowRuntimeInputOf<TPlugin> = TPlugin extends {
  runtime?: WorkflowRuntimeContribution<infer TInput, unknown>;
}
  ? TInput
  : never;

type UnionToIntersection<T> = (T extends unknown ? (input: T) => void : never) extends (
  input: infer TIntersected
) => void
  ? TIntersected
  : never;

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

type ComposedWorkflowRuntimeInput<TPlugins extends readonly WorkflowPluginRegistration[]> =
  Simplify<
    WorkflowRuntimeInput &
      UnionToIntersection<Exclude<WorkflowRuntimeInputOf<TPlugins[number]>, never>>
  >;

function mergeWorkflowInternalContracts(
  plugins: readonly WorkflowPluginRegistration[]
): ContractTree {
  return mergeNamedSurfaceTrees(
    plugins.flatMap((plugin) => (plugin.internal ? [plugin.internal.contract] : [])),
    { kind: "workflow", surface: "contract" }
  );
}

function mergeWorkflowInternalRouters(plugins: readonly WorkflowPluginRegistration[]): RouterTree {
  return mergeNamedSurfaceTrees(
    plugins.flatMap((plugin) => (plugin.internal ? [plugin.internal.router] : [])),
    { kind: "workflow", surface: "router" }
  );
}

function mergeWorkflowPublishedContracts(
  plugins: readonly WorkflowPluginRegistration[]
): ContractTree {
  return mergeNamedSurfaceTrees(
    plugins.flatMap((plugin) => (plugin.published ? [plugin.published.contract] : [])),
    { kind: "workflow", surface: "contract" }
  );
}

function mergeWorkflowPublishedRouters(plugins: readonly WorkflowPluginRegistration[]): RouterTree {
  return mergeNamedSurfaceTrees(
    plugins.flatMap((plugin) => (plugin.published ? [plugin.published.router] : [])),
    { kind: "workflow", surface: "router" }
  );
}

export function defineWorkflowPlugin<
  const TCapability extends string,
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
  TRuntimeInput = WorkflowRuntimeInput,
  TFunction = unknown,
  TBound = never,
>(
  input: Omit<
    WorkflowPluginRegistration<TCapability, TContract, TRouter, TRuntimeInput, TFunction, TBound>,
    "namespace"
  >
): WorkflowPluginRegistration<TCapability, TContract, TRouter, TRuntimeInput, TFunction, TBound> {
  return {
    namespace: "workflows",
    ...input,
  };
}

export function defineWorkflowPluginDeclaration<
  const TCapability extends string,
  TContract extends ContractTree = ContractTree,
>(
  input: Omit<WorkflowPluginDeclaration<TCapability, TContract>, "namespace">
): WorkflowPluginDeclaration<TCapability, TContract> {
  return {
    namespace: "workflows",
    ...input,
  };
}

export function composeWorkflowPlugins<
  const TPlugins extends readonly WorkflowPluginRegistration[],
>(plugins: TPlugins) {
  return {
    surfaces: plugins.map(
      (plugin) =>
        ({
          capability: plugin.declaration?.capability ?? plugin.capability,
          routeBase:
            plugin.declaration?.published?.routeBase ?? plugin.published?.routeBase ?? null,
          hasInternalRouter:
            plugin.declaration?.internal !== undefined || plugin.internal !== undefined,
          hasPublishedRouter:
            plugin.declaration?.published !== undefined || plugin.published !== undefined,
          hasRuntimeFunctions:
            plugin.declaration?.runtime !== undefined || plugin.runtime !== undefined,
        }) satisfies WorkflowSurfaceMetadata
    ),
    internalContract: mergeWorkflowInternalContracts(plugins),
    internalRouter: mergeWorkflowInternalRouters(plugins),
    publishedContract: mergeWorkflowPublishedContracts(plugins),
    publishedRouter: mergeWorkflowPublishedRouters(plugins),
    createInngestFunctions(input: ComposedWorkflowRuntimeInput<TPlugins>): readonly unknown[] {
      return plugins.flatMap((plugin) => plugin.runtime?.createInngestFunctions(input) ?? []);
    },
  } as const;
}
