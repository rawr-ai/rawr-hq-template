import {
  contentDigest,
  createAgentPluginPayload,
  createAgentPluginRelease,
  createAgentPluginReleaseInput,
  createAgentPluginReleaseSet,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type AgentPluginPayload,
  type AgentPluginRelease,
  type AgentPluginReleaseInput,
  type ReleaseResult,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "../../../src/service/shared/release/index";

const encoder = new TextEncoder();
const SOURCE = Object.freeze({
  sourceRepository: "git:example.invalid/generated-agent-plugin-content",
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
});

export interface ExportArtifactFixture {
  readonly alpha: VerifiedReleaseArtifactV1;
  readonly beta: VerifiedReleaseArtifactV1;
  readonly complete: Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }>;
}

export interface AlphaOnlyArtifactFixture {
  readonly alpha: VerifiedReleaseArtifactV1;
  readonly complete: Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }>;
}

export function exportArtifactFixture(
  alphaText = "alpha-v1\n",
  betaText = "beta-v1\n",
  alphaPrimaryPath = "skills/alpha/SKILL.md",
): ExportArtifactFixture {
  const alphaPayload = payload([
    [alphaPrimaryPath, 0o644, alphaText],
    ["scripts/check.sh", 0o755, "#!/bin/sh\nexit 0\n"],
  ]);
  const betaPayload = payload([
    ["agents/beta.md", 0o644, betaText],
    ["skills/beta/SKILL.md", 0o644, "beta-skill\n"],
  ]);
  const releaseInput = must(createAgentPluginReleaseInput({
    schemaVersion: 1,
    contentAuthority: "generated-export-fixture",
    members: [
      member("alpha", alphaPayload, "alpha-fixture"),
      member("beta", betaPayload, "beta-fixture"),
    ],
    ownershipClaims: [
      { kind: "skill", identity: "alpha-fixture", ownerPluginId: "alpha" },
      { kind: "skill", identity: "beta-fixture", ownerPluginId: "beta" },
    ],
    locks: [binding("fixture-lock", "fixture-lock-v1", "lock\n")],
    qualityPolicies: [binding("fixture-quality", "fixture-quality-v1", "quality\n")],
  }));
  const alphaRelease = release(releaseInput, "alpha", alphaPayload);
  const betaRelease = release(releaseInput, "beta", betaPayload);
  const releaseSet = must(createAgentPluginReleaseSet({
    releaseInput,
    releases: [betaRelease, alphaRelease],
  }));
  const alpha = snapshot(alphaRelease);
  const beta = snapshot(betaRelease);
  return Object.freeze({
    alpha,
    beta,
    complete: Object.freeze({
      kind: "complete-set",
      ref: createCompleteSetArtifactRef(releaseSet.releaseSetDigest),
      releaseSet,
      members: Object.freeze([alpha, beta]),
    }),
  });
}

export function alphaOnlyArtifactFixture(alphaText = "alpha-only\n"): AlphaOnlyArtifactFixture {
  const alphaPayload = payload([
    ["skills/alpha/SKILL.md", 0o644, alphaText],
    ["scripts/check.sh", 0o755, "#!/bin/sh\nexit 0\n"],
  ]);
  const releaseInput = must(createAgentPluginReleaseInput({
    schemaVersion: 1,
    contentAuthority: "generated-alpha-only-fixture",
    members: [member("alpha", alphaPayload, "alpha-only-fixture")],
    ownershipClaims: [{ kind: "skill", identity: "alpha-only-fixture", ownerPluginId: "alpha" }],
    locks: [binding("alpha-only-lock", "fixture-lock-v1", "lock\n")],
    qualityPolicies: [binding("alpha-only-quality", "fixture-quality-v1", "quality\n")],
  }));
  const alphaRelease = release(releaseInput, "alpha", alphaPayload);
  const releaseSet = must(createAgentPluginReleaseSet({ releaseInput, releases: [alphaRelease] }));
  const alpha = snapshot(alphaRelease);
  return Object.freeze({
    alpha,
    complete: Object.freeze({
      kind: "complete-set",
      ref: createCompleteSetArtifactRef(releaseSet.releaseSetDigest),
      releaseSet,
      members: Object.freeze([alpha]),
    }),
  });
}

function payload(entries: readonly (readonly [string, 0o644 | 0o755, string])[]): AgentPluginPayload {
  return must(createAgentPluginPayload(entries.map(([path, mode, value]) => ({
    path,
    mode,
    bytes: encoder.encode(value),
  }))));
}

function member(
  pluginId: string,
  pluginPayload: AgentPluginPayload,
  skillIdentity: string,
): Record<string, unknown> {
  return {
    kind: "agent-plugin",
    pluginId,
    skillInventory: pluginPayload.manifest
      .filter((entry) => /^skills\/[^/]+\/SKILL\.md$/u.test(entry.path))
      .map((entry) => ({ identity: skillIdentity, manifestPath: entry.path })),
    payload: {
      protocolVersion: pluginPayload.protocolVersion,
      manifest: pluginPayload.manifest,
      payloadDigest: pluginPayload.payloadDigest,
    },
    vendor: [binding(`vendor-${pluginId}`, "vendor-v1", `${pluginId}-vendor\n`)],
    curation: [binding(`curation-${pluginId}`, "curation-v1", `${pluginId}-curation\n`)],
  };
}

function binding(id: string, protocol: string, value: string): Record<string, unknown> {
  return { id, protocol, contentDigest: contentDigest(encoder.encode(value)) };
}

function release(releaseInput: AgentPluginReleaseInput, pluginId: string, pluginPayload: AgentPluginPayload): AgentPluginRelease {
  return must(createAgentPluginRelease({ releaseInput, pluginId, source: SOURCE, payload: pluginPayload }));
}

function snapshot(releaseValue: AgentPluginRelease): VerifiedReleaseArtifactV1 {
  return Object.freeze({
    kind: "release",
    ref: createReleaseArtifactRef(releaseValue.releaseDigest, releaseValue.artifactDigest),
    release: releaseValue,
    files: Object.freeze(releaseValue.artifactBody.payloadEntries.map((entry) => Object.freeze({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    }))),
  });
}

function must<T, E>(result: ReleaseResult<T, E>): T {
  if (!result.ok) throw new Error(`Generated export fixture is invalid: ${JSON.stringify(result.issues)}`);
  return result.value;
}
