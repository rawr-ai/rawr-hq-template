import type { AgentConfigSyncResources } from "../../../shared/resources";
import { PLUGINS_SYNC_UNDO_PROVIDER } from "../entities";
import { clearActiveUndoCapsule, loadActiveUndoCapsule } from "./capsule-store";

function nonFlagTokens(argv: string[]): string[] {
  return argv.filter((arg) => typeof arg === "string" && arg.length > 0 && !arg.startsWith("-"));
}

function isPluginsSyncRelatedArgv(argv: string[]): boolean {
  const parts = nonFlagTokens(argv);
  if (parts.length === 0) return false;

  if (parts[0] === "undo") return true;
  if (parts[0] === "plugins" && parts[1] === "sync") return true;
  if (parts[0] === "sync") return true;

  return false;
}

export async function expireUndoCapsuleOnUnrelatedCommand(input: {
  cwd: string;
  argv: string[];
  workspaceRoot: string | null;
  resources: AgentConfigSyncResources;
}): Promise<{ workspaceRoot?: string; cleared: boolean; reason?: string }> {
  const workspaceRoot = input.workspaceRoot;
  if (!workspaceRoot) return { cleared: false, reason: "workspace-root-missing" };

  const capsule = await loadActiveUndoCapsule(workspaceRoot, input.resources);
  if (!capsule) return { workspaceRoot, cleared: false, reason: "no-capsule" };

  if (capsule.provider === PLUGINS_SYNC_UNDO_PROVIDER && isPluginsSyncRelatedArgv(input.argv)) {
    return { workspaceRoot, cleared: false, reason: "related-command" };
  }

  await clearActiveUndoCapsule(workspaceRoot, input.resources);
  return { workspaceRoot, cleared: true, reason: "unrelated-command" };
}
