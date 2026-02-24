import type { CoordinationRuntimeAdapter } from "@rawr/coordination-inngest";
import type { SupportExampleClient } from "@rawr/support-example/client";
import type { Inngest } from "inngest";

// Keep this structurally aligned with `apps/server/src/workflows/context.ts` so workflow plugin routers
// can be composed into host boundaries without leaking plugin-specific context contracts.
type RawrMiddlewareDedupeMarker = "rpc.authorization.decision";

type RawrBoundaryMiddlewareState = {
  markerCache: Map<RawrMiddlewareDedupeMarker, unknown>;
};

export type SupportExampleWorkflowContext = {
  repoRoot: string;
  baseUrl: string;
  runtime: CoordinationRuntimeAdapter;
  inngestClient: Inngest;
  requestId: string;
  correlationId: string;
  middlewareState: RawrBoundaryMiddlewareState;
  // Provided by the host when the example capability is enabled.
  supportExample: SupportExampleClient;
};
