import { router as tagOperations } from "./router/tags.router";

/** Composes the completed tag operations into the module's public router face. */
export const router = {
  ...tagOperations,
};
