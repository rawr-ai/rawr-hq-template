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
