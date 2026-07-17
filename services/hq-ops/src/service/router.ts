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
import { router as security } from "./modules/security/router";
import { impl } from "./impl";

/**
 * Root HQ Ops router.
 */
export const router = impl.router({
  config,
  journal,
  security,
});

export type Router = typeof router;
