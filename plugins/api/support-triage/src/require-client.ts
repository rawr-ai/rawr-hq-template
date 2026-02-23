import { ORPCError } from "@orpc/server";
import type { SupportTriageInternalClient } from "@rawr/support-triage";
import type { SupportTriageApiContext } from "./context";

/**
 * API plugin operations assume the host injected an in-process internal client.
 * When the example is not mounted, fail fast with a typed boundary error.
 */
export function requireSupportTriageClient(context: SupportTriageApiContext): SupportTriageInternalClient {
  const client = context.supportTriage;
  if (client) {
    return client;
  }

  throw new ORPCError("SUPPORT_TRIAGE_NOT_CONFIGURED", {
    status: 500,
    message: "support-triage internal client is not configured on the request context",
  });
}

