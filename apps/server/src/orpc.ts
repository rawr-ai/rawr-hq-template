import { createHqRuntimeRouter, createWorkflowTriggerRuntimeRouter } from "@rawr/core/orpc";
import { OpenAPIGenerator, type ConditionalSchemaConverter, type JSONSchema } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { AnyContractRouter } from "@orpc/contract";
import type { Router } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createRpcAuthPolicy, isRpcRequestAllowed, type RpcAuthPolicy } from "./auth/rpc-auth";
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

type RawrOrpcContext = RawrBoundaryContext;
type RawrOrpcRouter = Router<AnyContractRouter, RawrOrpcContext>;

const RPC_AUTH_DEDUPE_MARKER = RAWR_MIDDLEWARE_DEDUPE_MARKERS.RPC_AUTHORIZATION_DECISION;

export type RegisterOrpcRoutesOptions<
  TContext extends RawrBoundaryContext = RawrBoundaryContext,
  TWorkflowContext extends RawrBoundaryContext = TContext,
  TRequestContext extends TContext & TWorkflowContext = TContext & TWorkflowContext,
> = RawrBoundaryContextDeps & {
  router?: Router<AnyContractRouter, TContext>;
  workflowTriggerRouter?: Router<AnyContractRouter, TWorkflowContext>;
  contextFactory?: (request: Request, deps: RawrBoundaryContextDeps) => TRequestContext;
  onContextCreated?: (context: TRequestContext) => void;
  rpcAuthPolicy?: RpcAuthPolicy;
};

export function createOrpcRouter<TContext extends RawrBoundaryContext = RawrBoundaryContext>() {
  return createHqRuntimeRouter<TContext>();
}

export function createWorkflowTriggerRouter<TContext extends RawrBoundaryContext = RawrBoundaryContext>() {
  return createWorkflowTriggerRuntimeRouter<TContext>();
}

function isRpcRequestAllowedWithDedupe(request: Request, policy: RpcAuthPolicy): boolean {
  return resolveRequestScopedMiddlewareValue(request, RPC_AUTH_DEDUPE_MARKER, () => isRpcRequestAllowed(request, policy));
}

function assertRpcAuthDedupeMarker(context: RawrBoundaryContext): void {
  assertRequestScopedMiddlewareMarker(context, RPC_AUTH_DEDUPE_MARKER);
  assertHeavyMiddlewareDedupeMarkers(context, RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY.requiredMarkers);
}

async function handleRpcRoute<
  TContext extends RawrBoundaryContext,
  TWorkflowContext extends RawrBoundaryContext,
  TRequestContext extends TContext & TWorkflowContext,
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
  if (!isRpcRequestAllowedWithDedupe(request, rpcAuthPolicy)) {
    return new Response("forbidden", { status: 403 });
  }

  const context = contextFactory(request, contextDeps);
  assertRpcAuthDedupeMarker(context);
  onContextCreated?.(context);

  // The oRPC RPC handler may consume the request body before it can decide that a procedure is unmatched.
  // Clone upfront so we can safely fall back to the workflow trigger router without double-consuming the stream.
  const workflowFallbackRequest = workflowTriggerRpcHandler ? request.clone() : undefined;

  const result = await rpcHandler.handle(request, { prefix: "/rpc", context });
  if (result.matched) {
    return result.response;
  }

  if (!workflowTriggerRpcHandler || !workflowFallbackRequest) {
    return new Response("not found", { status: 404 });
  }

  const workflowResult = await workflowTriggerRpcHandler.handle(workflowFallbackRequest, { prefix: "/rpc", context });
  return workflowResult.matched ? workflowResult.response : new Response("not found", { status: 404 });
}

async function handleOpenApiRoute<TContext extends RawrBoundaryContext, TRequestContext extends TContext>(args: {
  request: Request;
  openapiHandler: OpenAPIHandler<TContext>;
  contextFactory: (request: Request, deps: RawrBoundaryContextDeps) => TRequestContext;
  contextDeps: RawrBoundaryContextDeps;
  onContextCreated?: (context: TRequestContext) => void;
}): Promise<Response> {
  const { request, openapiHandler, contextFactory, contextDeps, onContextCreated } = args;
  const context = contextFactory(request, contextDeps);
  onContextCreated?.(context);
  const result = await openapiHandler.handle(request, { prefix: "/api/orpc", context });
  return result.matched ? result.response : new Response("not found", { status: 404 });
}

async function createOpenApiSpec<TContext extends RawrBoundaryContext>(
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
  TContext extends RawrBoundaryContext = RawrBoundaryContext,
  TWorkflowContext extends RawrBoundaryContext = TContext,
  TRequestContext extends TContext & TWorkflowContext = TContext & TWorkflowContext,
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
