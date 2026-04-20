import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

/**
 * Runtime composition for sync execution.
 *
 * The final context shape exposes only repoRoot, primitive resources, and the
 * optional undo capture to handlers so destination sync does not depend on
 * host globals.
 */
export const module = impl.execution
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      repoRoot: context.scope.repoRoot,
      resources: context.deps.resources,
      undoCapture: context.deps.undoCapture,
    },
  }));
