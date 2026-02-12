import {
  loadGlobalRawrConfig,
  loadRawrConfig,
  mergeRawrConfigLayers,
  type RawrConfig,
} from "@rawr/control-plane";

import { findWorkspaceRoot } from "./workspace";

export type LayeredRawrConfig = {
  config: RawrConfig | null;
  globalPath: string | null;
  workspacePath: string | null;
};

export async function loadLayeredRawrConfigForCwd(cwd: string): Promise<LayeredRawrConfig> {
  const global = await loadGlobalRawrConfig();
  if (global.error) {
    throw new Error(
      `${global.error.message}${global.error.cause ? `\n${global.error.cause}` : ""}`,
    );
  }

  const workspaceRoot = await findWorkspaceRoot(cwd);
  const workspace = workspaceRoot ? await loadRawrConfig(workspaceRoot) : { config: null, path: null, warnings: [] };
  if (workspace.error) {
    throw new Error(
      `${workspace.error.message}${workspace.error.cause ? `\n${workspace.error.cause}` : ""}`,
    );
  }

  const merged = mergeRawrConfigLayers({ global: global.config, workspace: workspace.config });
  return { config: merged, globalPath: global.path, workspacePath: workspace.path };
}
