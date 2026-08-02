import type { DbPool } from "@habitat-ai/rawr-hq-sdk";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
  type EmbeddedPlaceholderAnalyticsEntry,
} from "@habitat-ai/rawr-hq-sdk/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
  type EmbeddedPlaceholderLogEntry,
} from "@habitat-ai/rawr-hq-sdk/host-adapters/logger/embedded-placeholder";
import {
  createEmbeddedInMemoryDbPoolAdapter,
  type EmbeddedInMemorySqlOptions,
} from "@habitat-ai/rawr-hq-sdk/host-adapters/sql/embedded-in-memory";
import type { CreateClientOptions, Deps, Invocation } from "../../../src/client";

type DepsOptions = EmbeddedInMemorySqlOptions & {
  logs?: LogEntry[];
  analytics?: AnalyticsEntry[];
};

type ClientOptions = DepsOptions & {
  deps?: Deps;
  readOnly?: boolean;
  maxAssignmentsPerTask?: number;
  workspaceId?: string;
};

export type OrpcErrorShape = {
  defined: boolean;
  inferable: boolean;
  code: string;
  message: string;
  data?: Record<string, unknown>;
};

export type LogEntry = EmbeddedPlaceholderLogEntry;
export type AnalyticsEntry = EmbeddedPlaceholderAnalyticsEntry;

export function createDeps(options: DepsOptions = {}): Deps {
  let tick = 0;
  let identifier = 0;
  const dbPool: DbPool = createEmbeddedInMemoryDbPoolAdapter(options);

  return {
    dbPool,
    clock: {
      now: () => {
        tick += 1;
        return new Date(Date.UTC(2026, 1, 25, 0, 0, tick)).toISOString();
      },
    },
    identifierGenerator: {
      generate: () => {
        identifier += 1;
        return `00000000-0000-4000-8000-${identifier.toString().padStart(12, "0")}`;
      },
    },
    logger: createEmbeddedPlaceholderLoggerAdapter({ sink: options.logs }),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter({ sink: options.analytics }),
  };
}

export function createClientOptions(options: ClientOptions = {}): CreateClientOptions {
  return {
    deps: options.deps ?? createDeps(options),
    scope: {
      workspaceId: options.workspaceId ?? "workspace-default",
    },
    config: {
      readOnly: options.readOnly ?? false,
      limits: {
        maxAssignmentsPerTask: options.maxAssignmentsPerTask ?? 2,
      },
    },
  };
}

export function createInvocation(traceId = "trace-default") {
  const invocation: Invocation = { traceId };

  return {
    context: {
      invocation,
    },
  } as const;
}

export const invocation = createInvocation;
