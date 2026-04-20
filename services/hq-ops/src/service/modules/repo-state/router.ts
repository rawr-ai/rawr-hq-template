import {
  getRepoStateWithAuthority,
  mutateRepoStateAtomically,
} from "./helpers/storage";
import { module } from "./module";

const getState = module.getState.handler(async ({ context }) => {
  const { state, authorityRepoRoot } = await getRepoStateWithAuthority(context.deps.resources, context.scope.repoRoot);

  return {
    state,
    authorityRepoRoot,
  };
});

const enablePlugin = module.enablePlugin.handler(async ({ context, input, errors }) => {
  const result = await mutateRepoStateAtomically(context.deps.resources, context.scope.repoRoot, async (current) => ({
    ...current,
    plugins: {
      ...current.plugins,
      enabled: Array.from(new Set([...current.plugins.enabled, input.pluginId])).sort(),
      lastUpdatedAt: new Date().toISOString(),
    },
  }));
  if (!result.ok) {
    throw errors.REPO_STATE_LOCK_TIMEOUT({
      message: `Timed out waiting for repo state lock: ${result.lockPath}`,
      data: { lockPath: result.lockPath },
    });
  }
  return result.state;
});

const disablePlugin = module.disablePlugin.handler(async ({ context, input, errors }) => {
  const result = await mutateRepoStateAtomically(context.deps.resources, context.scope.repoRoot, async (current) => ({
    ...current,
    plugins: {
      ...current.plugins,
      enabled: current.plugins.enabled.filter((value) => value !== input.pluginId),
      disabled: Array.from(new Set([...(current.plugins.disabled ?? []), input.pluginId])).sort(),
      lastUpdatedAt: new Date().toISOString(),
    },
  }));
  if (!result.ok) {
    throw errors.REPO_STATE_LOCK_TIMEOUT({
      message: `Timed out waiting for repo state lock: ${result.lockPath}`,
      data: { lockPath: result.lockPath },
    });
  }
  return result.state;
});

export const router = module.router({
  getState,
  enablePlugin,
  disablePlugin,
});
