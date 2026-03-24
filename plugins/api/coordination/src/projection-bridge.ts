import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";
import { createClient } from "@rawr/coordination";
import {
  createDeskEvent as createServiceDeskEvent,
  type CreateDeskEventDraft,
} from "@rawr/coordination/events";

export type CoordinationApiContext = BoundaryRequestSupportContext;

const sharedDeps = {
  logger: createEmbeddedPlaceholderLoggerAdapter(),
  analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
} as const;

const emptyInvocation = {
  context: {
    invocation: {},
  },
} as const;

export const coordinationProjectionInvocation = emptyInvocation;

function createResidualDeskEvent(input: CreateDeskEventDraft) {
  return createServiceDeskEvent({
    ...input,
    eventId: "coordination-api-residual",
    ts: new Date(0).toISOString(),
  });
}

async function unsupportedQueueRun(): Promise<never> {
  throw new Error(
    "Coordination workflow dispatch authority lives in @rawr/plugin-workflows-coordination.",
  );
}

export function createCoordinationProjectionBridge(context: CoordinationApiContext) {
  const client = createClient({
    deps: {
      ...sharedDeps,
      queueRun: unsupportedQueueRun,
      createTraceLinks: () => [],
      createEvent: createResidualDeskEvent,
    },
    scope: {
      repoRoot: context.repoRoot,
    },
    config: {},
  });

  return {
    listWorkflows(input: Parameters<typeof client.listWorkflows>[0]) {
      return client.listWorkflows(input, coordinationProjectionInvocation);
    },
    saveWorkflow(input: Parameters<typeof client.saveWorkflow>[0]) {
      return client.saveWorkflow(input, coordinationProjectionInvocation);
    },
    getWorkflow(input: Parameters<typeof client.getWorkflow>[0]) {
      return client.getWorkflow(input, coordinationProjectionInvocation);
    },
    validateWorkflow(input: Parameters<typeof client.validateWorkflow>[0]) {
      return client.validateWorkflow(input, coordinationProjectionInvocation);
    },
  };
}

export type CoordinationProjectionBridge = ReturnType<typeof createCoordinationProjectionBridge>;
