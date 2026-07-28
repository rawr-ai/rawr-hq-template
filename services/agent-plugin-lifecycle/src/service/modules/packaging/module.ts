import { service } from "../../impl";

/**
 * Packaging implementer with its route-facing context curated from the
 * inherited service dependencies.
 */
export const module = service.packaging.use(async ({ context, next }) =>
  next({
    context: {
      contentWorkspace: context.deps.contentWorkspace,
      packageOutput: context.deps.packageOutput,
    },
  })
);
