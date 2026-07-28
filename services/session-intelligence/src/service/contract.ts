import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { contract as catalog } from "./modules/catalog/contract";
import { contract as search } from "./modules/search/contract";
import { contract as transcripts } from "./modules/transcripts/contract";

// TODO: migrate retained meta plugin scripts into service/workspace flows once
// upstream owns the combined surface. `extract_content.py` belongs in
// content/artifact intelligence, and `scan_compactions.py` belongs in a
// compaction inspection command/service. The scripts remain downstream plugin
// compatibility material while template and personal plugin content are split.
export const metadataDefaults = {
  idempotent: true,
  domain: "session-intelligence",
  audience: "internal",
  audit: "basic",
  entity: "service",
} as const;

export const contract = oc.meta(procedureMetadata(metadataDefaults)).router({
  catalog,
  transcripts,
  search,
});

export type Contract = typeof contract;
