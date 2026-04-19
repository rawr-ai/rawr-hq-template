import { createClient, type Client, type CreateClientOptions } from "@rawr/chatgpt-corpus";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { createFilesystemWorkspaceStore } from "./workspace-store";

export type CorpusInitializeOptions = NonNullable<Parameters<Client["workspace"]["initialize"]>[1]>;
export type CorpusMaterializeOptions = NonNullable<Parameters<Client["corpusArtifacts"]["materialize"]>[1]>;

export function createCorpusClient(workspaceRef: string): Client {
  const boundary = {
    deps: {
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
      workspaceStore: createFilesystemWorkspaceStore(),
    },
    scope: {
      workspaceRef,
    },
    config: {},
  } satisfies CreateClientOptions;

  return createClient(boundary);
}

export function describeServiceError(error: unknown): {
  message: string;
  code?: string;
  details?: unknown;
} {
  if (error && typeof error === "object") {
    const typed = error as {
      message?: unknown;
      code?: unknown;
      data?: unknown;
    };
    return {
      message: typeof typed.message === "string" && typed.message.trim() !== "" ? typed.message : String(error),
      code: typeof typed.code === "string" ? typed.code : undefined,
      details: typed.data,
    };
  }

  return { message: String(error) };
}
