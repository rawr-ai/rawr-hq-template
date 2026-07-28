import { router as taskOperations } from "./router/tasks.router";

/** Composes the completed task operations into the module's public router face. */
export const router = {
  ...taskOperations,
};
