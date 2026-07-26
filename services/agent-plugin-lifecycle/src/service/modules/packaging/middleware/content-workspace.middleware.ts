import { createMiddleware } from "../../../base";

/**
 * Projects the ready content-workspace resource into the Packaging module.
 *
 * @remarks
 * The package operation sequences source observation directly. This
 * middleware contributes the resource without constructing a reader, adapter,
 * or alternate source authority.
 */
export const contentWorkspace = createMiddleware().middleware(({ context, next }) => {
  return next({
    context: {
      contentWorkspace: context.deps.contentWorkspace,
    },
  });
});
