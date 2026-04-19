import { createClient, type Client, type CreateClientOptions } from "@rawr/session-intelligence/client";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
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

type CatalogListOptions = NonNullable<Parameters<Client["catalog"]["list"]>[1]>;
type CatalogResolveOptions = NonNullable<Parameters<Client["catalog"]["resolve"]>[1]>;
type TranscriptsExtractOptions = NonNullable<Parameters<Client["transcripts"]["extract"]>[1]>;
type SearchMetadataOptions = NonNullable<Parameters<Client["search"]["metadata"]>[1]>;
type SearchContentOptions = NonNullable<Parameters<Client["search"]["content"]>[1]>;
type SearchClearIndexOptions = NonNullable<Parameters<Client["search"]["clearIndex"]>[1]>;
type SearchReindexOptions = NonNullable<Parameters<Client["search"]["reindex"]>[1]>;

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
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
      sessionSourceRuntime: createSessionSourceRuntime(),
      sessionIndexRuntime: createSessionIndexRuntime(),
    },
    scope: {
      workspaceRef: "plugin://session-tools",
    },
    config: {},
  } satisfies CreateClientOptions;
}

function adaptRawClient(rawClient: Client): SessionIntelligenceClient {
  return {
    catalog: {
      list: async (input) => {
        const options = {
          context: { invocation: { traceId: "plugin-session-tools.catalog.list" } },
        } satisfies CatalogListOptions;
        return (await rawClient.catalog.list(input, options)).sessions;
      },
      resolve: async (input) => {
        try {
          const options = {
            context: { invocation: { traceId: "plugin-session-tools.catalog.resolve" } },
          } satisfies CatalogResolveOptions;
          return await rawClient.catalog.resolve(input, options);
        } catch (err) {
          return { error: errorMessage(err) };
        }
      },
    },
    transcripts: {
      extract: async ({ path, ...options }) => {
        try {
          const callOptions = {
            context: { invocation: { traceId: "plugin-session-tools.transcripts.extract" } },
          } satisfies TranscriptsExtractOptions;
          return await rawClient.transcripts.extract({ path, options }, callOptions);
        } catch (err) {
          return { error: errorMessage(err) };
        }
      },
    },
    search: {
      metadata: async (input) => {
        const options = {
          context: { invocation: { traceId: "plugin-session-tools.search.metadata" } },
        } satisfies SearchMetadataOptions;
        return (await rawClient.search.metadata(input, options)).hits;
      },
      content: async (input) => {
        const options = {
          context: { invocation: { traceId: "plugin-session-tools.search.content" } },
        } satisfies SearchContentOptions;
        return (await rawClient.search.content(input, options)).hits;
      },
      clearIndex: async (input) => {
        const options = {
          context: { invocation: { traceId: "plugin-session-tools.search.clear-index" } },
        } satisfies SearchClearIndexOptions;
        await rawClient.search.clearIndex(input, options);
      },
      reindex: async (input) => {
        const serviceInput = {
          ...input,
          sessions: input.sessions.map((session) => ({
            path: session.path,
            source: session.source,
          })),
        };
        const options = {
          context: { invocation: { traceId: "plugin-session-tools.search.reindex" } },
        } satisfies SearchReindexOptions;
        return await rawClient.search.reindex(serviceInput, options);
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
