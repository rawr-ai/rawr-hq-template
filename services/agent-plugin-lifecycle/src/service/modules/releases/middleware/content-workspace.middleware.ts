import { createMiddleware } from "../../../base";

/**
 * Projects the ready content-workspace resource into the Releases module.
 *
 * @remarks
 * Release operations sequence the resource directly. This middleware narrows
 * context flow without constructing a reader, adapter, or alternate resource.
 */
export const contentWorkspace = createMiddleware().middleware(({ context, next }) => {
  return next({
    context: {
      contentWorkspace: context.deps.contentWorkspace,
    },
  });
});
