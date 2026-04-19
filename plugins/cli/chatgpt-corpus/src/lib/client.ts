import { createClient, type Client, type CreateClientOptions } from "@rawr/chatgpt-corpus";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { bindService, type ProcessView, type RoleView, type ServiceBinding, type ServiceBindingContext } from "@rawr/hq-sdk/plugins";
import { createFilesystemWorkspaceStore } from "./workspace-store";

export type CorpusInitializeOptions = NonNullable<Parameters<Client["workspace"]["initialize"]>[1]>;
export type CorpusMaterializeOptions = NonNullable<Parameters<Client["corpusArtifacts"]["materialize"]>[1]>;

type CorpusProcess = ProcessView & {
  processId: "plugin-chatgpt-corpus";
  workspaceRef: string;
};

type CorpusRole = RoleView & {
  roleId: "chatgpt-corpus";
  capability: "corpus";
};

type BindingContext = ServiceBindingContext<CorpusProcess, CorpusRole>;

const corpusService = bindService(createClient, {
  bindingId: "plugin-chatgpt-corpus/chatgpt-corpus",
  deps: () => ({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    workspaceStore: createFilesystemWorkspaceStore(),
  }),
  scope: (context: BindingContext) => ({
    workspaceRef: context.process.workspaceRef,
  }),
  config: {},
  cacheKey: (context: BindingContext) => `${context.process.processId}:${context.process.workspaceRef}:${context.role.roleId}`,
} satisfies ServiceBinding<CreateClientOptions, CorpusProcess, CorpusRole>);

export function createCorpusClient(workspaceRef: string): Client {
  return corpusService.resolve({
    process: {
      processId: "plugin-chatgpt-corpus",
      workspaceRef,
    },
    role: {
      roleId: "chatgpt-corpus",
      capability: "corpus",
    },
  });
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
