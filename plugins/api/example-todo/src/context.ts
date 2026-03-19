import type { RuntimeRouterContext } from "@rawr/core/orpc";
import type { Client as ExampleTodoClient } from "@rawr/example-todo";

export type ExampleTodoApiContext = RuntimeRouterContext & {
  repoRoot: string;
  correlationId: string;
};

export type ExampleTodoClientResolver = (repoRoot: string) => ExampleTodoClient;
