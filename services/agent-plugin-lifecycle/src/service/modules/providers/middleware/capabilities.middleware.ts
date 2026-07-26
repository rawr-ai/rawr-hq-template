import { createSelectedContentResolver } from "#agent-plugin-lifecycle-service/modules/providers/model/helpers/selected-content-resolution";
import { createMiddleware } from "../../../base";

/** Contributes Provider capabilities from service-owned resources. */
export const capabilities = createMiddleware().middleware(({ context, next }) =>
  next({
    context: {
      selectedContent: createSelectedContentResolver({
        contentWorkspace: context.deps.contentWorkspace,
      }),
      nativeProviders: context.deps.nativeProviders,
    },
  })
);
