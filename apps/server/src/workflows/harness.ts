import type { AnyContractRouter } from "@orpc/contract";
import { metrics, SpanStatusCode, trace, type Counter, type Histogram } from "@opentelemetry/api";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { Context, Router } from "@orpc/server";
import { createHostLoggerAdapter, createHostLoggingContext, withHostLoggingContext, withHostLoggingSpanContext } from "../logging";
import type { RawrBoundaryContextDeps } from "./context";

export const WORKFLOW_BASE_PATH = "/api/workflows" as const;

export type WorkflowRouteSurface<TContext extends Context> = Readonly<{
  publishedRouter: Router<AnyContractRouter, TContext>;
}>;

let workflowRequestsCounter: Counter | undefined;
let workflowRequestDurationHistogram: Histogram | undefined;

export function __resetWorkflowRouteTelemetryForTests() {
  workflowRequestsCounter = undefined;
  workflowRequestDurationHistogram = undefined;
}

function getTelemetryInstruments() {
  const meter = metrics.getMeter("@rawr/server");
  workflowRequestsCounter ??= meter.createCounter("rawr.workflow.requests", {
    description: "Count of published workflow requests handled by the host shell.",
  });
  workflowRequestDurationHistogram ??= meter.createHistogram("rawr.workflow.request.duration", {
    description: "Duration of published workflow requests handled by the host shell.",
    unit: "ms",
  });

  return {
    workflowRequestsCounter,
    workflowRequestDurationHistogram,
  };
}

function getRouteTracer() {
  return trace.getTracer("@rawr/server");
}

function recordWorkflowRequestMetrics(args: {
  statusCode: number;
  durationMs: number;
  attributes?: Record<string, string | boolean>;
}) {
  const telemetryAttributes = {
    "rawr.workflow.surface": "published",
    "http.response.status_code": args.statusCode,
    ...args.attributes,
  };
  const { workflowRequestsCounter, workflowRequestDurationHistogram } = getTelemetryInstruments();

  workflowRequestsCounter.add(1, telemetryAttributes);
  workflowRequestDurationHistogram.record(args.durationMs, telemetryAttributes);
}

async function withWorkflowRouteSpan(
  request: Request,
  fn: () => Promise<Response>,
): Promise<Response> {
  return getRouteTracer().startActiveSpan("rawr.workflow.request", async (span) => {
    span.setAttribute("rawr.workflow.surface", "published");
    span.setAttribute("url.full", request.url);

    try {
      const response = await withHostLoggingSpanContext(span.spanContext(), fn);
      span.setAttribute("http.response.status_code", response.status);
      if (response.status >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      return response;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-canonical host-owned published workflow route harness
 * @agents-must-not manifest-side workflow route fixtures
 *
 * Owns:
 * - wrapping realized published workflow routers with host request context,
 *   logging, and telemetry
 *
 * Must not own:
 * - workflow declaration/binding
 * - alternate published route assembly outside host realization
 */
export function createWorkflowRouteHarness<
  TContext extends {
    requestId: string;
    correlationId: string;
  } & Context,
>(input: {
  workflows: WorkflowRouteSurface<TContext>;
  contextFactory: (request: Request, deps: RawrBoundaryContextDeps) => TContext;
}) {
  const workflowOpenApiHandler = new OpenAPIHandler<TContext>(input.workflows.publishedRouter);
  const hostLogger = createHostLoggerAdapter();

  return {
    async handle(request: Request, deps: RawrBoundaryContextDeps): Promise<Response> {
      const startedAt = Date.now();
      return withWorkflowRouteSpan(request, async () => {
        const context = input.contextFactory(request, deps);
        const loggingContext = createHostLoggingContext({
          request,
          repoRoot: deps.repoRoot,
          requestId: context.requestId,
          correlationId: context.correlationId,
          surface: "workflow",
        });

        const response = await withHostLoggingContext(loggingContext, async () => {
          const result = await workflowOpenApiHandler.handle(request, {
            prefix: WORKFLOW_BASE_PATH,
            context,
          });
          const nextResponse = result.matched ? result.response : new Response("not found", { status: 404 });
          hostLogger.info("workflow.route", {
            outcome: nextResponse.status >= 400 ? "error" : "success",
            statusCode: nextResponse.status,
            durationMs: Date.now() - startedAt,
          });
          return nextResponse;
        });
        recordWorkflowRequestMetrics({
          statusCode: response.status,
          durationMs: Date.now() - startedAt,
          attributes: {
            "rawr.workflow.router": "published",
          },
        });
        return response;
      }).catch((error) => {
        recordWorkflowRequestMetrics({
          statusCode: 500,
          durationMs: Date.now() - startedAt,
          attributes: {
            "rawr.workflow.router": "published",
          },
        });
        throw error;
      });
    },
  } as const;
}
