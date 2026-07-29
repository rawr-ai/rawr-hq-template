import { status } from "./status";
import { sync } from "./sync";
import { test } from "./test";

/**
 * Composes the Providers module's public operations for the service root.
 *
 * Provider transitions remain authored in the named router leaves; this face
 * only preserves their public `test`, `status`, and `sync` branches.
 */
export const router = { test, status, sync };
