import type { EffectBody, RawrEffect } from "../../effect";
import type {
  BoundaryTelemetry,
  EffectBoundaryContext,
  ExecutionDescriptor,
  PublicServerRequestContext,
  RuntimeResourceAccess,
  WorkflowDispatcher,
} from "../../execution";
import type { ServiceUses } from "../../service";

export interface ConstructionBoundServiceClient<TService = unknown> {
  withInvocation(input: {
    readonly invocation: Record<string, unknown>;
  }): TService;
}

export type ConstructionBoundServiceClients<TServiceUses extends ServiceUses> = {
  readonly [TKey in keyof TServiceUses]: ConstructionBoundServiceClient;
};

export interface ServerApiInvocationContext<
  TRouteContext = unknown,
  TServiceUses extends ServiceUses = ServiceUses,
> {
  readonly route: TRouteContext;
  readonly request: PublicServerRequestContext;
  readonly clients: ConstructionBoundServiceClients<TServiceUses>;
  readonly resources: RuntimeResourceAccess;
  readonly workflows: WorkflowDispatcher;
}

export interface ServerApiExecutionContext<
  TInput,
  TRouteContext = unknown,
  TErrors = unknown,
  TServiceUses extends ServiceUses = ServiceUses,
> {
  readonly input: TInput;
  readonly context: ServerApiInvocationContext<TRouteContext, TServiceUses>;
  readonly telemetry: BoundaryTelemetry;
  readonly errors: TErrors;
  readonly execution: EffectBoundaryContext;
}

export interface ServerApiRouteImplementation<TInput = unknown, TOutput = unknown> {
  readonly kind: "server.route-implementation";
  readonly descriptor: ExecutionDescriptor<TInput, TOutput>;
}

export interface RawrServerApiRouteImplementer<
  TInput,
  TOutput,
  TRouteContext = unknown,
  TErrors = unknown,
  TServiceUses extends ServiceUses = ServiceUses,
> {
  effect<TEffectError, TRequirements>(
    fn: EffectBody<
      ServerApiExecutionContext<TInput, TRouteContext, TErrors, TServiceUses>,
      TOutput,
      TEffectError,
      TRequirements
    >,
  ): ServerApiRouteImplementation<TInput, TOutput>;
}

export interface ServerApiImplementerOptions {
  readonly pluginId: string;
}

type RouteImplementer = RawrServerApiRouteImplementer<unknown, unknown>;

function createRouteImplementer(): RouteImplementer {
  return {
    effect(fn) {
      return {
        kind: "server.route-implementation",
        descriptor: {
          kind: "execution.descriptor",
          run: fn as EffectBody<unknown, unknown>,
        },
      };
    },
  };
}

function createServerImplementer(_surface: "api" | "internal", _contract: unknown, _options: ServerApiImplementerOptions) {
  return new Proxy(
    {
      router<const TRouter extends Record<string, unknown>>(router: TRouter): TRouter {
        return router;
      },
    },
    {
      get(target, property, receiver) {
        if (property in target) return Reflect.get(target, property, receiver);
        return createRouteImplementer();
      },
    },
  ) as Record<string, RouteImplementer> & {
    router<const TRouter extends Record<string, unknown>>(router: TRouter): TRouter;
  };
}

export function implementServerApiPlugin<const TContract>(
  contract: TContract,
  options: ServerApiImplementerOptions,
) {
  return createServerImplementer("api", contract, options);
}

export function implementServerInternalPlugin<const TContract>(
  contract: TContract,
  options: ServerApiImplementerOptions,
) {
  return createServerImplementer("internal", contract, options);
}

export type { RawrEffect };
