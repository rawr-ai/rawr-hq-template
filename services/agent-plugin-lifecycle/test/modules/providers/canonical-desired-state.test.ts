import { describe, expect, it } from "vitest";

import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  parseReleaseSetDigest,
  payloadEntryBytes,
  type AgentPluginRelease,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "../../../src/service/shared/release";
import type {
  CanonicalChannelSelection,
} from "../../../src/service/modules/governance/model/dto/current-main";
import {
  resolveCanonicalDesiredStates,
} from "../../../src/service/modules/providers/model/policy/canonical-desired-state";
import {
  parseAdapterProtocol,
  renderCompleteProjection,
  type AdapterProtocol,
  type AgentProviderProjection,
} from "../../../src/service/modules/providers/model/policy/projection";
import { must, productFixture } from "../../shared/release/fixtures";

type CompleteSetSnapshot = Extract<VerifiedArtifactSnapshotV1, { kind: "complete-set" }>;

interface DesiredStateFixture {
  readonly snapshot: CompleteSetSnapshot;
  readonly selection: CanonicalChannelSelection;
  readonly projections: readonly [AgentProviderProjection, AgentProviderProjection];
}

describe("canonical desired-state resolution", () => {
  it("resolves the exact selected complete set in fixed claude then codex order", () => {
    const fixture = desiredStateFixture();

    const result = resolveCanonicalDesiredStates(fixture.selection, fixture.snapshot);

    expect(result.status).toBe("RESOLVED");
    if (result.status !== "RESOLVED") return;
    expect(result.desired.map((entry) => entry.projection.provider)).toEqual([
      "claude",
      "codex",
    ]);
    expect(result.desired.map((entry) => entry.projection.projectionDigest)).toEqual(
      fixture.projections.map((projection) => projection.projectionDigest),
    );
    expect(result.desired[0].selection).toBe(fixture.selection);
    expect(result.desired[1].selection).toBe(fixture.selection);
  });

  it("blocks a release artifact instead of resolving a partial desired state", () => {
    const fixture = desiredStateFixture();
    const release = fixture.snapshot.members[0];
    if (release === undefined) throw new Error("fixture must contain a release");

    const result = resolveCanonicalDesiredStates(fixture.selection, release);

    expect(result.status).toBe("BLOCKED_SELECTION");
  });

  it.each([
    ["content authority", (selection: CanonicalChannelSelection) => ({
      ...selection,
      contentAuthority: "other-content-authority",
    })],
    ["repository identity", (selection: CanonicalChannelSelection) => ({
      ...selection,
      sourceRepositoryIdentity: "git:github.com/example/other-rawr-hq",
    })],
    ["source commit", (selection: CanonicalChannelSelection) => ({
      ...selection,
      sourceCommit: "c".repeat(40),
    })],
    ["source tree", (selection: CanonicalChannelSelection) => ({
      ...selection,
      sourceTree: "d".repeat(40),
    })],
    ["release-input digest", (selection: CanonicalChannelSelection) => ({
      ...selection,
      releaseInputDigest: `ri1_${"e".repeat(64)}`,
    })],
    ["release-set digest", (selection: CanonicalChannelSelection) => ({
      ...selection,
      releaseSetDigest: `rs1_${"f".repeat(64)}`,
    })],
  ] satisfies ReadonlyArray<readonly [
    string,
    (selection: CanonicalChannelSelection) => CanonicalChannelSelection,
  ]>)("blocks a selected %s that differs from the verified artifact", (_label, mutate) => {
    const fixture = desiredStateFixture();

    const result = resolveCanonicalDesiredStates(
      mutate(fixture.selection),
      fixture.snapshot,
    );

    expect(result.status).toBe("BLOCKED_SELECTION");
  });

  it("blocks an artifact ref that does not exactly name the selected complete set", () => {
    const fixture = desiredStateFixture();
    const otherDigest = must(parseReleaseSetDigest(`rs1_${"0".repeat(64)}`));
    const mismatchedSnapshot: CompleteSetSnapshot = Object.freeze({
      ...fixture.snapshot,
      ref: createCompleteSetArtifactRef(otherDigest),
    });

    const result = resolveCanonicalDesiredStates(
      fixture.selection,
      mismatchedSnapshot,
    );

    expect(result.status).toBe("BLOCKED_SELECTION");
  });

  it.each([
    ["renderer protocol", (binding: CanonicalChannelSelection["projections"][0]) => ({
      ...binding,
      rendererProtocol: "rawr-provider-renderer/claude@v9",
    })],
    ["adapter protocol", (binding: CanonicalChannelSelection["projections"][0]) => ({
      ...binding,
      adapterProtocol: "claude-native-adapter@v9",
    })],
    ["capability profile", (binding: CanonicalChannelSelection["projections"][0]) => ({
      ...binding,
      capabilityProfileDigest: `cp1_${"0".repeat(64)}`,
    })],
    ["projection digest", (binding: CanonicalChannelSelection["projections"][0]) => ({
      ...binding,
      projectionDigest: `ap1_${"0".repeat(64)}`,
    })],
  ] satisfies ReadonlyArray<readonly [
    string,
    (binding: CanonicalChannelSelection["projections"][0]) => CanonicalChannelSelection["projections"][0],
  ]>)("blocks a selected %s binding that differs from the rendered projection", (_label, mutate) => {
    const fixture = desiredStateFixture();
    const projections: CanonicalChannelSelection["projections"] = [
      Object.freeze(mutate(fixture.selection.projections[0])),
      fixture.selection.projections[1],
    ];
    const selection: CanonicalChannelSelection = Object.freeze({
      ...fixture.selection,
      projections: Object.freeze(projections),
    });

    const result = resolveCanonicalDesiredStates(selection, fixture.snapshot);

    expect(result.status).toBe("BLOCKED_SELECTION");
  });

  it("blocks a mismatched Codex binding instead of accepting one verified provider", () => {
    const fixture = desiredStateFixture();
    const projections: CanonicalChannelSelection["projections"] = [
      fixture.selection.projections[0],
      Object.freeze({
        ...fixture.selection.projections[1],
        projectionDigest: `ap1_${"0".repeat(64)}`,
      }),
    ];
    const selection: CanonicalChannelSelection = Object.freeze({
      ...fixture.selection,
      projections: Object.freeze(projections),
    });

    const result = resolveCanonicalDesiredStates(selection, fixture.snapshot);

    expect(result.status).toBe("BLOCKED_SELECTION");
  });
});

function desiredStateFixture(): DesiredStateFixture {
  const product = productFixture();
  const snapshot: CompleteSetSnapshot = Object.freeze({
    kind: "complete-set",
    ref: createCompleteSetArtifactRef(product.releaseSet.releaseSetDigest),
    releaseSet: product.releaseSet,
    members: Object.freeze([
      releaseSnapshot(product.betaRelease),
      releaseSnapshot(product.alphaRelease),
    ]),
  });
  const claude = mustProjection(
    "claude",
    mustAdapterProtocol("claude-native-adapter@v1"),
    snapshot,
  );
  const codex = mustProjection(
    "codex",
    mustAdapterProtocol("codex-native-adapter@v1"),
    snapshot,
  );
  const body = product.releaseSet.body;
  const selectedProjections: CanonicalChannelSelection["projections"] = [
    Object.freeze({
      provider: "claude",
      projectionDigest: claude.projectionDigest,
      rendererProtocol: claude.rendererProtocol,
      adapterProtocol: claude.adapterProtocol,
      capabilityProfileDigest: claude.capabilityProfile.capabilityProfileDigest,
    }),
    Object.freeze({
      provider: "codex",
      projectionDigest: codex.projectionDigest,
      rendererProtocol: codex.rendererProtocol,
      adapterProtocol: codex.adapterProtocol,
      capabilityProfileDigest: codex.capabilityProfile.capabilityProfileDigest,
    }),
  ];
  const selection: CanonicalChannelSelection = Object.freeze({
    currentMainDigest: `cm2_${"a".repeat(64)}`,
    contentAuthority: body.contentAuthority,
    sourceRepositoryIdentity: body.sourceRepository,
    sourceCommit: body.sourceCommit,
    sourceTree: body.sourceTree,
    releaseInputDigest: body.releaseInputDigest,
    releaseSetDigest: product.releaseSet.releaseSetDigest,
    evaluationProfile: "provider-smoke@v1",
    projections: Object.freeze(selectedProjections),
  });
  const projections: DesiredStateFixture["projections"] = [claude, codex];
  return Object.freeze({
    snapshot,
    selection,
    projections: Object.freeze(projections),
  });
}

function mustProjection(
  provider: "claude" | "codex",
  adapterProtocol: AdapterProtocol,
  snapshot: CompleteSetSnapshot,
): AgentProviderProjection {
  const rendered = renderCompleteProjection(provider, adapterProtocol, snapshot);
  if (!rendered.ok) throw new Error("fixture projection must render");
  return rendered.value;
}

function mustAdapterProtocol(value: string): AdapterProtocol {
  const parsed = parseAdapterProtocol(value);
  if (!parsed.ok) throw new Error("fixture adapter protocol must parse");
  return parsed.value;
}

function releaseSnapshot(release: AgentPluginRelease): VerifiedReleaseArtifactV1 {
  return Object.freeze({
    kind: "release",
    ref: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
    release,
    files: Object.freeze(release.artifactBody.payloadEntries.map((entry) => Object.freeze({
      path: entry.path,
      mode: entry.mode,
      contentDigest: entry.contentDigest,
      bytes: payloadEntryBytes(entry),
    }))),
  });
}
