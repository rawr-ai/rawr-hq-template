import { implement } from "@orpc/server";
import { router as exampleTodoRouter } from "@rawr/example-todo";
import type { ExampleTodoApiContext, ExampleTodoClientResolver } from "./context";

const os = implement<typeof exampleTodoRouter, ExampleTodoApiContext>(
  exampleTodoRouter as unknown as typeof exampleTodoRouter,
);

export function createExampleTodoApiRouter(resolveClient: ExampleTodoClientResolver) {
  return {
    exampleTodo: {
      tasks: {
        create: os.tasks.create.handler(async ({ context, input }) => {
          return resolveClient(context.repoRoot).tasks.create(input, {
            context: {
              invocation: {
                traceId: context.correlationId,
              },
            },
          });
        }),
        get: os.tasks.get.handler(async ({ context, input }) => {
          return resolveClient(context.repoRoot).tasks.get(input, {
            context: {
              invocation: {
                traceId: context.correlationId,
              },
            },
          });
        }),
      },
    },
  } as const;
}

export type ExampleTodoApiRouter = ReturnType<typeof createExampleTodoApiRouter>;
