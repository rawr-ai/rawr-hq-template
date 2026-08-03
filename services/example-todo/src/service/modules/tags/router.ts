import { create } from "./router/create";
import { list } from "./router/list";

/** Composes the completed tag operations into the module's public router face. */
export const router = {
  create,
  list,
};
