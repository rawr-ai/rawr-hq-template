import {
  createEmbeddedPlaceholderAnalyticsAdapter,
  type EmbeddedPlaceholderAnalyticsEntry,
} from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
  type EmbeddedPlaceholderLogEntry,
} from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { CreateClientOptions } from "../src/client";

export type LogEntry = EmbeddedPlaceholderLogEntry;
export type AnalyticsEntry = EmbeddedPlaceholderAnalyticsEntry;

type ClientOptions = {
  repoRoot?: string;
  logs?: LogEntry[];
  analytics?: AnalyticsEntry[];
};

export function createClientOptions(options: ClientOptions = {}): CreateClientOptions {
  return {
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter({ sink: options.logs }),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: options.analytics }),
    },
    scope: {
      repoRoot: options.repoRoot ?? "/tmp/rawr-state-observability",
    },
    config: {},
  } as const;
}

export function createInvocation(traceId = "trace-state-default") {
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

export const invocation = createInvocation;
