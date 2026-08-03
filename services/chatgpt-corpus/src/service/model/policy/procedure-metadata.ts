import { procedureMetadata as createProcedureMetadata } from "@habitat-ai/rawr-hq-sdk";

export const metadataDefaults = {
  idempotent: true,
  domain: "chatgpt-corpus",
  audience: "internal",
  entity: "chatgpt-corpus",
} as const;

export const procedureMetadata = createProcedureMetadata;
