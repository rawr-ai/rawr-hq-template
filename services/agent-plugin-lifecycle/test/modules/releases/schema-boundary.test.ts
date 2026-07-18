import { schema } from "@rawr/hq-sdk";
import { describe, expect, it } from "vitest";
import { Value } from "typebox/value";

import {
  BuildInputSchema,
  BuildResultSchema,
  CheckInputSchema,
  CheckResultSchema,
  RepositoryCheckInputSchema,
  RepositoryCheckResultSchema,
} from "../../../src/service/modules/releases/schemas";

const contentWorkspace = Object.freeze({
  locator: "/tmp/content-workspace",
  repositoryIdentity: "git:personal-rawr-hq",
  contentAuthority: "personal-rawr-hq",
  remoteName: "origin",
  remoteUrl: "git@example.invalid:rawr-hq.git",
  refName: "refs/heads/main",
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
  releaseInputPath: ".rawr/release-input.json",
  pluginRoot: "plugins/agent",
});
const releaseDigest = `rd1_${"c".repeat(64)}`;
const artifactDigest = `ad1_${"d".repeat(64)}`;
const releaseSetDigest = `rs1_${"e".repeat(64)}`;

describe("release procedure schema boundary", () => {
  it("admits only the two closed check/build mode envelopes", () => {
    expect(Value.Check(CheckInputSchema, {
      contentWorkspace,
      mode: { kind: "targeted", pluginId: "cognition" },
    })).toBe(true);
    expect(Value.Check(BuildInputSchema, {
      contentWorkspace,
      mode: { kind: "complete-set" },
    })).toBe(true);
    expect(Value.Check(BuildInputSchema, {
      contentWorkspace,
      mode: { kind: "complete-set" },
      failpoint: "not-public",
    })).toBe(false);
    expect(Value.Check(CheckInputSchema, {
      contentWorkspace,
      mode: { kind: "all" },
    })).toBe(false);
  });

  it("rejects non-canonical workspace and targeted-plugin authority at the callable boundary", async () => {
    const invalidWorkspaces = [
      { ...contentWorkspace, locator: "/" },
      { ...contentWorkspace, locator: "relative/content-workspace" },
      { ...contentWorkspace, locator: "/tmp/../content-workspace" },
      { ...contentWorkspace, locator: "/tmp//content-workspace" },
      { ...contentWorkspace, locator: "/tmp/content-workspace/" },
      { ...contentWorkspace, repositoryIdentity: "file:/tmp/rawr-hq" },
      { ...contentWorkspace, repositoryIdentity: "Git:personal-rawr-hq" },
      { ...contentWorkspace, repositoryIdentity: "git:personal/../rawr-hq" },
      { ...contentWorkspace, repositoryIdentity: `git:${"a".repeat(509)}` },
      { ...contentWorkspace, contentAuthority: "Personal-RAWR-HQ" },
      { ...contentWorkspace, contentAuthority: "personal rawr hq" },
      { ...contentWorkspace, contentAuthority: "a".repeat(513) },
      { ...contentWorkspace, remoteName: "--origin" },
      { ...contentWorkspace, remoteName: "o".repeat(129) },
      { ...contentWorkspace, remoteUrl: "https://example.invalid/rawr-hq.git\n" },
      { ...contentWorkspace, remoteUrl: "u".repeat(513) },
      { ...contentWorkspace, refName: "main" },
      { ...contentWorkspace, refName: "refs/heads/.hidden" },
      { ...contentWorkspace, refName: "refs/heads/release.lock" },
      { ...contentWorkspace, refName: "refs/heads/main..next" },
      { ...contentWorkspace, sourceCommit: "A".repeat(40) },
      { ...contentWorkspace, sourceCommit: "a".repeat(41) },
      { ...contentWorkspace, sourceTree: "b".repeat(63) },
      { ...contentWorkspace, releaseInputPath: "/.rawr/release-input.json" },
      { ...contentWorkspace, releaseInputPath: ".rawr/../release-input.json" },
      { ...contentWorkspace, releaseInputPath: "release:input.json" },
      { ...contentWorkspace, releaseInputPath: "cafe\u0301/release-input.json" },
      { ...contentWorkspace, pluginRoot: "plugins\\agents" },
      { ...contentWorkspace, pluginRoot: "plugins/agents/" },
      { ...contentWorkspace, pluginRoot: "\u{00e9}".repeat(513) },
    ];

    for (const invalid of invalidWorkspaces) {
      const request = { contentWorkspace: invalid, mode: { kind: "complete-set" } };
      expect(Value.Check(CheckInputSchema, request)).toBe(false);
      const validated = await schema(CheckInputSchema)["~standard"].validate(request);
      expect("issues" in validated).toBe(true);
    }

    for (const pluginId of ["Cognition", "cognition/tools", "a".repeat(513)]) {
      expect(Value.Check(CheckInputSchema, {
        contentWorkspace,
        mode: { kind: "targeted", pluginId },
      })).toBe(false);
    }

    expect(Value.Check(CheckInputSchema, {
      contentWorkspace: {
        ...contentWorkspace,
        sourceCommit: "a".repeat(64),
        sourceTree: "b".repeat(64),
        pluginRoot: "\u{00e9}".repeat(512),
      },
      mode: { kind: "targeted", pluginId: "cognition.state-machine" },
    })).toBe(true);
  });

  it("keeps read-only and mutating outcomes in closed discriminated unions", () => {
    expect(Value.Check(CheckResultSchema, {
      kind: "EligibleReport",
      mode: { kind: "complete-set" },
      candidate: { kind: "complete-set", releaseSetDigest },
      eligibilityBinding: "binding-v1",
    })).toBe(true);
    expect(Value.Check(BuildResultSchema, {
      kind: "ReadOnlyConverged",
      mode: { kind: "targeted", pluginId: "cognition" },
      ref: {
        kind: "release",
        releaseDigest,
        artifactDigest,
      },
    })).toBe(true);
    expect(Value.Check(BuildResultSchema, {
      kind: "RejectedBeforePublication",
      mode: { kind: "complete-set" },
      issues: [],
    })).toBe(false);
    expect(Value.Check(BuildResultSchema, {
      kind: "ReadOnlyConverged",
      mode: { kind: "complete-set" },
      ref: { kind: "complete-set", releaseSetDigest: "rs1_deadbeef" },
    })).toBe(false);
  });

  it("keeps staged and clean repository checks in closed nonoptional variants", () => {
    const stagedWorkspace = {
      locator: contentWorkspace.locator,
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      contentAuthority: contentWorkspace.contentAuthority,
      remoteName: contentWorkspace.remoteName,
      remoteUrl: contentWorkspace.remoteUrl,
      refName: contentWorkspace.refName,
      releaseInputPath: contentWorkspace.releaseInputPath,
      pluginRoot: contentWorkspace.pluginRoot,
    };
    expect(Value.Check(RepositoryCheckInputSchema, {
      kind: "staged",
      contentWorkspace: stagedWorkspace,
    })).toBe(true);
    expect(Value.Check(RepositoryCheckInputSchema, {
      kind: "clean",
      contentWorkspace,
    })).toBe(true);
    expect(Value.Check(RepositoryCheckInputSchema, {
      kind: "staged",
      contentWorkspace: { ...stagedWorkspace, sourceCommit: "a".repeat(40) },
    })).toBe(false);
    expect(Value.Check(RepositoryCheckInputSchema, {
      kind: "clean",
      contentWorkspace: stagedWorkspace,
    })).toBe(false);

    expect(Value.Check(RepositoryCheckResultSchema, {
      kind: "StagedRepositoryEligible",
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      refName: contentWorkspace.refName,
      headCommit: contentWorkspace.sourceCommit,
      headTree: contentWorkspace.sourceTree,
      stagedBinding: "staged-binding-v1",
    })).toBe(true);
    expect(Value.Check(RepositoryCheckResultSchema, {
      kind: "StagedRepositoryEligible",
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      refName: contentWorkspace.refName,
      headCommit: contentWorkspace.sourceCommit,
      headTree: contentWorkspace.sourceTree,
      stagedBinding: "staged-binding-v1",
      candidate: { kind: "complete-set", releaseSetDigest },
    })).toBe(false);
    expect(Value.Check(RepositoryCheckResultSchema, {
      kind: "CleanRepositoryEligible",
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      refName: contentWorkspace.refName,
      sourceCommit: contentWorkspace.sourceCommit,
      sourceTree: contentWorkspace.sourceTree,
      eligibilityBinding: "clean-binding-v1",
      stagedBinding: "forbidden",
    })).toBe(false);
    expect(Value.Check(RepositoryCheckResultSchema, {
      kind: "SourceChanged",
      mode: "clean",
      detail: "forbidden clean source-changed variant",
    })).toBe(false);
  });
});
