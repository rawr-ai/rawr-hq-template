/**
 * @fileoverview Repo-state module repository seam over repo-state support helpers.
 *
 * @remarks
 * Keep boundary concerns out of this file. It translates the module's stable
 * repo-root scope into a narrow repository interface that handlers can consume
 * through module composition.
 */
import type { RepoState } from "../../../repo-state";
import { getRepoStateWithAuthority } from "../../../repo-state";

export type RepoStateSnapshot = {
  state: RepoState;
  authorityRepoRoot: string;
};

export function createRepository(repoRoot: string) {
  return {
    async getStateWithAuthority(): Promise<RepoStateSnapshot> {
      return await getRepoStateWithAuthority(repoRoot);
    },
  };
}
