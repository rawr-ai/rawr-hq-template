import type { RepoState } from "../../modules/repo-state/model";

export type RepoStateSnapshot = {
  state: RepoState;
  authorityRepoRoot: string;
};

export interface RepoStateStore {
  getStateWithAuthority(repoRoot: string): Promise<RepoStateSnapshot>;
  enablePlugin(repoRoot: string, pluginId: string): Promise<RepoState>;
  disablePlugin(repoRoot: string, pluginId: string): Promise<RepoState>;
}
