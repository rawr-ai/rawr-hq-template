import type { BaseMetadata } from "@habitat-ai/sdk/service";

/** Service-wide metadata policy inherited by every lifecycle operation contract. */
export const metadataDefaults = {
  idempotent: true,
  domain: "agent-plugin-lifecycle",
  audience: "internal",
  audit: "basic",
  entity: "service",
} satisfies BaseMetadata;
