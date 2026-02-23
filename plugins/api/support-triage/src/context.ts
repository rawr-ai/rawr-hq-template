import type { CoordinationRuntimeAdapter } from "@rawr/coordination-inngest";
import type { SupportTriageInternalClient } from "@rawr/support-triage";
import type { Inngest } from "inngest";

// Keep this structurally aligned with `apps/server/src/workflows/context.ts` so API plugin routers
// can be composed into the host oRPC router without context-type drift.
type RawrMiddlewareDedupeMarker = "rpc.authorization.decision";

type RawrBoundaryMiddlewareState = {
  markerCache: Map<RawrMiddlewareDedupeMarker, unknown>;
};

export type SupportTriageApiContext = {
  repoRoot: string;
  baseUrl: string;
  runtime: CoordinationRuntimeAdapter;
  inngestClient: Inngest;
  requestId: string;
  correlationId: string;
  middlewareState: RawrBoundaryMiddlewareState;
  // Provided by the host when the example capability is enabled.
  supportTriage?: SupportTriageInternalClient;
};
