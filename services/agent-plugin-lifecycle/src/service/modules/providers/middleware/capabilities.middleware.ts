import { createMiddleware } from "../../../base";
import { createSelectedContentResolver } from "../model/helpers/selected-content-resolution";

/** Contributes Provider capabilities from service-owned resources. */
export const capabilities = createMiddleware().middleware(({ context, next }) =>
  next({
    context: {
      contentWorkspace: context.deps.contentWorkspace,
      selectedContent: createSelectedContentResolver({
        contentWorkspace: context.deps.contentWorkspace,
      }),
      nativeProviders: context.deps.nativeProviders,
    },
  })
);
