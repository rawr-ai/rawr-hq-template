import type { OpenTelemetryNodeConfig } from "@habitat-ai/resource-telemetry/providers/opentelemetry-node";
import {
  type BootstrappedServer,
  bootstrapServer,
  type ServerRouteRegistrar,
  startServer,
} from "./bootstrap";
import { createRawrHostComposition } from "./host-composition";
import type { RawrHostDeclarations } from "./host-seam";
import { createHostLoggerAdapter } from "./logging";
import { registerRawrRoutes } from "./rawr";

export type { BootstrappedServer, RawrHostDeclarations };

/**
 * The app-selected declarations accepted by the server's only public process
 * host. Runtime resources and route registration remain server-owned.
 */
export type RawrServerHostInput = Readonly<{
  declarations: RawrHostDeclarations;
  telemetryConfig: OpenTelemetryNodeConfig;
}>;

function createRouteRegistrar(declarations: RawrHostDeclarations): ServerRouteRegistrar {
  return (app, options) => {
    const hostLogger = createHostLoggerAdapter(options.telemetry.telemetry);
    const hostComposition = createRawrHostComposition({
      declarations,
      hostLogger,
    });

    return registerRawrRoutes(app, {
      ...options,
      hostComposition,
    });
  };
}

/**
 * Assembles the server host around app-selected declarations without opening a
 * listening socket.
 */
export async function bootstrapServerHost(input: RawrServerHostInput): Promise<BootstrappedServer> {
  return await bootstrapServer({
    registerRoutes: createRouteRegistrar(input.declarations),
    telemetryConfig: input.telemetryConfig,
  });
}

/**
 * Starts the server process after bootstrap has assembled its complete host.
 * The app entrypoint selects declarations; the server owns listening.
 */
export async function startServerHost(input: RawrServerHostInput): Promise<BootstrappedServer> {
  return await startServer({
    registerRoutes: createRouteRegistrar(input.declarations),
    telemetryConfig: input.telemetryConfig,
  });
}
