/**
 * @fileoverview Root HQ Ops contract composition.
 *
 * @remarks
 * This file only composes module contracts into the root contract object.
 * `src/service/impl.ts` implements that root contract once; modules then descend
 * through configured `service.<module>` branches.
 */
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { metadataDefaults } from "./model/policy/procedure-metadata";
import { contract as config } from "./modules/config/contract";
import { contract as journal } from "./modules/journal/contract";
import { contract as security } from "./modules/security/contract";

/** Root HQ Ops contract. */
export const contract = oc.meta(procedureMetadata(metadataDefaults)).router({
  config,
  journal,
  security,
});

export type Contract = typeof contract;
