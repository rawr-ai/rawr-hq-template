import { procedureMetadata as createProcedureMetadata } from "@habitat-ai/sdk/service";

export const metadataDefaults = {
  idempotent: true,
  domain: "hyperresearch-codex",
  audience: "internal",
  audit: "basic",
  entity: "service",
} as const;

export const procedureMetadata = createProcedureMetadata;
