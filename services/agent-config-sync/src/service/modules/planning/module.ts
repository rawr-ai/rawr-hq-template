import { impl } from "../../impl";
import { analytics, observability } from "./middleware";
import { createRepository } from "./repository";

export const module = impl.planning
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      repoRoot: context.scope.repoRoot,
      repo: createRepository(context.deps.resources),
    },
  }));
