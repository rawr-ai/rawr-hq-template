import { contract as exampleTodoContract } from "@rawr/example-todo/service/contract";

export const exampleTodoApiRouterContract = {
  exampleTodo: {
    tasks: {
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
    },
  },
} as const;

export const exampleTodoApiContract = exampleTodoApiRouterContract;

export type ExampleTodoApiContract = typeof exampleTodoApiContract;
