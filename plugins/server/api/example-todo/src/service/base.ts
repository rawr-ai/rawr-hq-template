import type { Client as ExampleTodoClient } from "@rawr/example-todo";
import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";

/** Request facts consumed by Example Todo API operations. */
export type Context = Pick<BoundaryRequestSupportContext, "correlationId" | "repoRoot">;

/** Host-owned resolver for the sealed Example Todo domain-service client. */
export type ClientResolver = (repoRoot: string) => ExampleTodoClient;
