import { createMiddleware } from "../../../base";

/**
 * Projects the ready content-workspace resource into the Providers module.
 *
 * @remarks
 * Provider operations sequence source observation directly. This middleware
 * contributes the resource without constructing a resolver, adapter, or
 * alternate source authority.
 */
export const contentWorkspace = createMiddleware().middleware(({ context, next }) => {
  return next({
    context: {
      contentWorkspace: context.deps.contentWorkspace,
    },
  });
});
