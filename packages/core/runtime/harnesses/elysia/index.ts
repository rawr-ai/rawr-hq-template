import type { OpenAPIGeneratorGenerateOptions } from "@orpc/openapi";
import type { ElysiaRoutePayload } from "../../process-runtime/src/adapters/elysia";
import type { MountReadySurfaceRuntimeRecord } from "../../process-runtime/src/mount-ready-process";
import type {
  HarnessDescriptor,
  HarnessHealthKind,
  HarnessHealthReport,
  HarnessMountInput,
} from "../src/index";
import { assertRequiredResourcesReady, createOwnerStop } from "../src/native-contract";
import { createPublicDocument } from "./public-document";

export type { ElysiaRoutePayload } from "../../process-runtime/src/adapters/elysia";

export interface ElysiaHarnessConfig {
  readonly id: string;
  readonly hostname: string;
  readonly port: number;
  readonly publicDocument?: {
    readonly path: string;
    readonly info: NonNullable<NonNullable<OpenAPIGeneratorGenerateOptions["base"]>["info"]>;
  };
}

/** Capture cold host configuration; the optional native host loads only during mount. */
export function createElysiaHarness(
  config: ElysiaHarnessConfig
): HarnessDescriptor<MountReadySurfaceRuntimeRecord<ElysiaRoutePayload>> {
  if (
    typeof config.id !== "string" ||
    config.id.length === 0 ||
    typeof config.hostname !== "string" ||
    config.hostname.length === 0 ||
    !Number.isInteger(config.port) ||
    config.port < 0 ||
    config.port > 65535 ||
    (config.publicDocument !== undefined &&
      (typeof config.publicDocument.path !== "string" ||
        !config.publicDocument.path.startsWith("/") ||
        /[?#*{}:]/.test(config.publicDocument.path) ||
        typeof config.publicDocument.info?.title !== "string" ||
        typeof config.publicDocument.info?.version !== "string"))
  )
    throw new TypeError("Elysia requires explicit host and publication configuration.");
  const { id, hostname, port } = config;
  const publication = structuredClone(config.publicDocument);
  return Object.freeze({
    id,
    roles: Object.freeze(["server"] as const),
    surfaces: Object.freeze(["server/api", "server/internal"]),
    async mount(input: HarnessMountInput<MountReadySurfaceRuntimeRecord<ElysiaRoutePayload>>) {
      assertRequiredResourcesReady(input.requiredResources);
      if (!input.roles.includes("server")) throw new TypeError("Elysia requires the server role.");
      const payloads = input.mountReadyPayloads.map((record) => {
        if (
          record.role !== "server" ||
          record.surface !== record.payload.kind ||
          !["server/api", "server/internal"].includes(record.payload.kind) ||
          typeof record.payload.handle !== "function"
        )
          throw new TypeError("Elysia requires selected server mount payloads.");
        return record;
      });
      const document = await createPublicDocument(payloads, publication);
      const { Elysia } = await import("elysia");
      const app = new Elysia();
      let closing = false;
      try {
        if (document !== undefined && publication !== undefined)
          app.get(
            publication.path,
            () =>
              new Response(document, {
                headers: { "content-type": "application/json" },
              })
          );
        app.all(
          "*",
          async ({ request }) => {
            for (const { payload } of payloads) {
              const result = await payload.handle(request);
              if (result.matched) return result.response;
            }
            return new Response("Not found", { status: 404 });
          },
          { parse: "none" }
        );
        app.listen({ hostname, port });
        const nativeStop = createOwnerStop(async () => {
          // Bun drains admitted requests; Elysia's unawaited onStop hooks own no cleanup here.
          await app.stop(false);
        });
        const stop = () => {
          closing = true;
          return nativeStop();
        };
        const health = async (kind: HarnessHealthKind): Promise<HarnessHealthReport> => ({
          launchIdentity: input.launchIdentity,
          harnessId: id,
          kind,
          status: !closing && app.server !== null ? "passing" : "failing",
          findings: [],
        });
        return Object.freeze({
          stop,
          readiness: () => health("readiness"),
          liveness: () => health("liveness"),
        });
      } catch (error) {
        try {
          if (app.server !== null) await app.stop(false);
        } catch {
          /* Listen or mount failure remains primary. */
        }
        throw error;
      }
    },
  });
}
