import { assign } from "./router/assign";
import { listForTask } from "./router/list-for-task";

/** Composes the completed assignment operations into the module's public router face. */
export const router = {
  assign,
  listForTask,
};
