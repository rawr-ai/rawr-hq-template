import { implement, type RouterContract } from "@orpc/server";
import {
  definePlugin,
  type PluginDefinition,
  type PluginFactory,
  type PluginFactoryArgs,
  type ResourceRequirement,
  type ServiceUse,
} from "../../../../runtime/definition/src";

export type ServerServiceUses = Readonly<Record<string, ServiceUse>>;

export interface ServerApiProjection {
  readonly kind: "server.api.projection";
  readonly routeBase: string;
  readonly router: unknown;
}

export interface ServerInternalProjection {
  readonly kind: "server.internal.projection";
  readonly router: unknown;
}

interface ServerPluginAuthoringBase<TOptions, TServices extends ServerServiceUses> {
  readonly capability: string;
  readonly services: TServices;
  readonly resources?: readonly ResourceRequirement[];
  readonly instance?: string;
  readonly id?: string;
}

export interface ServerApiPluginAuthoring<TOptions, TServices extends ServerServiceUses>
  extends ServerPluginAuthoringBase<TOptions, TServices> {
  readonly routeBase: string;
  readonly api: (options: TOptions) => unknown;
}

export interface ServerInternalPluginAuthoring<TOptions, TServices extends ServerServiceUses>
  extends ServerPluginAuthoringBase<TOptions, TServices> {
  readonly internal: (options: TOptions) => unknown;
}

export type ServerApiPluginDefinition<TCapability extends string = string> = PluginDefinition<
  "server",
  "server.api",
  TCapability
>;

export type ServerInternalPluginDefinition<TCapability extends string = string> = PluginDefinition<
  "server",
  "server.internal",
  TCapability
>;

const servicesOf = (services: ServerServiceUses): readonly ServiceUse[] =>
  Object.freeze(Object.values(services));

const optionsAt = <TOptions>(args: readonly unknown[]): TOptions => args[0] as TOptions;

/** Authors a public server projection whose topology, rather than a visibility flag, supplies its classification. */
export const defineServerApiPlugin = Object.freeze({
  factory<TOptions = void>() {
    return <const TCapability extends string, const TServices extends ServerServiceUses>(
      input: ServerApiPluginAuthoring<TOptions, TServices> & { readonly capability: TCapability }
    ): PluginFactory<TOptions, ServerApiPluginDefinition<TCapability>> =>
      (...args: PluginFactoryArgs<TOptions>) => {
        const options = optionsAt<TOptions>(args);
        return definePlugin({
          id: input.id ?? `server.api.${input.capability}`,
          role: "server",
          surface: "server.api",
          capability: input.capability,
          ...(input.instance === undefined ? {} : { instance: input.instance }),
          serviceUses: servicesOf(input.services),
          resourceRequirements: Object.freeze([...(input.resources ?? [])]),
          project: () => ({
            kind: "plugin.projection",
            facts: Object.freeze({
              projection: Object.freeze({
                kind: "server.api.projection",
                routeBase: input.routeBase,
                router: input.api(options),
              } satisfies ServerApiProjection),
            }),
          }),
        });
      };
  },
});

/** Authors a trusted first-party server projection without turning trust into a mutable declaration field. */
export const defineServerInternalPlugin = Object.freeze({
  factory<TOptions = void>() {
    return <const TCapability extends string, const TServices extends ServerServiceUses>(
      input: ServerInternalPluginAuthoring<TOptions, TServices> & {
        readonly capability: TCapability;
      }
    ): PluginFactory<TOptions, ServerInternalPluginDefinition<TCapability>> =>
      (...args: PluginFactoryArgs<TOptions>) => {
        const options = optionsAt<TOptions>(args);
        return definePlugin({
          id: input.id ?? `server.internal.${input.capability}`,
          role: "server",
          surface: "server.internal",
          capability: input.capability,
          ...(input.instance === undefined ? {} : { instance: input.instance }),
          serviceUses: servicesOf(input.services),
          resourceRequirements: Object.freeze([...(input.resources ?? [])]),
          project: () => ({
            kind: "plugin.projection",
            facts: Object.freeze({
              projection: Object.freeze({
                kind: "server.internal.projection",
                router: input.internal(options),
              } satisfies ServerInternalProjection),
            }),
          }),
        });
      };
  },
});

/** Starts a public plugin router from oRPC's native contract implementer. */
export function implementServerApiPlugin<const TContract extends RouterContract>(
  contract: TContract,
  _options: { readonly pluginId: string }
) {
  return implement(contract);
}

/** Starts a trusted internal plugin router from oRPC's native contract implementer. */
export function implementServerInternalPlugin<const TContract extends RouterContract>(
  contract: TContract,
  _options: { readonly pluginId: string }
) {
  return implement(contract);
}

export { useService } from "../../../../runtime/definition/src/service";
