import type { Inngest, InngestFunction } from "inngest";
import type { ConnectHandlerOptions, WorkerConnection } from "inngest/connect";

import type { RuntimeResource } from "../../definition/src/resource";
import {
  materializeInngestFunctions,
  readInngestFunctionBundle,
} from "../../process-runtime/src/async-function-bundle";
import { type InngestMountPayload } from "../../process-runtime/src/async-payload";
import { type MountReadySurfaceRuntimeRecord } from "../../process-runtime/src/mount-ready-process";
import type {
  HarnessDescriptor,
  HarnessHealthKind,
  HarnessHealthReport,
  HarnessMountInput,
} from "../src/index";
import { assertRequiredResourcesReady, createOwnerStop } from "../src/native-contract";

export type { InngestMountPayload } from "../../process-runtime/src/async-payload";

interface InngestHarnessIdentity {
  readonly id: string;
  readonly client: RuntimeResource<string, Inngest>;
  readonly instance?: string;
}

export type InngestHarnessConfig = InngestHarnessIdentity &
  (
    | {
        readonly mode: "serve";
        readonly hostname: string;
        readonly port: number;
        readonly path: `/${string}`;
      }
    | {
        readonly mode: "connect";
        readonly options?: Readonly<
          Pick<
            ConnectHandlerOptions,
            "instanceId" | "maxWorkerConcurrency" | "gatewayUrl" | "isolateExecution"
          >
        >;
      }
  );

const surfaces = Object.freeze(["async/workflow", "async/schedule", "async/consumer"]);

/** Native imports and client registration occur only after process-owned payload admission. */
export function createInngestHarness(
  input: InngestHarnessConfig
): HarnessDescriptor<MountReadySurfaceRuntimeRecord<InngestMountPayload>> {
  if (
    typeof input.id !== "string" ||
    input.id.length === 0 ||
    input.client?.kind !== "runtime.resource" ||
    typeof input.client.id !== "string" ||
    input.client.id.length === 0 ||
    (input.instance !== undefined &&
      (typeof input.instance !== "string" || input.instance.length === 0)) ||
    (input.mode !== "serve" && input.mode !== "connect")
  )
    throw new TypeError("Inngest requires an explicit harness and process client resource.");
  if (
    input.mode === "serve" &&
    (typeof input.hostname !== "string" ||
      input.hostname.length === 0 ||
      !Number.isInteger(input.port) ||
      input.port < 0 ||
      input.port > 65535 ||
      typeof input.path !== "string" ||
      !input.path.startsWith("/") ||
      /[?#]/.test(input.path))
  )
    throw new TypeError("Inngest Serve requires explicit native listen configuration.");
  const config = Object.freeze({
    ...input,
    ...(input.mode === "connect" && input.options !== undefined
      ? { options: Object.freeze({ ...input.options }) }
      : {}),
  });
  const { id } = config;
  return Object.freeze({
    id,
    roles: Object.freeze(["async"] as const),
    surfaces,
    async mount(mount: HarnessMountInput<MountReadySurfaceRuntimeRecord<InngestMountPayload>>) {
      assertRequiredResourcesReady(mount.requiredResources);
      if (!mount.roles.includes("async")) throw new TypeError("Inngest requires the async role.");
      const ids = new Set<string>();
      const bundles = mount.mountReadyPayloads.map((record) => {
        if (
          record.harnessId !== id ||
          record.role !== "async" ||
          !surfaces.includes(record.surface)
        )
          throw new TypeError("Inngest requires selected async mount payloads.");
        const bundle = readInngestFunctionBundle(record.payload);
        if (
          bundle.appId !== mount.launchIdentity.app ||
          bundle.processId !== mount.launchIdentity.process
        )
          throw new TypeError("Inngest bundle belongs to another process.");
        for (const functionId of bundle.functionIds) {
          if (ids.has(functionId))
            throw new TypeError("Selected Inngest functions have duplicate native ids.");
          ids.add(functionId);
        }
        return bundle;
      });
      let closing = false;
      let server: Bun.Server<undefined> | undefined;
      let connection: WorkerConnection | undefined;
      let nativeStop: (() => Promise<void>) | undefined;
      let cohort: Awaited<ReturnType<typeof materializeInngestFunctions>> | undefined;
      const finish = createOwnerStop(async () => {
        const drain = cohort?.closeAndDrain();
        try {
          await nativeStop?.();
        } finally {
          // Native lease loss may settle Connect close before an admitted callback returns.
          await drain;
          cohort?.uninstallMiddleware();
        }
      });
      const stop = () => {
        closing = true;
        void cohort?.closeAndDrain();
        return finish();
      };
      const health = async (kind: HarnessHealthKind): Promise<HarnessHealthReport> => ({
        launchIdentity: mount.launchIdentity,
        harnessId: id,
        kind,
        status:
          bundles.length === 0
            ? "not-applicable"
            : closing
              ? "failing"
              : config.mode === "serve"
                ? server !== undefined && server.port !== undefined
                  ? "passing"
                  : "unknown"
                : connection?.state === "ACTIVE"
                  ? "passing"
                  : "unknown",
        findings: [],
      });
      try {
        if (bundles.length !== 0) {
          const client = mount.processAccess.resource(config.client, { instance: config.instance });
          cohort = await materializeInngestFunctions(bundles, { client });
          const functions: InngestFunction.Any[] = [...cohort.functions];
          // Native generated failure functions participate in the same registration namespace.
          const nativeIds = new Set<string>();
          for (const fn of functions) {
            // Pinned native registration projection, including generated onFailure functions.
            const getConfig: unknown = Reflect.get(fn, "getConfig");
            if (typeof getConfig !== "function")
              throw new TypeError("Native Inngest function has no registration projection.");
            const configs: unknown = Reflect.apply(getConfig, fn, [
              { baseUrl: new URL("http://localhost/"), appPrefix: client.id },
            ]);
            if (!Array.isArray(configs))
              throw new TypeError("Native Inngest registration projection is invalid.");
            for (const native of configs) {
              if (typeof native !== "object" || native === null || typeof native.id !== "string")
                throw new TypeError("Native Inngest registration has no id.");
              const nativeId = native.id;
              if (nativeIds.has(nativeId))
                throw new TypeError("Native Inngest registration ids collide.");
              nativeIds.add(nativeId);
            }
          }
          if (config.mode === "serve") {
            const { serve } = await import("inngest/bun");
            const handler = serve({ client, functions });
            const requestOwner = cohort;
            server = Bun.serve({
              hostname: config.hostname,
              port: config.port,
              fetch(request) {
                if (new URL(request.url).pathname !== config.path)
                  return new Response("Not found", { status: 404 });
                if (closing) return new Response("Service unavailable", { status: 503 });
                return requestOwner.trackHandler(request, () => handler(request));
              },
            });
            const owned = server;
            nativeStop = () => owned.stop(false);
          } else {
            const { connect } = await import("inngest/connect");
            connection = await connect({
              ...config.options,
              isolateExecution: config.options?.isolateExecution ?? true,
              apps: [{ client, functions }],
              handleShutdownSignals: [],
            });
            const owned = connection;
            nativeStop = () => owned.close();
          }
        }
        return Object.freeze({
          stop,
          readiness: () => health("readiness"),
          liveness: () => health("liveness"),
        });
      } catch (error) {
        try {
          await stop();
        } catch {
          /* Native mount failure remains primary after owned cleanup settles. */
        }
        throw error;
      }
    },
  });
}
