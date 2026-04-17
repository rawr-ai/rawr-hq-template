/**
 * @fileoverview Repo-state module repository seam over repo-state support helpers.
 *
 * @remarks
 * Keep boundary concerns out of this file. It translates the module's stable
 * repo-root scope into a narrow repository interface that handlers can consume
 * through module composition.
 */
import type { RepoState } from "./model";
import type { RepoStateStore } from "../../shared/ports/repo-state-store";

export type RepoStateSnapshot = {
  state: RepoState;
  authorityRepoRoot: string;
};

export function createRepository(repoStateStore: RepoStateStore, repoRoot: string) {
  return {
    async getStateWithAuthority(): Promise<RepoStateSnapshot> {
      return await repoStateStore.getStateWithAuthority(repoRoot);
    },
    async enablePlugin(pluginId: string): Promise<RepoState> {
      return await repoStateStore.enablePlugin(repoRoot, pluginId);
    },
    async disablePlugin(pluginId: string): Promise<RepoState> {
      return await repoStateStore.disablePlugin(repoRoot, pluginId);
    },
  };
}
