import type { Tree } from "@nx/devkit";
import { createTree } from "@nx/devkit/testing";
import { describe, expect, it, vi } from "vitest";
import createCliExtension from "../../src/generators/cli-extension";

const destination = "extensions/example";
const outputPaths = [
  ".gitignore",
  "README.md",
  "package.json",
  "src/commands.ts",
  "test/commands.test.mjs",
  "tsconfig.json",
];

function snapshot(tree: Tree) {
  return tree.listChanges().map((change) => ({
    path: change.path,
    type: change.type,
    contents: change.content?.toString(),
  }));
}

describe("native CLI extension generator", () => {
  it("stages the complete standalone package without an Nx workspace or callback", () => {
    const tree = createTree();
    const initialPaths = tree.listChanges().map(({ path }) => path);
    expect(createCliExtension(tree, { id: "example", destination })).toBeUndefined();
    expect(tree.listChanges().map(({ path }) => path)).toEqual([
      ...initialPaths,
      ...outputPaths.map((path) => `${destination}/${path}`),
    ]);
    const manifest = JSON.parse(tree.read(`${destination}/package.json`, "utf8") ?? "");
    expect(manifest).toMatchObject({
      name: "habitat-extension-example",
      type: "module",
      dependencies: { "@oclif/core": "4.13.3" },
      devDependencies: { "@types/node": "24.13.3", typescript: "5.9.3" },
      oclif: {
        commands: {
          strategy: "explicit",
          target: "./dist/commands.js",
          identifier: "COMMANDS",
        },
      },
    });
    expect(Object.keys(manifest.dependencies)).toEqual(["@oclif/core"]);
    expect(tree.exists("package.json")).toBe(false);
    expect(tree.exists("nx.json")).toBe(false);
    expect(tree.exists("project.json")).toBe(false);
    expect(tree.exists(`${destination}/project.json`)).toBe(false);
    expect(tree.exists(`${destination}/nx.json`)).toBe(false);
    expect(tree.exists(`${destination}/node_modules`)).toBe(false);
    expect(tree.exists(`${destination}/dist`)).toBe(false);
    expect(tree.read(`${destination}/src/commands.ts`, "utf8")).toContain(
      'export const COMMANDS = { "example:hello": Hello };'
    );
    expect(tree.read(`${destination}/test/commands.test.mjs`, "utf8")).toContain("spawnSync");
  });

  it("converges without Tree writes and preserves unrelated staged work", () => {
    const tree = createTree();
    tree.write("work-in-progress.txt", "unrelated\n");
    tree.write(`${destination}/notes.txt`, "keep this\n");
    createCliExtension(tree, { id: "example", destination });
    const before = snapshot(tree);
    const write = vi.spyOn(tree, "write");
    try {
      expect(createCliExtension(tree, { id: "example", destination })).toBeUndefined();
      expect(write).not.toHaveBeenCalled();
      expect(snapshot(tree)).toEqual(before);
      expect(tree.read("work-in-progress.txt", "utf8")).toBe("unrelated\n");
      expect(tree.read(`${destination}/notes.txt`, "utf8")).toBe("keep this\n");
    } finally {
      write.mockRestore();
    }
  });

  it("fills only missing exact output without rewriting matching files", () => {
    const tree = createTree();
    createCliExtension(tree, { id: "example", destination });
    const missingPath = `${destination}/src/commands.ts`;
    const contents = tree.read(missingPath, "utf8");
    tree.delete(missingPath);
    const write = vi.spyOn(tree, "write");
    try {
      createCliExtension(tree, { id: "example", destination });
      expect(write).toHaveBeenCalledTimes(1);
      expect(write.mock.calls[0][0]).toBe(missingPath);
      expect(tree.read(missingPath, "utf8")).toBe(contents);
    } finally {
      write.mockRestore();
    }
  });

  it.each(outputPaths)("refuses divergent %s before every write", (path) => {
    const tree = createTree();
    tree.write("work-in-progress.txt", "unrelated\n");
    tree.write(`${destination}/${path}`, "divergent\n");
    const before = snapshot(tree);
    const write = vi.spyOn(tree, "write");
    try {
      expect(() => createCliExtension(tree, { id: "example", destination })).toThrow(
        "divergent bytes"
      );
      expect(write).not.toHaveBeenCalled();
      expect(snapshot(tree)).toEqual(before);
    } finally {
      write.mockRestore();
    }
  });

  it.each([
    "Uppercase",
    "a/b",
    "../escape",
    "two words",
    "a-",
    "a".repeat(197),
  ])("refuses unsafe package/command identity %s without mutation", (id) => {
    const tree = createTree();
    const before = snapshot(tree);
    expect(() => createCliExtension(tree, { id, destination })).toThrow("safe kebab-case");
    expect(snapshot(tree)).toEqual(before);
  });

  it.each([
    "",
    "../escape",
    "/absolute",
    "C:/absolute",
    "nested\\directory",
    "con",
  ])("refuses an unsafe destination %s without mutation", (unsafeDestination) => {
    const tree = createTree();
    const before = snapshot(tree);
    expect(() =>
      createCliExtension(tree, { id: "example", destination: unsafeDestination })
    ).toThrow();
    expect(snapshot(tree)).toEqual(before);
  });

  it("keeps reserved identifiers out of generated filesystem names", () => {
    const tree = createTree();
    const initialPaths = tree.listChanges().map(({ path }) => path);
    createCliExtension(tree, { id: "con", destination });
    expect(tree.listChanges().map(({ path }) => path)).toEqual([
      ...initialPaths,
      ...outputPaths.map((path) => `${destination}/${path}`),
    ]);
    expect(tree.read(`${destination}/src/commands.ts`, "utf8")).toContain('"con:hello": Hello');
    expect(tree.read(`${destination}/package.json`, "utf8")).toContain("habitat-extension-con");
  });

  it("refuses file/directory conflicts without erasing existing content", () => {
    for (const conflict of ["src", "package.json/keep.txt"]) {
      const tree = createTree();
      tree.write(`${destination}/${conflict}`, "keep this\n");
      const before = snapshot(tree);
      expect(() => createCliExtension(tree, { id: "example", destination })).toThrow();
      expect(snapshot(tree)).toEqual(before);
    }
  });
});
