import { createRouterClient } from "@orpc/server";
import type { SupportTriageProcedureContext } from "./context";
import type { SupportTriageServiceDeps } from "./service";
import { supportTriageRouter } from "./router";

export function createSupportTriageClient(context: SupportTriageProcedureContext) {
  return createRouterClient(supportTriageRouter, { context });
}

export function createSupportTriageClientFromDeps(
  deps: SupportTriageServiceDeps,
  metadata?: Omit<SupportTriageProcedureContext, "deps">,
) {
  return createSupportTriageClient({
    deps,
    ...(metadata ?? {}),
  });
}

export type SupportTriageClient = ReturnType<typeof createSupportTriageClient>;
