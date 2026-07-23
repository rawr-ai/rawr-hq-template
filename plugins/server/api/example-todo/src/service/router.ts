import type { ClientResolver } from "./base";
import { service } from "./impl";
import { router as tasks } from "./modules/tasks/router";

/** Complete Example Todo API operation router. */
export const router = (resolveClient: ClientResolver) =>
  service.router({
    exampleTodo: {
      tasks: tasks(resolveClient),
    },
  });
