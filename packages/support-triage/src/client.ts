import { createRouterClient } from "@orpc/server";
import { internalRouter } from "./router";
import type { SupportTriageProcedureContext } from "./context";

export function createSupportTriageInternalClient(context: SupportTriageProcedureContext) {
  return createRouterClient(internalRouter, { context });
}

export type SupportTriageInternalClient = ReturnType<typeof createSupportTriageInternalClient>;

