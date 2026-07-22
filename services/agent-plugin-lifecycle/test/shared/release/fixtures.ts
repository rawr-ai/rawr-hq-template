import {
  contentDigest,
  createAgentPluginPayload,
  createAgentPluginRelease,
  createAgentPluginReleaseInput,
  createAgentPluginReleaseSet,
  type AgentPluginPayload,
  type AgentPluginRelease,
  type AgentPluginReleaseInput,
  type AgentPluginReleaseSet,
  type ReleaseResult,
} from "../../../src/service/shared/release";

const encoder = new TextEncoder();

export const SOURCE = Object.freeze({
  sourceRepository: "git:github.com/example/personal-rawr-hq",
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
});

export interface ProductFixture {
  readonly releaseInput: AgentPluginReleaseInput;
  readonly alphaPayload: AgentPluginPayload;
  readonly betaPayload: AgentPluginPayload;
  readonly alphaRelease: AgentPluginRelease;
  readonly betaRelease: AgentPluginRelease;
  readonly releaseSet: AgentPluginReleaseSet;
}

export function productFixture(): ProductFixture {
  const alphaPayload = must(
    createAgentPluginPayload([
      { path: "skills/alpha/SKILL.md", mode: 0o644, bytes: encoder.encode("alpha\n") },
      { path: "agents/alpha.md", mode: 0o644, bytes: encoder.encode("agent alpha\n") },
    ])
  );
  const betaPayload = must(
    createAgentPluginPayload([
      { path: "skills/beta/SKILL.md", mode: 0o644, bytes: encoder.encode("beta\n") },
      { path: "scripts/check.sh", mode: 0o755, bytes: encoder.encode("#!/bin/sh\nexit 0\n") },
    ])
  );
  const releaseInput = must(
    createAgentPluginReleaseInput(releaseInputBody(alphaPayload, betaPayload))
  );
  const alphaRelease = must(
    createAgentPluginRelease({
      releaseInput,
      pluginId: "alpha",
      source: SOURCE,
      payload: alphaPayload,
    })
  );
  const betaRelease = must(
    createAgentPluginRelease({
      releaseInput,
      pluginId: "beta",
      source: SOURCE,
      payload: betaPayload,
    })
  );
  const releaseSet = must(
    createAgentPluginReleaseSet({
      releaseInput,
      releases: [betaRelease, alphaRelease],
    })
  );
  return { releaseInput, alphaPayload, betaPayload, alphaRelease, betaRelease, releaseSet };
}

export function releaseInputBody(
  alphaPayload: AgentPluginPayload,
  betaPayload: AgentPluginPayload
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    contentAuthority: "personal-rawr-hq",
    members: [
      member("alpha", alphaPayload, "vendor-alpha", "curation-alpha"),
      member("beta", betaPayload, "vendor-beta", "curation-beta"),
    ],
    ownershipClaims: [
      ...skillClaims("alpha", alphaPayload),
      { kind: "alias", identity: "a", ownerPluginId: "alpha" },
      { kind: "provider-identity", identity: "codex:alpha", ownerPluginId: "alpha" },
      { kind: "destination", identity: "exports/alpha", ownerPluginId: "alpha" },
      ...skillClaims("beta", betaPayload),
      { kind: "alias", identity: "b", ownerPluginId: "beta" },
      { kind: "provider-identity", identity: "claude:beta", ownerPluginId: "beta" },
      { kind: "destination", identity: "exports/beta", ownerPluginId: "beta" },
    ],
    locks: [binding("vendor-lock", "vendor-lock-v1", "lock\n")],
    qualityPolicies: [binding("quality-policy", "quality-v1", "quality\n")],
  };
}

function skillClaims(
  pluginId: string,
  payload: AgentPluginPayload
): readonly Record<string, unknown>[] {
  return payload.manifest
    .filter((entry) => /^skills\/[^/]+\/SKILL\.md$/u.test(entry.path))
    .map((_, index) => ({
      kind: "skill",
      identity: `${pluginId}-skill${index === 0 ? "" : `-${index + 1}`}`,
      ownerPluginId: pluginId,
    }));
}

export function member(
  pluginId: string,
  payload: AgentPluginPayload,
  vendorId = `vendor-${pluginId}`,
  curationId = `curation-${pluginId}`
): Record<string, unknown> {
  return {
    kind: "agent-plugin",
    pluginId,
    skillInventory: payload.manifest
      .filter((entry) => /^skills\/[^/]+\/SKILL\.md$/u.test(entry.path))
      .map((entry, index) => ({
        identity: `${pluginId}-skill${index === 0 ? "" : `-${index + 1}`}`,
        manifestPath: entry.path,
      })),
    payload: {
      protocolVersion: payload.protocolVersion,
      manifest: payload.manifest,
      payloadDigest: payload.payloadDigest,
    },
    vendor: [binding(vendorId, "vendor-v1", `${vendorId}\n`)],
    curation: [binding(curationId, "curation-v1", `${curationId}\n`)],
  };
}

export function binding(id: string, protocol: string, value: string): Record<string, unknown> {
  return { id, protocol, contentDigest: contentDigest(encoder.encode(value)) };
}

export function must<T, E>(result: ReleaseResult<T, E>): T {
  if (!result.ok) throw new Error(`Expected success: ${JSON.stringify(result.issues)}`);
  return result.value;
}

export function wire(bytes: Uint8Array): Record<string, any> {
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, any>;
}
