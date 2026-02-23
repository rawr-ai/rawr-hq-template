import type { RuntimeRouterContext } from "@rawr/core/orpc";
import type { SupportTriageInternalClient } from "@rawr/support-triage";

export type SupportTriageApiContext = RuntimeRouterContext & {
  supportTriage: SupportTriageInternalClient;
};
