import type { SupportTriageServiceDeps } from "./service";

export type SupportTriageProcedureContext = {
  deps: SupportTriageServiceDeps;
  requestId?: string;
  correlationId?: string;
};
