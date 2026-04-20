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
import { router as pluginCatalog } from "./modules/plugin-catalog/router";
import { router as pluginInstall } from "./modules/plugin-install/router";
import { router as pluginLifecycle } from "./modules/plugin-lifecycle/router";
import { router as repoState } from "./modules/repo-state/router";
import { router as security } from "./modules/security/router";
import { impl } from "./impl";

/**
 * Root HQ Ops router, including the plugin-management modules that own
 * catalog, install, and lifecycle semantics for headquarters.
 */
export const router = impl.router({
  config,
  repoState,
  journal,
  security,
  pluginCatalog,
  pluginInstall,
  pluginLifecycle,
});

export type Router = typeof router;
