/**
 * @fileoverview Root hyperresearch-codex contract composition.
 */
import { contract as fixtures } from "./modules/fixtures/contract";
import { contract as runs } from "./modules/runs/contract";

export const contract = {
  fixtures,
  runs,
};

export type Contract = typeof contract;
