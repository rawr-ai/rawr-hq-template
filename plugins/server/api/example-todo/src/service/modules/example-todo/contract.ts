import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { contract as exampleTodoContract } from "@rawr/example-todo/client";

/**
 * @purpose Project the Todo task capability onto its stable HTTP boundary.
 * @capability Create and retrieve repository-scoped Todo tasks.
 * @behavior Preserve the domain schemas while adding HTTP route metadata.
 * @relation Forms the task branch of the Example Todo API module contract.
 */
const tasks = {
  create: oc
    .meta(
      openapi({
        method: "POST",
        path: "/exampleTodo/tasks/create",
        tags: ["exampleTodo"],
        summary: "Create a task in the example todo capability",
        operationId: "exampleTodoCreateTask",
      })
    )
    .router(exampleTodoContract.tasks.create),
  get: oc
    .meta(
      openapi({
        method: "GET",
        path: "/exampleTodo/tasks/{id}",
        tags: ["exampleTodo"],
        summary: "Get a task from the example todo capability",
        operationId: "exampleTodoGetTask",
      })
    )
    .router(exampleTodoContract.tasks.get),
} as const;

/** Public Example Todo API module contract composed from its task capability. */
export const contract = { tasks } as const;
