import { getRepoStateWithAuthority } from "../../../repo-state";
import { impl } from "../../impl";

const getState = impl.getState.handler(async ({ context }) => {
  const { state, authorityRepoRoot } = await getRepoStateWithAuthority(context.scope.repoRoot);

  return {
    state,
    authorityRepoRoot,
  };
});

export const router = {
  getState,
};
