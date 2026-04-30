import type { BoundaryRequestSupportContext } from "@rawr/sdk/execution";
import type { Client as ExampleTodoClient } from "@rawr/example-todo";

export type ExampleTodoApiContext = BoundaryRequestSupportContext;

export type ExampleTodoClientResolver = (repoRoot: string) => ExampleTodoClient;
