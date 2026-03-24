/**
 * @fileoverview Service router composition for the state package.
 */
import { router as state } from "./modules/state/router";
import { impl } from "./impl";

export const router = impl.router({
  ...state,
});

export type Router = typeof router;
