import type { HqOpsResources } from "../../shared/ports/resources";
import {
  addGlobalSyncSource,
  listGlobalSyncSources,
  loadGlobalRawrConfig,
  loadRawrConfig,
  loadRawrConfigLayered,
  removeGlobalSyncSource,
} from "./support";

export function createRepository(resources: HqOpsResources, repoRoot: string) {
  return {
    async getWorkspaceConfig() {
      return await loadRawrConfig(resources, repoRoot);
    },
    async getGlobalConfig() {
      return await loadGlobalRawrConfig(resources);
    },
    async getLayeredConfig() {
      return await loadRawrConfigLayered(resources, repoRoot);
    },
    async listGlobalSyncSources() {
      return await listGlobalSyncSources(resources);
    },
    async addGlobalSyncSource(sourcePath: string) {
      return await addGlobalSyncSource(resources, sourcePath);
    },
    async removeGlobalSyncSource(sourcePath: string) {
      return await removeGlobalSyncSource(resources, sourcePath);
    },
  };
}
