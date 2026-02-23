import type { RuntimeRouterContext } from "@rawr/core/orpc";
import type { SupportTriageClient } from "@rawr/support-triage";

export type SupportTriageApiContext = RuntimeRouterContext & {
  supportTriage: SupportTriageClient;
};
