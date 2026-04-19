import { defineApiPlugin } from "@rawr/hq-sdk/apis";
import type { ExampleTodoClientResolver } from "./context";
import { exampleTodoApiContract } from "./contract";
import { createExampleTodoApiRouter } from "./router";

export {
  type ExampleTodoApiContext,
  type ExampleTodoClientResolver,
} from "./context";
export { createExampleTodoApiRouter, type ExampleTodoApiRouter } from "./router";

export function registerExampleTodoApiPlugin(input: {
  resolveClient: ExampleTodoClientResolver;
}) {
  const internal = {
    contract: exampleTodoApiContract,
    router: createExampleTodoApiRouter(input.resolveClient),
  } as const;

  return defineApiPlugin({
    internal,
    published: internal,
  });
}

export type ExampleTodoApiPluginRegistration = ReturnType<typeof registerExampleTodoApiPlugin>;
