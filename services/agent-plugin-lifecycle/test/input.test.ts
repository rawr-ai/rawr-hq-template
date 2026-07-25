import { describe, expect, it } from "vitest";

import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "../src/input";

describe("public lifecycle input parsing", () => {
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

  it.each([
    ["content authority", parseContentAuthority, "RAWR"],
    ["content authority length", parseContentAuthority, "a".repeat(513)],
    ["commit case", parseGitCommitId, "A".repeat(40)],
    ["commit length", parseGitCommitId, "a".repeat(39)],
    ["tree length", parseGitTreeId, "b".repeat(41)],
    ["plugin identity", parsePluginId, "StateMachine"],
    ["release path traversal", parseReleaseRelativePath, "../skills/SKILL.md"],
    ["release path normalization", parseReleaseRelativePath, "skills/e\u0301/SKILL.md"],
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
