/**
 * @fileoverview Repo-state module repository seam over repo-state support helpers.
 *
 * @remarks
 * Keep boundary concerns out of this file. It translates the module's stable
 * repo-root scope into a narrow repository interface that handlers can consume
 * through module composition.
 */
import type { RepoState } from "./model";
import { disablePlugin, enablePlugin, getRepoStateWithAuthority } from "./support";

export type RepoStateSnapshot = {
  state: RepoState;
  authorityRepoRoot: string;
};

export function createRepository(repoRoot: string) {
  return {
    async getStateWithAuthority(): Promise<RepoStateSnapshot> {
      return await getRepoStateWithAuthority(repoRoot);
    },
    async enablePlugin(pluginId: string): Promise<RepoState> {
      return await enablePlugin(repoRoot, pluginId);
    },
    async disablePlugin(pluginId: string): Promise<RepoState> {
      return await disablePlugin(repoRoot, pluginId);
    },
  };
}
