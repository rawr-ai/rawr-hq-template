import { service } from "../../impl";

/**
 * Releases implementer with its route-facing context curated from the
 * inherited service dependencies.
 */
export const module = service.releases.use(async ({ context, next }) =>
  next({
    context: {
      contentWorkspace: context.deps.contentWorkspace,
    },
  })
);
