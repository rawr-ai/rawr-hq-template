import { router as assignmentOperations } from "./router/assignments.router";

/** Composes the completed assignment operations into the module's public router face. */
export const router = {
  ...assignmentOperations,
};
