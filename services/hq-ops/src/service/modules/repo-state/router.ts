import { module } from "./module";

const getState = module.getState.handler(async ({ context }) => {
  const { state, authorityRepoRoot } = await context.repo.getStateWithAuthority();

  return {
    state,
    authorityRepoRoot,
  };
});

export const router = module.router({
  getState,
});
