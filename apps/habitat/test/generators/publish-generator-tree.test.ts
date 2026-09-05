import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FsTree } from "nx/src/generators/tree.js";
import { describe, expect, it } from "vitest";
import { publishGeneratorTree } from "../../src/generators/publish-generator-tree";

describe("native generator publication", () => {
  it("locks and publishes native changes before returning a frozen receipt", () => {
    const root = mkdtempSync(join(tmpdir(), "habitat-generator-publication-"));
    try {
      const tree = new FsTree(root, false);
      tree.write("source.ts", "export const value = 1;\n");
      const result = publishGeneratorTree(tree);
      expect(result).toEqual({ status: "created", paths: ["source.ts"] });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.paths)).toBe(true);
      expect(readFileSync(join(root, "source.ts"), "utf8")).toBe("export const value = 1;\n");
      expect(() => tree.write("late.ts", "late")).toThrow();
      expect(publishGeneratorTree(new FsTree(root, false))).toEqual({
        status: "converged",
        paths: [],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("locks a dry-run Tree without publishing any planned path", () => {
    const root = mkdtempSync(join(tmpdir(), "habitat-generator-dry-run-"));
    try {
      const tree = new FsTree(root, false);
      tree.write("source.ts", "planned");
      expect(publishGeneratorTree(tree, { dryRun: true })).toEqual({
        status: "dry-run",
        paths: ["source.ts"],
      });
      expect(existsSync(join(root, "source.ts"))).toBe(false);
      expect(() => tree.write("late.ts", "late")).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("propagates a native flush failure without accepting or rolling back its prefix", () => {
    const root = mkdtempSync(join(tmpdir(), "habitat-generator-flush-failure-"));
    try {
      const tree = new FsTree(root, false);
      tree.write("first.ts", "first");
      tree.write("blocked/second.ts", "second");
      writeFileSync(join(root, "blocked"), "filesystem changed after staging");
      expect(() => publishGeneratorTree(tree)).toThrow();
      expect(readFileSync(join(root, "first.ts"), "utf8")).toBe("first");
      expect(readFileSync(join(root, "blocked"), "utf8")).toBe("filesystem changed after staging");
      expect(() => tree.write("late.ts", "late")).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
