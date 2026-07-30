import { assign } from "./router/assign.router";
import { listForTask } from "./router/list-for-task.router";

/** Composes the completed assignment operations into the module's public router face. */
export const router = {
  assign,
  listForTask,
};
