import { describe, expect, it } from "vitest";
import type { CanonicalChannelSelection } from "../../../src/service/model/dto/current-main-selection";
import { resolveCanonicalDesiredStates } from "../../../src/service/modules/providers/model/policy/canonical-desired-state";
import {
  createCompleteSetArtifactRef,
  parseReleaseSetDigest,
} from "../../../src/service/shared/release";
import { must } from "../../shared/release/fixtures";
import { type CompleteSetSnapshot, desiredStateFixture } from "./canonical-fixture";

describe("canonical desired-state resolution", () => {
  it("resolves the exact selected complete set in fixed claude then codex order", () => {
    const fixture = desiredStateFixture();

    const result = resolveCanonicalDesiredStates(fixture.selection, fixture.snapshot);

    expect(result.status).toBe("RESOLVED");
    if (result.status !== "RESOLVED") return;
    expect(result.desired.map((entry) => entry.projection.provider)).toEqual(["claude", "codex"]);
    expect(result.desired.map((entry) => entry.projection.projectionDigest)).toEqual(
      fixture.projections.map((projection) => projection.projectionDigest)
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
    [
      "content authority",
      (selection: CanonicalChannelSelection) => ({
        ...selection,
        contentAuthority: "other-content-authority",
      }),
    ],
    [
      "repository identity",
      (selection: CanonicalChannelSelection) => ({
        ...selection,
        sourceRepositoryIdentity: "git:github.com/example/other-rawr-hq",
      }),
    ],
    [
      "source commit",
      (selection: CanonicalChannelSelection) => ({
        ...selection,
        sourceCommit: "c".repeat(40),
      }),
    ],
    [
      "source tree",
      (selection: CanonicalChannelSelection) => ({
        ...selection,
        sourceTree: "d".repeat(40),
      }),
    ],
    [
      "release-input digest",
      (selection: CanonicalChannelSelection) => ({
        ...selection,
        releaseInputDigest: `ri1_${"e".repeat(64)}`,
      }),
    ],
    [
      "release-set digest",
      (selection: CanonicalChannelSelection) => ({
        ...selection,
        releaseSetDigest: `rs1_${"f".repeat(64)}`,
      }),
    ],
  ] satisfies ReadonlyArray<
    readonly [string, (selection: CanonicalChannelSelection) => CanonicalChannelSelection]
  >)("blocks a selected %s that differs from the verified artifact", (_label, mutate) => {
    const fixture = desiredStateFixture();

    const result = resolveCanonicalDesiredStates(mutate(fixture.selection), fixture.snapshot);

    expect(result.status).toBe("BLOCKED_SELECTION");
  });

  it("blocks an artifact ref that does not exactly name the selected complete set", () => {
    const fixture = desiredStateFixture();
    const otherDigest = must(parseReleaseSetDigest(`rs1_${"0".repeat(64)}`));
    const mismatchedSnapshot: CompleteSetSnapshot = Object.freeze({
      ...fixture.snapshot,
      ref: createCompleteSetArtifactRef(otherDigest),
    });

    const result = resolveCanonicalDesiredStates(fixture.selection, mismatchedSnapshot);

    expect(result.status).toBe("BLOCKED_SELECTION");
  });

  it.each([
    [
      "renderer protocol",
      (binding: CanonicalChannelSelection["projections"][0]) => ({
        ...binding,
        rendererProtocol: "rawr-provider-renderer/claude@v9",
      }),
    ],
    [
      "adapter protocol",
      (binding: CanonicalChannelSelection["projections"][0]) => ({
        ...binding,
        adapterProtocol: "claude-native-adapter@v9",
      }),
    ],
    [
      "capability profile",
      (binding: CanonicalChannelSelection["projections"][0]) => ({
        ...binding,
        capabilityProfileDigest: `cp1_${"0".repeat(64)}`,
      }),
    ],
    [
      "projection digest",
      (binding: CanonicalChannelSelection["projections"][0]) => ({
        ...binding,
        projectionDigest: `ap1_${"0".repeat(64)}`,
      }),
    ],
  ] satisfies ReadonlyArray<
    readonly [
      string,
      (
        binding: CanonicalChannelSelection["projections"][0]
      ) => CanonicalChannelSelection["projections"][0],
    ]
  >)("blocks a selected %s binding that differs from the rendered projection", (_label, mutate) => {
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
