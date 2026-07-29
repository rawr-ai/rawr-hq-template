import { status } from "./status";
import { update } from "./update";

/**
 * Composes the Vendors module's read-only observation and explicit authoring
 * operations for the service root.
 */
export const router = {
  status,
  update,
};
