import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.planning
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      repoRoot: context.scope.repoRoot,
      resources: context.deps.resources,
    },
  }));
