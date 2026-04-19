/**
 * @fileoverview Service router composition for the coordination package.
 *
 * @remarks
 * Keep the canonical service tree namespaced here as `{ workflows }`.
 */
import { router as workflows } from "./modules/workflows/router";
import { impl } from "./impl";

export const router = impl.router({
  workflows,
});
export type Router = typeof router;
