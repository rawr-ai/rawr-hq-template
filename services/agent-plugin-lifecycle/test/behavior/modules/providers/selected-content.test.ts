import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { parseOwnershipIdentity } from "../../../../src/service/model/policy/release-identity";
import {
  type SelectedContent,
  SelectedContentSchema,
} from "../../../../src/service/modules/providers/model/dto/selected-content";
import {
  marketplaceSourceMatches,
  verificationFiles,
} from "../../../../src/service/modules/providers/model/policy/native-state";
import {
  sameSelectedContent,
  validateSelectedContent,
} from "../../../../src/service/modules/providers/model/policy/selected-content";
import { member, selectedContent } from "../../../support/modules/providers/fixture";

describe("selected provider content", () => {
  it("derives one bounded full-payload verification set for each provider", () => {
    const selected = selectedContent();
    expect(validateSelectedContent(selected)).toEqual([]);
    expect(verificationFiles(selected.members[0]!, "codex")?.map((file) => file.path)).toEqual([
      ".claude-plugin/plugin.json",
      ".codex-plugin/plugin.json",
      "skills/cognition/SKILL.md",
      "skills/cognition/references/guide.md",
    ]);
    expect(verificationFiles(selected.members[0]!, "claude")?.map((file) => file.path)).toEqual([
      ".claude-plugin/plugin.json",
      ".codex-plugin/plugin.json",
      "skills/cognition/SKILL.md",
      "skills/cognition/references/guide.md",
    ]);
  });

  it("rejects duplicate ownership names before native inspection", () => {
    const cognition = member("cognition");
    const docs = member("docs");
    const invalid = Object.freeze({
      ...selectedContent(["cognition", "docs"]),
      members: Object.freeze([
        Object.freeze({ ...cognition, aliases: Object.freeze([ownershipIdentity("shared")]) }),
        Object.freeze({ ...docs, aliases: Object.freeze([ownershipIdentity("shared")]) }),
      ]),
    });
    expect(validateSelectedContent(invalid)).toContainEqual(
      expect.objectContaining({ code: "DesiredContentInvalid", pluginId: "docs" })
    );
  });

  it("accepts Codex Git observations without a ref only when the repository URL matches", () => {
    const desired = selectedContent().marketplace.source;
    if (desired.kind !== "git") throw new Error("Expected the Git marketplace fixture");
    expect(
      marketplaceSourceMatches(
        {
          identity: "rawr-hq",
          source: { kind: "git", repositoryUrl: desired.repositoryUrl, revision: null },
          installedRoot: "/tmp/codex-home/marketplaces/rawr-hq",
        },
        desired
      )
    ).toBe(true);
    expect(
      marketplaceSourceMatches(
        {
          identity: "rawr-hq",
          source: {
            kind: "git",
            repositoryUrl: "https://example.com/unrelated.git",
            revision: null,
          },
          installedRoot: "/tmp/codex-home/marketplaces/rawr-hq",
        },
        desired
      )
    ).toBe(false);
  });

  it("derives selection kind and release-set presence from one TypeBox union", () => {
    const complete = selectedContent();
    const targeted = selectedContent(["cognition"], complete.marketplace.source, "targeted");
    expect(Value.Check(SelectedContentSchema, complete)).toBe(true);
    expect(Value.Check(SelectedContentSchema, targeted)).toBe(true);
    expect(Value.Check(SelectedContentSchema, { ...complete, releaseSetDigest: null })).toBe(false);
    expect(
      Value.Check(SelectedContentSchema, {
        ...targeted,
        releaseSetDigest: complete.releaseSetDigest,
      })
    ).toBe(false);
  });

  it("rejects a Git marketplace revision that does not pin the selected commit", () => {
    const selected = selectedContent();
    if (selected.marketplace.source.kind !== "git") {
      throw new Error("Expected the Git marketplace fixture");
    }
    const mismatched = Object.freeze({
      ...selected,
      marketplace: Object.freeze({
        ...selected.marketplace,
        source: Object.freeze({
          ...selected.marketplace.source,
          revision: "f".repeat(40),
        }),
      }),
    });

    expect(Value.Check(SelectedContentSchema, mismatched)).toBe(true);
    expect(validateSelectedContent(mismatched)).toContainEqual(
      expect.objectContaining({ code: "DesiredContentInvalid" })
    );
  });

  it("keeps canonical member, alias, and manifest order in Provider policy", () => {
    const cognition = member("cognition");
    const docs = member("docs");
    const selected = selectedContent(["cognition", "docs"]);
    const candidates = [
      {
        ...selected,
        members: [docs, cognition],
      },
      {
        ...selectedContent(),
        members: [
          { ...cognition, aliases: [ownershipIdentity("zulu"), ownershipIdentity("alpha")] },
        ],
      },
      {
        ...selectedContent(),
        members: [{ ...cognition, manifest: [...cognition.manifest].reverse() }],
      },
    ];

    for (const candidate of candidates) {
      expect(Value.Check(SelectedContentSchema, candidate)).toBe(true);
      expect(validateSelectedContent(candidate)).toContainEqual(
        expect.objectContaining({ code: "DesiredContentInvalid" })
      );
    }
  });

  it("rejects duplicate member identities and manifest paths in Provider policy", () => {
    const cognition = member("cognition");
    const docs = member("docs");
    const firstManifestEntry = cognition.manifest[0];
    if (firstManifestEntry === undefined) throw new Error("Expected a selected manifest entry");

    const duplicateMember = {
      ...selectedContent(["cognition", "docs"]),
      members: [cognition, { ...docs, pluginId: cognition.pluginId }],
    };
    const duplicateManifestPath = {
      ...selectedContent(),
      members: [
        {
          ...cognition,
          manifest: [
            firstManifestEntry,
            {
              ...firstManifestEntry,
              byteLength: firstManifestEntry.byteLength + 1,
              contentDigest: `sha256_${"f".repeat(64)}`,
            },
            ...cognition.manifest.slice(1),
          ],
        },
      ],
    };

    for (const candidate of [duplicateMember, duplicateManifestPath]) {
      expect(Value.Check(SelectedContentSchema, candidate)).toBe(true);
      expect(validateSelectedContent(candidate)).toContainEqual(
        expect.objectContaining({ code: "DesiredContentInvalid" })
      );
    }
  });

  it("admits manifest path structure before Provider path policy", () => {
    const cognition = member("cognition");
    const firstManifestEntry = cognition.manifest[0];
    if (firstManifestEntry === undefined) throw new Error("Expected a selected manifest entry");
    const candidate = {
      ...selectedContent(),
      members: [
        {
          ...cognition,
          manifest: [{ ...firstManifestEntry, path: "cafe\u0301/skill.md" }],
        },
      ],
    };

    expect(Value.Check(SelectedContentSchema, candidate)).toBe(true);
    expect(validateSelectedContent(candidate)).toContainEqual(
      expect.objectContaining({
        code: "DesiredContentInvalid",
        detail: "Selected manifest paths must be canonical release-relative paths.",
      })
    );
  });

  it("compares canonical semantic fields independently of object key order", () => {
    const selected = selectedContent();
    if (selected.selectionKind !== "complete-set") {
      throw new Error("Expected the complete-set fixture");
    }
    const reordered: SelectedContent = Object.freeze({
      members: selected.members,
      marketplace: Object.freeze({
        source: selected.marketplace.source,
        identity: selected.marketplace.identity,
      }),
      releaseSetDigest: selected.releaseSetDigest,
      selectionKind: selected.selectionKind,
      releaseInputDigest: selected.releaseInputDigest,
      sourceTree: selected.sourceTree,
      sourceCommit: selected.sourceCommit,
      repositoryIdentity: selected.repositoryIdentity,
      contentAuthority: selected.contentAuthority,
    });
    expect(sameSelectedContent(selected, reordered)).toBe(true);
  });
});

function ownershipIdentity(value: string) {
  const parsed = parseOwnershipIdentity(value);
  if (!parsed.ok) throw new Error(`Invalid ownership identity fixture: ${value}`);
  return parsed.value;
}
