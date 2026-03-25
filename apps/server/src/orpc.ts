import type { RuntimeRouterContext } from "@rawr/runtime-context";
import { metrics, SpanStatusCode, trace, type Counter, type Histogram } from "@opentelemetry/api";
import { OpenAPIGenerator, type ConditionalSchemaConverter, type JSONSchema } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { AnyContractRouter } from "@orpc/contract";
import type { Router } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createTestingRawrHostSeam } from "./testing-host";
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
  TRequestContext extends RawrBoundaryContext & TContext = RawrBoundaryContext & TContext,
> = RawrBoundaryContextDeps & {
  router?: Router<AnyContractRouter, any>;
  openApiRouter?: Router<AnyContractRouter, any>;
  contextFactory?: (request: Request, deps: RawrBoundaryContextDeps) => TRequestContext;
  onContextCreated?: (context: TRequestContext) => void;
  rpcAuthPolicy?: RpcAuthPolicy;
};

export function __resetOrpcRouteTelemetryForTests() {
  routedRequestsCounter = undefined;
  routedRequestDurationHistogram = undefined;
}

/**
 * @agents-style canonical realized-host proof helper
 *
 * Owns:
 * - default test/proof access to the realized internal oRPC router
 *
 * Must not own:
 * - alternate manifest-owned runtime assembly
 * - app-side executable bridge restoration
 *
 * Canonical:
 * - `testing-host -> host-seam -> host-realization`
 */
export function createOrpcRouter<TContext extends RuntimeRouterContext = RuntimeRouterContext>() {
  return createTestingRawrHostSeam().realization.orpc.router as unknown as Router<AnyContractRouter, TContext>;
}

/**
 * @agents-style canonical realized-host proof helper
 *
 * Owns:
 * - default test/proof access to the realized published OpenAPI router
 *
 * Must not own:
 * - manifest-shaped published router fixtures
 * - ad hoc published route assembly outside host realization
 *
 * Canonical:
 * - `testing-host -> host-seam -> host-realization`
 */
export function createPublishedOpenApiRouter<TContext extends RuntimeRouterContext = RuntimeRouterContext>() {
  return createTestingRawrHostSeam().realization.orpc.published.router as unknown as Router<AnyContractRouter, TContext>;
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
  // Every caller-facing proof path must cross this host span so traces, metrics,
  // and runtime logs describe the same routed execution.
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
  TRequestContext extends RawrBoundaryContext & TContext,
>(args: {
  request: Request;
  rpcHandler: RPCHandler<TContext>;
  contextFactory: (request: Request, deps: RawrBoundaryContextDeps) => TRequestContext;
  contextDeps: RawrBoundaryContextDeps;
  rpcAuthPolicy: RpcAuthPolicy;
  onContextCreated?: (context: TRequestContext) => void;
}): Promise<Response> {
  const { request, rpcHandler, contextFactory, contextDeps, rpcAuthPolicy, onContextCreated } = args;
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
    // Request-scoped logging context is established at the shared host boundary,
    // not inside the service package, so in-process execution still correlates
    // logs with the routed RPC request.
    const loggingContext = createHostLoggingContext({
      request,
      repoRoot: context.repoRoot,
      requestId: context.requestId,
      correlationId: context.correlationId,
      surface: "rpc",
    });

    const response = await withHostLoggingContext(loggingContext, async () => {
      const result = await rpcHandler.handle(request, { prefix: "/rpc", context });
      return result.matched ? result.response : new Response("not found", { status: 404 });
    });

    recordRoutedRequestMetrics({
      surface: "rpc",
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      attributes: { "rawr.orpc.authorized": true, "rawr.orpc.router": "rpc" },
    });
    return response;
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
    // OpenAPI requests must carry the same host-owned logging correlation model
    // as RPC so the two public surfaces stay observably consistent.
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

export async function generateOrpcOpenApiSpec(
  baseUrl: string,
  router: Router<AnyContractRouter, any> = createPublishedOpenApiRouter(),
) {
  return createOpenApiSpec(router, baseUrl);
}

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-canonical host-owned API request materializer
 * @agents-must-not manifest-owned route assembly or HQ testing fixtures
 *
 * Owns:
 * - request-scoped context hydration for RPC and published OpenAPI routes
 * - host auth/logging/telemetry wrappers around realized routers
 *
 * Must not own:
 * - declaration inspection or satisfier resolution
 * - alternate runtime/testing assembly paths outside the realized host seam
 */
export function registerOrpcRoutes<
  TApp extends AnyElysia,
  TContext extends RuntimeRouterContext = RuntimeRouterContext,
  TRequestContext extends RawrBoundaryContext & TContext = RawrBoundaryContext & TContext,
>(
  app: TApp,
  options: RegisterOrpcRoutesOptions<TContext, TRequestContext>,
): TApp {
  const router = (options.router ?? createOrpcRouter<TContext>()) as Router<AnyContractRouter, TContext>;
  const openApiRouter = (options.openApiRouter ?? router) as Router<AnyContractRouter, TContext>;
  const rpcHandler = new RPCHandler<TContext>(router);
  const openapiHandler = new OpenAPIHandler<TContext>(openApiRouter);
  const rpcAuthPolicy = options.rpcAuthPolicy ?? createRpcAuthPolicy({ baseUrl: options.baseUrl });
  const contextDeps: RawrBoundaryContextDeps = {
    repoRoot: options.repoRoot,
    baseUrl: options.baseUrl,
    runtime: options.runtime,
    inngestClient: options.inngestClient,
    hostLogger: options.hostLogger,
  };
  const contextFactory: (request: Request, deps: RawrBoundaryContextDeps) => TRequestContext =
    options.contextFactory ??
    ((request, deps) => createRequestScopedBoundaryContext(request, deps) as TRequestContext);

  let openapiSpecPromise: Promise<unknown> | undefined;
  const getOpenApiSpec = () => {
    if (!openapiSpecPromise) {
      openapiSpecPromise = createOpenApiSpec(openApiRouter, options.baseUrl);
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
