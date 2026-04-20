import type { AgentConfigSyncResources } from "../../../shared/resources";
import type { SourceContent, SourcePlugin } from "../../../shared/entities";
import { scanComposedToolkitContent } from "./composed-tools";
import { resolvePluginContentLayout } from "./manifest";
import { scanCanonicalContentAtRoot } from "./scan-content";

/**
 * Identifies the composed tools plugin names that aggregate toolkit content.
 */
function isComposedToolsPlugin(sourcePlugin: SourcePlugin): boolean {
  return (
    sourcePlugin.dirName === "plugins" ||
    sourcePlugin.dirName === "tools" ||
    sourcePlugin.packageName === "@rawr/plugin-plugins" ||
    sourcePlugin.packageName === "@rawr/plugin-tools" ||
    sourcePlugin.packageName === "@rawr/plugin-agent-sync"
  );
}

/**
 * Scans the canonical source content for one plugin, including the composed
 * toolkit path for the tools plugin.
 */
export async function scanSourcePluginContent(input: {
  sourcePlugin: SourcePlugin;
  workspacePlugins: SourcePlugin[];
  resources: AgentConfigSyncResources;
}): Promise<SourceContent> {
  if (isComposedToolsPlugin(input.sourcePlugin)) {
    return scanComposedToolkitContent({
      toolsPlugin: input.sourcePlugin,
      workspacePlugins: input.workspacePlugins,
      resources: input.resources,
    });
  }

  const layout = await resolvePluginContentLayout({
    sourcePlugin: input.sourcePlugin,
    resources: input.resources,
  });
  return scanCanonicalContentAtRoot({
    rootAbsPath: layout.baseRootAbs,
    include: layout.baseInclude,
    resources: input.resources,
  });
}
