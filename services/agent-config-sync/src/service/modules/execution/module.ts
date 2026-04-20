import { impl } from "../../impl";
import { analytics, observability, repository } from "./middleware";

export const module = impl.execution
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      repoRoot: context.scope.repoRoot,
      resources: context.deps.resources,
      repo: context.provided.repo,
    },
  }));
