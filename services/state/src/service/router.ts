/**
 * @fileoverview Service router composition for the state package.
 *
 * @remarks
 * This file composes module routers into a single router object and performs a
 * single final `.router(...)` attach.
 */
import { router as state } from "./modules/state/router";
import { impl } from "./impl";

export const router = impl.router({
  ...state,
});

export type Router = typeof router;
