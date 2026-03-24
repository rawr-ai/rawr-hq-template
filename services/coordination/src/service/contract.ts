/**
 * @fileoverview Transport-free coordination capability contract.
 */
import { contract as runs } from "./modules/runs/contract";
import { contract as workflows } from "./modules/workflows/contract";

export const contract = {
  workflows,
  runs,
};

export type Contract = typeof contract;
