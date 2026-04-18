import { impl } from "../../impl";
import { analytics, observability } from "./middleware";
import { createRepository } from "./repository";

export const module = impl.undo
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      repoRoot: context.scope.repoRoot,
      undoRuntime: context.deps.undoRuntime,
      repo: createRepository(context.deps.undoRuntime),
    },
  }));
