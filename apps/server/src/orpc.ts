import {
  createHqRuntimeRouter,
  createWorkflowTriggerRuntimeRouter,
  type RuntimeRouterContext,
} from "@rawr/core/orpc";
import { metrics, SpanStatusCode, trace, type Counter, type Histogram } from "@opentelemetry/api";
import { OpenAPIGenerator, type ConditionalSchemaConverter, type JSONSchema } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { AnyContractRouter } from "@orpc/contract";
import type { Router } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createRpcAuthPolicy, isRpcRequestAllowed, type RpcAuthPolicy } from "./auth/rpc-auth";
import { createHostLoggingContext, withHostLoggingContext, withHostLoggingSpanContext } from "./logging";
import type { AnyElysia } from "./plugins";
import {
  assertHeavyMiddlewareDedupeMarkers,
  assertRequestScopedMiddlewareMarker,
  createRequestScopedBoundaryContext,
  RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY,
  RAWR_MIDDLEWARE_DEDUPE_MARKERS,
  resolveRequestScopedMiddlewareValue,
  type RawrBoundaryContext,
  type RawrBoundaryContextDeps,
} from "./workflows/context";

type RawrOrpcContext = RuntimeRouterContext;
type RawrOrpcRouter = Router<AnyContractRouter, RawrOrpcContext>;

const RPC_AUTH_DEDUPE_MARKER = RAWR_MIDDLEWARE_DEDUPE_MARKERS.RPC_AUTHORIZATION_DECISION;
let routedRequestsCounter: Counter | undefined;
let routedRequestDurationHistogram: Histogram | undefined;

export type RegisterOrpcRoutesOptions<
  TContext extends RuntimeRouterContext = RuntimeRouterContext,
  TWorkflowContext extends RuntimeRouterContext = TContext,
  TRequestContext extends RawrBoundaryContext & TContext & TWorkflowContext = RawrBoundaryContext &
    TContext &
    TWorkflowContext,
> = RawrBoundaryContextDeps & {
  router?: Router<AnyContractRouter, TContext>;
  workflowTriggerRouter?: Router<AnyContractRouter, TWorkflowContext>;
  contextFactory?: (request: Request, deps: RawrBoundaryContextDeps) => TRequestContext;
  onContextCreated?: (context: TRequestContext) => void;
  rpcAuthPolicy?: RpcAuthPolicy;
};

export function __resetOrpcRouteTelemetryForTests() {
  routedRequestsCounter = undefined;
  routedRequestDurationHistogram = undefined;
}

export function createOrpcRouter<TContext extends RuntimeRouterContext = RuntimeRouterContext>() {
  return createHqRuntimeRouter<TContext>();
}

export function createWorkflowTriggerRouter<TContext extends RuntimeRouterContext = RuntimeRouterContext>() {
  return createWorkflowTriggerRuntimeRouter<TContext>();
}

function isRpcRequestAllowedWithDedupe(request: Request, policy: RpcAuthPolicy): boolean {
  return resolveRequestScopedMiddlewareValue(request, RPC_AUTH_DEDUPE_MARKER, () => isRpcRequestAllowed(request, policy));
}

function assertRpcAuthDedupeMarker(context: RawrBoundaryContext): void {
  assertRequestScopedMiddlewareMarker(context, RPC_AUTH_DEDUPE_MARKER);
  assertHeavyMiddlewareDedupeMarkers(context, RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY.requiredMarkers);
}

function getTelemetryInstruments() {
  const meter = metrics.getMeter("@rawr/server");
  routedRequestsCounter ??= meter.createCounter("rawr.orpc.requests", {
    description: "Count of routed oRPC and OpenAPI requests handled by the host shell.",
  });
  routedRequestDurationHistogram ??= meter.createHistogram("rawr.orpc.request.duration", {
    description: "Duration of routed oRPC and OpenAPI requests handled by the host shell.",
    unit: "ms",
  });

  return {
    routedRequestsCounter,
    routedRequestDurationHistogram,
  };
}

function getRouteTracer() {
  return trace.getTracer("@rawr/server");
}

function recordRoutedRequestMetrics(args: {
  surface: "rpc" | "openapi";
  statusCode: number;
  durationMs: number;
  attributes?: Record<string, string | boolean>;
}) {
  const { surface, statusCode, durationMs, attributes } = args;
  const telemetryAttributes = {
    "rawr.orpc.surface": surface,
    "http.response.status_code": statusCode,
    ...attributes,
  };
  const { routedRequestsCounter, routedRequestDurationHistogram } = getTelemetryInstruments();

  routedRequestsCounter.add(1, telemetryAttributes);
  routedRequestDurationHistogram.record(durationMs, telemetryAttributes);
}

async function withRouteSpan(
  name: string,
  attributes: Record<string, string | boolean | number>,
  fn: () => Promise<Response>,
): Promise<Response> {
  return getRouteTracer().startActiveSpan(name, async (span) => {
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }

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

async function handleRpcRoute<
  TContext extends RuntimeRouterContext,
  TWorkflowContext extends RuntimeRouterContext,
  TRequestContext extends RawrBoundaryContext & TContext & TWorkflowContext,
>(args: {
  request: Request;
  rpcHandler: RPCHandler<TContext>;
  workflowTriggerRpcHandler?: RPCHandler<TWorkflowContext>;
  contextFactory: (request: Request, deps: RawrBoundaryContextDeps) => TRequestContext;
  contextDeps: RawrBoundaryContextDeps;
  rpcAuthPolicy: RpcAuthPolicy;
  onContextCreated?: (context: TRequestContext) => void;
}): Promise<Response> {
  const { request, rpcHandler, workflowTriggerRpcHandler, contextFactory, contextDeps, rpcAuthPolicy, onContextCreated } =
    args;
  const startedAt = Date.now();
  return withRouteSpan("rawr.orpc.rpc.request", {
    "rawr.orpc.surface": "rpc",
    "url.full": request.url,
  }, async () => {
    if (!isRpcRequestAllowedWithDedupe(request, rpcAuthPolicy)) {
      const response = new Response("forbidden", { status: 403 });
      recordRoutedRequestMetrics({
        surface: "rpc",
        statusCode: response.status,
        durationMs: Date.now() - startedAt,
        attributes: { "rawr.orpc.authorized": false, "rawr.orpc.router": "rpc" },
      });
      return response;
    }

    const context = contextFactory(request, contextDeps);
    assertRpcAuthDedupeMarker(context);
    onContextCreated?.(context);
    const loggingContext = createHostLoggingContext({
      request,
      repoRoot: context.repoRoot,
      requestId: context.requestId,
      correlationId: context.correlationId,
      surface: "rpc",
    });

    // The oRPC RPC handler may consume the request body before it can decide that a procedure is unmatched.
    // Clone upfront so we can safely fall back to the workflow trigger router without double-consuming the stream.
    const workflowFallbackRequest = workflowTriggerRpcHandler ? request.clone() : undefined;

    const routedResponse = await withHostLoggingContext(loggingContext, async () => {
      const result = await rpcHandler.handle(request, { prefix: "/rpc", context });
      if (result.matched) {
        return {
          response: result.response,
          router: "rpc" as const,
        };
      }

      if (!workflowTriggerRpcHandler || !workflowFallbackRequest) {
        return {
          response: new Response("not found", { status: 404 }),
          router: "rpc" as const,
        };
      }

      const workflowResult = await workflowTriggerRpcHandler.handle(workflowFallbackRequest, { prefix: "/rpc", context });
      return {
        response: workflowResult.matched ? workflowResult.response : new Response("not found", { status: 404 }),
        router: workflowResult.matched ? "workflow-trigger" as const : "rpc" as const,
      };
    });

    recordRoutedRequestMetrics({
      surface: "rpc",
      statusCode: routedResponse.response.status,
      durationMs: Date.now() - startedAt,
      attributes: { "rawr.orpc.authorized": true, "rawr.orpc.router": routedResponse.router },
    });
    return routedResponse.response;
  }).catch((error) => {
    recordRoutedRequestMetrics({
      surface: "rpc",
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      attributes: { "rawr.orpc.authorized": true, "rawr.orpc.router": "rpc" },
    });
    throw error;
  });
}

async function handleOpenApiRoute<
  TContext extends RuntimeRouterContext,
  TRequestContext extends RawrBoundaryContext & TContext,
>(args: {
  request: Request;
  openapiHandler: OpenAPIHandler<TContext>;
  contextFactory: (request: Request, deps: RawrBoundaryContextDeps) => TRequestContext;
  contextDeps: RawrBoundaryContextDeps;
  onContextCreated?: (context: TRequestContext) => void;
}): Promise<Response> {
  const { request, openapiHandler, contextFactory, contextDeps, onContextCreated } = args;
  const startedAt = Date.now();
  return withRouteSpan("rawr.orpc.openapi.request", {
    "rawr.orpc.surface": "openapi",
    "url.full": request.url,
  }, async () => {
    const context = contextFactory(request, contextDeps);
    onContextCreated?.(context);
    const loggingContext = createHostLoggingContext({
      request,
      repoRoot: context.repoRoot,
      requestId: context.requestId,
      correlationId: context.correlationId,
      surface: "openapi",
    });

    const response = await withHostLoggingContext(
      loggingContext,
      async () => {
        const result = await openapiHandler.handle(request, { prefix: "/api/orpc", context });
        return result.matched ? result.response : new Response("not found", { status: 404 });
      },
    );
    recordRoutedRequestMetrics({
      surface: "openapi",
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      attributes: { "rawr.orpc.router": "openapi" },
    });
    return response;
  }).catch((error) => {
    recordRoutedRequestMetrics({
      surface: "openapi",
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      attributes: { "rawr.orpc.router": "openapi" },
    });
    throw error;
  });
}

async function createOpenApiSpec<TContext extends RuntimeRouterContext>(
  router: Router<AnyContractRouter, TContext>,
  baseUrl: string,
) {
  const typeBoxSchemaConverter: ConditionalSchemaConverter = {
    condition: (schema) => Boolean(schema && typeof schema === "object" && "__typebox" in schema),
    convert: (schema) => {
      const rawSchema = (schema as { __typebox?: unknown }).__typebox;
      if (!rawSchema || typeof rawSchema !== "object") {
        return [false, {}];
      }
      return [true, JSON.parse(JSON.stringify(rawSchema)) as JSONSchema];
    },
  };

  const generator = new OpenAPIGenerator({
    schemaConverters: [typeBoxSchemaConverter],
  });
  return generator.generate(router, {
    info: {
      title: "RAWR HQ ORPC API",
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
  });
}

export async function generateOrpcOpenApiSpec(baseUrl: string) {
  return createOpenApiSpec(createOrpcRouter(), baseUrl);
}

export function registerOrpcRoutes<
  TApp extends AnyElysia,
  TContext extends RuntimeRouterContext = RuntimeRouterContext,
  TWorkflowContext extends RuntimeRouterContext = TContext,
  TRequestContext extends RawrBoundaryContext & TContext & TWorkflowContext = RawrBoundaryContext &
    TContext &
    TWorkflowContext,
>(
  app: TApp,
  options: RegisterOrpcRoutesOptions<TContext, TWorkflowContext, TRequestContext>,
): TApp {
  const router = options.router ?? createOrpcRouter<TContext>();
  const rpcHandler = new RPCHandler<TContext>(router);
  const workflowTriggerRpcHandler = options.workflowTriggerRouter
    ? new RPCHandler<TWorkflowContext>(options.workflowTriggerRouter)
    : undefined;
  const openapiHandler = new OpenAPIHandler<TContext>(router);
  const rpcAuthPolicy = options.rpcAuthPolicy ?? createRpcAuthPolicy({ baseUrl: options.baseUrl });
  const contextDeps: RawrBoundaryContextDeps = {
    repoRoot: options.repoRoot,
    baseUrl: options.baseUrl,
    runtime: options.runtime,
    inngestClient: options.inngestClient,
  };
  const contextFactory: (request: Request, deps: RawrBoundaryContextDeps) => TRequestContext =
    options.contextFactory ??
    ((request, deps) => createRequestScopedBoundaryContext(request, deps) as TRequestContext);

  let openapiSpecPromise: Promise<unknown> | undefined;
  const getOpenApiSpec = () => {
    if (!openapiSpecPromise) {
      openapiSpecPromise = createOpenApiSpec(router, options.baseUrl);
    }
    return openapiSpecPromise;
  };

  app.get("/api/orpc/openapi.json", async () => {
    const spec = await getOpenApiSpec();
    return new Response(JSON.stringify(spec), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  });

  app.all(
    "/rpc",
    async (ctx) => {
      const request = ctx.request as Request;
      return handleRpcRoute({
        request,
        rpcHandler,
        workflowTriggerRpcHandler,
        contextFactory,
        contextDeps,
        rpcAuthPolicy,
        onContextCreated: options.onContextCreated,
      });
    },
    { parse: "none" },
  );

  app.all(
    "/rpc/*",
    async (ctx) => {
      const request = ctx.request as Request;
      return handleRpcRoute({
        request,
        rpcHandler,
        workflowTriggerRpcHandler,
        contextFactory,
        contextDeps,
        rpcAuthPolicy,
        onContextCreated: options.onContextCreated,
      });
    },
    { parse: "none" },
  );

  app.all(
    "/api/orpc",
    async (ctx) => {
      const request = ctx.request as Request;
      return handleOpenApiRoute({
        request,
        openapiHandler,
        contextFactory,
        contextDeps,
        onContextCreated: options.onContextCreated,
      });
    },
    { parse: "none" },
  );

  app.all(
    "/api/orpc/*",
    async (ctx) => {
      const request = ctx.request as Request;
      return handleOpenApiRoute({
        request,
        openapiHandler,
        contextFactory,
        contextDeps,
        onContextCreated: options.onContextCreated,
      });
    },
    { parse: "none" },
  );

  return app;
}

export type { RawrOrpcContext };
