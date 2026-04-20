/**
 * @fileoverview Root agent-config-sync contract composition.
 */
import { contract as execution } from "./modules/execution/contract";
import { contract as planning } from "./modules/planning/contract";
import { contract as retirement } from "./modules/retirement/contract";
import { contract as undo } from "./modules/undo/contract";

/**
 * Root contract for standalone agent destination sync capabilities.
 */
export const contract = {
  planning,
  execution,
  retirement,
  undo,
};

export type Contract = typeof contract;
