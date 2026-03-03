/**
 * @fileoverview oRPC boundary wrapper for the todo package.
 *
 * @remarks
 * This is the single choke point where global middleware is applied.
 * Keep domain composition inside `../modules/router.ts`.
 */
import { router as modulesRouter } from "../modules/router";
import { middlewareBuilder } from "./base";
import { withReadOnlyMode } from "./middleware/with-read-only-mode";
import { withTelemetry } from "./middleware/with-telemetry";

export const router = middlewareBuilder
  .use(withTelemetry)
  .use(withReadOnlyMode)
  .router(modulesRouter);

export type Router = typeof router;

