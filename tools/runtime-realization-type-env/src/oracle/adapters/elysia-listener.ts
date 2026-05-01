import type { StartedRuntimeElysiaHostBoundary } from "./elysia-host";

export type RuntimeElysiaListenerPhase =
  | "elysia.listener.starting"
  | "elysia.listener.vendor.started"
  | "elysia.listener.started"
  | "elysia.listener.network.request.start"
  | "elysia.listener.stopping"
  | "elysia.listener.vendor.stopped"
  | "elysia.listener.stopped";

export interface RuntimeElysiaListenerRecord {
  readonly kind: "elysia.runtime-listener-record";
  readonly listenerId: string;
  readonly hostId: string;
  readonly phase: RuntimeElysiaListenerPhase;
  readonly hostname?: string;
  readonly port?: number;
  readonly url?: string;
  readonly method?: string;
  readonly path?: string;
  readonly httpStatus?: number;
  readonly closeActiveConnections?: boolean;
  readonly errorName?: string;
}

export interface StartedRuntimeElysiaListener {
  readonly kind: "elysia.runtime-listener";
  readonly listenerId: string;
  readonly hostId: string;
  readonly hostname: string;
  readonly port: number;
  readonly url: URL;
  records(): readonly RuntimeElysiaListenerRecord[];
  stop(closeActiveConnections?: boolean): Promise<readonly RuntimeElysiaListenerRecord[]>;
}

interface ElysiaServerSnapshot {
  readonly hostname?: string;
  readonly port?: number;
  readonly url?: string | URL;
}

function record(
  input: Omit<RuntimeElysiaListenerRecord, "kind">,
): RuntimeElysiaListenerRecord {
  return {
    kind: "elysia.runtime-listener-record",
    ...input,
  };
}

function serverUrl(server: ElysiaServerSnapshot): URL {
  if (server.url) return new URL(String(server.url));
  if (server.hostname && server.port !== undefined) {
    return new URL(`http://${server.hostname}:${server.port}/`);
  }

  throw new Error("Elysia listener did not expose a server URL");
}

function serverPort(server: ElysiaServerSnapshot): number {
  if (typeof server.port !== "number") {
    throw new Error("Elysia listener did not expose a numeric port");
  }

  return server.port;
}

/**
 * Starts a real local Elysia/Bun listener around an already-mounted lab host.
 *
 * This proves contained listen/request/stop passage only. It does not choose
 * production server lifecycle, deployment topology, auth/logging, OpenAPI
 * publication, native telemetry/error mapping, or public API law.
 */
export function startRuntimeElysiaListener(input: {
  readonly listenerId: string;
  readonly host: StartedRuntimeElysiaHostBoundary;
  readonly hostname?: string;
  readonly port?: number;
}): StartedRuntimeElysiaListener {
  const records: RuntimeElysiaListenerRecord[] = [];
  const hostname = input.hostname ?? "127.0.0.1";
  const requestedPort = input.port ?? 0;
  let stopped = false;

  input.host.app
    .onRequest(({ request }) => {
      const url = new URL(request.url);
      records.push(
        record({
          listenerId: input.listenerId,
          hostId: input.host.hostId,
          phase: "elysia.listener.network.request.start",
          method: request.method,
          path: url.pathname,
          url: String(url),
        }),
      );
    })
    .onStart(({ server }) => {
      const current = server as ElysiaServerSnapshot | null | undefined;
      records.push(
        record({
          listenerId: input.listenerId,
          hostId: input.host.hostId,
          phase: "elysia.listener.vendor.started",
          hostname: current?.hostname,
          port: current?.port,
          url: current?.url ? String(current.url) : undefined,
        }),
      );
    })
    .onStop(() => {
      records.push(
        record({
          listenerId: input.listenerId,
          hostId: input.host.hostId,
          phase: "elysia.listener.vendor.stopped",
        }),
      );
    });

  records.push(
    record({
      listenerId: input.listenerId,
      hostId: input.host.hostId,
      phase: "elysia.listener.starting",
      hostname,
      port: requestedPort,
    }),
  );

  input.host.app.listen({ hostname, port: requestedPort });
  const server = input.host.app.server as ElysiaServerSnapshot | null;
  if (!server) throw new Error("Elysia listener did not start");

  const url = serverUrl(server);
  const port = serverPort(server);

  records.push(
    record({
      listenerId: input.listenerId,
      hostId: input.host.hostId,
      phase: "elysia.listener.started",
      hostname: server.hostname ?? hostname,
      port,
      url: String(url),
    }),
  );

  return {
    kind: "elysia.runtime-listener",
    listenerId: input.listenerId,
    hostId: input.host.hostId,
    hostname: server.hostname ?? hostname,
    port,
    url,
    records() {
      return [...records];
    },
    async stop(closeActiveConnections = true) {
      if (!stopped) {
        records.push(
          record({
            listenerId: input.listenerId,
            hostId: input.host.hostId,
            phase: "elysia.listener.stopping",
            closeActiveConnections,
          }),
        );
        await input.host.app.stop(closeActiveConnections);
        stopped = true;
        records.push(
          record({
            listenerId: input.listenerId,
            hostId: input.host.hostId,
            phase: "elysia.listener.stopped",
            closeActiveConnections,
          }),
        );
      }

      return [...records];
    },
  };
}
