import { status } from "./router/status";
import { update } from "./router/update";

/**
 * Composes the Vendors module's read-only observation and explicit authoring
 * operations for the service root.
 */
export const router = {
  status,
  update,
};
