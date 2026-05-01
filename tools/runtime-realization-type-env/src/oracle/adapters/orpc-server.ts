import { oc, type } from "@orpc/contract";
import { implement } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type { ServerAdapterCallbackPayload } from "../../spine/artifacts";
import type { OracleHarnessRecord, StartedOracleServerHarness } from "../harnesses";
import type { RuntimeSimulationEvent } from "../../runtime/process-runtime";
import type { AdapterDelegationEvent } from "../../adapters/delegation";

export interface RuntimeOrpcServerRequest {
  readonly executionId: string;
  readonly input: unknown;
  readonly requestId?: string;
}

export interface RuntimeOrpcServerResponse {
  readonly kind: "orpc.runtime-server-response";
  readonly executionId: string;
  readonly status: "success" | "failure";
  readonly output?: unknown;
  readonly runtimeEvents: readonly RuntimeSimulationEvent[];
  readonly adapterEvents: readonly AdapterDelegationEvent[];
  readonly harnessRecords: readonly OracleHarnessRecord[];
  readonly route: {
    readonly boundary: ServerAdapterCallbackPayload["ref"]["boundary"];
    readonly routePath: readonly string[];
    readonly surface: string;
    readonly capability: string;
  };
}

export type RuntimeOrpcServerBoundaryPhase =
  | "orpc.fetch.received"
  | "orpc.handler.enter"
  | "orpc.handler.finished"
  | "orpc.handler.failed"
  | "orpc.fetch.matched"
  | "orpc.fetch.unmatched";

export interface RuntimeOrpcServerBoundaryRecord {
  readonly kind: "orpc.runtime-server-boundary-record";
  readonly boundaryId: string;
  readonly phase: RuntimeOrpcServerBoundaryPhase;
  readonly executionId?: string;
  readonly status?: "success" | "failure" | "unmatched";
  readonly httpStatus?: number;
}

interface RuntimeOrpcServerContext {
  readonly boundaryId: string;
  readonly payload: ServerAdapterCallbackPayload;
  readonly harness: StartedOracleServerHarness;
  readonly createInvocationContext: (request: RuntimeOrpcServerRequest) => unknown;
  readonly records: RuntimeOrpcServerBoundaryRecord[];
}

function record(
  input: Omit<RuntimeOrpcServerBoundaryRecord, "kind">,
): RuntimeOrpcServerBoundaryRecord {
  return {
    kind: "orpc.runtime-server-boundary-record",
    ...input,
  };
}

const RuntimeOrpcServerContract = oc.router({
  invoke: oc
    .route({
      method: "POST",
      path: "/invoke",
    })
    .input(type<RuntimeOrpcServerRequest>())
    .output(type<RuntimeOrpcServerResponse>()),
});

const RuntimeOrpcServerImplementer =
  implement(RuntimeOrpcServerContract).$context<RuntimeOrpcServerContext>();

const RuntimeOrpcServerRouter = RuntimeOrpcServerImplementer.router({
  invoke: RuntimeOrpcServerImplementer.invoke.handler(
    async ({ context, input }) => {
      const adapterEvents: AdapterDelegationEvent[] = [];
      context.records.push(
        record({
          boundaryId: context.boundaryId,
          phase: "orpc.handler.enter",
          executionId: input.executionId,
        }),
      );

      if (input.executionId !== context.payload.ref.executionId) {
        context.records.push(
          record({
            boundaryId: context.boundaryId,
            phase: "orpc.handler.failed",
            executionId: input.executionId,
            status: "failure",
          }),
        );
        throw new Error(`oRPC server boundary missing payload ${input.executionId}`);
      }

      const result = await context.harness.handleRoute({
        executionId: input.executionId,
        context: context.createInvocationContext(input),
        instrumentation: {
          record(event) {
            adapterEvents.push(event);
          },
        },
      });

      context.records.push(
        record({
          boundaryId: context.boundaryId,
          phase: "orpc.handler.finished",
          executionId: input.executionId,
          status: result.status,
        }),
      );

      return {
        kind: "orpc.runtime-server-response",
        executionId: input.executionId,
        status: result.status,
        ...(result.status === "success" ? { output: result.output } : {}),
        runtimeEvents: result.events,
        adapterEvents,
        harnessRecords: context.harness.records(),
        route: {
          boundary: context.payload.ref.boundary,
          routePath: context.payload.routeDescriptor.routePath,
          surface: context.payload.routeDescriptor.surface,
          capability: context.payload.routeDescriptor.capability,
        },
      } satisfies RuntimeOrpcServerResponse;
    },
  ),
});

export interface StartedRuntimeOrpcServerBoundary {
  readonly kind: "orpc.runtime-server-boundary";
  readonly boundaryId: string;
  readonly prefix: `/${string}`;
  readonly procedurePath: "/invoke";
  records(): readonly RuntimeOrpcServerBoundaryRecord[];
  handle(request: Request): Promise<{
    readonly matched: boolean;
    readonly response: Response;
  }>;
}

/**
 * Mounts a lab-contained oRPC Fetch handler over a started server harness.
 *
 * This crosses the real `@orpc/server/fetch` request handler before delegating
 * through the RAWR Oracle harness and ProcessExecutionRuntime. It is not an
 * Elysia mount, OpenAPI publication, production route topology, or public API
 * contract.
 */
export function mountRuntimeOrpcServerBoundary(input: {
  readonly boundaryId: string;
  readonly prefix: `/${string}`;
  readonly payload: ServerAdapterCallbackPayload;
  readonly harness: StartedOracleServerHarness;
  readonly createInvocationContext: (request: RuntimeOrpcServerRequest) => unknown;
}): StartedRuntimeOrpcServerBoundary {
  const handler = new RPCHandler(RuntimeOrpcServerRouter);
  const records: RuntimeOrpcServerBoundaryRecord[] = [];

  return {
    kind: "orpc.runtime-server-boundary",
    boundaryId: input.boundaryId,
    prefix: input.prefix,
    procedurePath: "/invoke",
    records() {
      return [...records];
    },
    async handle(request) {
      records.push(
        record({
          boundaryId: input.boundaryId,
          phase: "orpc.fetch.received",
        }),
      );

      const { matched, response } = await handler.handle(request, {
        prefix: input.prefix,
        context: {
          boundaryId: input.boundaryId,
          payload: input.payload,
          harness: input.harness,
          createInvocationContext: input.createInvocationContext,
          records,
        },
      });

      records.push(
        record({
          boundaryId: input.boundaryId,
          phase: matched ? "orpc.fetch.matched" : "orpc.fetch.unmatched",
          status: matched ? undefined : "unmatched",
          httpStatus: response?.status,
        }),
      );

      return {
        matched,
        response: response ?? new Response("Not Found", { status: 404 }),
      };
    },
  };
}
