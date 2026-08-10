import { readJson, type Tree, writeJson } from "@nx/devkit";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { describe, expect, it, vi } from "vitest";
import migrateRepositoryFoundation from "../../src/migrations/0-5-7-repository-foundation";
import {
  type HabitatRepositoryPresetOptions,
  initializeHabitatBunRepository,
} from "../../src/nx/repository-preset";
import { habitatConsumerBinding } from "../../src/nx-generators";

function bunRepository(input?: {
  readonly biome?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly includedScripts?: readonly string[];
  readonly namedInputs?: Readonly<Record<string, unknown>>;
  readonly nxPlugins?: readonly unknown[];
  readonly overrides?: Readonly<Record<string, unknown>>;
  readonly packageManager?: string;
  readonly patchedDependencies?: Readonly<Record<string, string>>;
  readonly resolutions?: Readonly<Record<string, unknown>>;
  readonly scripts?: Readonly<Record<string, string>>;
  readonly targetDefaults?: Readonly<Record<string, unknown>>;
  readonly workspaces?: readonly string[];
}): Tree {
  const tree = createTreeWithEmptyWorkspace({ layout: "apps-libs" });
  writeJson(tree, "nx.json", {
    $schema: "./node_modules/nx/schemas/nx-schema.json",
    namedInputs: {
      default: ["{projectRoot}/**/*", "!{projectRoot}/dist/**", "!{projectRoot}/coverage/**"],
      production: [
        "default",
        "!{projectRoot}/test/**",
        "!{projectRoot}/**/*.test.*",
        "!{projectRoot}/**/*.spec.*",
      ],
      ...input?.namedInputs,
    },
    plugins: input?.nxPlugins ?? [],
    targetDefaults: input?.targetDefaults,
  });
  writeJson(tree, "package.json", {
    name: "@fixture/source",
    private: true,
    ...(input?.packageManager === undefined ? {} : { packageManager: input.packageManager }),
    ...(input?.scripts === undefined ? {} : { scripts: input.scripts }),
    ...(input?.workspaces === undefined ? {} : { workspaces: input.workspaces }),
    ...(input?.includedScripts === undefined
      ? {}
      : { nx: { includedScripts: input.includedScripts } }),
    ...(input?.dependencies === undefined ? {} : { dependencies: input.dependencies }),
    ...(input?.overrides === undefined ? {} : { overrides: input.overrides }),
    ...(input?.patchedDependencies === undefined
      ? {}
      : { patchedDependencies: input.patchedDependencies }),
    ...(input?.resolutions === undefined ? {} : { resolutions: input.resolutions }),
    devDependencies: {
      nx: "23.1.1",
      "@nx/workspace": "23.1.1",
    },
  });
  if (input?.biome !== undefined) tree.write("biome.json", input.biome);
  return tree;
}

describe("Habitat Bun repository preset", () => {
  it("creates the portable scheduler and source-quality spine", () => {
    const tree = bunRepository();

    expect(
      initializeHabitatBunRepository(tree, habitatConsumerBinding, {
        packageManager: "bun",
      })
    ).toEqual({ packageChanged: true });

    expect(readJson(tree, "package.json")).toMatchObject({
      private: true,
      type: "module",
      packageManager: "bun@1.3.14",
      nx: { includedScripts: [] },
      workspaces: [
        "apps/*",
        "services/*",
        "packages/*",
        "resources/*",
        "plugins/cli/topics/*",
        "plugins/web/*",
        "plugins/server/api/*",
        "plugins/async/workflows/*",
        "plugins/async/schedules/*",
      ],
      scripts: {
        build: "nx run-many -t build",
        check: "nx run-many -t check",
        ci: "nx run-many -t build,check,test",
        "ci:affected": "nx affected -t build,check,test",
        format: "nx run habitat:format",
        lint: "nx run habitat:lint",
        test: "nx run-many -t test",
        typecheck: "nx run-many -t typecheck",
      },
      devDependencies: {
        "@biomejs/biome": "2.5.3",
        "@nx/eslint": "23.1.1",
        "@nx/eslint-plugin": "23.1.1",
        "@typescript-eslint/parser": "8.66.0",
        "@types/node": "24.13.3",
        "bun-types": "1.3.14",
        eslint: "10.0.3",
        nx: "23.1.1",
        typescript: "5.9.3",
      },
    });
    expect(readJson<{ readonly plugins: readonly unknown[] }>(tree, "nx.json").plugins).toEqual([
      "@habitat-ai/cli/nx-plugin",
      { plugin: "@nx/eslint/plugin", options: { targetName: "check:boundaries" } },
    ]);
    expect(readJson(tree, "nx.json")).toMatchObject({
      namedInputs: {
        bunToolchain: [
          "{workspaceRoot}/package.json",
          "{workspaceRoot}/bun.lock",
          "{workspaceRoot}/bunfig.toml",
        ],
        typescriptRuntime: ["bunToolchain", "{workspaceRoot}/tsconfig.base.json"],
      },
      targetDefaults: {
        build: { cache: true, dependsOn: ["^build"] },
        check: { cache: false, dependsOn: expect.arrayContaining(["check:boundaries"]) },
        test: { cache: true },
        typecheck: { cache: true },
        verify: { cache: false },
      },
    });
    expect(readJson(tree, "scripts/habitat/project.json")).toMatchObject({
      name: "habitat",
      root: "scripts/habitat",
      tags: ["type:tool", "role:architecture-policy"],
      targets: {
        check: { executor: "nx:noop" },
        format: { executor: "nx:run-commands" },
        lint: { executor: "nx:run-commands" },
      },
    });
    expect(readJson(tree, "scripts/habitat/project.json")).not.toHaveProperty("projectType");
    expect(readJson(tree, "biome.json")).toMatchObject({
      files: { includes: expect.arrayContaining(["!**/.venv/**"]) },
    });
    expect(tree.read("eslint.config.mjs", "utf8")).toContain('...nxPlugin.configs["flat/base"]');
    expect(tree.read("eslint.config.mjs", "utf8")).toContain('files: ["**/*.{ts,tsx,cts,mts}"]');
    expect(tree.read("bunfig.toml", "utf8")).toContain('linker = "isolated"');
    expect(readJson(tree, "tsconfig.base.json")).toMatchObject({
      compilerOptions: { types: ["bun-types", "node"] },
    });
    expect(tree.exists(".habitat")).toBe(false);
    expect(tree.exists("AGENTS.md")).toBe(false);
    expect(tree.exists(".github/workflows/repository-ratchet.yml")).toBe(false);
  });

  it.each([
    "23.1.0",
    "23.1.1",
  ])("migrates the prior boundary-free repository foundation from Nx %s", (nxVersion) => {
    const tree = bunRepository({
      packageManager: "bun@1.3.14",
      nxPlugins: ["@habitat-ai/cli/nx-plugin"],
      targetDefaults: {
        check: {
          cache: false,
          dependsOn: [
            { projects: ["habitat"], target: "lint" },
            "typecheck",
            "verify",
            "check:policy",
            "^check",
          ],
          outputs: [],
        },
      },
    });
    const packageJson = readJson<Record<string, unknown>>(tree, "package.json");
    writeJson(tree, "package.json", {
      ...packageJson,
      devDependencies: {
        ...(packageJson.devDependencies as Record<string, string>),
        "@nx/workspace": nxVersion,
        nx: nxVersion,
      },
    });

    expect(migrateRepositoryFoundation(tree)).toEqual(expect.any(Function));

    expect(readJson<{ readonly plugins: readonly unknown[] }>(tree, "nx.json").plugins).toEqual([
      "@habitat-ai/cli/nx-plugin",
      { plugin: "@nx/eslint/plugin", options: { targetName: "check:boundaries" } },
    ]);
    expect(readJson(tree, "nx.json")).toMatchObject({
      targetDefaults: {
        check: { dependsOn: expect.arrayContaining(["check:boundaries"]) },
      },
    });
    expect(readJson(tree, "package.json")).toMatchObject({
      devDependencies: {
        "@nx/eslint": "23.1.1",
        "@nx/eslint-plugin": "23.1.1",
        "@nx/workspace": "23.1.1",
        "@typescript-eslint/parser": "8.66.0",
        eslint: "10.0.3",
        nx: "23.1.1",
      },
    });
    expect(tree.read("eslint.config.mjs", "utf8")).toContain("@nx/enforce-module-boundaries");

    const migratedPackage = tree.read("package.json", "utf8");
    const migratedNx = tree.read("nx.json", "utf8");
    expect(migrateRepositoryFoundation(tree)).toBeUndefined();
    expect(tree.read("package.json", "utf8")).toBe(migratedPackage);
    expect(tree.read("nx.json", "utf8")).toBe(migratedNx);
  });

  it("does not rewrite an unrecognized Nx workspace version", () => {
    const tree = bunRepository({
      packageManager: "bun@1.3.14",
      nxPlugins: ["@habitat-ai/cli/nx-plugin"],
      targetDefaults: {
        check: {
          cache: false,
          dependsOn: [
            { projects: ["habitat"], target: "lint" },
            "typecheck",
            "verify",
            "check:policy",
            "^check",
          ],
          outputs: [],
        },
      },
    });
    const packageJson = readJson<Record<string, unknown>>(tree, "package.json");
    writeJson(tree, "package.json", {
      ...packageJson,
      devDependencies: {
        ...(packageJson.devDependencies as Record<string, string>),
        "@nx/workspace": "23.0.0",
      },
    });

    expect(migrateRepositoryFoundation(tree)).toEqual(expect.any(Function));
    expect(readJson(tree, "package.json")).toMatchObject({
      devDependencies: { "@nx/workspace": "23.0.0", nx: "23.1.1" },
    });
  });

  it("preserves consumer configuration and repeats without a Tree write", () => {
    const baseline = bunRepository();
    initializeHabitatBunRepository(baseline, habitatConsumerBinding, { packageManager: "bun" });
    const biome = baseline.read("biome.json", "utf8");
    expect(biome).not.toBeNull();
    const baselineProject = readJson<{
      readonly targets: Readonly<Record<string, unknown>>;
    }>(baseline, "scripts/habitat/project.json");
    const tree = bunRepository({
      biome: biome ?? undefined,
      includedScripts: ["docs"],
      nxPlugins: ["consumer-plugin"],
      namedInputs: { docs: ["{workspaceRoot}/docs/**/*"] },
      packageManager: "bun@1.3.14",
      scripts: { docs: "bun docs.ts" },
      targetDefaults: { docs: { cache: true } },
      workspaces: ["domain/*"],
    });
    const habitatProject = `${JSON.stringify(
      {
        ...baselineProject,
        targets: {
          ...baselineProject.targets,
          "check:policy": { parallelism: false },
        },
      },
      null,
      2
    )}\n`;
    tree.write("scripts/habitat/project.json", habitatProject);
    writeJson(tree, "tsconfig.base.json", {
      compilerOptions: {
        paths: { "#consumer/*": ["consumer/*"] },
        target: "ES2022",
        types: ["consumer-types"],
      },
    });

    initializeHabitatBunRepository(tree, habitatConsumerBinding, { packageManager: "bun" });
    expect(tree.read("biome.json", "utf8")).toBe(biome);
    expect(readJson(tree, "package.json")).toMatchObject({
      nx: { includedScripts: ["docs"] },
      scripts: {
        check: "nx run-many -t check",
        docs: "bun docs.ts",
      },
      workspaces: [
        "apps/*",
        "services/*",
        "packages/*",
        "resources/*",
        "plugins/cli/topics/*",
        "plugins/web/*",
        "plugins/server/api/*",
        "plugins/async/workflows/*",
        "plugins/async/schedules/*",
        "domain/*",
      ],
    });
    expect(readJson<{ readonly plugins: readonly unknown[] }>(tree, "nx.json").plugins).toEqual([
      "consumer-plugin",
      "@habitat-ai/cli/nx-plugin",
      { plugin: "@nx/eslint/plugin", options: { targetName: "check:boundaries" } },
    ]);
    expect(readJson(tree, "nx.json")).toMatchObject({
      namedInputs: { docs: ["{workspaceRoot}/docs/**/*"] },
      targetDefaults: { docs: { cache: true } },
    });
    expect(tree.read("scripts/habitat/project.json", "utf8")).toBe(habitatProject);
    expect(readJson(tree, "tsconfig.base.json")).toMatchObject({
      compilerOptions: {
        module: "ESNext",
        paths: { "#consumer/*": ["consumer/*"] },
        target: "ES2022",
        types: ["bun-types", "node", "consumer-types"],
      },
    });

    const before = tree.listChanges();
    const write = vi.spyOn(tree, "write");
    expect(
      initializeHabitatBunRepository(tree, habitatConsumerBinding, {
        packageManager: "bun",
      })
    ).toEqual({ packageChanged: false });
    expect(write).not.toHaveBeenCalled();
    expect(tree.listChanges()).toEqual(before);
  });

  it("completes empty foundation placeholders", () => {
    const tree = bunRepository({ biome: "" });
    tree.write("bunfig.toml", "\n");
    tree.write("tsconfig.base.json", "\n");
    tree.write("scripts/habitat/project.json", "\n");

    initializeHabitatBunRepository(tree, habitatConsumerBinding, { packageManager: "bun" });

    expect(readJson(tree, "biome.json")).toHaveProperty("linter.enabled", true);
    expect(tree.read("bunfig.toml", "utf8")).toContain('linker = "isolated"');
    expect(readJson(tree, "tsconfig.base.json")).toMatchObject({
      compilerOptions: { types: ["bun-types", "node"] },
    });
    expect(readJson(tree, "scripts/habitat/project.json")).toMatchObject({
      name: "habitat",
      root: "scripts/habitat",
    });
  });

  it("converges the native Nx custom-preset bootstrap", () => {
    const tree = bunRepository({
      namedInputs: {
        default: ["{projectRoot}/**/*", "sharedGlobals"],
        production: ["default"],
        sharedGlobals: [],
      },
    });

    initializeHabitatBunRepository(tree, habitatConsumerBinding, { packageManager: "bun" });

    expect(readJson(tree, "nx.json")).toMatchObject({
      namedInputs: {
        default: ["{projectRoot}/**/*", "!{projectRoot}/dist/**", "!{projectRoot}/coverage/**"],
        production: [
          "default",
          "!{projectRoot}/test/**",
          "!{projectRoot}/**/*.test.*",
          "!{projectRoot}/**/*.spec.*",
        ],
        sharedGlobals: [],
      },
    });
  });

  it.each([
    {
      label: "missing package-manager selection",
      tree: () => bunRepository(),
      options: {} as HabitatRepositoryPresetOptions,
      message: "requires Bun; received 'undefined'",
    },
    {
      label: "non-Bun preset",
      tree: () => bunRepository(),
      options: { packageManager: "npm" },
      message: "requires Bun; received 'npm'",
    },
    {
      label: "non-Bun package authority",
      tree: () => bunRepository({ packageManager: "pnpm@10.0.0" }),
      options: { packageManager: "bun" },
      message: "requires packageManager 'bun@1.3.14'",
    },
    {
      label: "incompatible Bun version",
      tree: () => bunRepository({ packageManager: "bun@1.2.0" }),
      options: { packageManager: "bun" },
      message: "requires packageManager 'bun@1.3.14'",
    },
    {
      label: "alternate package-manager artifact",
      tree: () => {
        const tree = bunRepository();
        tree.write("package-lock.json", "{}\n");
        return tree;
      },
      options: { packageManager: "bun" },
      message: "refuses alternate package-manager artifact 'package-lock.json'",
    },
    {
      label: "root script inference",
      tree: () => bunRepository({ includedScripts: ["check"] }),
      options: { packageManager: "bun" },
      message: "requires nx.includedScripts to exclude scheduler script 'check'",
    },
    {
      label: "incompatible scheduler script",
      tree: () => bunRepository({ scripts: { check: "bun consumer-check.ts" } }),
      options: { packageManager: "bun" },
      message: "found incompatible root scheduler script 'check'",
    },
    {
      label: "misplaced foundation tool",
      tree: () => bunRepository({ dependencies: { "@biomejs/biome": "2.5.3" } }),
      options: { packageManager: "bun" },
      message: "requires tool dependency '@biomejs/biome' in devDependencies",
    },
    {
      label: "incompatible foundation tool",
      tree: () => {
        const tree = bunRepository();
        const packageJson = readJson<Record<string, unknown>>(tree, "package.json");
        writeJson(tree, "package.json", {
          ...packageJson,
          devDependencies: {
            ...(packageJson.devDependencies as Readonly<Record<string, string>>),
            typescript: "4.9.5",
          },
        });
        return tree;
      },
      options: { packageManager: "bun" },
      message: "found incompatible tool dependency 'typescript@4.9.5'",
    },
    {
      label: "incompatible Bun override",
      tree: () => bunRepository({ overrides: { typescript: "4.9.5" } }),
      options: { packageManager: "bun" },
      message: "found incompatible overrides selection for tool 'typescript'",
    },
    {
      label: "incompatible Bun resolution",
      tree: () => bunRepository({ resolutions: { typescript: "4.9.5" } }),
      options: { packageManager: "bun" },
      message: "found incompatible resolutions selection for tool 'typescript'",
    },
    {
      label: "patched foundation tool",
      tree: () =>
        bunRepository({
          patchedDependencies: { "typescript@5.9.3": "patches/typescript@5.9.3.patch" },
        }),
      options: { packageManager: "bun" },
      message: "refuses patched foundation tool 'typescript@5.9.3'",
    },
    {
      label: "incompatible Biome foundation",
      tree: () => bunRepository({ biome: '{ "linter": { "enabled": false } }\n' }),
      options: { packageManager: "bun" },
      message: "found incompatible foundation file 'biome.json'",
    },
    {
      label: "incompatible Bun foundation",
      tree: () => {
        const tree = bunRepository();
        tree.write("bunfig.toml", '[install]\nlinker = "hoisted"\n');
        return tree;
      },
      options: { packageManager: "bun" },
      message: "found incompatible foundation file 'bunfig.toml'",
    },
    {
      label: "incompatible reserved named input",
      tree: () => bunRepository({ namedInputs: { typescriptRuntime: ["{workspaceRoot}/other"] } }),
      options: { packageManager: "bun" },
      message: "found incompatible Nx named input 'typescriptRuntime'",
    },
    {
      label: "incompatible reserved target default",
      tree: () => bunRepository({ targetDefaults: { check: { cache: true } } }),
      options: { packageManager: "bun" },
      message: "found incompatible Nx target default 'check'",
    },
    {
      label: "incompatible TypeScript foundation",
      tree: () => {
        const tree = bunRepository();
        writeJson(tree, "tsconfig.base.json", { compilerOptions: { strict: false } });
        return tree;
      },
      options: { packageManager: "bun" },
      message: "found incompatible TypeScript compiler option 'strict'",
    },
    {
      label: "duplicate Habitat plugin",
      tree: () =>
        bunRepository({
          nxPlugins: ["@habitat-ai/cli/nx-plugin", "@habitat-ai/cli/nx-plugin"],
        }),
      options: { packageManager: "bun" },
      message: "multiple Habitat Nx plugin registrations",
    },
    {
      label: "incompatible Habitat project",
      tree: () => {
        const tree = bunRepository();
        writeJson(tree, "scripts/habitat/project.json", {
          name: "habitat",
          root: "scripts/habitat",
          tags: ["type:tool", "role:architecture-policy"],
          targets: { lint: { executor: "nx:noop" } },
        });
        return tree;
      },
      options: { packageManager: "bun" },
      message: "has incompatible Habitat target 'check'",
    },
    {
      label: "incompatible Habitat target behavior",
      tree: () => {
        const tree = bunRepository();
        initializeHabitatBunRepository(tree, habitatConsumerBinding, { packageManager: "bun" });
        const project = readJson<{
          readonly targets: Readonly<Record<string, unknown>>;
        }>(tree, "scripts/habitat/project.json");
        writeJson(tree, "scripts/habitat/project.json", {
          ...project,
          targets: {
            ...project.targets,
            lint: {
              executor: "nx:run-commands",
              cache: true,
              options: { command: "biome lint --diagnostic-level=error ." },
            },
          },
        });
        return tree;
      },
      options: { packageManager: "bun" },
      message: "has incompatible Habitat target 'lint'",
    },
    {
      label: "incompatible Habitat classification",
      tree: () => {
        const tree = bunRepository();
        initializeHabitatBunRepository(tree, habitatConsumerBinding, { packageManager: "bun" });
        const project = readJson<Record<string, unknown>>(tree, "scripts/habitat/project.json");
        writeJson(tree, "scripts/habitat/project.json", {
          ...project,
          tags: ["consumer-policy"],
        });
        return tree;
      },
      options: { packageManager: "bun" },
      message: "is not a compatible Habitat policy project",
    },
    {
      label: "projectType inference",
      tree: () => {
        const tree = bunRepository();
        initializeHabitatBunRepository(tree, habitatConsumerBinding, { packageManager: "bun" });
        const project = readJson<Record<string, unknown>>(tree, "scripts/habitat/project.json");
        writeJson(tree, "scripts/habitat/project.json", {
          ...project,
          projectType: "application",
        });
        return tree;
      },
      options: { packageManager: "bun" },
      message: "must not declare projectType",
    },
    {
      label: "conflicting Habitat project root",
      tree: () => {
        const tree = bunRepository();
        writeJson(tree, "tools/other/project.json", {
          name: "habitat",
          root: "tools/other",
          targets: {},
        });
        return tree;
      },
      options: { packageManager: "bun" },
      message: "found project 'habitat' at incompatible root 'tools/other'",
    },
    {
      label: "conflicting owner at Habitat project root",
      tree: () => {
        const tree = bunRepository();
        writeJson(tree, "scripts/habitat/project.json", {
          name: "consumer-policy",
          root: "scripts/habitat",
          targets: {},
        });
        return tree;
      },
      options: { packageManager: "bun" },
      message: "found root 'scripts/habitat' owned by incompatible project 'consumer-policy'",
    },
  ])("refuses $label before the first Tree write", ({ tree: createTree, options, message }) => {
    const tree = createTree();
    const write = vi.spyOn(tree, "write");

    expect(() => initializeHabitatBunRepository(tree, habitatConsumerBinding, options)).toThrow(
      message
    );
    expect(write).not.toHaveBeenCalled();
  });
});
