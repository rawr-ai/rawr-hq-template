/**
 * @fileoverview Run-lifecycle module composition for Hyperresearch Codex.
 */
import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.runs
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      repoRoot: context.scope.repoRoot,
      io: context.deps.io,
      cli: context.deps.cli,
    },
  }));
