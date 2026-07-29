import { expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { copyTree } from "../scripts/install-local-codex-pack.ts";

test("rejects an allowlisted target outside the checkout before replacing it", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "workstream-pack-installer-"));
  const repositoryRoot = join(fixtureRoot, "checkout");
  const sourceTree = join(repositoryRoot, "source");
  const sourceMarker = join(sourceTree, "marker.txt");
  const outsideTarget = join(fixtureRoot, "outside-target");
  const outsideMarker = join(outsideTarget, "marker.txt");

  mkdirSync(sourceTree, { recursive: true });
  mkdirSync(outsideTarget);
  writeFileSync(sourceMarker, "replacement");
  writeFileSync(outsideMarker, "external marker");

  try {
    expect(() =>
      copyTree(repositoryRoot, sourceTree, outsideTarget, new Set([resolve(outsideTarget)]), false)
    ).toThrow("refusing unowned projection target");
    expect(readFileSync(outsideMarker, "utf8")).toBe("external marker");
  } finally {
    unlinkSync(sourceMarker);
    rmdirSync(sourceTree);
    unlinkSync(outsideMarker);
    rmdirSync(outsideTarget);
    rmdirSync(repositoryRoot);
    rmdirSync(fixtureRoot);
  }
});

test("rejects a symlinked target path before replacing its external destination", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "workstream-pack-installer-"));
  const repositoryRoot = join(fixtureRoot, "checkout");
  const sourceTree = join(repositoryRoot, "source");
  const sourceMarker = join(sourceTree, "marker.txt");
  const externalRoot = join(fixtureRoot, "external");
  const externalSkills = join(externalRoot, "skills");
  const externalTarget = join(externalSkills, "workstream-runner");
  const externalMarker = join(externalTarget, "marker.txt");
  const aliasedParent = join(repositoryRoot, ".agents");
  const target = join(aliasedParent, "skills", "workstream-runner");

  mkdirSync(sourceTree, { recursive: true });
  mkdirSync(externalTarget, { recursive: true });
  writeFileSync(sourceMarker, "replacement");
  writeFileSync(externalMarker, "external marker");
  symlinkSync(externalRoot, aliasedParent, "dir");

  try {
    expect(() =>
      copyTree(repositoryRoot, sourceTree, target, new Set([resolve(target)]), false)
    ).toThrow("refusing aliased projection target");
    expect(readFileSync(externalMarker, "utf8")).toBe("external marker");
  } finally {
    unlinkSync(sourceMarker);
    rmdirSync(sourceTree);
    unlinkSync(aliasedParent);
    unlinkSync(externalMarker);
    rmdirSync(externalTarget);
    rmdirSync(externalSkills);
    rmdirSync(externalRoot);
    rmdirSync(repositoryRoot);
    rmdirSync(fixtureRoot);
  }
});
