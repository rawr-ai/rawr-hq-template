import type { AgentConfigSyncResources } from "../../../shared/resources";
import type { SourceContent, SourcePlugin } from "../../../shared/schemas";
import { scanComposedToolkitContent } from "./composed-tools";
import { resolvePluginContentLayout } from "./manifest";
import { scanCanonicalContentAtRoot } from "./scan-content";

function isComposedToolsPlugin(sourcePlugin: SourcePlugin): boolean {
  return (
    sourcePlugin.dirName === "plugins" ||
    sourcePlugin.dirName === "tools" ||
    sourcePlugin.packageName === "@rawr/plugin-plugins" ||
    sourcePlugin.packageName === "@rawr/plugin-tools" ||
    sourcePlugin.packageName === "@rawr/plugin-agent-sync"
  );
}

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

