/// <reference path="../shims/bun-sqlite.d.ts" />

/**
 * @fileoverview Root HQ Ops contract composition.
 *
 * @remarks
 * This file only composes module contracts into the root contract object.
 * `src/service/impl.ts` implements that root contract once; modules then derive
 * their implementer subtrees from `impl.<module>`.
 */
import { contract as config } from "./modules/config/contract";
import { contract as journal } from "./modules/journal/contract";
import { contract as repoState } from "./modules/repo-state/contract";
import { contract as security } from "./modules/security/contract";

export const contract = {
  config,
  repoState,
  journal,
  security,
};

export type Contract = typeof contract;
