/** Minimal release-input body accepted only through the real lifecycle operation. */
export function releaseInputBodyFixture(): unknown {
  return Object.freeze({
    schemaVersion: 1,
    contentAuthority: "personal-rawr-hq",
    members: Object.freeze([
      Object.freeze({
        kind: "agent-plugin",
        pluginId: "alpha",
        skillInventory: Object.freeze([]),
        payload: Object.freeze({
          protocolVersion: 1,
          manifest: Object.freeze([]),
          payloadDigest: "pd1_37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570",
        }),
        vendor: Object.freeze([]),
        curation: Object.freeze([]),
      }),
    ]),
    ownershipClaims: Object.freeze([]),
    locks: Object.freeze([]),
    qualityPolicies: Object.freeze([]),
  });
}
