import { service } from "../../impl";
import { analytics, observability } from "./middleware";
import { createSelectedContentResolver } from "./model/helpers/selected-content-resolution";

export const module = service.providers
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => {
    return next({
      context: {
        currentMain: context.provided.currentMain,
        selectedContent: createSelectedContentResolver({
          contentWorkspace: context.deps.contentWorkspace,
        }),
        nativeSessions: context.deps.providerNativeSessions,
      },
    });
  });
