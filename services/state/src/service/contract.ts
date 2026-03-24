/**
 * @fileoverview Root domain contract composition for the state package.
 *
 * @remarks
 * This file only composes module contracts into the root contract object.
 * `src/service/impl.ts` implements that root contract once; module-local
 * composition then happens below that seam.
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
