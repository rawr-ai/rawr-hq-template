/**
 * @fileoverview Root domain contract composition for the state package.
 */
import {
  GetStateInputSchema,
  GetStateOutputSchema,
  contract as state,
} from "./modules/state/contract";

export const contract = {
  ...state,
};

export type Contract = typeof contract;
export {
  GetStateInputSchema,
  GetStateOutputSchema,
};
