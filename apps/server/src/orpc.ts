import { createHqRuntimeRouter, createWorkflowTriggerRuntimeRouter } from "@rawr/core/orpc";
import { OpenAPIGenerator, type ConditionalSchemaConverter, type JSONSchema } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { RPCHandler } from "@orpc/server/fetch";
import { createRpcAuthPolicy, isRpcRequestAllowed, type RpcAuthPolicy } from "./auth/rpc-auth";
import type { AnyElysia } from "./plugins";
import {
  assertRequestScopedMiddlewareMarker,
  createRequestScopedBoundaryContext,
  RAWR_MIDDLEWARE_DEDUPE_MARKERS,
  resolveRequestScopedMiddlewareValue,
  type RawrBoundaryContext,
  type RawrBoundaryContextDeps,
} from "./workflows/context";

type RawrOrpcContext = RawrBoundaryContext;
type RawrOrpcRouter = ReturnType<typeof createOrpcRouter>;
type RawrOrpcContextFactory = (request: Request, deps: RawrBoundaryContextDeps) => RawrOrpcContext;
type OnRawrOrpcContextCreated = (context: RawrOrpcContext) => void;

const RPC_AUTH_DEDUPE_MARKER = RAWR_MIDDLEWARE_DEDUPE_MARKERS.RPC_AUTHORIZATION_DECISION;

export type RegisterOrpcRoutesOptions = RawrBoundaryContextDeps & {
  router?: RawrOrpcRouter;
  contextFactory?: (request: Request, deps: RawrBoundaryContextDeps) => RawrOrpcContext;
  onContextCreated?: (context: RawrOrpcContext) => void;
  rpcAuthPolicy?: RpcAuthPolicy;
};

export function createOrpcRouter() {
  return createHqRuntimeRouter<RawrOrpcContext>();
}

export function createWorkflowTriggerRouter() {
  return createWorkflowTriggerRuntimeRouter<RawrOrpcContext>();
}

function isRpcRequestAllowedWithDedupe(request: Request, policy: RpcAuthPolicy): boolean {
  return resolveRequestScopedMiddlewareValue(request, RPC_AUTH_DEDUPE_MARKER, () => isRpcRequestAllowed(request, policy));
}

function assertRpcAuthDedupeMarker(context: RawrOrpcContext): void {
  assertRequestScopedMiddlewareMarker(context, RPC_AUTH_DEDUPE_MARKER);
}

async function handleRpcRoute(args: {
  request: Request;
  rpcHandler: RPCHandler<RawrOrpcContext>;
  contextFactory: RawrOrpcContextFactory;
  contextDeps: RawrBoundaryContextDeps;
  rpcAuthPolicy: RpcAuthPolicy;
  onContextCreated?: OnRawrOrpcContextCreated;
}): Promise<Response> {
  const { request, rpcHandler, contextFactory, contextDeps, rpcAuthPolicy, onContextCreated } = args;
  if (!isRpcRequestAllowedWithDedupe(request, rpcAuthPolicy)) {
    return new Response("forbidden", { status: 403 });
  }

  const context = contextFactory(request, contextDeps);
  assertRpcAuthDedupeMarker(context);
  onContextCreated?.(context);
  const result = await rpcHandler.handle(request, { prefix: "/rpc", context });
  return result.matched ? result.response : new Response("not found", { status: 404 });
}

async function handleOpenApiRoute(args: {
  request: Request;
  openapiHandler: OpenAPIHandler<RawrOrpcContext>;
  contextFactory: RawrOrpcContextFactory;
  contextDeps: RawrBoundaryContextDeps;
  onContextCreated?: OnRawrOrpcContextCreated;
}): Promise<Response> {
  const { request, openapiHandler, contextFactory, contextDeps, onContextCreated } = args;
  const context = contextFactory(request, contextDeps);
  onContextCreated?.(context);
  const result = await openapiHandler.handle(request, { prefix: "/api/orpc", context });
  return result.matched ? result.response : new Response("not found", { status: 404 });
}

async function createOpenApiSpec(router: RawrOrpcRouter, baseUrl: string) {
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

export function registerOrpcRoutes<TApp extends AnyElysia>(app: TApp, options: RegisterOrpcRoutesOptions): TApp {
  const router = options.router ?? createOrpcRouter();
  const rpcHandler = new RPCHandler<RawrOrpcContext>(router);
  const openapiHandler = new OpenAPIHandler<RawrOrpcContext>(router);
  const rpcAuthPolicy = options.rpcAuthPolicy ?? createRpcAuthPolicy({ baseUrl: options.baseUrl });
  const contextDeps: RawrBoundaryContextDeps = {
    repoRoot: options.repoRoot,
    baseUrl: options.baseUrl,
    runtime: options.runtime,
    inngestClient: options.inngestClient,
  };
  const contextFactory = options.contextFactory ?? createRequestScopedBoundaryContext;

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
