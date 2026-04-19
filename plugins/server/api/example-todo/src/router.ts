import {
  createApiRouterBuilder,
  createApiTraceForwardingOptions,
} from "@rawr/hq-sdk/apis";
import type { ExampleTodoApiContext, ExampleTodoClientResolver } from "./context";
import { exampleTodoApiContract } from "./contract";

const os = createApiRouterBuilder<typeof exampleTodoApiContract, ExampleTodoApiContext>(exampleTodoApiContract);

export function createExampleTodoApiRouter(resolveClient: ExampleTodoClientResolver) {
  return os.router({
    exampleTodo: {
      tasks: {
        create: os.exampleTodo.tasks.create.handler(async ({ context, input }) => {
          return resolveClient(context.repoRoot).tasks.create(input, createApiTraceForwardingOptions(context));
        }),
        get: os.exampleTodo.tasks.get.handler(async ({ context, input }) => {
          return resolveClient(context.repoRoot).tasks.get(input, createApiTraceForwardingOptions(context));
        }),
      },
    },
  });
}

export type ExampleTodoApiRouter = ReturnType<typeof createExampleTodoApiRouter>;
