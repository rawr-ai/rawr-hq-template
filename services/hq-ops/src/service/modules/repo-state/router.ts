import { module } from "./module";

const getState = module.getState.handler(async ({ context }) => {
  const { state, authorityRepoRoot } = await context.repo.getStateWithAuthority();

  return {
    state,
    authorityRepoRoot,
  };
});

const enablePlugin = module.enablePlugin.handler(async ({ context, input }) => {
  return await context.repo.enablePlugin(input.pluginId);
});

const disablePlugin = module.disablePlugin.handler(async ({ context, input }) => {
  return await context.repo.disablePlugin(input.pluginId);
});

export const router = module.router({
  getState,
  enablePlugin,
  disablePlugin,
});
