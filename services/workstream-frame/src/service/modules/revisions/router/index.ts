/**
 * @fileoverview Revisions module router surface.
 *
 * @remarks
 * Exports one plain procedure map. The service root applies the contract-
 * enforced attach in `src/service/router.ts`.
 */
import { abandon } from "./abandon.router";
import { fork } from "./fork.router";
import { list } from "./list.router";
import { preview } from "./preview.router";
import { promote } from "./promote.router";

/** Plain procedure map for the revisions module. */
export const router = {
  fork,
  preview,
  promote,
  abandon,
  list,
};
