/**
 * @fileoverview Root domain contract composition for workstream-frame.
 *
 * @remarks
 * Composes module contracts into the root contract object. `src/service/impl.ts`
 * implements this once; modules derive their subtrees from `impl.<module>`.
 */
import { contract as revisions } from "./modules/revisions/contract";
import { contract as streams } from "./modules/streams/contract";

/** Root contract: the composed module contracts this service implements once. */
export const contract = {
  streams,
  revisions,
};

export type Contract = typeof contract;
