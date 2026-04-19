import { impl } from "../../impl";
import { analytics, observability, repository } from "./middleware";

export const module = impl.catalog
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      repo: context.provided.repo,
    },
  }));
