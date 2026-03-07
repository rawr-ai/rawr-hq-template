/**
 * @fileoverview Root domain contract composition for the todo package.
 *
 * @remarks
 * This file only composes module contracts into the root contract object.
 * `src/service/impl.ts` implements that root contract once; modules then derive
 * their implementer subtrees from `impl.<module>`.
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
