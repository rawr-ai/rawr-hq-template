import type { Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type ContentAuthority,
  ContentAuthoritySchema,
  type GitCommitId,
  GitCommitIdSchema,
  type GitTreeId,
  GitTreeIdSchema,
  MAX_RELEASE_RELATIVE_PATH_BYTES,
  type OwnershipIdentity,
  OwnershipIdentitySchema,
  type PluginId,
  PluginIdSchema,
  type ReleaseRelativePath,
  ReleaseRelativePathSchema,
  type RepositoryIdentity,
  RepositoryIdentitySchema,
} from "../../src/service/model/dto/release-identity";
import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseOwnershipIdentity,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "../../src/service/model/policy/release-identity";

describe("release identity model", () => {
  it("derives all seven identity types from their TypeBox schemas", () => {
    expectTypeOf<ContentAuthority>().toEqualTypeOf<Static<typeof ContentAuthoritySchema>>();
    expectTypeOf<RepositoryIdentity>().toEqualTypeOf<Static<typeof RepositoryIdentitySchema>>();
    expectTypeOf<GitCommitId>().toEqualTypeOf<Static<typeof GitCommitIdSchema>>();
    expectTypeOf<GitTreeId>().toEqualTypeOf<Static<typeof GitTreeIdSchema>>();
    expectTypeOf<PluginId>().toEqualTypeOf<Static<typeof PluginIdSchema>>();
    expectTypeOf<OwnershipIdentity>().toEqualTypeOf<Static<typeof OwnershipIdentitySchema>>();
    expectTypeOf<ReleaseRelativePath>().toEqualTypeOf<Static<typeof ReleaseRelativePathSchema>>();
  });

  it("admits canonical values through the same schemas and parsers", () => {
    const cases = [
      [ContentAuthoritySchema, parseContentAuthority, "rawr-hq"],
      [RepositoryIdentitySchema, parseRepositoryIdentity, "git:github.com/rawr-ai/rawr-hq"],
      [GitCommitIdSchema, parseGitCommitId, "a".repeat(40)],
      [GitTreeIdSchema, parseGitTreeId, "b".repeat(64)],
      [PluginIdSchema, parsePluginId, "state-machine"],
      [OwnershipIdentitySchema, parseOwnershipIdentity, "provider:codex/cognition"],
      [ReleaseRelativePathSchema, parseReleaseRelativePath, "skills/cognition/SKILL.md"],
    ] as const;

    for (const [schema, parse, value] of cases) {
      expect(Value.Check(schema, value)).toBe(true);
      expect(parse(value)).toEqual({ ok: true, value });
    }
  });

  it("preserves caller paths and emits the owner-specific diagnostic for invalid strings", () => {
    const cases = [
      [
        parseContentAuthority,
        "RAWR",
        "INVALID_CONTENT_AUTHORITY",
        "Content authority must be canonical",
      ],
      [
        parseRepositoryIdentity,
        "file:/tmp/rawr-hq",
        "INVALID_REPOSITORY_IDENTITY",
        "Repository identity must be logical and path-safe",
      ],
      [parseGitCommitId, "A".repeat(40), "INVALID_GIT_OBJECT_ID", "Invalid Git object identity"],
      [parseGitTreeId, "b".repeat(39), "INVALID_GIT_OBJECT_ID", "Invalid Git object identity"],
      [parsePluginId, "StateMachine", "INVALID_PLUGIN_ID", "Invalid plugin identity"],
      [
        parseOwnershipIdentity,
        "../unsafe",
        "INVALID_OWNERSHIP_IDENTITY",
        "Invalid ownership identity",
      ],
      [
        parseReleaseRelativePath,
        "../skills/SKILL.md",
        "INVALID_RELATIVE_PATH",
        "Path must be a canonical POSIX relative path",
      ],
    ] as const;

    for (const [parse, value, code, message] of cases) {
      const path = `request.${code}`;
      expect(parse(value, path)).toEqual({
        ok: false,
        issues: [{ code, path, message }],
      });
    }
  });

  it("classifies non-string values before applying identity-specific policy", () => {
    for (const [path, parse] of [
      ["request.contentAuthority", parseContentAuthority],
      ["request.repositoryIdentity", parseRepositoryIdentity],
      ["request.sourceCommit", parseGitCommitId],
      ["request.sourceTree", parseGitTreeId],
      ["request.pluginId", parsePluginId],
      ["request.ownershipIdentity", parseOwnershipIdentity],
      ["request.relativePath", parseReleaseRelativePath],
    ] as const) {
      expect(parse(null, path)).toEqual({
        ok: false,
        issues: [{ code: "EXPECTED_STRING", path, message: "Value must be a string" }],
      });
    }
  });

  it("enforces the exact UTF-8 path bound and every canonical path exclusion", () => {
    const exactUtf8Path = "é".repeat(MAX_RELEASE_RELATIVE_PATH_BYTES / 2);
    expect(new TextEncoder().encode(exactUtf8Path)).toHaveLength(MAX_RELEASE_RELATIVE_PATH_BYTES);
    expect(parseReleaseRelativePath(exactUtf8Path)).toEqual({
      ok: true,
      value: exactUtf8Path,
    });

    for (const invalid of [
      `${exactUtf8Path}a`,
      "skills/../SKILL.md",
      "skills/e\u0301/SKILL.md",
      "skills\\cognition\\SKILL.md",
      "skills:cognition/SKILL.md",
      "skills/cognition/\u0000SKILL.md",
    ]) {
      expect(parseReleaseRelativePath(invalid, "request.path")).toEqual({
        ok: false,
        issues: [
          {
            code: "INVALID_RELATIVE_PATH",
            path: "request.path",
            message: "Path must be a canonical POSIX relative path",
          },
        ],
      });
    }
  });

  it("admits both lowercase Git object ID widths for commits and trees", () => {
    for (const parse of [parseGitCommitId, parseGitTreeId]) {
      for (const value of ["a".repeat(40), "b".repeat(64)]) {
        expect(parse(value)).toEqual({ ok: true, value });
      }
    }
  });
});
