import type { BaseMetadata } from "@habitat-ai/sdk/service";

/** Service-wide metadata policy inherited by every development operation contract. */
export const metadataDefaults = {
  idempotent: true,
  domain: "dev",
  audience: "internal",
  audit: "basic",
  entity: "service",
} as const satisfies BaseMetadata;
