import type { Client as ExampleTodoClient } from "@rawr/example-todo";
import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";

export type ExampleTodoApiContext = BoundaryRequestSupportContext;

export type ExampleTodoClientResolver = (repoRoot: string) => ExampleTodoClient;
