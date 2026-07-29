import type { AgentPluginPayload } from "../../../../src/service/model/dto/agent-plugin-payload";
import type { AgentPluginRelease } from "../../../../src/service/model/dto/agent-plugin-release";
import type { AgentPluginReleaseSet } from "../../../../src/service/model/dto/agent-plugin-release-set";
import type { AgentPluginReleaseInput } from "../../../../src/service/model/dto/release-input";
import type { ReleaseResult } from "../../../../src/service/model/dto/release-result";
import { createAgentPluginPayload } from "../../../../src/service/model/policy/agent-plugin-payload";
import { createAgentPluginRelease } from "../../../../src/service/model/policy/agent-plugin-release";
import { createAgentPluginReleaseSet } from "../../../../src/service/model/policy/agent-plugin-release-set";
import { contentDigest } from "../../../../src/service/model/policy/release-digest";
import { createAgentPluginReleaseInput } from "../../../../src/service/model/policy/release-input";

const encoder = new TextEncoder();
const SOURCE = Object.freeze({
  sourceRepository: "git:github.com/example/generated-content",
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
});

interface PackagingReleaseFixture {
  readonly releaseInput: AgentPluginReleaseInput;
  readonly alphaRelease: AgentPluginRelease;
  readonly betaRelease: AgentPluginRelease;
  readonly releaseSet: AgentPluginReleaseSet;
}

/**
 * Builds the complete two-member release set exercised by packaging behavior.
 *
 * The fixture crosses into `cowork-v1.test.ts`, keeping packaging tests on the
 * same admitted release and payload contracts as production policy.
 */
export function packagingReleaseFixture(
  alphaText = "alpha\n",
  betaText = "beta\n"
): PackagingReleaseFixture {
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
    throw new Error(`Generated release fixture is invalid: ${JSON.stringify(result.issues)}`);
  return result.value;
}
