import { contract as tasks } from "./modules/tasks/contract";

/** Public Example Todo API contract composed from its operation modules. */
export const contract = {
  exampleTodo: {
    tasks,
  },
} as const;
