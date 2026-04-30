import type { EffectBody } from "../effect";
import type {
  ConstructionBoundServiceClients,
  ServiceUses,
} from "../service";
import type {
  BoundaryTelemetry,
  EffectBoundaryContext,
  ExecutionDescriptor,
  PublicServerRequestContext,
  RuntimeResourceAccess,
  ServerRouteDeclaration,
  WorkflowDispatcher,
} from "../../spine/artifacts";

export interface ServerApiInvocationContext<TServiceUses extends ServiceUses> {
  readonly request: PublicServerRequestContext;
  readonly clients: ConstructionBoundServiceClients<TServiceUses>;
  readonly resources: RuntimeResourceAccess;
  readonly workflows: WorkflowDispatcher;
}

export interface ServerApiExecutionContext<
  TInput,
  TServiceUses extends ServiceUses,
> {
  readonly input: TInput;
  readonly context: ServerApiInvocationContext<TServiceUses>;
  readonly telemetry: BoundaryTelemetry;
  readonly execution: EffectBoundaryContext;
}

export interface RawrServerApiRouteImplementer<
  TInput,
  TOutput,
  TServiceUses extends ServiceUses,
> {
  effect<TError, TRequirements>(
    fn: EffectBody<
      ServerApiExecutionContext<TInput, TServiceUses>,
      TOutput,
      TError,
      TRequirements
    >,
  ): ExecutionDescriptor<TInput, TOutput, TError, ServerApiExecutionContext<TInput, TServiceUses>>;
}

export interface ServerApiBuilder<TServiceUses extends ServiceUses> {
  route<TInput, TOutput>(): RawrServerApiRouteImplementer<
    TInput,
    TOutput,
    TServiceUses
  >;
}

export type ServerApiRouteDeclaration = ServerRouteDeclaration & {
  readonly routeKey: string;
  readonly descriptor: ExecutionDescriptor<any, any, any, any, any>;
};

export interface ServerApiPluginDefinition<TServiceUses extends ServiceUses> {
  readonly kind: "plugin.server-api";
  readonly id: string;
  readonly services: TServiceUses;
  readonly routeDeclarations: readonly ServerApiRouteDeclaration[];
  readonly descriptors: readonly ExecutionDescriptor<any, any, any, any, any>[];
}

function routePathFromKey(routeKey: string): readonly string[] {
  return routeKey.split(/[/.]/).filter((segment) => segment.length > 0);
}

export function defineServerApiPlugin<const TServiceUses extends ServiceUses>(input: {
  readonly id: string;
  readonly services: TServiceUses;
  readonly routes: (
    api: ServerApiBuilder<TServiceUses>,
  ) => Record<string, ExecutionDescriptor<any, any, any, any, any>>;
}): ServerApiPluginDefinition<TServiceUses> {
  let routeDeclarationCache: readonly ServerApiRouteDeclaration[] | undefined;
  const api: ServerApiBuilder<TServiceUses> = {
    route() {
      return {
        effect(fn) {
          return {
            kind: "execution.descriptor",
            ref: undefined as never,
            run: fn,
          };
        },
      };
    },
  };

  // Keep SDK route discovery cold and memoized: the spine may ask for metadata once,
  // while `descriptors` remains a compatibility view over the same inert declarations.
  const routeDeclarations = () => {
    routeDeclarationCache ??= Object.entries(input.routes(api)).map(
      ([routeKey, descriptor]) => ({
        kind: "server.route-declaration" as const,
        boundary: "plugin.server-api" as const,
        role: "server" as const,
        surface: "api",
        capability: input.id,
        routeKey,
        routePath: routePathFromKey(routeKey),
        importSafety: "cold-declaration" as const,
        descriptor,
      }),
    );

    return routeDeclarationCache;
  };

  return {
    kind: "plugin.server-api",
    id: input.id,
    services: input.services,
    get routeDeclarations() {
      return routeDeclarations();
    },
    get descriptors() {
      return routeDeclarations().map((route) => route.descriptor);
    },
  };
}

export const defineServerInternalPlugin = defineServerApiPlugin;
