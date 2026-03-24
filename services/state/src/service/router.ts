/**
 * @fileoverview Service router composition for the state package.
 */
import { getRepoStateWithAuthority } from "../repo-state";
import { impl } from "./impl";

export const router = impl.router({
  getState: impl.getState.handler(async ({ context }) => {
    const { state, authorityRepoRoot } = await getRepoStateWithAuthority(context.scope.repoRoot);

    return {
      state,
      authorityRepoRoot,
    };
  }),
});

export type Router = typeof router;
