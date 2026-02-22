import type { CoordinationRuntimeAdapter } from "@rawr/coordination-inngest";
import type { Inngest } from "inngest";

export const RAWR_MIDDLEWARE_DEDUPE_MARKERS = {
  RPC_AUTHORIZATION_DECISION: "rpc.authorization.decision",
} as const;

export type RawrMiddlewareDedupeMarker =
  (typeof RAWR_MIDDLEWARE_DEDUPE_MARKERS)[keyof typeof RAWR_MIDDLEWARE_DEDUPE_MARKERS];

export type RawrBoundaryMiddlewareState = {
  markerCache: Map<RawrMiddlewareDedupeMarker, unknown>;
};

export type RawrBoundaryContextDeps = {
  repoRoot: string;
  baseUrl: string;
  runtime: CoordinationRuntimeAdapter;
  inngestClient: Inngest;
};

export type RawrBoundaryContext = RawrBoundaryContextDeps & {
  requestId: string;
  correlationId: string;
  middlewareState: RawrBoundaryMiddlewareState;
};

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

export function getRequestScopedBoundaryMiddlewareState(request: Request): RawrBoundaryMiddlewareState {
  const cached = requestScopedMiddlewareStateCache.get(request);
  if (cached) return cached;

  const state = createBoundaryMiddlewareState();
  requestScopedMiddlewareStateCache.set(request, state);
  return state;
}

export function resolveRequestScopedMiddlewareValue<T>(
  request: Request,
  marker: RawrMiddlewareDedupeMarker,
  evaluate: () => T,
): T {
  const state = getRequestScopedBoundaryMiddlewareState(request);
  if (state.markerCache.has(marker)) {
    return state.markerCache.get(marker) as T;
  }

  const value = evaluate();
  state.markerCache.set(marker, value);
  return value;
}

export function hasRequestScopedMiddlewareMarker(
  context: Pick<RawrBoundaryContext, "middlewareState">,
  marker: RawrMiddlewareDedupeMarker,
): boolean {
  return context.middlewareState.markerCache.has(marker);
}

export function assertRequestScopedMiddlewareMarker(
  context: Pick<RawrBoundaryContext, "middlewareState">,
  marker: RawrMiddlewareDedupeMarker,
): void {
  if (hasRequestScopedMiddlewareMarker(context, marker)) {
    return;
  }

  throw new Error(`missing request-scoped middleware dedupe marker: ${marker}`);
}

export function createRequestScopedBoundaryContext(
  request: Request,
  deps: RawrBoundaryContextDeps,
): RawrBoundaryContext {
  const requestId = resolveRequestId(request);
  const correlationId = resolveCorrelationId(request, requestId);

  return {
    ...deps,
    requestId,
    correlationId,
    middlewareState: getRequestScopedBoundaryMiddlewareState(request),
  };
}

export function createWorkflowBoundaryContext(request: Request, deps: RawrBoundaryContextDeps): RawrBoundaryContext {
  return createRequestScopedBoundaryContext(request, deps);
}
