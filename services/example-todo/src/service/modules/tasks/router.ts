import { create } from "./router/create";
import { get } from "./router/get";

/** Composes the completed task operations into the module's public router face. */
export const router = {
  create,
  get,
};
