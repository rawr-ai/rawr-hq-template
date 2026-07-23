/**
 * @fileoverview Service router composition for the hyperresearch-codex package.
 */

import { impl } from "./impl";
import { router as fixtures } from "./modules/fixtures/router";
import { router as runs } from "./modules/runs/router";

export const router = impl.router({
  fixtures,
  runs,
});

export type Router = typeof router;
