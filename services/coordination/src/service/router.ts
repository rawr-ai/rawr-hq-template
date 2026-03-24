/**
 * @fileoverview Service router composition for the coordination package.
 */
import { router as runs } from "./modules/runs/router";
import { router as workflows } from "./modules/workflows/router";
import { impl } from "./impl";

export const router = impl.router({
  ...workflows,
  ...runs,
});

export type Router = typeof router;
