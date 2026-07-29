import { status } from "./router/status.router";
import { update } from "./router/update.router";

/**
 * Composes the Vendors module's read-only observation and explicit authoring
 * operations for the service root.
 */
export const router = {
  status,
  update,
};
