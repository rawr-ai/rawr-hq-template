import type { ExampleTodoClientResolver } from "./context";
import { exampleTodoApiContract } from "./contract";
import { createExampleTodoApiRouter } from "./router";

export function registerExampleTodoApiPlugin(input: {
  resolveClient: ExampleTodoClientResolver;
}) {
  return {
    namespace: "orpc" as const,
    contract: exampleTodoApiContract,
    router: createExampleTodoApiRouter(input.resolveClient),
  };
}

export type ExampleTodoApiPluginRegistration = ReturnType<typeof registerExampleTodoApiPlugin>;
