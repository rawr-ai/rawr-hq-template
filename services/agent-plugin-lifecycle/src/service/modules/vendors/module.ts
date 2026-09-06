import { service } from "../../impl";

/**
 * Vendor implementer with its route-facing context curated from the inherited
 * service dependencies.
 */
export const module = service.vendors.use(async ({ context, next }) =>
  next({
    context: {
      contentWorkspace: context.deps.contentWorkspace,
      versionedContent: context.deps.versionedContent,
    },
  })
);
