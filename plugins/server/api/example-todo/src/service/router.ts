import type { Router } from "@orpc/server";
import type { contract } from "./contract";
import { router as exampleTodo } from "./modules/example-todo/router";

/** Complete Example Todo API operation router. */
export const router = { exampleTodo } satisfies Router<typeof contract, never>;
