/**
 * @fileoverview Root domain contract composition for the todo package.
 *
 * @remarks
 * This file composes module contracts into a single root contract object.
 * `src/orpc.ts` implements this root contract once, then modules derive their
 * per-module implementers from the resulting `impl.<module>` subtrees.
 */
import { contract as assignments } from "./modules/assignments/contract";
import { contract as tags } from "./modules/tags/contract";
import { contract as tasks } from "./modules/tasks/contract";

export const contract = {
  tasks,
  tags,
  assignments,
};

export type Contract = typeof contract;
