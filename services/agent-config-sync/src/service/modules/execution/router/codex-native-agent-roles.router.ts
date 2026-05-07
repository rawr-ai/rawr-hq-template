import { buildProviderProjections } from "../../../common/helpers/projections";
import { summarizeScannedContent } from "../../../common/helpers/sync-results";
import type { SyncTargetResult } from "../../../common/entities/sync-results";
import { resolveProviderContent as resolveServiceProviderContent } from "../../../common/source-content/helpers/provider-content";
import { syncCodexNativeAgentRoleHomes } from "../repositories/codex-native-agent-role-repository";
import { module } from "../module";

export const syncCodexNativeAgentRoles = module.syncCodexNativeAgentRoles.handler(async ({ context, input }) => {
  const options = {
    dryRun: input.dryRun,
    force: input.force,
    gc: input.gc,
    includeAgentsInCodex: input.includeAgentsInCodex,
    includeAgentsInClaude: input.includeAgentsInClaude,
    undoCapture: input.dryRun ? undefined : context.undoCapture,
    resources: context.resources,
  };
  const codexContent = await resolveServiceProviderContent({
    agent: "codex",
    sourcePlugin: input.sourcePlugin,
    base: input.content,
    resources: context.resources,
  });
  const agentContent = {
    ...codexContent,
    workflowFiles: [],
    skills: [],
    scripts: [],
    hooks: [],
    hookConfigs: [],
    mcpServers: [],
    settings: [],
    assets: [],
    orchestration: [],
  };
  const projections = await buildProviderProjections({
    provider: "codex",
    sourcePlugin: input.sourcePlugin,
    content: agentContent,
    homes: input.codexHomes,
    includeAgentsInCodex: input.includeAgentsInCodex,
    resources: context.resources,
  });
  const targets: SyncTargetResult[] = input.includeCodex
    ? await syncCodexNativeAgentRoleHomes({
        sourcePlugin: input.sourcePlugin,
        content: agentContent,
        codexHomes: input.codexHomes,
        options,
      })
    : [];

  return {
    ok: targets.every((target) => target.conflicts.length === 0),
    sourcePlugin: input.sourcePlugin,
    scanned: summarizeScannedContent(input.content),
    targets,
    projections,
  };
});
