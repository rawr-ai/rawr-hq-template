import { service } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = service.providers
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => {
    return next({
      context: {
        currentMain: context.provided.currentMain,
        selectedContent: context.provided.selectedContent,
        nativeSessions: context.deps.providerNativeSessions,
      },
    });
  });
