import { procedureMetadata as createProcedureMetadata } from "@habitat-ai/rawr-hq-sdk";

export const metadataDefaults = {
  idempotent: true,
  domain: "hyperresearch-codex",
  audience: "internal",
  audit: "basic",
  entity: "service",
} as const;

export const procedureMetadata = createProcedureMetadata;
