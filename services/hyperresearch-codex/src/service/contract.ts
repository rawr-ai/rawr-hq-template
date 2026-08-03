/**
 * @fileoverview Root hyperresearch-codex contract composition.
 */

import { oc } from "@orpc/contract";
import { metadataDefaults, procedureMetadata } from "./model/policy";
import { contract as fixtures } from "./modules/fixtures/contract";
import { contract as runs } from "./modules/runs/contract";

export const contract = oc.meta(procedureMetadata(metadataDefaults)).router({
  fixtures,
  runs,
});

export type Contract = typeof contract;
