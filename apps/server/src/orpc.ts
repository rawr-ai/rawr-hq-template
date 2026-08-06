import {
  type Counter,
  type Histogram,
  metrics,
  context as otelContext,
  propagation,
  SpanStatusCode,
  type TextMapGetter,
  trace,
} from "@opentelemetry/api";
import {
  combineJsonObjectSchemaEntries,
  combineJsonSchemasWithComposition,
  type JsonObjectSchema,
  type JsonSchema,
  StandardJsonSchemaConverter,
} from "@orpc/json-schema";
import { type OpenAPIErrorBodyDefinition, OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { COMMON_ERROR_STATUS_MAP, type Router } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type { RawrServerApp } from "./app";
import { createRpcAuthPolicy, isRpcRequestAllowed, type RpcAuthPolicy } from "./auth/rpc-auth";
import {
  createHostLoggingContext,
  withHostLoggingContext,
  withHostLoggingSpanContext,
} from "./logging";
import {
  assertHeavyMiddlewareDedupeMarkers,
  assertRequestScopedMiddlewareMarker,
  createRequestScopedBoundaryContext,
  RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY,
  RAWR_MIDDLEWARE_DEDUPE_MARKERS,
  type RawrBoundaryContext,
  type RawrInitialContext,
  resolveRequestScopedMiddlewareDecision,
} from "./request-context";
import { createTestingRawrHostSeam } from "./testing-host";

type RawrOrpcContext = RawrBoundaryContext;
type RawrOrpcRouter = Router<RawrOrpcContext>;

const RPC_AUTH_DEDUPE_MARKER = RAWR_MIDDLEWARE_DEDUPE_MARKERS.RPC_AUTHORIZATION_DECISION;
const RAWR_ERROR_STATUS_MAP = {
  ...COMMON_ERROR_STATUS_MAP,
  ALREADY_ASSIGNED: 409,
  ASSIGNMENT_LIMIT_REACHED: 409,
  CORPUS_ARTIFACT_VALIDATION_FAILED: 422,
  DUPLICATE_TAG: 409,
  INVALID_CONVERSATION_EXPORT: 400,
  INVALID_CONVERSATION_JSON: 400,
  INVALID_REGEX: 400,
  INVALID_TASK_TITLE: 400,
  READ_ONLY_MODE: 409,
  RESOURCE_NOT_FOUND: 404,
  SESSION_NOT_FOUND: 404,
  UNKNOWN_SESSION_FORMAT: 422,
} satisfies Record<string, number>;

const requestHeaderGetter: TextMapGetter<Headers> = {
  get(carrier, key) {
    return carrier.get(key) ?? undefined;
  },
  keys(carrier) {
    const keys: string[] = [];
    carrier.forEach((_value, key) => keys.push(key));
    return keys;
  },
};

function closedErrorObject(
  entries: Parameters<typeof combineJsonObjectSchemaEntries>[0]
): JsonObjectSchema {
  return {
    ...combineJsonObjectSchemaEntries(entries),
    additionalProperties: false,
  };
}

function createNativeErrorBodySchema(definedErrors: OpenAPIErrorBodyDefinition[]): JsonSchema {
  const definedErrorSchemas = definedErrors.map((error) =>
    closedErrorObject([
      ["defined", { const: true }, false],
      ["inferable", { type: "boolean" }, false],
      ["code", { const: error.code }, false],
      ["message", { type: "string", default: error.defaultMessage }, false],
      ["data", error.dataJsonSchema, error.dataOptional],
    ])
  );
  const undefinedErrorSchema = closedErrorObject([
    ["defined", { const: false }, false],
    ["inferable", { type: "boolean" }, false],
    ["code", { type: "string" }, false],
    ["message", { type: "string" }, false],
    ["data", {}, true],
  ]);

  return combineJsonSchemasWithComposition("oneOf", [...definedErrorSchemas, undefinedErrorSchema]);
}
let routedRequestsCounter: Counter | undefined;
let routedRequestDurationHistogram: Histogram | undefined;

export type RegisterOrpcRoutesOptions = RawrInitialContext & {
  router?: RawrOrpcRouter;
  openApiRouter?: RawrOrpcRouter;
  contextFactory?: (request: Request, initial: RawrInitialContext) => RawrBoundaryContext;
  onContextCreated?: (context: RawrBoundaryContext) => void;
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
export function createOrpcRouter(): RawrOrpcRouter {
  return createTestingRawrHostSeam().realization.orpc.router;
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
export function createPublishedOpenApiRouter(): RawrOrpcRouter {
  return createTestingRawrHostSeam().realization.orpc.published.router;
}

function isRpcRequestAllowedWithDedupe(request: Request, policy: RpcAuthPolicy): boolean {
  return resolveRequestScopedMiddlewareDecision(request, RPC_AUTH_DEDUPE_MARKER, () =>
    isRpcRequestAllowed(request, policy)
  );
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
  request: Request,
  name: string,
  attributes: Record<string, string | boolean | number>,
  fn: () => Promise<Response>
): Promise<Response> {
  // Every caller-facing proof path must cross this host span so traces, metrics,
  // and runtime logs describe the same routed execution.
  const parentContext = propagation.extract(
    otelContext.active(),
    request.headers,
    requestHeaderGetter
  );
  return otelContext.with(parentContext, () =>
    getRouteTracer().startActiveSpan(name, async (span) => {
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
    })
  );
}

async function handleRpcRoute(args: {
  request: Request;
  rpcHandler: RPCHandler<RawrBoundaryContext>;
  contextFactory: (request: Request, initial: RawrInitialContext) => RawrBoundaryContext;
  initialContext: RawrInitialContext;
  rpcAuthPolicy: RpcAuthPolicy;
  onContextCreated?: (context: RawrBoundaryContext) => void;
}): Promise<Response> {
  const { request, rpcHandler, contextFactory, initialContext, rpcAuthPolicy, onContextCreated } =
    args;
  const startedAt = Date.now();
  return withRouteSpan(
    request,
    "rawr.orpc.rpc.request",
    {
      "rawr.orpc.surface": "rpc",
      "url.full": request.url,
    },
    async () => {
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

      const context = contextFactory(request, initialContext);
      assertRpcAuthDedupeMarker(context);
      onContextCreated?.(context);
      // Request-scoped logging context is established at the shared host boundary,
      // not inside the service package, so in-process execution still correlates
      // logs with the routed RPC request.
      const loggingContext = createHostLoggingContext({
        request,
        repoRoot: context.scope.repoRoot,
        requestId: context.invocation.requestId,
        correlationId: context.invocation.correlationId,
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
    }
  ).catch((error) => {
    recordRoutedRequestMetrics({
      surface: "rpc",
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      attributes: { "rawr.orpc.authorized": true, "rawr.orpc.router": "rpc" },
    });
    throw error;
  });
}

async function handleOpenApiRoute(args: {
  request: Request;
  openapiHandler: OpenAPIHandler<RawrBoundaryContext>;
  contextFactory: (request: Request, initial: RawrInitialContext) => RawrBoundaryContext;
  initialContext: RawrInitialContext;
  onContextCreated?: (context: RawrBoundaryContext) => void;
}): Promise<Response> {
  const { request, openapiHandler, contextFactory, initialContext, onContextCreated } = args;
  const startedAt = Date.now();
  return withRouteSpan(
    request,
    "rawr.orpc.openapi.request",
    {
      "rawr.orpc.surface": "openapi",
      "url.full": request.url,
    },
    async () => {
      const context = contextFactory(request, initialContext);
      onContextCreated?.(context);
      // OpenAPI requests must carry the same host-owned logging correlation model
      // as RPC so the two public surfaces stay observably consistent.
      const loggingContext = createHostLoggingContext({
        request,
        repoRoot: context.scope.repoRoot,
        requestId: context.invocation.requestId,
        correlationId: context.invocation.correlationId,
        surface: "openapi",
      });

      const response = await withHostLoggingContext(loggingContext, async () => {
        const result = await openapiHandler.handle(request, { prefix: "/api/orpc", context });
        return result.matched ? result.response : new Response("not found", { status: 404 });
      });
      recordRoutedRequestMetrics({
        surface: "openapi",
        statusCode: response.status,
        durationMs: Date.now() - startedAt,
        attributes: { "rawr.orpc.router": "openapi" },
      });
      return response;
    }
  ).catch((error) => {
    recordRoutedRequestMetrics({
      surface: "openapi",
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      attributes: { "rawr.orpc.router": "openapi" },
    });
    throw error;
  });
}

async function createOpenApiSpec(router: RawrOrpcRouter, baseUrl: string) {
  const generator = new OpenAPIGenerator({
    converters: [new StandardJsonSchemaConverter()],
  });
  return generator.generate(router, {
    base: {
      info: {
        title: "RAWR HQ ORPC API",
        version: "1.0.0",
      },
      servers: [{ url: baseUrl }],
    },
    errorStatusMap: RAWR_ERROR_STATUS_MAP,
    customErrorResponseBodySchema: createNativeErrorBodySchema,
  });
}

export async function generateOrpcOpenApiSpec(
  baseUrl: string,
  router: RawrOrpcRouter = createPublishedOpenApiRouter()
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
export function registerOrpcRoutes<TApp extends RawrServerApp>(
  app: TApp,
  options: RegisterOrpcRoutesOptions
): TApp {
  const router = options.router ?? createOrpcRouter();
  const openApiRouter = options.openApiRouter ?? router;
  const rpcHandler = new RPCHandler<RawrBoundaryContext>(router, {
    errorStatusMap: RAWR_ERROR_STATUS_MAP,
  });
  const openapiHandler = new OpenAPIHandler<RawrBoundaryContext>(openApiRouter, {
    errorStatusMap: RAWR_ERROR_STATUS_MAP,
  });
  const rpcAuthPolicy =
    options.rpcAuthPolicy ?? createRpcAuthPolicy({ baseUrl: options.config.baseUrl });
  const initialContext: RawrInitialContext = {
    "effect/context": options["effect/context"],
    ...(options["effect/wrap"] === undefined ? {} : { "effect/wrap": options["effect/wrap"] }),
    deps: options.deps,
    scope: options.scope,
    config: options.config,
  };
  const contextFactory = options.contextFactory ?? createRequestScopedBoundaryContext;

  let openapiSpecPromise: Promise<unknown> | undefined;
  const getOpenApiSpec = () => {
    if (!openapiSpecPromise) {
      openapiSpecPromise = createOpenApiSpec(openApiRouter, options.config.baseUrl);
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
        initialContext,
        rpcAuthPolicy,
        onContextCreated: options.onContextCreated,
      });
    },
    { parse: "none" }
  );

  app.all(
    "/rpc/*",
    async (ctx) => {
      const request = ctx.request as Request;
      return handleRpcRoute({
        request,
        rpcHandler,
        contextFactory,
        initialContext,
        rpcAuthPolicy,
        onContextCreated: options.onContextCreated,
      });
    },
    { parse: "none" }
  );

  app.all(
    "/api/orpc",
    async (ctx) => {
      const request = ctx.request as Request;
      return handleOpenApiRoute({
        request,
        openapiHandler,
        contextFactory,
        initialContext,
        onContextCreated: options.onContextCreated,
      });
    },
    { parse: "none" }
  );

  app.all(
    "/api/orpc/*",
    async (ctx) => {
      const request = ctx.request as Request;
      return handleOpenApiRoute({
        request,
        openapiHandler,
        contextFactory,
        initialContext,
        onContextCreated: options.onContextCreated,
      });
    },
    { parse: "none" }
  );

  return app;
}

export type { RawrOrpcContext };
