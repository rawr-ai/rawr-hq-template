import { impl } from "./impl";
import { router as exampleTodo } from "./modules/example-todo/router";

/** Complete Example Todo API operation router. */
export const router = impl.router({ exampleTodo });
