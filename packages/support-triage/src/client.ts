import { createRouterClient } from "@orpc/server";
import { supportTriageInternalRouter } from "./router";
import type { SupportTriageProcedureContext } from "./context";

export function createSupportTriageInternalClient(context: SupportTriageProcedureContext) {
  return createRouterClient(supportTriageInternalRouter, { context });
}

export type SupportTriageInternalClient = ReturnType<typeof createSupportTriageInternalClient>;

