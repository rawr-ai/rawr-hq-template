import { service } from "../../impl";
import { analytics, observability, repositories } from "./middleware";

export const module = service.releases
  .use(observability)
  .use(analytics)
  .use(repositories)
  .use(async ({ context, next }) =>
    next({
      context: {
        source: context.provided.releaseSource,
        stagedSource: context.provided.stagedReleaseSource,
      },
    })
  );
