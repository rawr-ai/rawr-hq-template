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

export interface ServerApiPluginDefinition<TServiceUses extends ServiceUses> {
  readonly kind: "plugin.server-api";
  readonly id: string;
  readonly services: TServiceUses;
  readonly descriptors: readonly ExecutionDescriptor<any, any, any, any, any>[];
}

export function defineServerApiPlugin<const TServiceUses extends ServiceUses>(input: {
  readonly id: string;
  readonly services: TServiceUses;
  readonly routes: (
    api: ServerApiBuilder<TServiceUses>,
  ) => Record<string, ExecutionDescriptor<any, any, any, any, any>>;
}): ServerApiPluginDefinition<TServiceUses> {
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

  return {
    kind: "plugin.server-api",
    id: input.id,
    services: input.services,
    descriptors: Object.values(input.routes(api)),
  };
}

export const defineServerInternalPlugin = defineServerApiPlugin;
