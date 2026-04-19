/**
 * @fileoverview Service router composition for the HQ Ops package.
 *
 * @remarks
 * This file composes module routers into a single router object and performs
 * a single final `.router(...)` attach.
 *
 * Service-wide middleware is authored and attached in `src/service/impl.ts`.
 */
import { router as config } from "./modules/config/router";
import { router as journal } from "./modules/journal/router";
import { router as pluginInstall } from "./modules/plugin-install/router";
import { router as pluginLifecycle } from "./modules/plugin-lifecycle/router";
import { router as repoState } from "./modules/repo-state/router";
import { router as security } from "./modules/security/router";
import { impl } from "./impl";

export const router = impl.router({
  config,
  repoState,
  journal,
  security,
  pluginInstall,
  pluginLifecycle,
});

export type Router = typeof router;
