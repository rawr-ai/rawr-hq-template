import type { RuntimeRouterContext } from "@rawr/runtime-context";
import type { Client as ExampleTodoClient } from "@rawr/example-todo";

export type ExampleTodoApiContext = RuntimeRouterContext & {
  repoRoot: string;
  correlationId: string;
};

export type ExampleTodoClientResolver = (repoRoot: string) => ExampleTodoClient;
