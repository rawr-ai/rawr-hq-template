import { impl } from "../../impl";
import { analytics, observability, repository } from "./middleware";

export const module = impl
  .corpus
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      workspaceRoot: context.provided.workspaceRoot,
      paths: context.provided.paths,
      repo: context.provided.repo,
    },
  }));
