import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";
import type { Client as ExampleTodoClient } from "@rawr/example-todo";

export type ExampleTodoApiContext = BoundaryRequestSupportContext;

export type ExampleTodoClientResolver = (repoRoot: string) => ExampleTodoClient;
