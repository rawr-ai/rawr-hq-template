/**
 * @fileoverview Service router composition for the coordination package.
 *
 * @remarks
 * Keep the canonical service tree namespaced here as `{ workflows, runs }`.
 * The legacy flat `{ ...workflows, ...runs }` compatibility projection exists
 * only at the outer package/plugin edges, not inside `service/*`.
 */
import { router as runs } from "./modules/runs/router";
import { router as workflows } from "./modules/workflows/router";
import { impl } from "./impl";

export const router = impl.router({
  workflows,
  runs,
});
export type Router = typeof router;
