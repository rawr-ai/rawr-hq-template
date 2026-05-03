import {
  createClient,
  type Client,
  type CreateClientOptions,
} from "@rawr/session-intelligence/client";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { bindService, type ServiceBinding, type ServiceBindingContext } from "@rawr/hq-sdk/plugins";
import { createSessionIndexRuntime, defaultSessionIndexPathSync } from "./session-index-runtime";
import { createSessionSourceRuntime } from "./session-source-runtime";

export { defaultSessionIndexPathSync };

export type SessionIntelligenceClient = Client;
export type SessionIntelligenceClientFactory = () => Promise<SessionIntelligenceClient>;

type SessionToolsProcess = {
  processId: "plugin-session-tools";
  workspaceRef: "plugin://session-tools";
  sessionIndexPath?: string;
};

type SessionToolsRole = {
  roleId: "session-intelligence";
  capability: "sessions";
};

const bindingContext = {
  process: {
    processId: "plugin-session-tools",
    workspaceRef: "plugin://session-tools",
  },
  role: {
    roleId: "session-intelligence",
    capability: "sessions",
  },
} satisfies ServiceBindingContext<SessionToolsProcess, SessionToolsRole>;

const sessionIntelligenceService = bindService(createClient, {
  bindingId: "plugin-session-tools/session-intelligence",
  deps: (context) => ({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    sessionSourceRuntime: createSessionSourceRuntime(),
    sessionIndexRuntime: createSessionIndexRuntime(context.process.sessionIndexPath),
  }),
  scope: (context) => ({
    workspaceRef: context.process.workspaceRef,
  }),
  config: {},
  cacheKey: (context) => `${context.process.processId}:${context.role.roleId}:${context.process.sessionIndexPath ?? "default"}`,
} satisfies ServiceBinding<CreateClientOptions, SessionToolsProcess, SessionToolsRole>);

let clientFactoryOverride: SessionIntelligenceClientFactory | null = null;

export function setSessionIntelligenceClientFactoryForTest(factory: SessionIntelligenceClientFactory | null): void {
  clientFactoryOverride = factory;
}

export async function createSessionIntelligenceClient(options: { indexPath?: string } = {}): Promise<SessionIntelligenceClient> {
  if (clientFactoryOverride) return clientFactoryOverride();
  return sessionIntelligenceService.resolve({
    ...bindingContext,
    process: {
      ...bindingContext.process,
      sessionIndexPath: options.indexPath,
    },
  });
}

export async function defaultSessionIndexPath(): Promise<string> {
  return defaultSessionIndexPathSync();
}
