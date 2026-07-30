import { os } from "@orpc/server";
import type { Client as ExampleTodoClient } from "@rawr/example-todo/client";

/** Host-owned resolver for the sealed Example Todo domain-service client. */
type ClientResolver = (repoRoot: string) => ExampleTodoClient;

/** Complete host and invocation context admitted by the embedded API service. */
export type Context = {
  deps: { exampleTodo: { resolveClient: ClientResolver } };
  scope: { repoRoot: string };
  config: Record<never, never>;
  invocation: { correlationId: string };
  provided: Record<never, never>;
};

/** Native middleware author rooted in the complete API service context. */
export const base = os.$context<Context>();
