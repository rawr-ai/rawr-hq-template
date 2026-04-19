import { minifyContractRouter, type AnyContractRouter } from "@orpc/contract";
import { router as exampleTodoRouter } from "@rawr/example-todo";

export const exampleTodoApiRouterContract = {
  exampleTodo: {
    tasks: {
      create: exampleTodoRouter.tasks.create,
      get: exampleTodoRouter.tasks.get,
    },
  },
} as const;

export const exampleTodoApiContract = minifyContractRouter(
  exampleTodoApiRouterContract as unknown as AnyContractRouter,
) as typeof exampleTodoApiRouterContract;

export type ExampleTodoApiContract = typeof exampleTodoApiContract;
