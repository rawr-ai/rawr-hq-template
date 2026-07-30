import { create } from "./router/create.router";
import { list } from "./router/list.router";

/** Composes the completed tag operations into the module's public router face. */
export const router = {
  create,
  list,
};
