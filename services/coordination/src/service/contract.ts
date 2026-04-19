/**
 * @fileoverview Transport-free coordination capability contract.
 */
import { contract as workflows } from "./modules/workflows/contract";

export const contract = {
  workflows,
};

export type Contract = typeof contract;
