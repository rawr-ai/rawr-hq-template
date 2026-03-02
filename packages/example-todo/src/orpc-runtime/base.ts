/**
 * @fileoverview Shared ORPC context and middleware baseline.
 *
 * @remarks
 * `base` defines the minimal required context (`deps`).
 * `serviceContextMiddleware` derives shared services (`logger`, `clock`) once.
 * Both router-first and contract-first module implementations should reuse this
 * middleware to keep context wiring consistent.
 *
 * Invariant: module routers should extend context from `withService`, not bypass it.
 *
 * @agents
 * If a new cross-module dependency is needed (for example metrics/tracing),
 * add it to `Deps` and promote it through `withService` once instead of
 * repeating ad-hoc injection inside each module.
 */
import { os } from "@orpc/server";
import type { Clock, Deps, Logger } from "./deps";

export interface BaseContext {
  deps: Deps;
}

export interface ServiceContext extends BaseContext {
  logger: Logger;
  clock: Clock;
}

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

export const withService = base.use(serviceContextMiddleware);
