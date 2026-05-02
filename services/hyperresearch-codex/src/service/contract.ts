/**
 * @fileoverview Root hyperresearch-codex contract composition.
 */
import { contract as runtime } from "./modules/runtime/contract";

export const contract = {
  runtime,
};

export type Contract = typeof contract;
