import type { LoggerContext } from "@orpc/evlog";
import type { WithEffectContext } from "@orpc/experimental-effect";
import type {
  BoundaryMiddlewareSupportState,
  BoundaryRequestSupportContext,
  HostRuntimeSupportContext,
} from "@rawr/runtime-context";
import type { Inngest } from "inngest";
import type { ExampleTodoApiContext } from "../../../plugins/server/api/example-todo/src/api";

/** Stable markers whose expensive request policy result may be reused. */
export const RAWR_MIDDLEWARE_DEDUPE_MARKERS = {
  RPC_AUTHORIZATION_DECISION: "rpc.authorization.decision",
} as const;

/** Marker names accepted by the server request boundary. */
export type RawrMiddlewareDedupeMarker =
  (typeof RAWR_MIDDLEWARE_DEDUPE_MARKERS)[keyof typeof RAWR_MIDDLEWARE_DEDUPE_MARKERS];

/** Required heavy-policy markers that must exist before RPC dispatch. */
export const RAWR_HEAVY_MIDDLEWARE_DEDUPE_POLICY = {
  requiredMarkers: [RAWR_MIDDLEWARE_DEDUPE_MARKERS.RPC_AUTHORIZATION_DECISION] as const,
} as const;

/** Request-local cache used to deduplicate qualified host middleware work. */
export type RawrBoundaryMiddlewareState = BoundaryMiddlewareSupportState<
  RawrMiddlewareDedupeMarker,
  boolean
>;

type RawrHostDependencies<TRuntime> = {
  runtime: TRuntime;
  inngestClient: Inngest;
  exampleTodo: ExampleTodoApiContext["deps"]["exampleTodo"];
};

type RawrHostScope = {
  repoRoot: string;
};

type RawrHostConfig = {
  baseUrl: string;
};

type RawrInvocation = {
  requestId: string;
  correlationId: string;
  middlewareState: RawrBoundaryMiddlewareState;
};

/** Stable server-host lanes supplied to every request materializer. */
export type RawrInitialContext<TRuntime = unknown> = HostRuntimeSupportContext<
  RawrHostDependencies<TRuntime>,
  RawrHostScope,
  RawrHostConfig
> &
  WithEffectContext<never>;

type ExampleTodoCompatibleContext<TContext extends ExampleTodoApiContext> = TContext;

/** Complete request context handed to realized RPC, OpenAPI, and workflow routers. */
export type RawrBoundaryContext<TRuntime = unknown> = ExampleTodoCompatibleContext<
  BoundaryRequestSupportContext<
    RawrHostDependencies<TRuntime>,
    RawrHostScope,
    RawrHostConfig,
    RawrInvocation
  >
> &
  WithEffectContext<never> &
  LoggerContext;

const requestScopedMiddlewareStateCache = new WeakMap<Request, RawrBoundaryMiddlewareState>();

function createBoundaryMiddlewareState(): RawrBoundaryMiddlewareState {
  return {
    markerCache: new Map(),
  };
}

function resolveRequestId(request: Request): string {
  const requestId = request.headers.get("x-request-id")?.trim();
  if (requestId) return requestId;
  return crypto.randomUUID();
}

function resolveCorrelationId(request: Request, requestId: string): string {
  const correlationId = request.headers.get("x-correlation-id")?.trim();
  if (correlationId) return correlationId;
  return requestId;
}

/** Returns the one middleware-state cache associated with a Request object. */
export function getRequestScopedBoundaryMiddlewareState(
  request: Request
): RawrBoundaryMiddlewareState {
  const cached = requestScopedMiddlewareStateCache.get(request);
  if (cached) return cached;

  const state = createBoundaryMiddlewareState();
  requestScopedMiddlewareStateCache.set(request, state);
  return state;
}

/** Evaluates a qualified middleware decision at most once per Request object. */
export function resolveRequestScopedMiddlewareDecision(
  request: Request,
  marker: RawrMiddlewareDedupeMarker,
  evaluate: () => boolean
): boolean {
  const state = getRequestScopedBoundaryMiddlewareState(request);
  const cached = state.markerCache.get(marker);
  if (cached !== undefined) return cached;

  const value = evaluate();
  state.markerCache.set(marker, value);
  return value;
}

/** Reports whether a request invocation contains a completed middleware marker. */
export function hasRequestScopedMiddlewareMarker(
  context: Pick<RawrBoundaryContext, "invocation">,
  marker: RawrMiddlewareDedupeMarker
): boolean {
  return context.invocation.middlewareState.markerCache.has(marker);
}

/** Refuses dispatch when a required request middleware marker is absent. */
export function assertRequestScopedMiddlewareMarker(
  context: Pick<RawrBoundaryContext, "invocation">,
  marker: RawrMiddlewareDedupeMarker
): void {
  if (hasRequestScopedMiddlewareMarker(context, marker)) {
    return;
  }

  throw new Error(`missing request-scoped middleware dedupe marker: ${marker}`);
}

/** Refuses dispatch until every named heavy middleware decision has completed. */
export function assertHeavyMiddlewareDedupeMarkers(
  context: Pick<RawrBoundaryContext, "invocation">,
  markers: readonly RawrMiddlewareDedupeMarker[]
): void {
  const missing = markers.filter((marker) => !hasRequestScopedMiddlewareMarker(context, marker));
  if (missing.length === 0) {
    return;
  }

  throw new Error(`missing required heavy middleware dedupe marker(s): ${missing.join(", ")}`);
}

/**
 * Materializes the invocation lane for one request without rebuilding stable
 * host dependencies, scope, or configuration.
 */
export function createRequestScopedBoundaryContext<TRuntime>(
  request: Request,
  initial: RawrInitialContext<TRuntime>
): RawrBoundaryContext<TRuntime> {
  const requestId = resolveRequestId(request);
  const correlationId = resolveCorrelationId(request, requestId);

  return {
    ...initial,
    invocation: {
      requestId,
      correlationId,
      middlewareState: getRequestScopedBoundaryMiddlewareState(request),
    },
    provided: {},
  };
}
