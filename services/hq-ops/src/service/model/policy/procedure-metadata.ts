import type { BaseMetadata } from "@rawr/hq-sdk";

/** Service-wide metadata policy inherited by every HQ operations contract. */
export const metadataDefaults = {
  idempotent: true,
  domain: "hq-ops",
  audience: "internal",
  audit: "basic",
  entity: "service",
} as const satisfies BaseMetadata;
