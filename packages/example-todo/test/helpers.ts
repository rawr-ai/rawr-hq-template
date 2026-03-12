import type { DbPool } from "../src/orpc/ports/db";
import {
  createEmbeddedPlaceholderAnalyticsAdapter,
  type EmbeddedPlaceholderAnalyticsEntry,
} from "../src/orpc/host-adapters/analytics/embedded-placeholder";
import {
  createEmbeddedPlaceholderLoggerAdapter,
  type EmbeddedPlaceholderLogEntry,
} from "../src/orpc/host-adapters/logger/embedded-placeholder";
import { createEmbeddedInMemoryDbPoolAdapter, type EmbeddedInMemorySqlOptions } from "../src/orpc/host-adapters/sql/embedded-in-memory";
import type { CreateClientOptions } from "../src/client";
import type { Service } from "../src/service/base";

type DepsOptions = EmbeddedInMemorySqlOptions & {
  logs?: LogEntry[];
  analytics?: AnalyticsEntry[];
};

type ClientOptions = DepsOptions & {
  deps?: Service["Deps"];
  readOnly?: boolean;
  maxAssignmentsPerTask?: number;
  workspaceId?: string;
};

export type OrpcErrorShape = {
  defined?: boolean;
  code?: string;
  status?: number;
  data?: Record<string, unknown>;
};

export type LogEntry = EmbeddedPlaceholderLogEntry;
export type AnalyticsEntry = EmbeddedPlaceholderAnalyticsEntry;

export function createDeps(options: DepsOptions = {}): Service["Deps"] {
  let tick = 0;
  const dbPool: DbPool = createEmbeddedInMemoryDbPoolAdapter(options);

  return {
    dbPool,
    clock: {
      now: () => {
        tick += 1;
        return new Date(Date.UTC(2026, 1, 25, 0, 0, tick)).toISOString();
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
  return {
    context: {
      invocation: {
        traceId,
      },
    },
  } as const;
}

export const invocation = createInvocation;
