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
  deps: () => ({
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    sessionSourceRuntime: createSessionSourceRuntime(),
    sessionIndexRuntime: createSessionIndexRuntime(),
  }),
  scope: (context) => ({
    workspaceRef: context.process.workspaceRef,
  }),
  config: {},
  cacheKey: (context) => `${context.process.processId}:${context.role.roleId}`,
} satisfies ServiceBinding<CreateClientOptions, SessionToolsProcess, SessionToolsRole>);

let clientFactoryOverride: SessionIntelligenceClientFactory | null = null;

export function setSessionIntelligenceClientFactoryForTest(factory: SessionIntelligenceClientFactory | null): void {
  clientFactoryOverride = factory;
}

export async function createSessionIntelligenceClient(): Promise<SessionIntelligenceClient> {
  if (clientFactoryOverride) return clientFactoryOverride();
  return sessionIntelligenceService.resolve(bindingContext);
}

export async function defaultSessionIndexPath(): Promise<string> {
  return defaultSessionIndexPathSync();
}
