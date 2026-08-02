/**
 * @fileoverview Root hyperresearch-codex contract composition.
 */

import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { oc } from "@orpc/contract";
import { contract as fixtures } from "./modules/fixtures/contract";
import { contract as runs } from "./modules/runs/contract";

export const metadataDefaults = {
  idempotent: true,
  domain: "hyperresearch-codex",
  audience: "internal",
  audit: "basic",
  entity: "service",
} as const;

export const contract = oc.meta(procedureMetadata(metadataDefaults)).router({
  fixtures,
  runs,
});

export type Contract = typeof contract;
