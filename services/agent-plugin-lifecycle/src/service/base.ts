import type { AgentPluginPackageOutputResource } from "@habitat-ai/resource-agent-plugin-package-output";
import type { ContentWorkspaceResource } from "@habitat-ai/resource-content-workspace";
import type { NativeAgentProviderResources } from "@habitat-ai/resource-native-agent-provider";
import type { VersionedContentResource } from "@habitat-ai/resource-versioned-content";

type EmptyContextLane = Readonly<Record<PropertyKey, never>>;

/** Host and invocation lanes admitted before lifecycle middleware narrows context. */
export type Context = {
  readonly deps: {
    readonly contentWorkspace: ContentWorkspaceResource<never>;
    readonly nativeProviders: NativeAgentProviderResources;
    readonly packageOutput: AgentPluginPackageOutputResource<never>;
    readonly versionedContent: VersionedContentResource<never>;
  };
  readonly scope: EmptyContextLane;
  readonly config: EmptyContextLane;
  readonly invocation: EmptyContextLane;
  readonly provided: EmptyContextLane;
};
