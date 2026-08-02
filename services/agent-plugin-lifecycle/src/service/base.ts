import type { AnalyticsClient, Logger } from "@habitat-ai/rawr-hq-sdk";
import type { AgentPluginPackageOutputResource } from "@habitat-ai/rawr-resource-agent-plugin-package-output";
import type { ContentWorkspaceResource } from "@habitat-ai/rawr-resource-content-workspace";
import type { NativeAgentProviderResources } from "@habitat-ai/rawr-resource-native-agent-provider";
import type { VersionedContentResource } from "@habitat-ai/rawr-resource-versioned-content";
import { os } from "@orpc/server";
import type { VendorClockPort } from "./modules/vendors/model/ports/clock";

type EmptyContextLane = Readonly<Record<PropertyKey, never>>;

/** Host and invocation lanes admitted before lifecycle middleware narrows context. */
export type Context = {
  readonly deps: {
    readonly analytics: AnalyticsClient;
    readonly clock: VendorClockPort;
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
