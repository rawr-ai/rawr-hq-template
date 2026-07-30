import { base } from "../base";

/**
 * Resolves the host-owned Todo client once for the request-scoped repository
 * and contributes it to the embedded service's `provided` lane.
 */
export const middleware = base.middleware(async ({ context, next }) => {
  const exampleTodoClient = context.deps.exampleTodo.resolveClient(context.scope.repoRoot);

  return next({
    context: {
      provided: {
        exampleTodoClient,
      },
    },
  });
});
