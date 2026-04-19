import { createClient } from "@rawr/hq-ops";
import { createNodeHqOpsBoundary } from "@rawr/hq-ops-host";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";

type HqOpsBoundary = Parameters<typeof createClient>[0];

export function createHqOpsClient(repoRoot: string) {
  const boundary = createNodeHqOpsBoundary({
    repoRoot,
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
  }) satisfies HqOpsBoundary;

  return createClient(boundary);
}

export function createHqOpsInvocation(traceId: string) {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

export type HqOpsClient = ReturnType<typeof createHqOpsClient>;
export type HqOpsConfigLoadResult = Awaited<ReturnType<HqOpsClient["config"]["getWorkspaceConfig"]>>;
export type HqOpsJournalEvent = Parameters<HqOpsClient["journal"]["writeEvent"]>[0];
export type HqOpsJournalSnippet = Parameters<HqOpsClient["journal"]["writeSnippet"]>[0];
