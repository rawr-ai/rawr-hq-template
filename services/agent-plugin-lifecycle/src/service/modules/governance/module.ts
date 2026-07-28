import { service } from "../../impl";

/**
 * Governance implementer with its route-facing context curated from the
 * inherited service dependencies.
 */
export const module = service.governance.use(async ({ context, next }) =>
  next({
    context: {
      contentWorkspace: context.deps.contentWorkspace,
    },
  })
);
