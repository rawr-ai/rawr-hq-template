import type { ClientResolver } from "../../base";
import { service } from "../../impl";

/** Task-operation implementer branch inherited from the API service contract. */
export const module = service.exampleTodo.tasks;

/**
 * Binds the host's domain-client resolver at the task-module boundary.
 *
 * The middleware resolves the request's repository-scoped client once and
 * contributes it to operation context, keeping host capability binding out of
 * individual operation handlers.
 */
export const bindModule = (resolveClient: ClientResolver) =>
  module.use(async ({ context, next }) =>
    next({
      context: {
        client: resolveClient(context.repoRoot),
      },
    })
  );
