/**
 * @fileoverview Service router composition for the agent-config-sync package.
 */
import { router as execution } from "./modules/execution/router";
import { router as planning } from "./modules/planning/router";
import { router as retirement } from "./modules/retirement/router";
import { router as undo } from "./modules/undo/router";
import { impl } from "./impl";

export const router = impl.router({
  planning,
  execution,
  retirement,
  undo,
});

export type Router = typeof router;
