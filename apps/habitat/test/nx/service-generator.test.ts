import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { addProjectConfiguration, readJson, type Tree, writeJson } from "@nx/devkit";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { describe, expect, it } from "vitest";
import createService, {
  SERVICE_GENERATOR_DEPENDENCY_VERSIONS,
  type ServiceGeneratorOptions,
} from "../../src/generators/service";

const options = {
  name: "jobs-service",
  directory: "services/jobs",
  module: "work-items",
  operation: "list-items",
} as const satisfies ServiceGeneratorOptions;

const cliManifest = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8")
) as {
  readonly version: string;
  readonly dependencies: Readonly<Record<string, string>>;
};

const expectedFiles = [
  "AGENTS.md",
  "habitat.toml",
  "package.json",
  "project.json",
  "src/client.ts",
  "src/service/base.ts",
  "src/service/contract.ts",
  "src/service/impl.ts",
  "src/service/modules/work-items/AGENTS.md",
  "src/service/modules/work-items/contract/index.ts",
  "src/service/modules/work-items/contract/list-items.ts",
  "src/service/modules/work-items/module.ts",
  "src/service/modules/work-items/router.ts",
  "src/service/modules/work-items/router/list-items.ts",
  "src/service/router.ts",
  "tsconfig.build.json",
  "tsconfig.json",
] as const;

describe("Habitat service generator", () => {
  it("constructs the exact closed service topology and native implementation lineage", async () => {
    const tree = workspaceTree();
    const before = tree.listChanges().length;

    expect(await createService(tree, options)).toEqual(expect.any(Function));

    expect(
      tree
        .listChanges()
        .slice(before)
        .map((change) => change.path.replace(`${options.directory}/`, ""))
        .sort()
    ).toEqual([...expectedFiles].sort());
    expect(readJson(tree, `${options.directory}/package.json`)).toEqual({
      name: options.name,
      private: true,
      type: "module",
      packageManager: "bun@1.3.14",
      files: ["dist"],
      exports: {
        "./client": {
          types: "./dist/client.d.ts",
          default: "./dist/client.js",
        },
      },
      scripts: {
        build:
          'bun --eval \'await import("node:fs/promises").then(({ rm }) => rm("dist", { recursive: true, force: true }))\' && tsc -p tsconfig.build.json',
        typecheck: "tsc -p tsconfig.json --noEmit",
      },
      dependencies: {
        "@habitat-ai/sdk": cliManifest.version,
        ...SERVICE_GENERATOR_DEPENDENCY_VERSIONS,
      },
      nx: { tags: ["type:service", "role:servicepackage"] },
    });
    expect(readJson(tree, `${options.directory}/project.json`)).toMatchObject({
      name: options.name,
      tags: ["type:service", "role:servicepackage"],
      targets: { check: { executor: "nx:noop" } },
    });
    expect(tree.read(`${options.directory}/habitat.toml`, "utf8")).toBe(
      `schemaVersion = 1\nid = "${options.name}"\nownerProject = "${options.name}"\n` +
        `blueprint = "service"\nblueprintVersion = 2\n\n[roots]\n` +
        `project = "${options.directory}"\n\n[selections]\n`
    );
    expect(tree.read(`${options.directory}/tsconfig.json`, "utf8")).toContain(
      '"extends": "../../tsconfig.base.json"'
    );
    expect(tree.read(`${options.directory}/tsconfig.json`, "utf8")).toBe(
      '{\n  "extends": "../../tsconfig.base.json",\n  "compilerOptions": {\n' +
        '    "outDir": "dist",\n    "rootDir": "src",\n    "noUnusedLocals": true\n' +
        '  },\n  "include": [\n    "src"\n  ]\n}\n'
    );
    expect(readJson(tree, `${options.directory}/tsconfig.json`)).toMatchObject({
      compilerOptions: { noUnusedLocals: true },
    });

    const sources = expectedFiles
      .filter((file) => file.endsWith(".ts"))
      .map((file) => tree.read(`${options.directory}/${file}`, "utf8") ?? "")
      .join("\n");
    expect(sources.match(/implement\(contract\)/g)).toHaveLength(1);
    expect(sources).not.toContain("@orpc/experimental-effect");
    expect(sources).not.toContain('from "effect"');
    expect(sources).not.toContain("Effect.runPromise");
    expect(sources).toContain("export type Context = {");
    expect(sources).toContain("readonly provided: EmptyContextLane;");
    expect(sources).toContain('import { os } from "@orpc/server";');
    expect(sources.match(/os\.\$context<Context>\(\)/g)).toHaveLength(1);
    expect(sources).toContain("export const base = os.$context<Context>();");
    expect(sources).toContain("service.workItems.use");
    expect(sources).toContain("next({ context: { workItems: context.deps.workItems } })");
    expect(sources).toContain("module.listItems.handler(({ context }) =>");
    expect(sources).toContain('import { listItems } from "./router/list-items.js";');
    expect(sources).toContain("export const router = {\n  listItems,\n};");
    expect(sources).toContain("void context.workItems;");
    expect(sources).not.toContain("next({ context: {} })");
    expect(sources).toContain('import { standard } from "@habitat-ai/sdk/service/schema";');
    expect(sources).toContain("oc.input(standard(InputSchema)).output(standard(OutputSchema))");
    expect(sources).toContain('import { listItems } from "./list-items.js";');
    expect(sources).toContain("export const contract = {\n  listItems,\n};");
    expect(sources).toContain("createRouterClient(router");
    expect(tree.read(`${options.directory}/AGENTS.md`, "utf8")).toMatch(
      new RegExp(`^# ${options.name} Service Router`, "m")
    );
    expect(tree.read(`${options.directory}/AGENTS.md`, "utf8")).toContain(
      "Native oRPC retains inherited context additively"
    );
    expect(tree.read(`${options.directory}/AGENTS.md`, "utf8")).toMatch(
      /initial operation uses an inline native `\.handler\(\.\.\.\)`/
    );
    expect(tree.read(`${options.directory}/AGENTS.md`, "utf8")).toMatch(
      /install the official `\.effect\(\.\.\.\)` extension once in `src\/service\/impl\.ts`/
    );
    expect(tree.read(`${options.directory}/AGENTS.md`, "utf8")).not.toContain(
      "second Effect terminal"
    );
    expect(tree.read(`${options.directory}/AGENTS.md`, "utf8")).not.toContain(
      "ProcessExecutionRuntime"
    );
  });

  it("preserves one scoped name as the project, package, instance, and owner identity", async () => {
    const tree = workspaceTree();
    const scoped = {
      ...options,
      name: "@fixture/jobs-service",
      directory: "domain/jobs-service",
    };

    await createService(tree, scoped);

    expect(readJson(tree, `${scoped.directory}/package.json`)).toMatchObject({
      name: scoped.name,
    });
    expect(readJson(tree, `${scoped.directory}/project.json`)).toMatchObject({
      name: scoped.name,
    });
    expect(tree.read(`${scoped.directory}/habitat.toml`, "utf8")).toContain(
      `id = "${scoped.name}"\nownerProject = "${scoped.name}"`
    );
  });

  it.each([
    "/services/jobs",
    "../services/jobs",
    "services/../jobs",
    "C:/services/jobs",
  ])("rejects non-relative or traversing directory %s before any write", async (directory) => {
    await expectRejectedWithoutWrites({ ...options, directory });
  });

  it.each([
    "@scope",
    "@scope/",
    "Uppercase",
    "bad package",
    ".hidden",
  ])("rejects invalid package name %s before any write", async (name) => {
    await expectRejectedWithoutWrites({ ...options, name });
  });

  it.each([
    { field: "module", value: "WorkItems" },
    { field: "module", value: "work_items" },
    { field: "operation", value: "ListItems" },
    { field: "operation", value: "list--items" },
  ] as const)("rejects invalid kebab-case $field before any write", async ({ field, value }) => {
    await expectRejectedWithoutWrites({ ...options, [field]: value });
  });

  it.each([
    { field: "module", value: "default" },
    { field: "operation", value: "package" },
    { field: "module", value: "use" },
    { field: "module", value: "middleware" },
    { field: "operation", value: "router" },
    { field: "operation", value: "lazy" },
  ] as const)("rejects strict identifier or oRPC implementer collision $field=$value before any write", async ({
    field,
    value,
  }) => {
    await expectRejectedWithoutWrites({ ...options, [field]: value });
  });

  it.each([
    "config",
    "deps",
    "invocation",
    "provided",
    "scope",
  ])("rejects reserved service context module %s before any write", async (module) => {
    await expectRejectedWithoutWrites({ ...options, module });
  });

  it("rejects a duplicate staged Nx project name before any write", async () => {
    const tree = workspaceTree();
    addProjectConfiguration(tree, options.name, {
      root: "services/existing-jobs",
      targets: {},
    });

    await expectRejectedWithoutWrites(options, tree);
  });

  it("rejects a duplicate staged Nx project root before any write", async () => {
    const tree = workspaceTree();
    addProjectConfiguration(tree, "another-service", {
      root: options.directory,
      targets: {},
    });

    await expectRejectedWithoutWrites({ ...options, name: "unique-jobs-service" }, tree);
  });

  it("rejects an occupied destination before any write", async () => {
    const tree = workspaceTree();
    tree.write(`${options.directory}/README.md`, "occupied\n");

    await expectRejectedWithoutWrites(options, tree);
  });

  it("rejects non-Bun consumers and destinations outside declared workspaces", async () => {
    const nonBun = workspaceTree();
    writeJson(nonBun, "package.json", {
      name: "@proj/source",
      packageManager: "npm@11.0.0",
      workspaces: ["services/*"],
    });
    await expectRejectedWithoutWrites(options, nonBun);

    await expectRejectedWithoutWrites({
      ...options,
      directory: "outside/jobs",
    });
  });
});

function workspaceTree(): Tree {
  const tree = createTreeWithEmptyWorkspace({ layout: "apps-libs" });
  writeJson(tree, "package.json", {
    name: "@proj/source",
    private: true,
    packageManager: "bun@1.3.14",
    workspaces: ["apps/*", "domain/*", "services/*"],
    dependencies: {},
    devDependencies: {},
  });
  return tree;
}

async function expectRejectedWithoutWrites(
  rejected: ServiceGeneratorOptions,
  tree = workspaceTree()
): Promise<void> {
  const before = tree.listChanges();

  await expect(createService(tree, rejected)).rejects.toThrow();
  expect(tree.listChanges()).toEqual(before);
}
