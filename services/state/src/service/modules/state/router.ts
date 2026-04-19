/**
 * @fileoverview State module router implementation.
 *
 * @remarks
 * Module composition lives in `./module.ts`.
 * This file owns concrete handler implementations and exports plain-object
 * `router`.
 */
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
