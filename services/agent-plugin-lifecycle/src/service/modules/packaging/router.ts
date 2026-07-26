import { router as packageOperations } from "./router/package.router";

/** Composes Packaging's authored operations into its single public module face. */
export const router = {
  ...packageOperations,
};
