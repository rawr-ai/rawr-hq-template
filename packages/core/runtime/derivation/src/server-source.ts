import type {
  PluginDefinition,
  ServerApiPluginDefinition,
  ServerInternalPluginDefinition,
} from "../../definition/src/plugin";

/** Native factories are cold references beside the existing selected surface identity. */
export type RuntimeServerSource =
  | {
      readonly kind: "server/api";
      readonly routeBase: `/${string}`;
      readonly createRouter: ServerApiPluginDefinition["api"];
    }
  | {
      readonly kind: "server/internal";
      readonly routeBase: `/${string}`;
      readonly createRouter: ServerInternalPluginDefinition["internal"];
    };

export function readServerSource(plugin: PluginDefinition): RuntimeServerSource | undefined {
  if (plugin.role !== "server") return undefined;
  if (plugin.surface === "server/api" && "api" in plugin && "routeBase" in plugin) {
    if (
      typeof plugin.api !== "function" ||
      typeof plugin.routeBase !== "string" ||
      !plugin.routeBase.startsWith("/")
    )
      throw new TypeError("Server API source requires its native factory and route base.");
    const source = plugin as ServerApiPluginDefinition;
    return Object.freeze({
      kind: "server/api",
      routeBase: source.routeBase,
      createRouter: source.api,
    });
  }
  if (plugin.surface === "server/internal" && "internal" in plugin && "routeBase" in plugin) {
    if (
      typeof plugin.internal !== "function" ||
      typeof plugin.routeBase !== "string" ||
      !plugin.routeBase.startsWith("/")
    )
      throw new TypeError("Server internal source requires its native factory and route base.");
    const source = plugin as ServerInternalPluginDefinition;
    return Object.freeze({
      kind: "server/internal",
      routeBase: source.routeBase,
      createRouter: source.internal,
    });
  }
  return undefined;
}
