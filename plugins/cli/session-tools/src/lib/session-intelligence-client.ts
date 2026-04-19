import { createClient, type CreateClientOptions } from "@rawr/session-intelligence/client";
import type {
  ErrorResult,
  ExtractOptions,
  ExtractedSession,
  MetadataSearchHit,
  ReindexResult,
  ResolveResult,
  RoleFilter,
  SearchHit,
  SessionFilters,
  SessionListItem,
  SessionSourceFilter,
} from "./session-types";
import { createSessionIndexRuntime, defaultSessionIndexPathSync } from "./session-index-runtime";
import { createSessionSourceRuntime } from "./session-source-runtime";

export { defaultSessionIndexPathSync };

export type SessionIntelligenceClient = {
  catalog: {
    list(input: { source: SessionSourceFilter; limit: number; filters?: SessionFilters }): Promise<SessionListItem[]>;
    resolve(input: { session: string; source: SessionSourceFilter }): Promise<ResolveResult | ErrorResult>;
  };
  transcripts: {
    extract(input: { path: string } & ExtractOptions): Promise<ExtractedSession | ErrorResult>;
  };
  search: {
    metadata(input: { sessions: SessionListItem[]; needle: string; limit: number }): Promise<MetadataSearchHit[]>;
    content(input: {
      sessions: SessionListItem[];
      pattern: string;
      ignoreCase: boolean;
      maxMatches: number;
      snippetLen: number;
      roles: RoleFilter[];
      includeTools: boolean;
      useIndex: boolean;
      indexPath: string;
    }): Promise<SearchHit[]>;
    clearIndex(input: { indexPath: string }): Promise<void>;
    reindex(input: {
      sessions: Array<{ path: string; source?: "claude" | "codex" }>;
      roles: RoleFilter[];
      includeTools: boolean;
      indexPath: string;
      limit: number;
    }): Promise<ReindexResult>;
  };
};

export type SessionIntelligenceClientFactory = () => Promise<SessionIntelligenceClient>;

let clientFactoryOverride: SessionIntelligenceClientFactory | null = null;

export function setSessionIntelligenceClientFactoryForTest(factory: SessionIntelligenceClientFactory | null): void {
  clientFactoryOverride = factory;
}

export async function createSessionIntelligenceClient(): Promise<SessionIntelligenceClient> {
  if (clientFactoryOverride) return clientFactoryOverride();

  const rawClient = createClient(createSessionIntelligenceBoundary());
  return adaptRawClient(rawClient);
}

export async function defaultSessionIndexPath(): Promise<string> {
  return defaultSessionIndexPathSync();
}

function createSessionIntelligenceBoundary(): CreateClientOptions {
  return {
    deps: {
      logger: {
        info() {},
        error() {},
      },
      analytics: {
        track() {},
      },
      sessionSourceRuntime: createSessionSourceRuntime(),
      sessionIndexRuntime: createSessionIndexRuntime(),
    },
    scope: {
      workspaceRef: "plugin://session-tools",
    },
    config: {},
  } satisfies CreateClientOptions;
}

function adaptRawClient(rawClient: unknown): SessionIntelligenceClient {
  const raw = rawClient as any;
  return {
    catalog: {
      list: async (input) => pickArray(await callProcedure(raw?.catalog?.list, input), "sessions"),
      resolve: async (input) => {
        try {
          return normalizeErrorResult<ResolveResult>(await callProcedure(raw?.catalog?.resolve, input));
        } catch (err) {
          return { error: errorMessage(err) };
        }
      },
    },
    transcripts: {
      extract: async ({ path, ...options }) => {
        try {
          return normalizeErrorResult<ExtractedSession>(await callProcedure(raw?.transcripts?.extract, { path, options }));
        } catch (err) {
          return { error: errorMessage(err) };
        }
      },
    },
    search: {
      metadata: async (input) => pickArray(await callProcedure(raw?.search?.metadata, input), "hits"),
      content: async (input) => pickArray(await callProcedure(raw?.search?.content, input), "hits"),
      clearIndex: async (input) => {
        await callProcedure(raw?.search?.clearIndex, input);
      },
      reindex: async (input) => {
        const serviceInput = {
          ...input,
          sessions: input.sessions.map((session) => ({
            path: session.path,
            source: session.source,
          })),
        };
        return pickObject(await callProcedure(raw?.search?.reindex, serviceInput), "reindex") as ReindexResult;
      },
    },
  };
}

async function callProcedure(procedure: unknown, input: unknown): Promise<unknown> {
  if (typeof procedure !== "function") {
    throw new Error("Session intelligence client is missing an expected procedure");
  }
  return procedure(input, {
    context: {
      invocation: {
        traceId: "plugin-session-tools",
      },
    },
  });
}

function pickArray<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  const record = value as Record<string, unknown> | null | undefined;
  const nested = record?.[key];
  if (Array.isArray(nested)) return nested as T[];
  return [];
}

function pickObject(value: unknown, key: string): Record<string, unknown> {
  const record = value as Record<string, unknown> | null | undefined;
  const nested = record?.[key];
  if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as Record<string, unknown>;
  if (record && typeof record === "object" && !Array.isArray(record)) return record;
  return {};
}

function normalizeErrorResult<T>(value: unknown): T | ErrorResult {
  const record = value as Record<string, unknown> | null | undefined;
  if (typeof record?.error === "string") return { error: record.error };
  return value as T;
}

function errorMessage(err: unknown): string {
  const record = err as Record<string, unknown> | null | undefined;
  const data = record?.data as Record<string, unknown> | null | undefined;
  if (typeof data?.message === "string") return data.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
