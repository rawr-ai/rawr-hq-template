/**
 * @fileoverview Invocation-trace observer.
 *
 * @remarks
 * This middleware demonstrates the repo posture for invocation-scoped input:
 * required per-call data arrives through native oRPC client context and is
 * consumed explicitly inside the package.
 */
import type { Logger } from "../../orpc/base";
import { createServiceMiddleware } from "../base";

/**
 * Observe the required invocation trace id on every procedure execution.
 */
export const invocationTrace = createServiceMiddleware<{
  deps: {
    logger: Logger;
  };
  invocation: {
    traceId: string;
  };
}>().middleware(async ({ context, path, next }) => {
  context.deps.logger.info("todo.invocation.trace", {
    path: path.join("."),
    traceId: context.invocation.traceId,
  });

  return await next();
});
