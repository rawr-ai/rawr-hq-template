/**
 * @fileoverview Streams module router surface.
 *
 * @remarks
 * Exports one plain procedure map. The service root applies the contract-
 * enforced attach in `src/service/router.ts`.
 */
import { admit } from "./admit.router";
import { inspect } from "./inspect.router";
import { open } from "./open.router";
import { push } from "./push.router";
import { resolve } from "./resolve.router";

/** Plain procedure map for the streams module. */
export const router = {
  open,
  admit,
  push,
  resolve,
  inspect,
};
