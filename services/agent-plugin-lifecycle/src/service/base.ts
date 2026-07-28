import { os } from "@orpc/server";
import type { AnalyticsClient, Logger } from "@rawr/hq-sdk";
import type { AgentPluginPackageOutputResource } from "@rawr/resource-agent-plugin-package-output";
import type { ContentWorkspaceResource } from "@rawr/resource-content-workspace";
import type { NativeAgentProviderResources } from "@rawr/resource-native-agent-provider";
import type { VersionedContentResource } from "@rawr/resource-versioned-content";
import type { VendorClockPort } from "./modules/vendors/model/ports/clock";

type LifecycleDependencies = {
  analytics: AnalyticsClient;
  clock: VendorClockPort;
  contentWorkspace: ContentWorkspaceResource<never>;
  logger: Logger;
  nativeProviders: NativeAgentProviderResources;
  packageOutput: AgentPluginPackageOutputResource<never>;
  versionedContent: VersionedContentResource<never>;
};

type InitialContext = {
  deps: LifecycleDependencies;
  scope: Record<never, never>;
  config: Record<never, never>;
};

type InvocationContext = {
  traceId: string;
  commandId: string;
};

/** Host and invocation lanes admitted before lifecycle middleware narrows context. */
export type Context = InitialContext & {
  invocation: InvocationContext;
  provided: Record<never, never>;
};

/** Native middleware author rooted in the complete lifecycle context. */
export const base = os.$context<Context>();
