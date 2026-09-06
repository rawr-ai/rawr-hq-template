import type { HTMLBundle } from "bun";
import type { WebHostPayload } from "../../process-runtime/src/adapters/web";
import type { MountReadySurfaceRuntimeRecord } from "../../process-runtime/src/mount-ready-process";
import type {
  HarnessDescriptor,
  HarnessHealthKind,
  HarnessHealthReport,
  HarnessMountInput,
} from "../src/harness-descriptor";
import { assertRequiredResourcesReady, createOwnerStop } from "../src/native-contract";

export type { WebHostPayload } from "../../process-runtime/src/adapters/web";

export interface BunWebHarnessConfig {
  readonly id: string;
  readonly hostname: string;
  readonly port: number;
}

function htmlBundle(module: unknown): HTMLBundle {
  if (typeof module !== "object" || module === null || !("default" in module))
    throw new TypeError("A web route module must export its native HTMLBundle as default.");
  const bundle = module.default;
  if (
    typeof bundle !== "object" ||
    bundle === null ||
    !("index" in bundle) ||
    typeof bundle.index !== "string"
  )
    throw new TypeError("A web route module must export its native HTMLBundle as default.");
  // Bun owns bundle interpretation and its build artifact paths, not a Habitat manifest parser.
  return bundle as HTMLBundle;
}

/** Cold native configuration; Bun owns routing, assets, cancellation and HTTP drain. */
export function createBunWebHarness(
  config: BunWebHarnessConfig
): HarnessDescriptor<MountReadySurfaceRuntimeRecord<WebHostPayload>> {
  if (
    typeof config.id !== "string" ||
    config.id.length === 0 ||
    typeof config.hostname !== "string" ||
    config.hostname.length === 0 ||
    !Number.isInteger(config.port) ||
    config.port < 0 ||
    config.port > 65535
  )
    throw new TypeError("Bun web requires explicit native hostname and port configuration.");
  const { id, hostname, port } = config;
  return Object.freeze({
    id,
    roles: Object.freeze(["web"] as const),
    surfaces: Object.freeze(["web/app"]),
    async mount(input: HarnessMountInput<MountReadySurfaceRuntimeRecord<WebHostPayload>>) {
      assertRequiredResourcesReady(input.requiredResources);
      if (!input.roles.includes("web")) throw new TypeError("Bun web requires the web role.");
      const paths = new Set<string>();
      const selected = input.mountReadyPayloads.flatMap((record) => {
        if (
          record.harnessId !== id ||
          record.role !== "web" ||
          record.surface !== "web/app" ||
          record.payload.kind !== "web/app"
        )
          throw new TypeError("Bun web requires selected web mount payloads.");
        return record.payload.routes.map((route) => {
          if (paths.has(route.path))
            throw new TypeError("Web routes contain duplicate exact paths.");
          paths.add(route.path);
          if (route.kind === "web.module" && typeof route.load === "function")
            return { path: route.path, load: route.load };
          if (route.kind === "web.effect" && typeof route.handle === "function")
            return { path: route.path, handle: route.handle };
          throw new TypeError("Bun web received an unsupported route payload.");
        });
      });
      const routes: Record<string, HTMLBundle | ((request: Request) => Promise<Response>)> = {};
      let closing = false;
      for (const route of selected) {
        const value =
          route.load === undefined
            ? (request: Request) =>
                closing
                  ? Promise.resolve(new Response("Unavailable", { status: 503 }))
                  : route.handle(request)
            : htmlBundle(await route.load());
        Object.defineProperty(routes, route.path, { value, enumerable: true });
      }
      const server = Bun.serve({
        hostname,
        port,
        development: false,
        routes,
        fetch: () => new Response("Not found", { status: 404 }),
        // Bun's default route rejection reporter also marks the process as failed.
        // Native transport owns this bounded HTTP mapping; the Effect outcome stays unchanged.
        error: () => new Response("Internal Server Error", { status: 500 }),
      });
      const nativeStop = createOwnerStop(() => server.stop(false));
      const stop = () => {
        closing = true;
        return nativeStop();
      };
      const health = async (kind: HarnessHealthKind): Promise<HarnessHealthReport> => ({
        launchIdentity: input.launchIdentity,
        harnessId: id,
        kind,
        status: closing ? "failing" : "passing",
        findings: [],
      });
      return Object.freeze({
        stop,
        readiness: () => health("readiness"),
        liveness: () => health("liveness"),
      });
    },
  });
}
