/**
 * @fileoverview Plugin-lifecycle module runtime composition.
 */
import { impl } from "../../impl";
import { analytics, observability, repository } from "./middleware";

export const module = impl.pluginLifecycle
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      repoRoot: context.scope.repoRoot,
      repo: context.provided.repo,
    },
  }));
