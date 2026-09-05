import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { addProjectConfiguration, readJson, type Tree, writeJson } from "@nx/devkit";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { describe, expect, it, vi } from "vitest";
import createCliCommand from "../../src/generators/cli-command";

const root = "plugins/cli/topics/foundation";
const index = `import { defineCliTopicPlugin } from "@habitat-ai/sdk/plugins/cli";
import { services } from "./services.js";
export const createPlugin = defineCliTopicPlugin.factory()({
  capability: "foundation", services, commands: [],
});
`;

function fixture(): Tree {
  const tree = createTreeWithEmptyWorkspace();
  writeJson(tree, "package.json", { name: "habitat-workspace", private: true });
  addProjectConfiguration(tree, "@habitat-ai/cli", { root: "apps/habitat" });
  tree.write(
    "apps/habitat/habitat.toml",
    `ownerProject = "@habitat-ai/cli"
blueprint = "app"
blueprintVersion = 2
[roots]
project = "apps/habitat"
`
  );
  addProjectConfiguration(tree, "@habitat-ai/plugin-foundation", { root });
  writeJson(tree, `${root}/package.json`, { name: "@habitat-ai/plugin-foundation", private: true });
  tree.write(
    `${root}/habitat.toml`,
    `ownerProject = "@habitat-ai/plugin-foundation"
blueprint = "plugin-cli-topic"
blueprintVersion = 1
[roots]
project = "${root}"
`
  );
  tree.write(`${root}/src/index.ts`, index);
  tree.write(`${root}/src/services.ts`, "export const services = {};");
  return tree;
}

function snapshot(tree: Tree) {
  return tree.listChanges().map((change) => [change.path, change.type, change.content?.toString()]);
}

describe("official CLI command generator", () => {
  it("preserves established test workflows and dependency ranges", () => {
    const tree = fixture();
    writeJson(tree, `${root}/package.json`, {
      name: "@habitat-ai/plugin-foundation",
      scripts: { test: "vitest run --project foundation" },
      devDependencies: { vitest: "^4.1.10", effect: "^4.0.0-beta.101", "bun-types": "^1.3.14" },
    });
    createCliCommand(tree, { topic: "foundation", name: "echo" });
    expect(readJson(tree, `${root}/package.json`)).toMatchObject({
      scripts: {
        test: "vitest run --project foundation",
        "test:cli-commands": "vitest run test/commands",
      },
      devDependencies: { effect: "^4.0.0-beta.101", "bun-types": "^1.3.14" },
    });
    expect(tree.read(`${root}/test/commands/echo.test.ts`, "utf8")).toContain('from "vitest"');
  });
  it("emits a compilable command and an executable native Effect behavior test", async () => {
    const tree = fixture();
    createCliCommand(tree, { topic: "foundation", name: "echo" });
    const destination = await mkdtemp(path.join(tmpdir(), "habitat-command-generator-"));
    try {
      const workspace = path.resolve(import.meta.dirname, "../../../..");
      await symlink(path.join(workspace, "node_modules"), path.join(destination, "node_modules"));
      for (const name of ["src/commands/echo.ts", "test/commands/echo.test.ts"]) {
        await mkdir(path.dirname(path.join(destination, name)), { recursive: true });
        await writeFile(path.join(destination, name), tree.read(`${root}/${name}`, "utf8")!);
      }
      await writeFile(path.join(destination, "package.json"), '{"type":"module"}');
      const compilation = spawnSync(
        "bun",
        [
          path.join(workspace, "node_modules/typescript/bin/tsc"),
          "--noEmit",
          "--module",
          "nodenext",
          "--moduleResolution",
          "nodenext",
          "--target",
          "es2022",
          "--types",
          "bun-types",
          "--skipLibCheck",
          "src/commands/echo.ts",
          "test/commands/echo.test.ts",
        ],
        { cwd: destination, encoding: "utf8" }
      );
      expect(compilation.status, compilation.stdout + compilation.stderr).toBe(0);
      execFileSync("bun", ["test", "test/commands/echo.test.ts"], {
        cwd: destination,
        stdio: "pipe",
      });
    } finally {
      await rm(destination, { recursive: true, force: true });
    }
  }, 30_000);

  it.each([
    "resolveCommand",
    "resolveCommand,",
  ])("preserves existing membership with %s", (members) => {
    const tree = fixture();
    tree.write(
      `${root}/src/index.ts`,
      'import { resolveCommand } from "./commands/resolve.js";\n' +
        index.replace("commands: []", `commands: [${members}]`)
    );
    createCliCommand(tree, { topic: "foundation", name: "echo" });
    expect(tree.read(`${root}/src/index.ts`, "utf8")).toContain("resolveCommand, echoCommand");
  });

  it("stages a real public command, test and explicit registration, then converges", () => {
    const tree = fixture();
    const services = tree.read(`${root}/src/services.ts`, "utf8");
    const project = tree.read(`${root}/project.json`, "utf8");
    expect(createCliCommand(tree, { topic: "foundation", name: "echo" })).toBeUndefined();
    expect(tree.read(`${root}/src/commands/echo.ts`, "utf8")).toContain('id: "foundation:echo"');
    expect(tree.read(`${root}/src/commands/echo.ts`, "utf8")).toContain("Args.string");
    expect(tree.read(`${root}/test/commands/echo.test.ts`, "utf8")).toContain("Effect.runPromise");
    expect(tree.read(`${root}/src/index.ts`, "utf8")).toContain("commands: [echoCommand]");
    expect(tree.read(`${root}/src/services.ts`, "utf8")).toBe(services);
    expect(tree.read(`${root}/project.json`, "utf8")).toBe(project);
    const before = snapshot(tree);
    expect(createCliCommand(tree, { topic: "foundation", name: "echo" })).toBeUndefined();
    expect(snapshot(tree)).toEqual(before);
    expect(tree.exists("apps/habitat/oclif.manifest.json")).toBe(false);
  });

  it.each([
    'import echoCommand from "./other.js";',
    'import * as echoCommand from "./other.js";',
    'import echoCommand = require("./other.cjs");',
    'import { other as echoCommand } from "./other.js";',
    "const { outer: [, { value: echoCommand }] } = source;",
    "const { ...echoCommand } = source;",
    "const [...echoCommand] = source;",
    "function echoCommand() {}",
    "export default function echoCommand() {}",
    "class echoCommand {}",
    "export default class echoCommand {}",
    "enum echoCommand { Value }",
    "namespace echoCommand { export const value = 1; }",
    "if (true) { var echoCommand; }",
    "for (var echoCommand of []) {}",
    "using echoCommand = disposable;",
  ])("refuses an existing module binding without writes: %s", (declaration) => {
    const tree = fixture();
    tree.write(`${root}/src/index.ts`, `${declaration}\n${index}`);
    const before = snapshot(tree);
    const write = vi.spyOn(tree, "write");
    try {
      expect(() => createCliCommand(tree, { topic: "foundation", name: "echo" })).toThrow(
        "collides with an existing topic declaration"
      );
      expect(write).not.toHaveBeenCalled();
      expect(snapshot(tree)).toEqual(before);
    } finally {
      write.mockRestore();
    }
  });

  it("does not confuse nested lexical bindings with module bindings", () => {
    const tree = fixture();
    tree.write(
      `${root}/src/index.ts`,
      `function helper() { const echoCommand = 1; return echoCommand; }
const callback = (echoCommand: unknown) => echoCommand;
const Named = class echoCommand {};
for (let echoCommand of []) {}
{ let echoCommand; }
namespace Other { export const echoCommand = 1; }
${index}`
    );
    createCliCommand(tree, { topic: "foundation", name: "echo" });
    expect(tree.read(`${root}/src/index.ts`, "utf8")).toContain("commands: [echoCommand]");
  });

  it("does not let an exact registered import exempt a second colliding binding", () => {
    const tree = fixture();
    createCliCommand(tree, { topic: "foundation", name: "echo" });
    tree.write(
      `${root}/src/index.ts`,
      `${tree.read(`${root}/src/index.ts`, "utf8")}\nfunction echoCommand() {}\n`
    );
    const before = snapshot(tree);
    expect(() => createCliCommand(tree, { topic: "foundation", name: "echo" })).toThrow(
      "collides with an existing topic declaration"
    );
    expect(snapshot(tree)).toEqual(before);
  });

  it.each([
    "...overrides",
    "[key]: []",
  ])("refuses later membership replacement %s without writes", (replacement) => {
    const tree = fixture();
    tree.write(
      `${root}/src/index.ts`,
      `const overrides: Record<string, unknown> = { commands: [] };
const key = "commands";
${index.replace("commands: []", `commands: [], ${replacement}`)}`
    );
    const before = snapshot(tree);
    const write = vi.spyOn(tree, "write");
    try {
      expect(() => createCliCommand(tree, { topic: "foundation", name: "echo" })).toThrow(
        "must not overwrite command membership"
      );
      expect(write).not.toHaveBeenCalled();
      expect(snapshot(tree)).toEqual(before);
    } finally {
      write.mockRestore();
    }
  });

  it.each([
    '"commands"',
    "'commands'",
    '["commands"]',
  ])("accepts literal membership %s after an earlier spread and converges", (property) => {
    const tree = fixture();
    tree.write(
      `${root}/src/index.ts`,
      "const overrides: Record<string, unknown> = { commands: [] };\n" +
        index.replace("commands: []", `...overrides, ${property}: []`)
    );
    createCliCommand(tree, { topic: "foundation", name: "echo" });
    expect(tree.read(`${root}/src/index.ts`, "utf8")).toContain(`${property}: [echoCommand]`);
    const before = snapshot(tree);
    createCliCommand(tree, { topic: "foundation", name: "echo" });
    expect(snapshot(tree)).toEqual(before);
  });

  it.each([
    [
      'import { createOclifCommand as nativeCommand } from "@habitat-ai/sdk/plugins/cli/oclif";',
      "nativeCommand",
    ],
    ['import * as native from "@habitat-ai/sdk/plugins/cli/oclif";', "native.createOclifCommand"],
    ['import { defineCommand as command } from "@habitat-ai/sdk/plugins/cli/effect";', "command"],
  ])("refuses an actual aliased SDK command ID from %s", (imports, callee) => {
    const tree = fixture();
    tree.write(
      `${root}/src/commands/other.ts`,
      `${imports}\nexport const other = ${callee}({ "id": "foundation:echo" });\n`
    );
    const before = snapshot(tree);
    const write = vi.spyOn(tree, "write");
    try {
      expect(() => createCliCommand(tree, { topic: "foundation", name: "echo" })).toThrow(
        "Command ID 'foundation:echo' already exists"
      );
      expect(write).not.toHaveBeenCalled();
      expect(snapshot(tree)).toEqual(before);
    } finally {
      write.mockRestore();
    }
  });

  it("does not treat payload IDs or non-SDK factories as command identities", () => {
    const tree = fixture();
    tree.write(
      `${root}/src/commands/other.ts`,
      `import { createOclifCommand } from "@habitat-ai/sdk/plugins/cli/oclif";
import { defineCommand } from "./domain-factory.js";
export const example = { id: "foundation:echo" };
export const domain = defineCommand({ id: "foundation:echo" });
export const other = createOclifCommand({
  id: "foundation:other",
  input: { id: "foundation:echo" },
});
`
    );
    createCliCommand(tree, { topic: "foundation", name: "echo" });
    expect(tree.read(`${root}/src/index.ts`, "utf8")).toContain("commands: [echoCommand]");
  });

  it.each([
    '{ id: "foundation:echo", ...metadata }',
    '{ id: "foundation:other", [key]: "foundation:echo" }',
    "{ id: selectedId }",
    "metadata",
  ])("refuses unresolved SDK command identity %s before writes", (metadata) => {
    const tree = fixture();
    tree.write(
      `${root}/src/commands/other.ts`,
      `import { createOclifCommand } from "@habitat-ai/sdk/plugins/cli/oclif";
const metadata = { description: "Other" };
export const other = createOclifCommand(${metadata});
`
    );
    const before = snapshot(tree);
    const write = vi.spyOn(tree, "write");
    try {
      expect(() => createCliCommand(tree, { topic: "foundation", name: "echo" })).toThrow(
        "Cannot qualify an existing command ID"
      );
      expect(write).not.toHaveBeenCalled();
      expect(snapshot(tree)).toEqual(before);
    } finally {
      write.mockRestore();
    }
  });

  it("accepts an explicit final command ID after earlier metadata", () => {
    const tree = fixture();
    tree.write(
      `${root}/src/commands/other.ts`,
      `import { createOclifCommand } from "@habitat-ai/sdk/plugins/cli/oclif";
export const other = createOclifCommand({ ...metadata, id: "foundation:other" });
`
    );
    createCliCommand(tree, { topic: "foundation", name: "echo" });
    expect(tree.read(`${root}/src/index.ts`, "utf8")).toContain("commands: [echoCommand]");
  });

  it.each([
    "../escape",
    "Uppercase",
    "two words",
    "a/b",
  ])("refuses unsafe identity %s without mutation", (name) => {
    const tree = fixture();
    const before = snapshot(tree);
    expect(() => createCliCommand(tree, { topic: "foundation", name })).toThrow();
    expect(snapshot(tree)).toEqual(before);
  });

  it("refuses foreign roots, mismatched owners and divergent files before writes", () => {
    for (const corrupt of [
      (tree: Tree) => writeJson(tree, "package.json", { name: "rawr", private: true }),
      (tree: Tree) => writeJson(tree, `${root}/package.json`, { name: "@foreign/topic" }),
      (tree: Tree) =>
        tree.write("apps/habitat/habitat.toml", 'blueprint = "app"\nblueprintVersion = 1'),
      (tree: Tree) => tree.write(`${root}/src/commands/echo.ts`, "divergent"),
      (tree: Tree) =>
        tree.write(`${root}/src/index.ts`, index.replace("commands: []", "commands: [...other]")),
    ]) {
      const tree = fixture();
      corrupt(tree);
      const before = snapshot(tree);
      expect(() => createCliCommand(tree, { topic: "foundation", name: "echo" })).toThrow();
      expect(snapshot(tree)).toEqual(before);
    }
  });

  it("refuses an existing command ID and inconsistent import registration", () => {
    for (const corrupt of [
      (tree: Tree) =>
        tree.write(
          `${root}/src/commands/other.ts`,
          'import { createOclifCommand } from "@habitat-ai/sdk/plugins/cli/oclif";\n' +
            'export const other = createOclifCommand({id: "foundation:echo"});'
        ),
      (tree: Tree) =>
        tree.write(
          `${root}/src/index.ts`,
          'import { echoCommand } from "./commands/echo.js";\n' + index
        ),
    ]) {
      const tree = fixture();
      corrupt(tree);
      const before = snapshot(tree);
      expect(() => createCliCommand(tree, { topic: "foundation", name: "echo" })).toThrow();
      expect(snapshot(tree)).toEqual(before);
    }
  });
});
