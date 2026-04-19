import { module } from "./module";

const getWorkspaceConfig = module.getWorkspaceConfig.handler(async ({ context }) => {
  return await context.repo.getWorkspaceConfig();
});

const getGlobalConfig = module.getGlobalConfig.handler(async ({ context }) => {
  return await context.repo.getGlobalConfig();
});

const getLayeredConfig = module.getLayeredConfig.handler(async ({ context }) => {
  return await context.repo.getLayeredConfig();
});

const listGlobalSyncSources = module.listGlobalSyncSources.handler(async ({ context }) => {
  return await context.repo.listGlobalSyncSources();
});

const addGlobalSyncSource = module.addGlobalSyncSource.handler(async ({ context, input }) => {
  return await context.repo.addGlobalSyncSource(input.path);
});

const removeGlobalSyncSource = module.removeGlobalSyncSource.handler(async ({ context, input }) => {
  return await context.repo.removeGlobalSyncSource(input.path);
});

export const router = module.router({
  getWorkspaceConfig,
  getGlobalConfig,
  getLayeredConfig,
  listGlobalSyncSources,
  addGlobalSyncSource,
  removeGlobalSyncSource,
});
