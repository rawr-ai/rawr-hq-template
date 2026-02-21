import type { CoordinationRuntimeAdapter } from "@rawr/coordination-inngest";
import type { Inngest } from "inngest";

export type RawrBoundaryContextDeps = {
  repoRoot: string;
  baseUrl: string;
  runtime: CoordinationRuntimeAdapter;
  inngestClient: Inngest;
};

export type RawrBoundaryContext = RawrBoundaryContextDeps & {
  requestId: string;
  correlationId: string;
};

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
  };
}

export function createWorkflowBoundaryContext(request: Request, deps: RawrBoundaryContextDeps): RawrBoundaryContext {
  return createRequestScopedBoundaryContext(request, deps);
}
