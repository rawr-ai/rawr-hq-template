/**
 * @fileoverview Service router composition for the state package.
 */
import { getRepoState } from "../repo-state";
import { impl } from "./impl";

export const router = impl.router({
  getState: impl.getState.handler(async ({ context }) => {
    const authorityRepoRoot = context.scope.repoRoot;
    const state = await getRepoState(authorityRepoRoot);

    return {
      state,
      authorityRepoRoot,
    };
  }),
});

export type Router = typeof router;
