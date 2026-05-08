import { findWorkspaceRoot } from "@rawr/core";
import { createNodeAgentConfigSyncResources } from "@rawr/agent-config-sync-node/resources";

type ExpireUndoCapsuleOnUnrelatedCommand = (input: {
  cwd: string;
  argv: string[];
  workspaceRoot: string | null;
  resources: ReturnType<typeof createNodeAgentConfigSyncResources>;
}) => Promise<unknown>;

type UndoPublicModule = {
  expireUndoCapsuleOnUnrelatedCommand?: ExpireUndoCapsuleOnUnrelatedCommand;
};

export async function expireUndoCapsuleBeforeCommand(input: {
  cwd: string;
  argv: string[];
  env?: NodeJS.ProcessEnv;
}): Promise<void> {
  try {
    if (input.env?.RAWR_TEST_UNDO_LIFECYCLE_THROW === "1") {
      throw new Error("forced undo lifecycle failure");
    }

    const mod = await import("@rawr/agent-config-sync/undo") as UndoPublicModule;
    if (typeof mod.expireUndoCapsuleOnUnrelatedCommand !== "function") return;

    await mod.expireUndoCapsuleOnUnrelatedCommand({
      cwd: input.cwd,
      argv: input.argv,
      workspaceRoot: await findWorkspaceRoot(input.cwd),
      resources: createNodeAgentConfigSyncResources(),
    });
  } catch {
    // Best-effort lifecycle maintenance must not block command dispatch.
  }
}
