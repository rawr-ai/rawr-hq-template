import type {
  ConfigLayeredResult,
  ConfigLoadResult,
  SyncSourcesResult,
} from "../../modules/config/schemas";

export interface ConfigStore {
  getWorkspaceConfig(repoRoot: string): Promise<ConfigLoadResult>;
  getGlobalConfig(): Promise<ConfigLoadResult>;
  getLayeredConfig(repoRoot: string): Promise<ConfigLayeredResult>;
  listGlobalSyncSources(): Promise<SyncSourcesResult>;
  addGlobalSyncSource(sourcePath: string): Promise<SyncSourcesResult>;
  removeGlobalSyncSource(sourcePath: string): Promise<SyncSourcesResult>;
}
