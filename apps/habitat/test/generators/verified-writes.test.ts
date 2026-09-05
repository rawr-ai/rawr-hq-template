import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { FsTree, flushChanges } from "nx/src/generators/tree";
import { describe, expect, it } from "vitest";
import { stageVerifiedWrites } from "../../src/generators/verified-writes";

describe("qualified native Nx staging", () => {
  it("stages an ordered complete plan, preserves unrelated work, and converges exactly", () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write("unrelated.txt", "preserved");
    tree.write("topic/index.ts", "before");
    const writes = [
      { path: "new.ts", contents: "new" },
      { path: "index.ts", contents: "after", before: "before" },
    ];
    expect(stageVerifiedWrites(tree, { root: "topic" }, writes)).toEqual({
      status: "staged",
      paths: ["topic/index.ts", "topic/new.ts"],
    });
    expect(tree.read("unrelated.txt", "utf8")).toBe("preserved");
    const before = tree.listChanges();
    expect(stageVerifiedWrites(tree, { root: "topic" }, writes).status).toBe("converged");
    expect(tree.listChanges()).toEqual(before);
  });

  it("refuses every divergent file or stale registration before staging any path", () => {
    for (const before of [undefined, "stale"]) {
      const tree = createTreeWithEmptyWorkspace();
      tree.write("topic/z.ts", "actual");
      const initial = tree.listChanges();
      expect(() =>
        stageVerifiedWrites(tree, { root: "topic" }, [
          { path: "a.ts", contents: "new" },
          { path: "z.ts", contents: "next", ...(before ? { before } : {}) },
        ])
      ).toThrow("divergent");
      expect(tree.listChanges()).toEqual(initial);
    }
  });

  it.each([
    "../escape.ts",
    "/escape.ts",
    "a\\b.ts",
    "C:/escape",
    "con.ts",
    "a.",
  ])("refuses unsafe relative output %s", (path) => {
    const tree = createTreeWithEmptyWorkspace();
    const before = tree.listChanges();
    expect(() => stageVerifiedWrites(tree, { root: "topic" }, [{ path, contents: "new" }])).toThrow(
      "portable relative path"
    );
    expect(tree.listChanges()).toEqual(before);
  });

  it.each([
    ["a.ts", "a.ts"],
    ["A.ts", "a.ts"],
    ["a", "a/b.ts"],
  ])("refuses duplicate or prefix-colliding plans %s / %s", (first, second) => {
    const tree = createTreeWithEmptyWorkspace();
    const before = tree.listChanges();
    expect(() =>
      stageVerifiedWrites(tree, { root: "topic" }, [
        { path: first, contents: "one" },
        { path: second, contents: "two" },
      ])
    ).toThrow();
    expect(tree.listChanges()).toEqual(before);
  });

  it("refuses file/directory and case-spelling collisions in the existing Tree", () => {
    for (const existing of ["topic/path", "topic/path/file.ts", "topic/PATH.ts"]) {
      const tree = createTreeWithEmptyWorkspace();
      tree.write(existing, "present");
      const before = tree.listChanges();
      const path = existing.endsWith("PATH.ts")
        ? "path.ts"
        : existing.endsWith("file.ts")
          ? "path"
          : "path/file.ts";
      expect(() =>
        stageVerifiedWrites(tree, { root: "topic" }, [{ path, contents: "new" }])
      ).toThrow();
      expect(tree.listChanges()).toEqual(before);
    }
  });

  it.skipIf(process.platform === "win32")("refuses symlink ancestors before staging", () => {
    const root = mkdtempSync(join(tmpdir(), "habitat-qualified-links-"));
    const outside = mkdtempSync(join(tmpdir(), "habitat-qualified-outside-"));
    try {
      symlinkSync(outside, join(root, "linked"), "dir");
      const tree = new FsTree(root, false);
      expect(() =>
        stageVerifiedWrites(tree, { root: "linked" }, [{ path: "new.ts", contents: "new" }])
      ).toThrow("unsafe existing path");
      expect(tree.listChanges()).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("native publication succeeds, while a later disk failure does not fabricate rollback", () => {
    const root = mkdtempSync(join(tmpdir(), "habitat-qualified-flush-"));
    try {
      const tree = new FsTree(root, false);
      stageVerifiedWrites(tree, { root: "" }, [
        { path: "a.txt", contents: "first" },
        { path: "blocked/b.txt", contents: "second" },
      ]);
      tree.lock();
      // Simulate a filesystem change after preflight, not an admitted partial result.
      writeFileSync(join(root, "blocked"), "changed after validation");
      expect(() => flushChanges(root, tree.listChanges())).toThrow();
      expect(readFileSync(join(root, "a.txt"), "utf8")).toBe("first");
      expect(readFileSync(join(root, "blocked"), "utf8")).toBe("changed after validation");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
