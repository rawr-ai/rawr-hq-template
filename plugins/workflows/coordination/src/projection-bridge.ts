import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { createClient } from "@rawr/coordination";
import type { CoordinationWorkflowContext } from "./context";
import { createDeskEvent } from "./events";
import { queueCoordinationRunWithInngest } from "./inngest";
import { defaultTraceLinks } from "./trace-links";

const sharedDeps = {
  logger: createEmbeddedPlaceholderLoggerAdapter(),
  analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
} as const;

const emptyInvocation = {
  context: {
    invocation: {},
  },
} as const;

export const coordinationWorkflowProjectionInvocation = emptyInvocation;

export function createCoordinationWorkflowProjectionClient(context: CoordinationWorkflowContext) {
  return createClient({
    deps: {
      ...sharedDeps,
      queueRun: ({ workflow, runId, input }) =>
        queueCoordinationRunWithInngest({
          client: context.inngestClient,
          runtime: context.runtime,
          workflow,
          runId,
          input,
          baseUrl: context.baseUrl,
        }),
      createTraceLinks: ({ runId, inngestRunId, inngestEventId }) =>
        defaultTraceLinks(context.baseUrl, runId, {
          inngestBaseUrl: context.runtime.inngestBaseUrl,
          inngestRunId,
          inngestEventId,
        }),
      createEvent: createDeskEvent,
    },
    scope: {
      repoRoot: context.repoRoot,
    },
    config: {},
  });
}

export type CoordinationWorkflowProjectionClient = ReturnType<
  typeof createCoordinationWorkflowProjectionClient
>;
