import {
  type AgentPluginPayload,
  type AgentPluginRelease,
  type AgentPluginReleaseInput,
  type AgentPluginReleaseSet,
  contentDigest,
  createAgentPluginPayload,
  createAgentPluginRelease,
  createAgentPluginReleaseInput,
  createAgentPluginReleaseSet,
  type ReleaseResult,
} from "../../../src/service/shared/release/index";

const encoder = new TextEncoder();
const SOURCE = Object.freeze({
  sourceRepository: "git:github.com/example/generated-content",
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
});

export interface PackagingArtifactFixture {
  readonly releaseInput: AgentPluginReleaseInput;
  readonly alphaRelease: AgentPluginRelease;
  readonly betaRelease: AgentPluginRelease;
  readonly releaseSet: AgentPluginReleaseSet;
}

export function packagingArtifactFixture(
  alphaText = "alpha\n",
  betaText = "beta\n"
): PackagingArtifactFixture {
  const alphaPayload = payload([
    ["skills/alpha/SKILL.md", 0o644, alphaText],
    ["scripts/alpha.sh", 0o755, "#!/bin/sh\nexit 0\n"],
  ]);
  const betaPayload = payload([
    ["agents/beta.md", 0o644, betaText],
    ["skills/beta/SKILL.md", 0o644, "beta skill\n"],
  ]);
  const releaseInput = must(
    createAgentPluginReleaseInput({
      schemaVersion: 1,
      contentAuthority: "generated-content",
      members: [
        member("alpha", alphaPayload, "alpha-skill"),
        member("beta", betaPayload, "beta-skill"),
      ],
      ownershipClaims: [
        { kind: "skill", identity: "alpha-skill", ownerPluginId: "alpha" },
        { kind: "skill", identity: "beta-skill", ownerPluginId: "beta" },
      ],
      locks: [binding("lock", "lock-v1", "lock\n")],
      qualityPolicies: [binding("quality", "quality-v1", "quality\n")],
    })
  );
  const alphaRelease = release(releaseInput, "alpha", alphaPayload);
  const betaRelease = release(releaseInput, "beta", betaPayload);
  const releaseSet = must(
    createAgentPluginReleaseSet({
      releaseInput,
      releases: [betaRelease, alphaRelease],
    })
  );
  return {
    releaseInput,
    alphaRelease,
    betaRelease,
    releaseSet,
  };
}

function payload(
  entries: readonly (readonly [string, 0o644 | 0o755, string])[]
): AgentPluginPayload {
  return must(
    createAgentPluginPayload(
      entries.map(([path, mode, value]) => ({
        path,
        mode,
        bytes: encoder.encode(value),
      }))
    )
  );
}

function member(
  pluginId: string,
  pluginPayload: AgentPluginPayload,
  skillIdentity: string
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

function release(
  releaseInput: AgentPluginReleaseInput,
  pluginId: string,
  pluginPayload: AgentPluginPayload
): AgentPluginRelease {
  return must(
    createAgentPluginRelease({
      releaseInput,
      pluginId,
      source: SOURCE,
      payload: pluginPayload,
    })
  );
}

function must<T, E>(result: ReleaseResult<T, E>): T {
  if (!result.ok)
    throw new Error(`Generated artifact fixture is invalid: ${JSON.stringify(result.issues)}`);
  return result.value;
}
