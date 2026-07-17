import {
  createAgentPluginPayload,
  createAgentPluginRelease,
  createAgentPluginReleaseInput,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  payloadEntryBytes,
  type AgentPluginRelease,
  type VerifiedReleaseArtifactV1,
} from "@rawr/agent-plugin-release";
import { describe, expect, it } from "vitest";

import {
  must,
  productFixture,
  releaseInputBody,
  SOURCE,
} from "../../../packages/agent-plugin-release/test/fixtures";
import {
  evaluateCapabilities,
  parseAdapterProtocol,
  renderCompleteProjection,
  renderTargetedProjection,
} from "../src/index";

describe("artifact-only provider projections", () => {
  it("is deterministic across member order, byte ownership, and same-protocol refactors", () => {
    const fixture = productFixture();
    const protocol = mustProtocol("codex-native-adapter@v1");
    const alpha = snapshot(fixture.alphaRelease);
    const beta = snapshot(fixture.betaRelease);
    const first = renderTargetedProjection("codex", protocol, [alpha, beta]);
    const reordered = renderTargetedProjection("codex", protocol, [copySnapshot(beta), copySnapshot(alpha)]);
    expect(first.ok).toBe(true);
    expect(reordered.ok).toBe(true);
    if (first.ok && reordered.ok) {
      expect(reordered.value.projectionDigest).toBe(first.value.projectionDigest);
      expect(reordered.value.members.map((member) => member.pluginId)).toEqual(["alpha", "beta"]);
      expect(first.value.members[0]?.visible.skills).toEqual(["alpha"]);
      expect(first.value.artifactAuthority).toEqual({
        protocol: "agent-plugin-artifact-authority@v1",
        contentAuthority: fixture.releaseInput.body.contentAuthority,
        sourceCommit: fixture.alphaRelease.artifactBody.releaseBody.sourceCommit,
      });
      expect(first.value.members[0]?.providerSourceIdentity).toBe(fixture.releaseInput.body.contentAuthority);
    }
  });

  it("rejects mixed content authority and source commits before a projection can exist", () => {
    const fixture = productFixture();
    const otherAuthorityBody = releaseInputBody(fixture.alphaPayload, fixture.betaPayload);
    otherAuthorityBody.contentAuthority = "other-content-authority";
    const otherAuthorityInput = must(createAgentPluginReleaseInput(otherAuthorityBody));
    const otherAuthorityBeta = must(createAgentPluginRelease({
      releaseInput: otherAuthorityInput,
      pluginId: "beta",
      source: SOURCE,
      payload: fixture.betaPayload,
    }));
    const otherCommitBeta = must(createAgentPluginRelease({
      releaseInput: fixture.releaseInput,
      pluginId: "beta",
      source: { ...SOURCE, sourceCommit: "c".repeat(40) },
      payload: fixture.betaPayload,
    }));
    const protocol = mustProtocol("codex-native-adapter@v1");

    expect(renderTargetedProjection("codex", protocol, [
      snapshot(fixture.alphaRelease),
      snapshot(otherAuthorityBeta),
    ]).ok).toBe(false);
    expect(renderTargetedProjection("codex", protocol, [
      snapshot(fixture.alphaRelease),
      snapshot(otherCommitBeta),
    ]).ok).toBe(false);
  });

  it("rejects duplicate native exposure claims across distinct curated members", () => {
    const alphaPayload = must(createAgentPluginPayload([
      { path: "skills/shared/SKILL.md", mode: 0o644, bytes: new TextEncoder().encode("alpha\n") },
    ]));
    const betaPayload = must(createAgentPluginPayload([
      { path: "skills/shared/SKILL.md", mode: 0o644, bytes: new TextEncoder().encode("beta\n") },
    ]));
    const releaseInput = must(createAgentPluginReleaseInput(releaseInputBody(alphaPayload, betaPayload)));
    const alpha = must(createAgentPluginRelease({ releaseInput, pluginId: "alpha", source: SOURCE, payload: alphaPayload }));
    const beta = must(createAgentPluginRelease({ releaseInput, pluginId: "beta", source: SOURCE, payload: betaPayload }));

    const result = renderTargetedProjection("codex", mustProtocol("codex-native-adapter@v1"), [
      snapshot(alpha),
      snapshot(beta),
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((entry) => entry.code === "DUPLICATE_MEMBER" && entry.actual === "shared")).toBe(true);
    }
  });

  it("binds provider, renderer protocol, adapter protocol, capabilities, and provider-visible bytes", () => {
    const fixture = productFixture();
    const snapshotValue = snapshot(fixture.alphaRelease);
    const codexV1 = renderTargetedProjection("codex", mustProtocol("codex-native-adapter@v1"), [snapshotValue]);
    const codexV2 = renderTargetedProjection("codex", mustProtocol("codex-native-adapter@v2"), [snapshotValue]);
    const claudeV1 = renderTargetedProjection("claude", mustProtocol("claude-native-adapter@v1"), [snapshotValue]);
    expect(codexV1.ok && codexV2.ok && claudeV1.ok).toBe(true);
    if (codexV1.ok && codexV2.ok && claudeV1.ok) {
      expect(codexV1.value.projectionDigest).not.toBe(codexV2.value.projectionDigest);
      expect(codexV1.value.projectionDigest).not.toBe(claudeV1.value.projectionDigest);
      expect(codexV1.value.members[0]?.files.some((file) => file.path === ".codex-plugin/plugin.json")).toBe(true);
      expect(claudeV1.value.members[0]?.files.some((file) => file.path === ".claude-plugin/plugin.json")).toBe(true);
      expect(codexV1.value.capabilityProfile.required).toContain("visible-skill-inventory");
    }
  });

  it("renders a complete set and evaluates semantic capability predicates exactly", () => {
    const fixture = productFixture();
    const protocol = mustProtocol("codex-native-adapter@v1");
    const complete = renderCompleteProjection("codex", protocol, {
      kind: "complete-set",
      ref: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
      releaseSet: fixture.releaseSet,
      members: [snapshot(fixture.betaRelease), snapshot(fixture.alphaRelease)],
    });
    expect(complete.ok).toBe(true);
    if (!complete.ok) return;
    const compatible = evaluateCapabilities(complete.value.capabilityProfile, {
      provider: "codex",
      adapterProtocol: protocol,
      available: complete.value.capabilityProfile.required,
    });
    const missing = evaluateCapabilities(complete.value.capabilityProfile, {
      provider: "codex",
      adapterProtocol: protocol,
      available: ["native-plugin-install"],
    });
    expect(compatible).toEqual({ compatible: true, missing: [] });
    expect(missing.compatible).toBe(false);
    expect(missing.missing.length).toBeGreaterThan(0);
  });

  it("rejects the wrong artifact kind instead of falling back", () => {
    const fixture = productFixture();
    const result = renderCompleteProjection("codex", mustProtocol("codex-native-adapter@v1"), snapshot(fixture.alphaRelease));
    expect(result.ok).toBe(false);
  });
});

function snapshot(release: AgentPluginRelease): VerifiedReleaseArtifactV1 {
  return {
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: release.artifactBody.payloadEntries.map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    })),
  };
}

function copySnapshot(value: VerifiedReleaseArtifactV1): VerifiedReleaseArtifactV1 {
  return {
    ...value,
    files: value.files.map((file) => ({ ...file, bytes: new Uint8Array(file.bytes) })),
  };
}

function mustProtocol(value: string) {
  const parsed = parseAdapterProtocol(value);
  if (!parsed.ok) throw new Error("fixture protocol must parse");
  return parsed.value;
}
