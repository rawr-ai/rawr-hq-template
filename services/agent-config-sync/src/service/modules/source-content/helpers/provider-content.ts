import type { AgentConfigSyncResources } from "../../../shared/resources";
import type { SourceContent, SourcePlugin, SyncAgent } from "../../../shared/entities";
import { resolvePluginContentLayout } from "./manifest";
import { mergeSourceContent } from "./merge-content";
import { scanCanonicalContentAtRoot } from "./scan-content";

/**
 * Produces effective content for one destination provider by applying that
 * provider's overlay root and include mask to the canonical source content.
 */
export async function resolveProviderContent(input: {
  agent: SyncAgent;
  sourcePlugin: SourcePlugin;
  base: SourceContent;
  resources: AgentConfigSyncResources;
}): Promise<SourceContent> {
  const layout = await resolvePluginContentLayout({
    sourcePlugin: input.sourcePlugin,
    resources: input.resources,
  });
  const overlayRoot = layout.overlayRootAbs[input.agent];
  if (!(await input.resources.files.pathExists(overlayRoot))) return input.base;

  const overlay = await scanCanonicalContentAtRoot({
    rootAbsPath: overlayRoot,
    include: layout.includeByProvider[input.agent],
    resources: input.resources,
  });
  return mergeSourceContent(input.base, overlay);
}
