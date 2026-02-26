/**
 * @fileoverview Shared ORPC context and middleware baseline.
 *
 * @remarks
 * `base` defines the minimal required context (`deps`), and `withService`
 * derives cross-cutting services (`logger`, `clock`) once for all modules.
 *
 * Invariant: module routers should extend context from `withService`, not bypass it.
 *
 * @agents
 * If a new cross-module dependency is needed (for example metrics/tracing),
 * add it to `TodoDeps` and promote it through `withService` once instead of
 * repeating ad-hoc injection inside each module.
 */
import { os } from "@orpc/server";
import type { Clock, Logger, TodoDeps } from "./deps";

export interface BaseContext {
  deps: TodoDeps;
}

export interface ServiceContext extends BaseContext {
  logger: Logger;
  clock: Clock;
}

export const base = os.$context<BaseContext>();

export const withService = base.use(({ context, next }) => {
  return next({
    context: {
      deps: context.deps,
      logger: context.deps.logger,
      clock: context.deps.clock,
    },
  });
});
