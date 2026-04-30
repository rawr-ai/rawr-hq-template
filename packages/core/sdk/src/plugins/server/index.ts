import {
  useService,
  type ServiceDefinition,
  type ServiceUse,
  type ServiceUses,
} from "../../service";

export { useService };
export type { ServiceDefinition, ServiceUse, ServiceUses };

export type ServerPluginSurface = "api" | "internal";

export interface ServerPluginInput<TServices extends ServiceUses = ServiceUses> {
  readonly capability: string;
  readonly routeBase?: `/${string}`;
  readonly services?: TServices;
  readonly api?: () => unknown;
  readonly routes?: () => unknown;
}

export interface ServerPluginDefinition<
  TSurface extends ServerPluginSurface = ServerPluginSurface,
  TServices extends ServiceUses = ServiceUses,
> {
  readonly kind: "plugin.server";
  readonly surface: TSurface;
  readonly capability: string;
  readonly id: string;
  readonly routeBase?: `/${string}`;
  readonly services: TServices;
  readonly api?: () => unknown;
  readonly routes?: () => unknown;
  readonly importSafety: "cold-declaration";
}

export interface ServerPluginBuilder<TSurface extends ServerPluginSurface> {
  <const TInput extends ServerPluginInput>(input: TInput): ServerPluginDefinition<
    TSurface,
    TInput["services"] extends ServiceUses ? TInput["services"] : {}
  >;
  factory(): <const TInput extends ServerPluginInput>(input: TInput) => ServerPluginDefinition<
    TSurface,
    TInput["services"] extends ServiceUses ? TInput["services"] : {}
  >;
}

function createServerPluginBuilder<TSurface extends ServerPluginSurface>(
  surface: TSurface,
): ServerPluginBuilder<TSurface> {
  const builder = ((input: ServerPluginInput) => ({
    kind: "plugin.server",
    surface,
    capability: input.capability,
    id: `server.${surface}.${input.capability}`,
    routeBase: input.routeBase,
    services: input.services ?? {},
    api: input.api,
    routes: input.routes,
    importSafety: "cold-declaration",
  })) as ServerPluginBuilder<TSurface>;

  builder.factory = () => builder;
  return builder;
}

export const defineServerApiPlugin = createServerPluginBuilder("api");
export const defineServerInternalPlugin = createServerPluginBuilder("internal");
