import { procedureMetadata as createProcedureMetadata } from "@habitat-ai/sdk/service";

export const metadataDefaults = {
  idempotent: true,
  domain: "chatgpt-corpus",
  audience: "internal",
  entity: "chatgpt-corpus",
} as const;

export const procedureMetadata = createProcedureMetadata;
