import { impl } from "../../impl";
import {
  analytics,
  observability,
  repository,
} from "./middleware";

export const module = impl.workflows
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      repo: context.provided.repo,
      repoRoot: context.scope.repoRoot,
    },
  }));
