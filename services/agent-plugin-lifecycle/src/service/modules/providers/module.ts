import { service } from "../../impl";

/**
 * Providers implementer with its route-facing context curated from the
 * inherited service dependencies.
 */
export const module = service.providers.use(async ({ context, next }) =>
  next({
    context: {
      contentWorkspace: context.deps.contentWorkspace,
      nativeProviders: context.deps.nativeProviders,
      versionedContent: context.deps.versionedContent,
    },
  })
);
