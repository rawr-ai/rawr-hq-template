import type { VersionedContentResource } from "@habitat-ai/rawr-resource-versioned-content";
import type { AgentPluginPackageOutputResource } from "@habitat-ai/resource-agent-plugin-package-output";
import type { ContentWorkspaceResource } from "@habitat-ai/resource-content-workspace";
import type { NativeAgentProviderResources } from "@habitat-ai/resource-native-agent-provider";
import type { AnalyticsClient, Logger } from "@habitat-ai/sdk/service";
import { os } from "@orpc/server";
import type { ClockPort } from "./model/ports";

type EmptyContextLane = Readonly<Record<PropertyKey, never>>;

/** Host and invocation lanes admitted before lifecycle middleware narrows context. */
export type Context = {
  readonly deps: {
    readonly analytics: AnalyticsClient;
    readonly clock: ClockPort;
    readonly contentWorkspace: ContentWorkspaceResource<never>;
    readonly logger: Logger;
    readonly nativeProviders: NativeAgentProviderResources;
    readonly packageOutput: AgentPluginPackageOutputResource<never>;
    readonly versionedContent: VersionedContentResource<never>;
  };
  readonly scope: EmptyContextLane;
  readonly config: EmptyContextLane;
  readonly invocation: {
    readonly traceId: string;
    readonly commandId: string;
  };
  readonly provided: EmptyContextLane;
};

/** Native middleware author rooted in the complete lifecycle context. */
export const base = os.$context<Context>();
