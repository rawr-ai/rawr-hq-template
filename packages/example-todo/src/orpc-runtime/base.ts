/**
 * @fileoverview Shared ORPC runtime builders and middleware.
 *
 * @remarks
 * `base` is the root ORPC builder for package router composition.
 * `serviceContextMiddleware` derives shared services (`logger`, `clock`) once
 * from `context.deps` and keeps module runtime context wiring consistent.
 *
 * @agents
 * If a new cross-module dependency is needed (for example metrics/tracing),
 * add it to `Deps` and promote it through `serviceContextMiddleware` once instead of
 * repeating ad-hoc injection inside each module.
 */
import { os } from "@orpc/server";
import type { BaseContext } from "./context";

export const base = os.$context<BaseContext>();

export const serviceContextMiddleware = base.middleware(({ context, next }) => {
  return next({
    context: {
      deps: context.deps,
      logger: context.deps.logger,
      clock: context.deps.clock,
    },
  });
});
