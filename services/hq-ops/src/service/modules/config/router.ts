/**
 * hq-ops: config module.
 *
 * This router owns the HQ "configuration as data" capability: reading workspace
 * and global config, validating it at the service boundary, and producing a
 * layered/merged view for callers.
 *
 * Projections should not re-implement merge/validation rules; those rules are
 * part of the service contract.
 */
import type { RawrConfig } from "./entities";
import { loadGlobalRawrConfig, loadRawrConfig } from "./helpers/load";
import { validateRawrConfig } from "./helpers/validation";
import { module } from "./module";

const getWorkspaceConfig = module.getWorkspaceConfig.handler(async ({ context }) => {
  return await loadRawrConfig(context.deps.resources, context.scope.repoRoot);
});

const getGlobalConfig = module.getGlobalConfig.handler(async ({ context }) => {
  return await loadGlobalRawrConfig(context.deps.resources);
});

const getLayeredConfig = module.getLayeredConfig.handler(async ({ context }) => {
  const [global, workspace] = await Promise.all([
    loadGlobalRawrConfig(context.deps.resources),
    loadRawrConfig(context.deps.resources, context.scope.repoRoot),
  ]);
  const g = global.config;
  const w = workspace.config;

  if (!g && !w) return { global, workspace, merged: null };

  const merged: RawrConfig = {
    version: 1,
    journal: { ...(g?.journal ?? {}), ...(w?.journal ?? {}) },
    server:
      g?.server || w?.server
        ? {
            port: w?.server?.port ?? g?.server?.port,
            baseUrl: w?.server?.baseUrl ?? g?.server?.baseUrl,
          }
        : undefined,
  };

  const validated = validateRawrConfig(merged);
  return { global, workspace, merged: validated.ok ? validated.config : null };
});

export const router = module.router({
  getWorkspaceConfig,
  getGlobalConfig,
  getLayeredConfig,
});
