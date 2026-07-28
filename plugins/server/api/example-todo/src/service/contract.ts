import { contract as exampleTodo } from "./modules/example-todo/contract";

/** Public Example Todo API contract composed from its operation modules. */
export const contract = {
  exampleTodo,
} as const;
