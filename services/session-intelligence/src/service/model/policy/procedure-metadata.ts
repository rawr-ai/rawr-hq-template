/** Static metadata inherited by every session-intelligence procedure. */
export const metadataDefaults = {
  idempotent: true,
  domain: "session-intelligence",
  audience: "internal",
  audit: "basic",
  entity: "service",
} as const;
