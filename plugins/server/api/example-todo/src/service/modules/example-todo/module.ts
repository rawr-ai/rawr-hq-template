import { service } from "../../impl";

/** Example Todo implementer branch with terminal handler-context curation. */
export const module = service.exampleTodo.use(async ({ context, next }) =>
  next({
    context: {
      client: context.provided.exampleTodoClient,
      correlationId: context.invocation.correlationId,
    },
  })
);
