import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type Client,
  parseContentAuthority,
  parseCurrentMainRecordInput,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "../../../src/client";

describe("public lifecycle input parsing", () => {
  it("keeps runtime byte carriers precise on the in-process client", () => {
    type ReleaseRecordInput = Parameters<Client["releases"]["releaseInputRecord"]>[0];
    type ReleaseRecordResult = Awaited<ReturnType<Client["releases"]["releaseInputRecord"]>>;
    type ReleaseRefreshResult = Awaited<ReturnType<Client["releases"]["refreshReleaseInput"]>>;
    type CurrentMainInput = Parameters<Client["governance"]["currentMainRecord"]>[0];
    type CurrentMainResult = Awaited<ReturnType<Client["governance"]["currentMainRecord"]>>;

    expectTypeOf<
      Extract<ReleaseRecordInput, { kind: "validate-envelope" }>["bytes"]
    >().toEqualTypeOf<Uint8Array>();
    expectTypeOf<
      Extract<ReleaseRecordResult, { ok: true }>["value"]["bytes"]
    >().toEqualTypeOf<Uint8Array>();
    expectTypeOf<
      Extract<
        ReleaseRefreshResult,
        { kind: "ReleaseInputCandidateReady" | "ReleaseInputReadOnlyConverged" }
      >["bytes"]
    >().toEqualTypeOf<Uint8Array>();
    expectTypeOf<
      Extract<CurrentMainInput, { kind: "validate-record" }>["bytes"]
    >().toEqualTypeOf<Uint8Array>();
    expectTypeOf<
      Extract<CurrentMainResult, { ok: true }>["value"]["bytes"]
    >().toEqualTypeOf<Uint8Array>();
  });

  it("admits canonical command values", () => {
    expect(parseContentAuthority("rawr-hq")).toBe("rawr-hq");
    expect(parseGitCommitId("a".repeat(40))).toBe("a".repeat(40));
    expect(parseGitTreeId("b".repeat(64))).toBe("b".repeat(64));
    expect(parsePluginId("cognition")).toBe("cognition");
    expect(parseReleaseRelativePath("skills/state-machine-design/SKILL.md")).toBe(
      "skills/state-machine-design/SKILL.md"
    );
    expect(parseRepositoryIdentity("git:github.com/rawr-ai/rawr-hq")).toBe(
      "git:github.com/rawr-ai/rawr-hq"
    );
  });

  it("admits current-main inputs through their operation-specific policy", () => {
    const body = currentMainBodyFixture();
    expect(parseCurrentMainRecordInput({ kind: "encode-body", body })).toEqual({
      kind: "encode-body",
      body,
    });

    const bytes = new Uint8Array([123, 125, 10]);
    expect(parseCurrentMainRecordInput({ kind: "validate-record", bytes })).toEqual({
      kind: "validate-record",
      bytes,
    });
  });

  it("rejects current-main inputs outside runtime and cross-field policy", () => {
    expect(
      parseCurrentMainRecordInput({
        kind: "encode-body",
        body: { ...currentMainBodyFixture(), sourceRef: "refs/tags/a..b" },
      })
    ).toBeUndefined();
    expect(parseCurrentMainRecordInput({ kind: "validate-record", bytes: "{}\n" })).toBeUndefined();
  });

  it.each([
    ["content authority", parseContentAuthority, "RAWR"],
    ["content authority length", parseContentAuthority, "a".repeat(513)],
    ["commit case", parseGitCommitId, "A".repeat(40)],
    ["commit length", parseGitCommitId, "a".repeat(39)],
    ["tree length", parseGitTreeId, "b".repeat(41)],
    ["plugin identity", parsePluginId, "StateMachine"],
    ["release path traversal", parseReleaseRelativePath, "../skills/SKILL.md"],
    ["release path normalization", parseReleaseRelativePath, "skills/e\u0301/SKILL.md"],
    ["release path UTF-8 bound", parseReleaseRelativePath, "\u00e9".repeat(513)],
    ["repository path identity", parseRepositoryIdentity, "file:/tmp/rawr-hq"],
    ["repository traversal", parseRepositoryIdentity, "git:rawr/../rawr-hq"],
  ] as const)("rejects noncanonical %s", (_label, parse, value) => {
    expect(parse(value)).toBeUndefined();
  });

  it("rejects non-string command values at every public parser", () => {
    for (const parse of [
      parseContentAuthority,
      parseGitCommitId,
      parseGitTreeId,
      parsePluginId,
      parseReleaseRelativePath,
      parseRepositoryIdentity,
    ]) {
      expect(parse(null)).toBeUndefined();
      expect(parse(42)).toBeUndefined();
    }
  });
});

function currentMainBodyFixture() {
  return {
    schemaVersion: 3,
    channel: "current-main",
    contentAuthority: "rawr-hq",
    sourceRepositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
    sourceRepositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
    sourceRef: "refs/tags/release+candidate",
    contentCommit: "a".repeat(40),
    contentTree: "b".repeat(40),
    releaseInputDigest: `ri1_${"c".repeat(64)}`,
  };
}
