import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { createClient } from "@rawr/coordination";
import type { Logger } from "@rawr/hq-sdk";
import type { RequestBoundaryContext } from "@rawr/runtime-context";
import type { CoordinationRuntimeAdapter } from "./inngest";

export type CoordinationWorkflowContext = RequestBoundaryContext<CoordinationRuntimeAdapter> & {
  hostLogger?: Logger;
};

export type CoordinationWorkflowAuthoringClient = ReturnType<typeof createCoordinationWorkflowAuthoringClient>;

export function createCoordinationWorkflowAuthoringClient(
  context: CoordinationWorkflowContext,
) {
  return createClient({
    deps: {
      logger: context.hostLogger ?? createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    },
    scope: {
      repoRoot: context.repoRoot,
    },
    config: {},
  }).workflows;
}
