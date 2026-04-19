import type { ConfigStore } from "../../shared/ports/config-store";

export function createRepository(configStore: ConfigStore, repoRoot: string) {
  return {
    async getWorkspaceConfig() {
      return await configStore.getWorkspaceConfig(repoRoot);
    },
    async getGlobalConfig() {
      return await configStore.getGlobalConfig();
    },
    async getLayeredConfig() {
      return await configStore.getLayeredConfig(repoRoot);
    },
    async listGlobalSyncSources() {
      return await configStore.listGlobalSyncSources();
    },
    async addGlobalSyncSource(sourcePath: string) {
      return await configStore.addGlobalSyncSource(sourcePath);
    },
    async removeGlobalSyncSource(sourcePath: string) {
      return await configStore.removeGlobalSyncSource(sourcePath);
    },
  };
}
