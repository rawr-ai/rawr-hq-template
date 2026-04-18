import { resolvePluginContentLayout } from "./plugin-content";
import { scanCanonicalContentAtRoot } from "./scan-canonical-content";
import { scanComposedToolsContent } from "./scan-tools-composed";
import type { HostSourceContent, HostSourcePlugin } from "./types";

export async function scanSourcePlugin(
  sourcePlugin: HostSourcePlugin,
): Promise<HostSourceContent> {
  if (
    sourcePlugin.dirName === "plugins" ||
    sourcePlugin.dirName === "tools" ||
    sourcePlugin.packageName === "@rawr/plugin-plugins" ||
    sourcePlugin.packageName === "@rawr/plugin-tools" ||
    sourcePlugin.packageName === "@rawr/plugin-agent-sync"
  ) {
    return scanComposedToolsContent({ toolsPlugin: sourcePlugin });
  }

  const layout = await resolvePluginContentLayout(sourcePlugin);
  return scanCanonicalContentAtRoot(layout.baseRootAbs, layout.baseInclude);
}
