import { createClient, type Client, type CreateClientOptions } from "@rawr/session-intelligence/client";
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

const invocation = {
  context: {
    invocation: {
      traceId: "plugin-session-tools",
    },
  },
} as const;

function adaptRawClient(rawClient: Client): SessionIntelligenceClient {
  return {
    catalog: {
      list: async (input) => (await rawClient.catalog.list(input, invocation)).sessions,
      resolve: async (input) => {
        try {
          return await rawClient.catalog.resolve(input, invocation);
        } catch (err) {
          return { error: errorMessage(err) };
        }
      },
    },
    transcripts: {
      extract: async ({ path, ...options }) => {
        try {
          return await rawClient.transcripts.extract({ path, options }, invocation);
        } catch (err) {
          return { error: errorMessage(err) };
        }
      },
    },
    search: {
      metadata: async (input) => (await rawClient.search.metadata(input, invocation)).hits,
      content: async (input) => (await rawClient.search.content(input, invocation)).hits,
      clearIndex: async (input) => {
        await rawClient.search.clearIndex(input, invocation);
      },
      reindex: async (input) => {
        const serviceInput = {
          ...input,
          sessions: input.sessions.map((session) => ({
            path: session.path,
            source: session.source,
          })),
        };
        return await rawClient.search.reindex(serviceInput, invocation);
      },
    },
  };
}

function errorMessage(err: unknown): string {
  const record = err as Record<string, unknown> | null | undefined;
  const data = record?.data as Record<string, unknown> | null | undefined;
  if (typeof data?.message === "string") return data.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
