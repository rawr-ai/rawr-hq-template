import { createMiddleware } from "../../../base";

/**
 * Projects the ready package-output resource into the Packaging module.
 *
 * @remarks
 * The package operation owns render and publication sequencing while the
 * resource retains byte encoding and destination mutation mechanics.
 */
export const packageOutput = createMiddleware().middleware(({ context, next }) => {
  return next({
    context: {
      packageOutput: context.deps.packageOutput,
    },
  });
});
