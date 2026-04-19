import { impl } from "../../impl";
import { analytics, observability } from "./middleware";
import { createRepository } from "./repository";

export const module = impl.retirement
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      repoRoot: context.scope.repoRoot,
      retirementRuntime: context.deps.retirementRuntime,
      repo: createRepository(context.deps.retirementRuntime),
    },
  }));
