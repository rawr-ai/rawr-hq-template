/** Minimal release-input body accepted only through the real lifecycle operation. */
export function releaseInputBodyFixture(): unknown {
  return Object.freeze({
    schemaVersion: 1,
    contentAuthority: "personal-rawr-hq",
    members: Object.freeze([
      Object.freeze({
        kind: "agent-plugin",
        pluginId: "alpha",
        vendor: Object.freeze([]),
        curation: Object.freeze([]),
      }),
    ]),
    ownershipClaims: Object.freeze([]),
    locks: Object.freeze([]),
    qualityPolicies: Object.freeze([]),
  });
}
