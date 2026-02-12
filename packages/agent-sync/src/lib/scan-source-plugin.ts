import { resolvePluginContentLayout } from "./plugin-content";
import { scanCanonicalContentAtRoot } from "./scan-canonical-content";
import { scanComposedToolsContent } from "./scan-tools-composed";
import type { SourceContent, SourcePlugin } from "./types";

export async function scanSourcePlugin(source: SourcePlugin): Promise<SourceContent> {
  // Special case: the plugin-management toolkit is a composed view of toolkit exports.
  // Keep legacy identifiers for compatibility with older branches/references.
  if (
    source.dirName === "plugins" ||
    source.dirName === "tools" ||
    source.packageName === "@rawr/plugin-plugins" ||
    source.packageName === "@rawr/plugin-tools" ||
    source.packageName === "@rawr/plugin-agent-sync"
  ) {
    return scanComposedToolsContent({ toolsPlugin: source });
  }

  const layout = await resolvePluginContentLayout(source);
  return scanCanonicalContentAtRoot(layout.baseRootAbs, layout.baseInclude);
}
