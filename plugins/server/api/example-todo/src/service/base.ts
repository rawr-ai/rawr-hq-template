import { os } from "@orpc/server";
import type { Client as ExampleTodoClient } from "@rawr/example-todo/client";
import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";

/** Host-owned resolver for the sealed Example Todo domain-service client. */
type ClientResolver = (repoRoot: string) => ExampleTodoClient;

/** Host projection required by the embedded Example Todo API service. */
export type Context = BoundaryRequestSupportContext<
  { exampleTodo: { resolveClient: ClientResolver } },
  { repoRoot: string },
  Record<never, never>,
  { correlationId: string }
>;

const middleware = os.$context<Context>();

/** Returns the sole context-seeded middleware author for this API service. */
export function createMiddleware() {
  return middleware;
}
