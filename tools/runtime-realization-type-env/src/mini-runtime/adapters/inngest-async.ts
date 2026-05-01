import { Inngest } from "inngest";
import { serve } from "inngest/bun";
import type { AsyncStepBridgePayload } from "../../spine/artifacts";
import type {
  MiniRuntimeHarnessRecord,
  StartedMiniAsyncHarness,
} from "../harnesses";
import type { RuntimeSimulationEvent } from "../process-runtime";
import type { AdapterDelegationEvent } from "./delegation";

export interface RuntimeInngestAsyncEvent {
  readonly name: string;
  readonly data: unknown;
}

export interface RuntimeInngestAsyncStepResponse {
  readonly kind: "inngest.runtime-async-step-response";
  readonly executionId: string;
  readonly status: "success" | "failure";
  readonly output?: unknown;
  readonly runtimeEvents: readonly RuntimeSimulationEvent[];
  readonly adapterEvents: readonly AdapterDelegationEvent[];
  readonly harnessRecords: readonly MiniRuntimeHarnessRecord[];
  readonly owner: AsyncStepBridgePayload["owner"];
  readonly stepId: string;
  readonly eventName: string;
}

export type RuntimeInngestAsyncBoundaryPhase =
  | "inngest.serve.received"
  | "inngest.handler.enter"
  | "inngest.step.run"
  | "inngest.handler.finished"
  | "inngest.handler.failed"
  | "inngest.serve.responded";

export interface RuntimeInngestAsyncBoundaryRecord {
  readonly kind: "inngest.runtime-async-boundary-record";
  readonly boundaryId: string;
  readonly phase: RuntimeInngestAsyncBoundaryPhase;
  readonly executionId?: string;
  readonly status?: "success" | "failure";
  readonly httpStatus?: number;
}

export interface RuntimeInngestAsyncRequestInput {
  readonly eventData: unknown;
  readonly runId?: string;
  readonly url?: string;
  readonly host?: string;
}

export interface StartedRuntimeInngestAsyncBoundary {
  readonly kind: "inngest.runtime-async-boundary";
  readonly boundaryId: string;
  readonly clientId: string;
  readonly functionId: string;
  readonly absoluteFunctionId: string;
  readonly eventName: string;
  readonly stepId: string;
  records(): readonly RuntimeInngestAsyncBoundaryRecord[];
  createRequest(input: RuntimeInngestAsyncRequestInput): Request;
  handle(request: Request): Promise<Response>;
}

function record(
  input: Omit<RuntimeInngestAsyncBoundaryRecord, "kind">,
): RuntimeInngestAsyncBoundaryRecord {
  return {
    kind: "inngest.runtime-async-boundary-record",
    ...input,
  };
}

function createResponse(input: {
  readonly payload: AsyncStepBridgePayload;
  readonly resultStatus: "success" | "failure";
  readonly output?: unknown;
  readonly runtimeEvents: readonly RuntimeSimulationEvent[];
  readonly adapterEvents: readonly AdapterDelegationEvent[];
  readonly harnessRecords: readonly MiniRuntimeHarnessRecord[];
  readonly eventName: string;
}): RuntimeInngestAsyncStepResponse {
  return {
    kind: "inngest.runtime-async-step-response",
    executionId: input.payload.ref.executionId,
    status: input.resultStatus,
    ...(input.resultStatus === "success" ? { output: input.output } : {}),
    runtimeEvents: input.runtimeEvents,
    adapterEvents: input.adapterEvents,
    harnessRecords: input.harnessRecords,
    owner: input.payload.owner,
    stepId: input.payload.stepId,
    eventName: input.eventName,
  };
}

async function responseHasStepError(response: Response): Promise<boolean> {
  // Inngest can report step failure as a StepError operation inside a 206
  // response, so boundary observations must inspect the protocol body.
  try {
    const body = await response.clone().json();
    return Array.isArray(body) &&
      body.some((entry) =>
        entry &&
        typeof entry === "object" &&
        (entry as { readonly op?: unknown }).op === "StepError"
      );
  } catch {
    return false;
  }
}

/**
 * Mounts a lab-contained Inngest Bun serve handler over a started async
 * harness. This crosses real `serve(...)`, `createFunction(...)`, and
 * `step.run(...)` before RAWR runtime delegation; it is not durable scheduling,
 * hosted worker topology, replay/idempotency proof, or public async DX law.
 */
export function mountRuntimeInngestAsyncBoundary(input: {
  readonly boundaryId: string;
  readonly clientId: string;
  readonly functionId: string;
  readonly eventName: string;
  readonly payload: AsyncStepBridgePayload;
  readonly harness: StartedMiniAsyncHarness;
  readonly createInvocationContext: (event: RuntimeInngestAsyncEvent) => unknown;
}): StartedRuntimeInngestAsyncBoundary {
  const client = new Inngest({ id: input.clientId, isDev: true });
  const records: RuntimeInngestAsyncBoundaryRecord[] = [];
  const fn = client.createFunction(
    { id: input.functionId },
    { event: input.eventName },
    async ({ event, step }) => {
      const eventName = event.name;
      records.push(
        record({
          boundaryId: input.boundaryId,
          phase: "inngest.handler.enter",
          executionId: input.payload.ref.executionId,
        }),
      );

      if (eventName !== input.eventName) {
        records.push(
          record({
            boundaryId: input.boundaryId,
            phase: "inngest.handler.failed",
            executionId: input.payload.ref.executionId,
            status: "failure",
          }),
        );
        throw new Error(
          `Inngest async boundary expected event ${input.eventName}, got ${eventName}`,
        );
      }

      const stepResponse = await step.run(input.payload.stepId, async () => {
        const adapterEvents: AdapterDelegationEvent[] = [];
        records.push(
          record({
            boundaryId: input.boundaryId,
            phase: "inngest.step.run",
            executionId: input.payload.ref.executionId,
          }),
        );

        const result = await input.harness.runStep({
          executionId: input.payload.ref.executionId,
          context: input.createInvocationContext({
            name: eventName,
            data: event.data,
          }),
          instrumentation: {
            record(event) {
              adapterEvents.push(event);
            },
          },
        });

        return createResponse({
          payload: input.payload,
          resultStatus: result.status,
          ...(result.status === "success" ? { output: result.output } : {}),
          runtimeEvents: result.events,
          adapterEvents,
          harnessRecords: input.harness.records(),
          eventName,
        });
      });

      records.push(
        record({
          boundaryId: input.boundaryId,
          phase: "inngest.handler.finished",
          executionId: input.payload.ref.executionId,
          status: "success",
        }),
      );

      return stepResponse;
    },
  );
  const handler = serve({ client, functions: [fn] });
  const absoluteFunctionId = fn.id(input.clientId);

  return {
    kind: "inngest.runtime-async-boundary",
    boundaryId: input.boundaryId,
    clientId: input.clientId,
    functionId: input.functionId,
    absoluteFunctionId,
    eventName: input.eventName,
    stepId: input.payload.stepId,
    records() {
      return [...records];
    },
    createRequest(requestInput) {
      const url = new URL(
        requestInput.url ?? "http://runtime.test/api/inngest",
      );
      url.searchParams.set("fnId", absoluteFunctionId);

      return new Request(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: requestInput.host ?? url.host,
        },
        body: JSON.stringify({
          version: 2,
          event: {
            name: input.eventName,
            data: requestInput.eventData,
          },
          events: [],
          steps: {},
          ctx: {
            run_id: requestInput.runId ?? `run:${input.boundaryId}`,
            attempt: 0,
            stack: {
              stack: [],
              current: 0,
            },
          },
        }),
      });
    },
    async handle(request) {
      records.push(
        record({
          boundaryId: input.boundaryId,
          phase: "inngest.serve.received",
        }),
      );

      const response = await handler(request);
      const stepError = await responseHasStepError(response);
      records.push(
        record({
          boundaryId: input.boundaryId,
          phase: "inngest.serve.responded",
          httpStatus: response.status,
          status: response.status >= 400 || stepError ? "failure" : "success",
        }),
      );
      return response;
    },
  };
}
