import { contract as exampleTodoContract } from "@rawr/example-todo/service/contract";

/** HTTP operation contract projected from the sealed Example Todo task boundary. */
export const contract = {
  create: exampleTodoContract.tasks.create.route({
    method: "POST",
    path: "/exampleTodo/tasks/create",
    tags: ["exampleTodo"],
    summary: "Create a task in the example todo capability",
    operationId: "exampleTodoCreateTask",
  }),
  get: exampleTodoContract.tasks.get.route({
    method: "GET",
    path: "/exampleTodo/tasks/{id}",
    tags: ["exampleTodo"],
    summary: "Get a task from the example todo capability",
    operationId: "exampleTodoGetTask",
  }),
} as const;
