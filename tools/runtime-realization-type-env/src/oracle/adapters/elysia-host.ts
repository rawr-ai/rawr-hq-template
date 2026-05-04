import { Elysia } from "elysia";
import type { StartedRuntimeOrpcServerBoundary } from "./orpc-server";

export type RuntimeElysiaHostBoundaryPhase =
  | "elysia.host.received"
  | "elysia.host.delegate.start"
  | "elysia.host.delegate.finished"
  | "elysia.host.delegate.failed"
  | "elysia.host.responded";

export type RuntimeElysiaHostBoundaryStatus =
  | "success"
  | "failure"
  | "unmatched";

export interface RuntimeElysiaHostBoundaryRecord {
  readonly kind: "elysia.runtime-host-boundary-record";
  readonly hostId: string;
  readonly phase: RuntimeElysiaHostBoundaryPhase;
  readonly method?: string;
  readonly path?: string;
  readonly delegated?: boolean;
  readonly downstreamBoundaryId?: string;
  readonly downstreamMatched?: boolean;
  readonly status?: RuntimeElysiaHostBoundaryStatus;
  readonly httpStatus?: number;
  readonly errorName?: string;
}

export interface StartedRuntimeElysiaHostBoundary {
  readonly kind: "elysia.runtime-host-boundary";
  readonly hostId: string;
  readonly prefix: `/${string}`;
  readonly app: Elysia;
  records(): readonly RuntimeElysiaHostBoundaryRecord[];
  handle(request: Request): Promise<Response>;
}

function requestPath(request: Request): string {
  return new URL(request.url).pathname;
}

function record(
  input: Omit<RuntimeElysiaHostBoundaryRecord, "kind">,
): RuntimeElysiaHostBoundaryRecord {
  return {
    kind: "elysia.runtime-host-boundary-record",
    ...input,
  };
}

function responseStatus(input: {
  readonly delegated: boolean;
  readonly response: Response;
}): RuntimeElysiaHostBoundaryStatus {
  if (!input.delegated) return "unmatched";
  return input.response.status >= 500 ? "failure" : "success";
}

/**
 * Mounts a real Elysia app around the lab oRPC Fetch boundary.
 *
 * The route forwards the raw Web Request with `parse: "none"` so Elysia proves
 * host/request passage without owning oRPC parsing, RAWR runtime invocation,
 * production HTTP lifecycle, or public API topology.
 */
export function mountRuntimeElysiaHostBoundary(input: {
  readonly hostId: string;
  readonly prefix: `/${string}`;
  readonly serverBoundary: StartedRuntimeOrpcServerBoundary;
}): StartedRuntimeElysiaHostBoundary {
  const records: RuntimeElysiaHostBoundaryRecord[] = [];
  const routePath = `${input.prefix}*` as const;

  const app = new Elysia()
    .onRequest(({ request }) => {
      records.push(
        record({
          hostId: input.hostId,
          phase: "elysia.host.received",
          method: request.method,
          path: requestPath(request),
        }),
      );
    })
    .all(
      routePath,
      async ({ request }) => {
        records.push(
          record({
            hostId: input.hostId,
            phase: "elysia.host.delegate.start",
            method: request.method,
            path: requestPath(request),
            downstreamBoundaryId: input.serverBoundary.boundaryId,
          }),
        );

        try {
          const { matched, response } = await input.serverBoundary.handle(request);
          records.push(
            record({
              hostId: input.hostId,
              phase: "elysia.host.delegate.finished",
              method: request.method,
              path: requestPath(request),
              downstreamBoundaryId: input.serverBoundary.boundaryId,
              downstreamMatched: matched,
              status: matched ? "success" : "unmatched",
              httpStatus: response.status,
            }),
          );
          return response;
        } catch (error) {
          records.push(
            record({
              hostId: input.hostId,
              phase: "elysia.host.delegate.failed",
              method: request.method,
              path: requestPath(request),
              downstreamBoundaryId: input.serverBoundary.boundaryId,
              status: "failure",
              errorName: error instanceof Error ? error.name : typeof error,
            }),
          );
          throw error;
        }
      },
      {
        parse: "none",
      },
    );

  return {
    kind: "elysia.runtime-host-boundary",
    hostId: input.hostId,
    prefix: input.prefix,
    app,
    records() {
      return [...records];
    },
    async handle(request) {
      const firstNewRecord = records.length;
      const response = await app.handle(request);
      const delegated = records
        .slice(firstNewRecord)
        .some((entry) => entry.phase === "elysia.host.delegate.start");

      records.push(
        record({
          hostId: input.hostId,
          phase: "elysia.host.responded",
          method: request.method,
          path: requestPath(request),
          delegated,
          downstreamBoundaryId: delegated
            ? input.serverBoundary.boundaryId
            : undefined,
          status: responseStatus({ delegated, response }),
          httpStatus: response.status,
        }),
      );

      return response;
    },
  };
}
