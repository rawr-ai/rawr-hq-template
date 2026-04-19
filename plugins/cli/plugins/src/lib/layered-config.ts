import { findWorkspaceRoot } from "./workspace-plugins";
import { createHqOpsCallOptions, createHqOpsClient } from "./hq-ops-client";

export type LayeredRawrConfig = {
  config: HqOpsLayeredConfig;
  globalPath: string | null;
  workspacePath: string | null;
};

type HqOpsLayeredConfig = Awaited<
  ReturnType<ReturnType<typeof createHqOpsClient>["config"]["getLayeredConfig"]>
>["merged"];

export async function loadLayeredRawrConfigForCwd(cwd: string): Promise<LayeredRawrConfig> {
  const client = createHqOpsClient(cwd);
  const global = await client.config.getGlobalConfig({}, createHqOpsCallOptions("plugin-plugins.config.global"));
  if (global.error) {
    throw new Error(
      `${global.error.message}${global.error.cause ? `\n${global.error.cause}` : ""}`,
    );
  }

  const workspaceRoot = await findWorkspaceRoot(cwd);
  if (!workspaceRoot) {
    return { config: global.config, globalPath: global.path, workspacePath: null };
  }

  const layered = await createHqOpsClient(workspaceRoot).config.getLayeredConfig(
    {},
    createHqOpsCallOptions("plugin-plugins.config.layered"),
  );

  if (layered.workspace.error) {
    throw new Error(
      `${layered.workspace.error.message}${layered.workspace.error.cause ? `\n${layered.workspace.error.cause}` : ""}`,
    );
  }

  return { config: layered.merged, globalPath: layered.global.path, workspacePath: layered.workspace.path };
}
