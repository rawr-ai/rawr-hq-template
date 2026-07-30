import { create } from "./router/create.router";
import { get } from "./router/get.router";

/** Composes the completed task operations into the module's public router face. */
export const router = {
  create,
  get,
};
