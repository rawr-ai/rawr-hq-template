import { execFileSync, spawn } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import type { Server } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runServer } from "verdaccio";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type CommandResult = Readonly<{
  exitCode: number;
  stderr: string;
  stdout: string;
}>;

type PublicProduct = Readonly<{
  filename: string;
  name: "@habitat-ai/cli" | "@habitat-ai/sdk";
  root: string;
  version: string;
}>;

const FIXTURE_PREFIX = "habitat-installed-package-";
const PUBLIC_NPM_REGISTRY = "https://registry.npmjs.org";
const CANDIDATE_VERSION = "0.5.15";
const PACKED_BLUEPRINT_DIRECTORIES = [
  "app",
  "package",
  "plugin",
  "plugin-nx",
  "provider",
  "resource",
  "service",
] as const;
const GENERATED_SERVICE_INVENTORY = [
  "AGENTS.md",
  "habitat.toml",
  "package.json",
  "project.json",
  "src/client.ts",
  "src/service/base.ts",
  "src/service/contract.ts",
  "src/service/impl.ts",
  "src/service/modules/greeting/AGENTS.md",
  "src/service/modules/greeting/contract/greet.ts",
  "src/service/modules/greeting/contract/index.ts",
  "src/service/modules/greeting/module.ts",
  "src/service/modules/greeting/router.ts",
  "src/service/modules/greeting/router/greet.ts",
  "src/service/router.ts",
  "tsconfig.build.json",
  "tsconfig.json",
] as const;
const temporaryParent = await realpath(tmpdir());
const workspaceRoot = fileURLToPath(new URL("../../..", import.meta.url));
const gitLocalEnvironmentVariables = execFileSync("git", ["rev-parse", "--local-env-vars"], {
  cwd: workspaceRoot,
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter((name) => name.length > 0);
const sdkVersion = await readPackageVersion("packages/habitat-sdk");
const cliVersion = await readPackageVersion("apps/habitat");
if (sdkVersion !== CANDIDATE_VERSION || cliVersion !== CANDIDATE_VERSION) {
  throw new Error(`Habitat acceptance requires the exact ${CANDIDATE_VERSION} CLI/SDK pair.`);
}
const publishedRegistryVersion = process.env.HABITAT_ACCEPTANCE_REGISTRY_VERSION?.trim();
if (
  publishedRegistryVersion !== undefined &&
  (publishedRegistryVersion.length === 0 ||
    publishedRegistryVersion !== sdkVersion ||
    publishedRegistryVersion !== cliVersion)
) {
  throw new Error(
    "HABITAT_ACCEPTANCE_REGISTRY_VERSION must equal the SDK and CLI package versions."
  );
}
const products: readonly PublicProduct[] = [
  {
    filename: `habitat-ai-sdk-${sdkVersion}.tgz`,
    name: "@habitat-ai/sdk",
    root: "packages/habitat-sdk",
    version: sdkVersion,
  },
  {
    filename: `habitat-ai-cli-${cliVersion}.tgz`,
    name: "@habitat-ai/cli",
    root: "apps/habitat",
    version: cliVersion,
  },
];

let acceptanceRoot = "";
let consumerRoot = "";
let gritSubjectPaths: readonly string[] = [];
let localRegistry: Server | undefined;
const originalRegistryEnvironment = new Map(
  [
    "BUN_CONFIG_REGISTRY",
    "BUN_CONFIG_TOKEN",
    "NPM_CONFIG_REGISTRY",
    "NPM_CONFIG_USERCONFIG",
    "npm_config_registry",
  ].map((name) => [name, process.env[name]])
);
const installVersion = publishedRegistryVersion ?? CANDIDATE_VERSION;

beforeAll(async () => {
  acceptanceRoot = await realpath(await mkdtemp(path.join(temporaryParent, FIXTURE_PREFIX)));
  consumerRoot = path.join(acceptanceRoot, "consumer");
  await mkdir(path.join(acceptanceRoot, "packages"), { recursive: true });
  await Promise.all(
    ["cache", "config", "data", "home", "public-config", "tmp"].map((directory) =>
      mkdir(path.join(acceptanceRoot, "runtime", directory), { recursive: true })
    )
  );
  await writeFile(
    path.join(acceptanceRoot, "runtime", "public-config", ".npmrc"),
    `registry=${PUBLIC_NPM_REGISTRY}/\n`
  );
  await mkdir(consumerRoot, { recursive: true });
  await packPublicProducts();
  if (publishedRegistryVersion === undefined) {
    const registryUrl = await startCandidateRegistry();
    await publishCandidateProducts(registryUrl);
  }
  await createConsumer();
  await installConsumer();
}, 180_000);

afterAll(async () => {
  try {
    await stopCandidateRegistry();
  } finally {
    for (const [name, value] of originalRegistryEnvironment) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    if (acceptanceRoot !== "") await removeOwnedFixture(acceptanceRoot);
  }
}, 300_000);

describe("installed Habitat products", () => {
  it("adopts the packed CLI into one bare Bun Nx repository through one native nx add", async () => {
    const cliRoot = path.join(consumerRoot, "node_modules/@habitat-ai/cli");
    const directSdkRoot = path.join(consumerRoot, "node_modules/@habitat-ai/sdk");
    const initialManifest = JSON.parse(
      await readFile(path.join(consumerRoot, "package.json"), "utf8")
    ) as Readonly<Record<string, unknown>>;
    expect(JSON.stringify(initialManifest)).not.toContain("@habitat-ai/cli");
    expect(JSON.stringify(initialManifest)).not.toContain("@habitat-ai/sdk");
    await expect(lstat(cliRoot)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(directSdkRoot)).rejects.toMatchObject({ code: "ENOENT" });

    const nx = path.join(consumerRoot, "node_modules/.bin/nx");
    const added = await run(
      nx,
      ["add", `@habitat-ai/cli@${CANDIDATE_VERSION}`, "--no-interactive"],
      {
        cwd: consumerRoot,
        env: {
          PATH: `${path.join(consumerRoot, "node_modules/.bin")}${path.delimiter}${process.env.PATH ?? ""}`,
        },
        timeoutMs: 120_000,
      }
    );
    expect(added, added.stderr || added.stdout).toMatchObject({ exitCode: 0 });

    const cliStats = await lstat(cliRoot);
    expect(cliStats.isDirectory() || cliStats.isSymbolicLink()).toBe(true);
    const resolvedCliRoot = await realpath(cliRoot);
    expect(resolvedCliRoot.startsWith(path.join(consumerRoot, "node_modules"))).toBe(true);
    expect(resolvedCliRoot.startsWith(workspaceRoot)).toBe(false);
    const cliRequire = createRequire(path.join(resolvedCliRoot, "package.json"));
    const sdkRoot = path.dirname(cliRequire.resolve("@habitat-ai/sdk/package.json"));
    const resolvedSdkRoot = await realpath(sdkRoot);
    expect(resolvedSdkRoot.startsWith(path.join(consumerRoot, "node_modules"))).toBe(true);
    expect(resolvedSdkRoot.startsWith(workspaceRoot)).toBe(false);
    expect(await readFile(path.join(cliRoot, "preset.schema.json"), "utf8")).toContain(
      '"additionalProperties": true'
    );
    expect(JSON.parse(await readFile(path.join(cliRoot, "generators.json"), "utf8"))).toMatchObject(
      {
        generators: {
          init: { factory: "./dist/generators/init.js" },
          service: { factory: "./dist/generators/service.js" },
        },
      }
    );
    expect((await lstat(path.join(cliRoot, "dist/generators/init.js"))).isFile()).toBe(true);
    expect((await lstat(path.join(cliRoot, "dist/generators/service.js"))).isFile()).toBe(true);
    expect(JSON.parse(await readFile(path.join(consumerRoot, "nx.json"), "utf8"))).toMatchObject({
      plugins: [
        "@habitat-ai/cli/nx-plugin",
        { plugin: "@nx/eslint/plugin", options: { targetName: "check:boundaries" } },
      ],
    });
    expect(
      JSON.parse(await readFile(path.join(consumerRoot, "package.json"), "utf8"))
    ).toMatchObject({
      packageManager: "bun@1.3.14",
      scripts: {
        check: "nx run-many -t check",
        lint: "nx run habitat:lint",
        prepare: "husky",
      },
      devDependencies: {
        "@habitat-ai/cli": CANDIDATE_VERSION,
        "@nx/eslint": "23.1.1",
        "@nx/eslint-plugin": "23.1.1",
        "@typescript-eslint/parser": "8.66.0",
        eslint: "10.0.3",
        husky: "9.1.7",
        typescript: "5.9.3",
      },
      trustedDependencies: ["@getgrit/cli"],
    });
    const hookConfig = await run("git", ["config", "--local", "--get", "core.hooksPath"], {
      cwd: consumerRoot,
    });
    expect(hookConfig, hookConfig.stderr || hookConfig.stdout).toMatchObject({
      exitCode: 0,
      stdout: ".husky/_\n",
    });

    const fixturePath = `${path.join(consumerRoot, "node_modules/.bin")}${path.delimiter}${process.env.PATH ?? ""}`;
    expect(JSON.parse(await readFile(path.join(consumerRoot, "nx.json"), "utf8"))).toMatchObject({
      namedInputs: {
        production: [
          "default",
          "!{projectRoot}/test/**",
          "!{projectRoot}/**/*.test.*",
          "!{projectRoot}/**/*.spec.*",
        ],
      },
    });
    expect(await readFile(path.join(consumerRoot, "eslint.config.mjs"), "utf8")).toContain(
      '"@nx/enforce-module-boundaries"'
    );

    await assertInstalledServiceConsumer(nx, fixturePath);
  });

  it("creates the portable Bun repository before activating post-Git hooks", async () => {
    const name = "preset-consumer";
    const root = path.join(acceptanceRoot, name);
    const cliSpecifier = `@habitat-ai/cli@${installVersion}`;
    const created = await run(
      "bunx",
      [
        "--bun",
        "create-nx-workspace@23.1.1",
        name,
        `--preset=${cliSpecifier}`,
        "--packageManager=bun",
        "--nxCloud=skip",
        "--interactive=false",
        "--skipGitHubPush=true",
        "--trustThirdPartyPreset=true",
      ],
      {
        cwd: acceptanceRoot,
        env: { PATH: process.env.PATH ?? "" },
        timeoutMs: 180_000,
      }
    );
    expect(created, created.stderr || created.stdout).toMatchObject({ exitCode: 0 });

    const packagePath = path.join(root, "package.json");
    const nxPath = path.join(root, "nx.json");
    const projectPath = path.join(root, "scripts/habitat/project.json");
    const firstPackage = await readFile(packagePath, "utf8");
    const firstNx = await readFile(nxPath, "utf8");
    const firstProject = await readFile(projectPath, "utf8");
    const presetPackage = JSON.parse(firstPackage) as {
      readonly name: string;
      readonly scripts?: Readonly<Record<string, string>>;
    };
    expect(presetPackage).toMatchObject({
      private: true,
      type: "module",
      packageManager: expect.stringMatching(/^bun@/u),
      nx: { includedScripts: [] },
      scripts: {
        build: "nx run-many -t build",
        check: "nx run-many -t check",
        lint: "nx run habitat:lint",
      },
      devDependencies: {
        "@biomejs/biome": "2.5.3",
        "@nx/eslint": "23.1.1",
        "@nx/eslint-plugin": "23.1.1",
        "@typescript-eslint/parser": "8.66.0",
        eslint: "10.0.3",
        typescript: "5.9.3",
      },
    });
    expect(JSON.parse(firstPackage)).not.toHaveProperty("scripts.prepare");
    expect(JSON.parse(firstNx)).toMatchObject({
      plugins: [
        "@habitat-ai/cli/nx-plugin",
        { plugin: "@nx/eslint/plugin", options: { targetName: "check:boundaries" } },
      ],
    });
    expect(JSON.parse(firstProject)).toMatchObject({
      name: "habitat",
      tags: ["type:tool", "role:architecture-policy"],
    });
    expect(JSON.parse(firstProject)).not.toHaveProperty("projectType");
    await expect(lstat(path.join(root, ".habitat/blueprints"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    const inactiveHooks = await run("git", ["config", "--local", "--get", "core.hooksPath"], {
      cwd: root,
    });
    expect(inactiveHooks.exitCode).not.toBe(0);

    const nx = path.join(root, "node_modules/.bin/nx");
    const fixturePath = `${path.join(root, "node_modules/.bin")}${path.delimiter}${process.env.PATH ?? ""}`;
    const biome = await run(path.join(root, "node_modules/.bin/biome"), ["--version"], {
      cwd: root,
    });
    expect(biome, biome.stderr || biome.stdout).toMatchObject({ exitCode: 0 });
    const initialized = await run(nx, ["generate", "@habitat-ai/cli:init", "--no-interactive"], {
      cwd: root,
      env: { PATH: fixturePath },
      timeoutMs: 120_000,
    });
    expect(initialized, initialized.stderr || initialized.stdout).toMatchObject({ exitCode: 0 });
    const activatedPackage = await readFile(packagePath, "utf8");
    const activeHooks = await run("git", ["config", "--local", "--get", "core.hooksPath"], {
      cwd: root,
    });
    expect(activeHooks, activeHooks.stderr || activeHooks.stdout).toMatchObject({
      exitCode: 0,
      stdout: ".husky/_\n",
    });

    const projects = await run(nx, ["show", "projects", "--json"], {
      cwd: root,
      env: { PATH: fixturePath },
      timeoutMs: 60_000,
    });
    expect(projects, projects.stderr || projects.stdout).toMatchObject({ exitCode: 0 });
    expect([...(JSON.parse(projects.stdout) as readonly string[])].sort()).toEqual(
      [presetPackage.name, "habitat"].sort()
    );
    const rootProject = await run(nx, ["show", "project", presetPackage.name, "--json"], {
      cwd: root,
      env: { PATH: fixturePath },
      timeoutMs: 60_000,
    });
    expect(rootProject, rootProject.stderr || rootProject.stdout).toMatchObject({ exitCode: 0 });
    const rootTargets = (
      JSON.parse(rootProject.stdout) as {
        readonly targets?: Readonly<Record<string, unknown>>;
      }
    ).targets;
    for (const target of [
      "build",
      "check",
      "ci",
      "ci:affected",
      "format",
      "lint",
      "test",
      "typecheck",
    ]) {
      expect(rootTargets).not.toHaveProperty(target);
    }

    const repeated = await run(
      nx,
      ["generate", "@habitat-ai/cli:preset", "--packageManager=bun", "--no-interactive"],
      { cwd: root, env: { PATH: fixturePath }, timeoutMs: 120_000 }
    );
    expect(repeated, repeated.stderr || repeated.stdout).toMatchObject({ exitCode: 0 });
    expect(await readFile(nxPath, "utf8")).toBe(firstNx);
    expect(await readFile(projectPath, "utf8")).toBe(firstProject);
    expect(await readFile(packagePath, "utf8")).toBe(activatedPackage);

    const firstLint = await run(nx, ["run", "habitat:lint", "--outputStyle=static"], {
      cwd: root,
      env: {
        ...process.env,
        NX_DAEMON: "false",
        NX_SKIP_NX_CACHE: "false",
        PATH: fixturePath,
      },
      timeoutMs: 60_000,
    });
    expect(firstLint, `${firstLint.stdout}\n${firstLint.stderr}`).toMatchObject({ exitCode: 0 });
    const repeatedLint = await run(nx, ["run", "habitat:lint", "--outputStyle=static"], {
      cwd: root,
      env: {
        ...process.env,
        NX_DAEMON: "false",
        NX_SKIP_NX_CACHE: "false",
        PATH: fixturePath,
      },
      timeoutMs: 60_000,
    });
    expect(repeatedLint, repeatedLint.stderr || repeatedLint.stdout).toMatchObject({ exitCode: 0 });
    expect(repeatedLint.stdout).toContain("existing outputs match the cache");

    const generatedAuthority = [
      await readFile(nxPath, "utf8"),
      await readFile(packagePath, "utf8"),
      await readFile(path.join(root, "biome.json"), "utf8"),
      await readFile(path.join(root, "bunfig.toml"), "utf8"),
      await readFile(path.join(root, "eslint.config.mjs"), "utf8"),
      await readFile(projectPath, "utf8"),
      await readFile(path.join(root, "tsconfig.base.json"), "utf8"),
    ].join("\n");
    expect(generatedAuthority).not.toContain("rawr");
    expect(generatedAuthority).not.toContain("pnpm");
    expect(generatedAuthority).not.toContain(workspaceRoot);
  });

  it.each([
    ["0.5.3", "23.1.0"],
    ["0.5.6", "23.1.1"],
  ])("migrates CLI %s and its SDK as one native Nx package group", async (previousVersion, previousNxVersion) => {
    const root = path.join(
      acceptanceRoot,
      `migration-consumer-${previousVersion.replaceAll(".", "-")}`
    );
    // Nx 23.1.0 cannot parse npm 12's one-item provenance response. The
    // 23.1.1 row verifies the same target artifact without this documented
    // compatibility flag. Local Verdaccio candidates have no provenance.
    const skipNxProvenance =
      publishedRegistryVersion === undefined || previousNxVersion === "23.1.0";
    await mkdir(root, { recursive: true });
    await writeFile(
      path.join(root, "nx.json"),
      `${JSON.stringify(
        {
          plugins: ["@habitat-ai/cli/nx-plugin"],
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
        },
        null,
        2
      )}\n`
    );
    await writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify(
        {
          name: "habitat-migration-consumer",
          private: true,
          type: "module",
          packageManager: "bun@1.3.14",
          devDependencies: {
            "@habitat-ai/cli": previousVersion,
            "@habitat-ai/sdk": previousVersion,
            "@nx/workspace": previousNxVersion,
            nx: previousNxVersion,
          },
        },
        null,
        2
      )}\n`
    );

    // Bun keeps scoped registries above --registry, so the old pair needs a public-only config.
    const installedPreviousPair = await run(
      "bun",
      ["install", "--ignore-scripts", `--registry=${PUBLIC_NPM_REGISTRY}`],
      {
        cwd: root,
        env: {
          BUN_INSTALL_CACHE_DIR: path.join(acceptanceRoot, "runtime", "cache", "bun-public"),
          NPM_CONFIG_USERCONFIG: path.join(acceptanceRoot, "runtime", "public-config", ".npmrc"),
          XDG_CONFIG_HOME: path.join(acceptanceRoot, "runtime", "public-config"),
        },
        timeoutMs: 120_000,
      }
    );
    expect(
      installedPreviousPair,
      installedPreviousPair.stderr || installedPreviousPair.stdout
    ).toMatchObject({ exitCode: 0 });

    const migrated = await run(
      "bunx",
      ["nx", "migrate", `@habitat-ai/cli@${installVersion}`, "--interactive=false"],
      {
        cwd: root,
        env: {
          NX_MIGRATE_CLI_VERSION: "23.1.1",
          ...(skipNxProvenance ? { NX_SKIP_PROVENANCE_CHECK: "true" } : {}),
        },
        timeoutMs: 120_000,
      }
    );
    expect(migrated, migrated.stderr || migrated.stdout).toMatchObject({ exitCode: 0 });
    expect(JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))).toMatchObject({
      devDependencies: {
        "@habitat-ai/cli": installVersion,
        "@habitat-ai/sdk": installVersion,
      },
    });
    expect(await readFile(path.join(root, "migrations.json"), "utf8")).toContain(
      "0-5-7-repository-foundation"
    );

    const installedMigratedPair = await run("bun", ["install", "--ignore-scripts"], {
      cwd: root,
      timeoutMs: 120_000,
    });
    expect(
      installedMigratedPair,
      installedMigratedPair.stderr || installedMigratedPair.stdout
    ).toMatchObject({ exitCode: 0 });

    const applied = await run(
      "bunx",
      ["nx", "migrate", "--run-migrations=migrations.json", "--interactive=false"],
      {
        cwd: root,
        env: {
          NX_DAEMON: "false",
          NX_MIGRATE_CLI_VERSION: "23.1.1",
          ...(skipNxProvenance ? { NX_SKIP_PROVENANCE_CHECK: "true" } : {}),
        },
        timeoutMs: 120_000,
      }
    );
    expect(applied, applied.stderr || applied.stdout).toMatchObject({ exitCode: 0 });
    expect(JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))).toMatchObject({
      devDependencies: {
        "@nx/eslint": "23.1.1",
        "@nx/eslint-plugin": "23.1.1",
        "@nx/workspace": "23.1.1",
        "@typescript-eslint/parser": "8.66.0",
        eslint: "10.0.3",
      },
    });
    expect(JSON.parse(await readFile(path.join(root, "nx.json"), "utf8"))).toMatchObject({
      plugins: expect.arrayContaining([
        { plugin: "@nx/eslint/plugin", options: { targetName: "check:boundaries" } },
      ]),
      targetDefaults: {
        check: { dependsOn: expect.arrayContaining(["check:boundaries"]) },
      },
    });
    expect(await readFile(path.join(root, "eslint.config.mjs"), "utf8")).toContain(
      "@nx/enforce-module-boundaries"
    );

    const frozenMigratedPair = await run(
      "bun",
      ["install", "--frozen-lockfile", "--ignore-scripts"],
      {
        cwd: root,
        timeoutMs: 120_000,
      }
    );
    expect(
      frozenMigratedPair,
      frozenMigratedPair.stderr || frozenMigratedPair.stdout
    ).toMatchObject({ exitCode: 0 });
    for (const product of products) {
      expect(
        JSON.parse(
          await readFile(path.join(root, "node_modules", product.name, "package.json"), "utf8")
        )
      ).toMatchObject({ name: product.name, version: installVersion });
    }
  });

  it("installs, executes, and initializes the public SDK and CLI boundary", async () => {
    const consumerBlueprintRoot = path.join(consumerRoot, ".habitat/blueprints");
    const consumerBlueprintInventory = [
      "grit-acceptance/blueprint.toml",
      "grit-acceptance/no-forbidden.md",
      "grit-pattern/require_grit_compatibility_inventory_acceptance/baseline.json",
      "grit-pattern/require_grit_compatibility_inventory_acceptance/pattern.md",
      "grit-pattern/require_grit_compatibility_inventory_acceptance/rule.json",
      "root-pattern-acceptance/blueprint.toml",
      "root-pattern-acceptance/no-forbidden.md",
    ];
    const installedCliRoot = path.join(consumerRoot, "node_modules/@habitat-ai/cli");
    const resolvedInstalledCliRoot = await realpath(installedCliRoot);
    const installedCliRequire = createRequire(path.join(resolvedInstalledCliRoot, "package.json"));
    const installedProductRoots = new Map<PublicProduct["name"], string>([
      ["@habitat-ai/cli", installedCliRoot],
      [
        "@habitat-ai/sdk",
        path.dirname(installedCliRequire.resolve("@habitat-ai/sdk/package.json")),
      ],
    ]);
    for (const product of products) {
      const packageRoot = installedProductRoots.get(product.name);
      if (packageRoot === undefined) throw new Error(`Missing installed root for ${product.name}.`);
      const stats = await lstat(packageRoot);
      expect(stats.isDirectory() || stats.isSymbolicLink()).toBe(true);
      const installedRoot = await realpath(packageRoot);
      const installedRelativePath = path.relative(
        path.join(consumerRoot, "node_modules"),
        installedRoot
      );
      expect(path.isAbsolute(installedRelativePath)).toBe(false);
      expect(installedRelativePath).not.toBe("..");
      expect(installedRelativePath.startsWith(`..${path.sep}`)).toBe(false);

      const manifestText = await readFile(path.join(packageRoot, "package.json"), "utf8");
      expect(manifestText).not.toContain("workspace:");
      expect(JSON.parse(manifestText)).toMatchObject({
        name: product.name,
        version: product.version,
      });
    }

    expect((await readdir(path.join(consumerRoot, "node_modules/@habitat-ai"))).sort()).toEqual([
      "cli",
    ]);

    const cliManifest = JSON.parse(
      await readFile(path.join(installedCliRoot, "package.json"), "utf8")
    ) as { readonly dependencies?: Readonly<Record<string, string>> };
    const habitatDependencies = Object.keys(cliManifest.dependencies ?? {})
      .filter((name) => name.startsWith("@habitat-ai/"))
      .sort();
    expect(habitatDependencies).toEqual(["@habitat-ai/sdk"]);
    expect(cliManifest.dependencies?.["@habitat-ai/sdk"]).toBe(productVersion("@habitat-ai/sdk"));

    const installedSdkRoot = installedProductRoots.get("@habitat-ai/sdk");
    if (installedSdkRoot === undefined) throw new Error("Missing installed SDK root.");
    const generatedServiceRoot = path.join(consumerRoot, "services/greeting");
    const generatedServiceRequire = createRequire(path.join(generatedServiceRoot, "package.json"));
    expect(
      await realpath(path.dirname(generatedServiceRequire.resolve("@habitat-ai/sdk/package.json")))
    ).toBe(await realpath(installedSdkRoot));
    const sdkManifest = JSON.parse(
      await readFile(path.join(installedSdkRoot, "package.json"), "utf8")
    ) as { readonly dependencies?: Readonly<Record<string, string>> };
    expect(sdkManifest.dependencies).toMatchObject({
      "@effect/platform-node": "4.0.0-beta.101",
      "@effect/platform-node-shared": "4.0.0-beta.101",
      "@orpc/contract": "2.0.0-beta.23",
      "@orpc/experimental-effect": "2.0.0-beta.23",
      "@orpc/server": "2.0.0-beta.23",
      effect: "4.0.0-beta.101",
    });
    expect(Object.values(sdkManifest.dependencies ?? {})).not.toContain("2.0.0-beta.20");
    expect(
      Object.keys(sdkManifest.dependencies ?? {}).filter((name) => name.startsWith("@habitat-ai/"))
    ).toEqual([]);

    const consumerManifest = JSON.parse(
      await readFile(path.join(consumerRoot, "package.json"), "utf8")
    ) as Readonly<
      Record<
        "dependencies" | "devDependencies" | "optionalDependencies" | "peerDependencies",
        Readonly<Record<string, string>> | undefined
      >
    >;
    const directHabitatDependencies = (
      ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"] as const
    ).flatMap((bucket) =>
      Object.entries(consumerManifest[bucket] ?? {})
        .filter(([name]) => name.startsWith("@habitat-ai/"))
        .map(([name, version]) => ({ bucket, name, version }))
    );
    expect(directHabitatDependencies).toEqual([
      { bucket: "devDependencies", name: "@habitat-ai/cli", version: CANDIDATE_VERSION },
    ]);

    const coldCliEntrypoint = path.join(consumerRoot, "cold-habitat-cli.mjs");
    await writeFile(
      coldCliEntrypoint,
      [
        'const command = await import("@habitat-ai/cli/command");',
        'const plugin = await import("@habitat-ai/cli/nx-plugin");',
        'await import("@habitat-ai/cli/package.json", { with: { type: "json" } });',
        "console.log(JSON.stringify({ command: Object.keys(command), plugin: Object.keys(plugin) }));",
      ].join("\n"),
      "utf8"
    );
    const coldCli = await run("bun", [coldCliEntrypoint], { cwd: consumerRoot });
    await rm(coldCliEntrypoint);
    expect(coldCli, coldCli.stderr || coldCli.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(JSON.parse(coldCli.stdout)).toEqual({
      command: ["HabitatCommand"],
      plugin: ["createNodes"],
    });

    const coldSdkEntrypoint = path.join(generatedServiceRoot, "cold-habitat-sdk.mjs");
    await writeFile(
      coldSdkEntrypoint,
      [
        'const sdk = await import("@habitat-ai/sdk");',
        'const service = await import("@habitat-ai/sdk/service");',
        'const schema = await import("@habitat-ai/sdk/service/schema");',
        'const telemetry = await import("@habitat-ai/sdk/telemetry");',
        'await import("@habitat-ai/sdk/package.json", { with: { type: "json" } });',
        'await import("@habitat-ai/sdk/habitat-pack.json", { with: { type: "json" } });',
        "console.log(JSON.stringify({ sdk: Object.keys(sdk), schema: Object.keys(schema), service: Object.keys(service), telemetry: Object.keys(telemetry).sort() }));",
      ].join("\n"),
      "utf8"
    );
    const coldSdk = await run("bun", [coldSdkEntrypoint], { cwd: generatedServiceRoot });
    await rm(coldSdkEntrypoint);
    expect(coldSdk, coldSdk.stderr || coldSdk.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(JSON.parse(coldSdk.stdout)).toMatchObject({
      sdk: ["createHabitatClientForWorkspace"],
      schema: ["standard"],
      service: expect.arrayContaining([
        "createAnalyticsMiddlewareCallback",
        "createObservabilityMiddlewareCallback",
        "getProcedureMetadata",
        "procedureMetadata",
      ]),
      telemetry: [
        "DisabledOpenTelemetryNodeConfigSchema",
        "EmitTechnicalLogInputSchema",
        "EnabledOpenTelemetryNodeConfigSchema",
        "FlushTelemetryInputSchema",
        "FlushTelemetryResultSchema",
        "OpenTelemetryNodeConfigSchema",
        "TelemetryAttributeKeySchema",
        "TelemetryAttributesSchema",
        "TelemetryAvailabilitySchema",
        "TelemetryDiagnosticSchema",
        "TelemetryDiagnosticStageSchema",
        "TelemetryDiagnosticsSchema",
        "TelemetryExportCallbackAccountingSchema",
        "TelemetryIdentityTextSchema",
        "TelemetryLogSeveritySchema",
        "TelemetryProcessIdentitySchema",
      ],
    });

    expect(await readFile(path.join(installedCliRoot, "dist/command.js"))).toEqual(
      await readFile(path.join(workspaceRoot, "apps/habitat/dist/command.js"))
    );

    const installedPackPath = generatedServiceRequire.resolve("@habitat-ai/sdk/habitat-pack.json");
    const installedBlueprintPath = generatedServiceRequire.resolve(
      "@habitat-ai/sdk/blueprints/package/blueprint.toml"
    );
    expect(JSON.parse(await readFile(installedPackPath, "utf8"))).toEqual(
      JSON.parse(
        await readFile(path.join(workspaceRoot, "packages/habitat-sdk/habitat-pack.json"), "utf8")
      )
    );

    const canonicalBlueprintRoot = path.join(workspaceRoot, ".habitat/blueprints");
    const installedBlueprintRoot = path.resolve(path.dirname(installedBlueprintPath), "..");
    const installedBlueprintEntries = await readdir(installedBlueprintRoot, {
      withFileTypes: true,
    });
    expect(installedBlueprintEntries.every((entry) => entry.isDirectory())).toBe(true);
    expect(installedBlueprintEntries.map(({ name }) => name).sort()).toEqual(
      PACKED_BLUEPRINT_DIRECTORIES
    );
    const blueprintInventory = (
      await Promise.all(
        PACKED_BLUEPRINT_DIRECTORIES.map(async (directory) => {
          const directoryInventory = await listFiles(path.join(canonicalBlueprintRoot, directory));
          return directoryInventory.map((relativePath) => path.posix.join(directory, relativePath));
        })
      )
    )
      .flat()
      .sort();
    const nestedStructureFiles = blueprintInventory.filter((relativePath) => {
      const segments = relativePath.split("/");
      const filename = segments.at(-1);
      return segments.length > 2 && filename === "structure.toml";
    });
    expect(nestedStructureFiles).toEqual([
      "resource/versions/2/structure.toml",
      "service/versions/2/structure.toml",
    ]);
    const nestedBlueprintResidue = blueprintInventory.filter((relativePath) => {
      const filename = relativePath.split("/").at(-1);
      return (
        filename === "baseline.json" || filename === "rule.json" || filename === "staged-rule.json"
      );
    });
    expect(nestedBlueprintResidue).toEqual([]);
    expect(await listFiles(installedBlueprintRoot)).toEqual(blueprintInventory);
    for (const relativePath of blueprintInventory) {
      expect(await readFile(path.join(installedBlueprintRoot, relativePath)), relativePath).toEqual(
        await readFile(path.join(canonicalBlueprintRoot, relativePath))
      );
    }

    const oclifManifest = JSON.parse(
      await readFile(
        path.join(consumerRoot, "node_modules/@habitat-ai/cli/oclif.manifest.json"),
        "utf8"
      )
    ) as {
      readonly commands?: Readonly<Record<string, { readonly relativePath?: readonly string[] }>>;
      readonly version?: unknown;
    };
    expect(oclifManifest.version).toBe(productVersion("@habitat-ai/cli"));
    expect(oclifManifest.commands).toEqual({
      check: expect.objectContaining({ relativePath: ["dist", "commands", "check.js"] }),
      hook: expect.objectContaining({ relativePath: ["dist", "commands", "hook.js"] }),
      resolve: expect.objectContaining({ relativePath: ["dist", "commands", "resolve.js"] }),
    });

    const habitat = path.join(consumerRoot, "node_modules/.bin/habitat");
    const help = await run(habitat, ["--help"], { cwd: consumerRoot });
    expect(help, help.stderr || help.stdout).toMatchObject({ exitCode: 0, stderr: "" });
    expect(help.stdout).toContain("check");
    expect(help.stdout).toContain("hook");
    expect(help.stdout).toContain("resolve");

    expect(await listFiles(consumerBlueprintRoot)).toEqual(consumerBlueprintInventory);
    const resolved = await run(habitat, ["resolve"], { cwd: consumerRoot });
    expect(resolved, resolved.stderr || resolved.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    const resolvedCatalog = JSON.parse(resolved.stdout);
    expect(resolvedCatalog).toMatchObject({
      _tag: "Resolved",
      catalog: {
        policyPack: {
          name: "@habitat-ai/sdk",
          protocolVersion: 1,
          version: productVersion("@habitat-ai/sdk"),
        },
        instances: expect.arrayContaining([
          expect.objectContaining({
            id: "grit-acceptance",
            ownerProject: "@fixture/grit-acceptance",
            roots: expect.arrayContaining([
              expect.objectContaining({ id: "project", path: "packages/grit-acceptance" }),
            ]),
          }),
          expect.objectContaining({
            id: "installed-package",
            ownerProject: "@fixture/package",
            roots: expect.arrayContaining([
              expect.objectContaining({ id: "project", path: "packages/example" }),
            ]),
          }),
          expect.objectContaining({
            blueprint: "resource",
            blueprintVersion: 2,
            id: "resource-v2-acceptance",
            ownerProject: "@fixture/resource-v2-acceptance",
          }),
          expect.objectContaining({
            blueprint: "service",
            blueprintVersion: 2,
            id: "@fixture/greeting-service",
            ownerProject: "@fixture/greeting-service",
          }),
        ]),
        applications: expect.arrayContaining([
          expect.objectContaining({
            instanceId: "grit-acceptance",
            ruleId: "grit_acceptance_no_forbidden",
            runner: expect.objectContaining({ name: "grit" }),
          }),
          expect.objectContaining({
            instanceId: "installed-package",
            ruleId: "package_v1_structure",
            provenance: expect.objectContaining({ kind: "policy-pack" }),
            runner: expect.objectContaining({
              structure: expect.objectContaining({
                provenance: expect.objectContaining({ kind: "policy-pack" }),
              }),
            }),
          }),
          expect.objectContaining({
            blueprintVersion: 2,
            instanceId: "resource-v2-acceptance",
            ruleId: "resource_v2_effect_error_authority",
            runner: expect.objectContaining({
              acquisition: {
                entries: [
                  {
                    kind: "file",
                    path: "packages/resource-v2-acceptance/contract.ts",
                    source: {
                      id: "project",
                      kind: "root-pattern",
                      pattern: "contract.ts",
                    },
                  },
                  {
                    kind: "file",
                    path: "packages/resource-v2-acceptance/providers/**/*.ts",
                    source: {
                      id: "project",
                      kind: "root-pattern",
                      pattern: "providers/**/*.ts",
                    },
                  },
                ],
                kind: "check",
              },
              name: "grit",
            }),
          }),
          expect.objectContaining({
            blueprintVersion: 3,
            instanceId: "root-pattern-acceptance",
            ruleId: "root_pattern_acceptance_no_forbidden",
            runner: expect.objectContaining({
              acquisition: {
                entries: [
                  {
                    kind: "file",
                    path: "packages/root-pattern-acceptance/src/**/*.ts",
                    source: {
                      id: "project",
                      kind: "root-pattern",
                      pattern: "src/**/*.ts",
                    },
                  },
                ],
                kind: "check",
              },
              name: "grit",
            }),
          }),
        ]),
      },
    });
    expect(resolvedCatalog.catalog.policyPack.blueprints).toEqual([
      { id: "app", path: "dist/blueprints/app/blueprint.toml", version: 1 },
      { id: "package", path: "dist/blueprints/package/blueprint.toml", version: 1 },
      { id: "plugin", path: "dist/blueprints/plugin/blueprint.toml", version: 1 },
      { id: "plugin-nx", path: "dist/blueprints/plugin-nx/blueprint.toml", version: 1 },
      { id: "provider", path: "dist/blueprints/provider/blueprint.toml", version: 1 },
      { id: "resource", path: "dist/blueprints/resource/blueprint.toml", version: 1 },
      {
        id: "resource",
        path: "dist/blueprints/resource/versions/2/blueprint.toml",
        version: 2,
      },
      { id: "service", path: "dist/blueprints/service/blueprint.toml", version: 1 },
      {
        id: "service",
        path: "dist/blueprints/service/versions/2/blueprint.toml",
        version: 2,
      },
    ]);
    expect(resolvedCatalog.catalog.blueprints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          definition: expect.objectContaining({ id: "root-pattern-acceptance", version: 3 }),
          provenance: expect.objectContaining({ kind: "local" }),
        }),
        expect.objectContaining({
          definition: expect.objectContaining({ id: "package", version: 1 }),
          provenance: expect.objectContaining({ kind: "policy-pack" }),
        }),
        expect.objectContaining({
          definition: expect.objectContaining({ id: "resource", version: 2 }),
          provenance: expect.objectContaining({ kind: "policy-pack" }),
        }),
        expect.objectContaining({
          definition: expect.objectContaining({ id: "service", version: 2 }),
          provenance: expect.objectContaining({ kind: "policy-pack" }),
        }),
      ])
    );
    expect(resolvedCatalog.catalog.compatibility.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ownerProject: "habitat",
          ruleId: "require_grit_compatibility_inventory_acceptance",
          runner: expect.objectContaining({ name: "grit" }),
        }),
      ])
    );
    expect(resolvedCatalog.catalog.compatibility.ownerRoots).toEqual({
      habitat: "scripts/habitat",
    });

    const checked = await run(habitat, ["check"], { cwd: consumerRoot });
    expect(checked, checked.stderr || checked.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(JSON.parse(checked.stdout)).toMatchObject({
      _tag: "Completed",
      applications: expect.arrayContaining([
        expect.objectContaining({
          instanceId: null,
          ownerProject: "habitat",
          ruleId: "require_grit_compatibility_inventory_acceptance",
          runner: "grit",
          status: "pass",
          disposition: { kind: "evaluated" },
        }),
        expect.objectContaining({
          instanceId: "grit-acceptance",
          ruleId: "grit_acceptance_no_forbidden",
          runner: "grit",
          status: "pass",
        }),
        expect.objectContaining({
          instanceId: "installed-package",
          ruleId: "package_v1_structure",
          runner: "habitat",
          status: "pass",
        }),
        expect.objectContaining({
          instanceId: "resource-v2-acceptance",
          ruleId: "resource_v2_effect_error_authority",
          runner: "grit",
          status: "pass",
        }),
        expect.objectContaining({
          instanceId: "@fixture/greeting-service",
          ruleId: "service_v2_client_lineage",
          runner: "grit",
          status: "pass",
        }),
      ]),
      ok: true,
    });

    if (process.platform !== "win32") {
      const expectedReport = JSON.stringify({ paths: gritSubjectPaths, results: [] });
      expect(Buffer.byteLength(expectedReport, "utf8")).toBeGreaterThan(256 * 1_024);
    }

    const installedEntrypoint = path.join(consumerRoot, "node_modules/@habitat-ai/cli/bin/run.js");
    const [nodeChecked, bunChecked] = await Promise.all([
      run("node", [installedEntrypoint, "check"], { cwd: consumerRoot }),
      run("bun", [installedEntrypoint, "check"], { cwd: consumerRoot }),
    ]);
    expect(nodeChecked, nodeChecked.stderr || nodeChecked.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(bunChecked, bunChecked.stderr || bunChecked.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(JSON.parse(bunChecked.stdout)).toEqual(JSON.parse(nodeChecked.stdout));

    const nx = path.join(consumerRoot, "node_modules/.bin/nx");
    const nxPath = path.join(consumerRoot, "nx.json");
    const hooksPath = path.join(consumerRoot, ".codex/hooks.json");
    const prePushPath = path.join(consumerRoot, ".husky/pre-push");
    const packagePath = path.join(consumerRoot, "package.json");
    const lockPath = path.join(consumerRoot, "bun.lock");
    const instancePath = path.join(consumerRoot, "packages/example/habitat.toml");
    const firstNx = await readFile(nxPath, "utf8");
    const firstHooks = await readFile(hooksPath, "utf8");
    const firstPrePush = await readFile(prePushPath, "utf8");
    const firstPackage = await readFile(packagePath, "utf8");
    const firstLock = await readFile(lockPath, "utf8");
    const firstInstance = await readFile(instancePath, "utf8");
    expect(await listFiles(consumerBlueprintRoot)).toEqual(consumerBlueprintInventory);
    expect(firstInstance).not.toContain("source =");
    expect(JSON.parse(firstNx)).toMatchObject({
      plugins: [
        "@habitat-ai/cli/nx-plugin",
        { plugin: "@nx/eslint/plugin", options: { targetName: "check:boundaries" } },
      ],
    });
    expect(JSON.parse(firstPackage)).toMatchObject({
      scripts: { check: "nx run-many -t check", prepare: "husky" },
      devDependencies: { "@habitat-ai/cli": CANDIDATE_VERSION, husky: "9.1.7" },
      trustedDependencies: ["@getgrit/cli"],
    });
    const huskyManifest = JSON.parse(
      await readFile(path.join(consumerRoot, "node_modules/husky/package.json"), "utf8")
    ) as { readonly version?: string };
    expect(huskyManifest.version).toBe("9.1.7");
    expect(firstLock).toContain('"husky": ["husky@9.1.7"');
    expect(firstLock).toContain(`"@habitat-ai/cli": "${CANDIDATE_VERSION}"`);
    expect(firstLock).toContain(`"@habitat-ai/sdk": "${CANDIDATE_VERSION}"`);
    expect(firstLock).not.toMatch(/@habitat-ai\/(?:cli|sdk)@(?:file|link|workspace):/u);
    expect(firstPrePush).toBe(
      "# Nested Git work must discover its own repository.\n" +
        "unset $(git rev-parse --local-env-vars)\n" +
        "bun run check\n"
    );
    const hookConfig = await run("git", ["config", "--local", "--get", "core.hooksPath"], {
      cwd: consumerRoot,
    });
    expect(hookConfig, hookConfig.stderr || hookConfig.stdout).toMatchObject({
      exitCode: 0,
      stdout: ".husky/_\n",
    });
    expect(JSON.parse(firstHooks)).toMatchObject({
      hooks: {
        Stop: [
          {
            _habitat: { identity: "@habitat-ai/cli:agent-stop", revision: 1 },
            hooks: [
              {
                command: expect.stringContaining("habitat hook agent-stop"),
                type: "command",
              },
            ],
          },
        ],
      },
    });

    const prePush = await run("git", ["hook", "run", "pre-push", "--", "origin"], {
      cwd: consumerRoot,
      env: { GIT_DIR: path.join(consumerRoot, ".git") },
      timeoutMs: 60_000,
    });
    expect(prePush, prePush.stderr || prePush.stdout).toMatchObject({ exitCode: 0 });
    const outerIdentity = await run("git", ["config", "--local", "--get", "user.name"], {
      cwd: consumerRoot,
    });
    expect(outerIdentity.stdout).toBe("outer-fixture\n");
    const nestedIdentity = await run("git", ["config", "--local", "--get", "user.name"], {
      cwd: path.join(consumerRoot, ".hook-check-repository"),
    });
    expect(nestedIdentity.stdout).toBe("nested-fixture\n");

    const projected = await run(nx, ["show", "project", "@fixture/package", "--json"], {
      cwd: consumerRoot,
      timeoutMs: 60_000,
    });
    expect(projected, projected.stderr || projected.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    const project = JSON.parse(projected.stdout) as {
      readonly targets?: Readonly<
        Record<string, { readonly inputs?: readonly unknown[] } | undefined>
      >;
    };
    const targets = Object.keys(project.targets ?? {})
      .filter((name) => name.startsWith("habitat:application:"))
      .sort();
    expect(targets).toEqual(["habitat:application:installed-package:package_v1_structure"]);
    const target = "habitat:application:installed-package:package_v1_structure";
    const targetInputs = project.targets?.[target]?.inputs ?? [];
    expect(
      targetInputs.filter(
        (input) => typeof input === "object" && input !== null && "externalDependencies" in input
      )
    ).toEqual([{ externalDependencies: ["@habitat-ai/cli"] }]);
    expect(targetInputs).toContain("{workspaceRoot}/packages/example");
    expect(
      targetInputs.some(
        (input) => typeof input === "string" && input.includes("blueprints/package/structure.toml")
      )
    ).toBe(false);

    const rootPatternTarget =
      "habitat:application:root-pattern-acceptance:root_pattern_acceptance_no_forbidden";
    const projectedRootPattern = await run(
      nx,
      ["show", "project", "@fixture/root-pattern-acceptance", "--json"],
      { cwd: consumerRoot, timeoutMs: 60_000 }
    );
    expect(
      projectedRootPattern,
      projectedRootPattern.stderr || projectedRootPattern.stdout
    ).toMatchObject({ exitCode: 0, stderr: "" });
    const rootPatternProject = JSON.parse(projectedRootPattern.stdout) as typeof project;
    expect(rootPatternProject.targets?.[rootPatternTarget]).toMatchObject({
      cache: true,
      executor: "nx:run-commands",
      options: {
        command:
          "habitat check --instance root-pattern-acceptance --rule root_pattern_acceptance_no_forbidden",
      },
      parallelism: false,
    });
    expect(rootPatternProject.targets?.[rootPatternTarget]?.inputs).toEqual([
      { externalDependencies: ["@habitat-ai/cli"] },
      "{workspaceRoot}/bun.lock",
      "{workspaceRoot}/package.json",
      { env: "HABITAT_COMMAND_TIMEOUT_MS" },
      { env: "NX_WORKSPACE_ROOT_PATH" },
      "{workspaceRoot}/**/habitat.toml",
      "{workspaceRoot}/.habitat/**/rule.json",
      "{workspaceRoot}/.habitat/blueprints/*/blueprint.toml",
      "{workspaceRoot}/.habitat/blueprints/*/versions/*/blueprint.toml",
      "{workspaceRoot}/.habitat/blueprints/root-pattern-acceptance/no-forbidden.md",
      "{workspaceRoot}/.habitat/index.json",
      "{workspaceRoot}/packages/root-pattern-acceptance/src/**/*.ts",
    ]);

    const includedSubjectPath = path.join(
      consumerRoot,
      "packages/root-pattern-acceptance/src/included.ts"
    );
    await writeFile(includedSubjectPath, "forbidden();\n");
    const evaluatedRootPattern = await run(
      habitat,
      [
        "check",
        "--instance",
        "root-pattern-acceptance",
        "--rule",
        "root_pattern_acceptance_no_forbidden",
      ],
      { cwd: consumerRoot, timeoutMs: 120_000 }
    );
    await writeFile(includedSubjectPath, "allowed();\n");
    expect(
      evaluatedRootPattern,
      evaluatedRootPattern.stderr || evaluatedRootPattern.stdout
    ).toMatchObject({ exitCode: 1, stderr: "" });
    const rootPatternEvaluation = JSON.parse(evaluatedRootPattern.stdout);
    expect(rootPatternEvaluation).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          disposition: { kind: "evaluated" },
          findings: [
            expect.objectContaining({
              path: "packages/root-pattern-acceptance/src/included.ts",
            }),
          ],
          instanceId: "root-pattern-acceptance",
          ruleId: "root_pattern_acceptance_no_forbidden",
          runner: "grit",
          status: "fail",
        },
      ],
      ok: false,
    });
    expect(
      rootPatternEvaluation.applications.flatMap(
        (application: { readonly findings: readonly { readonly path: string }[] }) =>
          application.findings.map((finding) => finding.path)
      )
    ).toEqual(["packages/root-pattern-acceptance/src/included.ts"]);

    const executedRootPattern = await run(
      nx,
      [
        "run",
        `@fixture/root-pattern-acceptance:${rootPatternTarget}`,
        "--outputStyle=static",
        "--skip-nx-cache",
      ],
      { cwd: consumerRoot, timeoutMs: 120_000 }
    );
    expect(
      executedRootPattern,
      executedRootPattern.stderr || executedRootPattern.stdout
    ).toMatchObject({ exitCode: 0, stderr: "" });
    expect(executedRootPattern.stdout).toContain('"status": "pass"');

    const executed = await run(
      nx,
      ["run", `@fixture/package:${target}`, "--outputStyle=static", "--skip-nx-cache"],
      { cwd: consumerRoot, timeoutMs: 120_000 }
    );
    expect(executed, executed.stderr || executed.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(executed.stdout).toContain('"status": "pass"');
  });
});

async function readPackageVersion(root: string): Promise<string> {
  const manifest = JSON.parse(
    await readFile(path.join(workspaceRoot, root, "package.json"), "utf8")
  ) as { readonly version?: unknown };
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new Error(`Package at ${root} has no release version.`);
  }
  return manifest.version;
}

function productVersion(name: PublicProduct["name"]): string {
  return publicProduct(name).version;
}

function publicProduct(name: PublicProduct["name"]): PublicProduct {
  const product = products.find((candidate) => candidate.name === name);
  if (product === undefined) throw new Error(`Unknown public Habitat product: ${name}`);
  return product;
}

async function assertInstalledServiceConsumer(nx: string, fixturePath: string): Promise<void> {
  const generatorArguments = [
    "generate",
    "@habitat-ai/cli:service",
    "--name=@fixture/greeting-service",
    "--directory=services/greeting",
    "--module=greeting",
    "--operation=greet",
    "--no-interactive",
  ] as const;
  const generated = await run(nx, generatorArguments, {
    cwd: consumerRoot,
    env: { PATH: fixturePath },
    timeoutMs: 120_000,
  });
  expect(generated, generated.stderr || generated.stdout).toMatchObject({ exitCode: 0 });

  const serviceRoot = path.join(consumerRoot, "services/greeting");
  expect(await listGeneratedServiceFiles(serviceRoot)).toEqual(GENERATED_SERVICE_INVENTORY);
  const generatedBeforeRefusal = await Promise.all(
    GENERATED_SERVICE_INVENTORY.map((relativePath) =>
      readFile(path.join(serviceRoot, relativePath), "utf8")
    )
  );
  const servicePackage = JSON.parse(
    await readFile(path.join(serviceRoot, "package.json"), "utf8")
  ) as { readonly dependencies?: Readonly<Record<string, string>> };
  expect(await readFile(path.join(serviceRoot, "habitat.toml"), "utf8")).toContain(
    "blueprintVersion = 2"
  );
  expect(servicePackage.dependencies).toEqual({
    "@habitat-ai/sdk": installVersion,
    "@orpc/contract": "2.0.0-beta.23",
    "@orpc/server": "2.0.0-beta.23",
    typebox: "1.3.8",
  });

  const generatedSources = (
    await Promise.all(
      GENERATED_SERVICE_INVENTORY.filter((relativePath) => relativePath.endsWith(".ts")).map(
        (relativePath) => readFile(path.join(serviceRoot, relativePath), "utf8")
      )
    )
  ).join("\n");
  expect(generatedSources).toContain(".greet.handler(");
  expect(generatedSources).not.toContain("@orpc/experimental-effect");
  expect(generatedSources).not.toContain('from "effect"');
  expect(generatedSources).not.toContain("Effect.run");
  expect(generatedSources).not.toContain("ProcessExecutionRuntime");

  const callerRoot = path.join(consumerRoot, "apps/caller");
  const callerSourcePath = path.join(callerRoot, "src/index.ts");
  const publicClientImport =
    'import { createClient } from "@fixture/greeting-service/client";\n\nvoid createClient;\n';
  await mkdir(path.dirname(callerSourcePath), { recursive: true });
  await writeFile(
    path.join(callerRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "@fixture/caller",
        private: true,
        dependencies: { "@fixture/greeting-service": "workspace:*" },
      },
      null,
      2
    )}\n`
  );
  await writeFile(
    path.join(callerRoot, "project.json"),
    `${JSON.stringify(
      {
        name: "@fixture/caller",
        root: "apps/caller",
        sourceRoot: "apps/caller/src",
        tags: ["npm:private", "type:app", "role:consumer"],
        targets: { check: { executor: "nx:noop" } },
      },
      null,
      2
    )}\n`
  );
  await writeFile(callerSourcePath, publicClientImport);

  const linkedCaller = await run("bun", ["install", "--ignore-scripts"], {
    cwd: consumerRoot,
    timeoutMs: 120_000,
  });
  expect(linkedCaller, linkedCaller.stderr || linkedCaller.stdout).toMatchObject({ exitCode: 0 });

  const refused = await run(nx, generatorArguments, {
    cwd: consumerRoot,
    env: { PATH: fixturePath },
    timeoutMs: 120_000,
  });
  expect(refused.exitCode).not.toBe(0);
  expect(await listGeneratedServiceFiles(serviceRoot)).toEqual(GENERATED_SERVICE_INVENTORY);
  expect(
    await Promise.all(
      GENERATED_SERVICE_INVENTORY.map((relativePath) =>
        readFile(path.join(serviceRoot, relativePath), "utf8")
      )
    )
  ).toEqual(generatedBeforeRefusal);

  const projected = await run(nx, ["show", "project", "@fixture/greeting-service", "--json"], {
    cwd: consumerRoot,
    env: { PATH: fixturePath },
    timeoutMs: 60_000,
  });
  expect(projected, projected.stderr || projected.stdout).toMatchObject({ exitCode: 0 });
  const project = JSON.parse(projected.stdout) as {
    readonly targets?: Readonly<
      Record<
        string,
        {
          readonly inputs?: readonly unknown[];
          readonly parallelism?: boolean;
        }
      >
    >;
  };
  expect(project.targets).toMatchObject({
    build: expect.any(Object),
    check: expect.any(Object),
    "check:boundaries": expect.any(Object),
    "check:policy": { parallelism: false },
    typecheck: expect.any(Object),
  });
  const serviceRootInput = "{workspaceRoot}/services/greeting";
  const serviceTargetPrefix = "habitat:application:@fixture/greeting-service:";
  const expectedServiceInputsByRule = {
    service_v2_client_lineage: [`${serviceRootInput}/src/client.ts`],
    service_v2_context_funnel: [
      `${serviceRootInput}/src/service/base.ts`,
      `${serviceRootInput}/src/service/impl.ts`,
      `${serviceRootInput}/src/service/middleware/*.ts`,
      `${serviceRootInput}/src/service/modules/*/module.ts`,
      `${serviceRootInput}/src/service/modules/*/router/*.ts`,
    ],
    service_v2_contract_authority: [`${serviceRootInput}/src/service/modules/*/contract/*.ts`],
    service_v2_contract_composition: [
      `${serviceRootInput}/src/service/contract.ts`,
      `${serviceRootInput}/src/service/modules/*/contract/index.ts`,
    ],
    service_v2_effect_bridge: [
      `${serviceRootInput}/src/client.ts`,
      `${serviceRootInput}/src/service/**/*.ts`,
    ],
    service_v2_public_face: [`${serviceRootInput}/package.json`],
    service_v2_router_composition: [
      `${serviceRootInput}/src/service/modules/*/router.ts`,
      `${serviceRootInput}/src/service/modules/*/router/*.ts`,
      `${serviceRootInput}/src/service/router.ts`,
    ],
    service_v2_source_boundary: [
      `${serviceRootInput}/src/client.ts`,
      `${serviceRootInput}/src/service/**/*.ts`,
    ],
  } as const;
  const expectedServiceTargets = [
    ...Object.keys(expectedServiceInputsByRule).map((ruleId) => `${serviceTargetPrefix}${ruleId}`),
    `${serviceTargetPrefix}service_v2_structure`,
  ].sort();
  const habitatLeafTargets = Object.entries(project.targets ?? {}).filter(([target]) =>
    target.startsWith("habitat:")
  );
  expect(habitatLeafTargets.map(([target]) => target).sort()).toEqual(expectedServiceTargets);
  expect(habitatLeafTargets.every(([, target]) => target.parallelism === false)).toBe(true);
  for (const [ruleId, expectedInputs] of Object.entries(expectedServiceInputsByRule)) {
    const serviceInputs = (
      project.targets?.[`${serviceTargetPrefix}${ruleId}`]?.inputs ?? []
    ).filter(
      (input): input is string => typeof input === "string" && input.startsWith(serviceRootInput)
    );
    expect(serviceInputs, ruleId).toEqual(expectedInputs);
    expect(serviceInputs, ruleId).not.toContain(serviceRootInput);
    expect(serviceInputs, ruleId).not.toContain(`${serviceRootInput}/**/*`);
  }
  const structureInputs = (
    project.targets?.[`${serviceTargetPrefix}service_v2_structure`]?.inputs ?? []
  ).filter(
    (input): input is string => typeof input === "string" && input.startsWith(serviceRootInput)
  );
  expect(structureInputs).toEqual([serviceRootInput, `${serviceRootInput}/**/*`]);

  const telemetryTypeConsumerPath = path.join(serviceRoot, "src/telemetry-type-consumer.ts");
  await writeFile(
    telemetryTypeConsumerPath,
    [
      'import { TelemetryAvailabilitySchema, type TelemetryAvailability } from "@habitat-ai/sdk/telemetry";',
      'export const telemetryAvailability: TelemetryAvailability = "disabled";',
      "void TelemetryAvailabilitySchema;",
      "",
    ].join("\n")
  );
  const typechecked = await run(
    nx,
    ["run", "@fixture/greeting-service:typecheck", "--outputStyle=static"],
    { cwd: consumerRoot, env: { PATH: fixturePath }, timeoutMs: 120_000 }
  );
  await rm(telemetryTypeConsumerPath);
  expect(typechecked, `${typechecked.stdout}\n${typechecked.stderr}`).toMatchObject({
    exitCode: 0,
  });

  const staleOutput = path.join(serviceRoot, "dist/stale.js");
  await mkdir(path.dirname(staleOutput), { recursive: true });
  await writeFile(staleOutput, "throw new Error('stale');\n");
  for (const target of ["build", "check:policy", "check"]) {
    const checked = await run(
      nx,
      ["run", `@fixture/greeting-service:${target}`, "--outputStyle=static", "--skipNxCache"],
      { cwd: consumerRoot, env: { PATH: fixturePath }, timeoutMs: 120_000 }
    );
    expect(checked, `${target}\n${checked.stdout}\n${checked.stderr}`).toMatchObject({
      exitCode: 0,
    });
  }
  await expect(lstat(staleOutput)).rejects.toMatchObject({ code: "ENOENT" });

  const coldClient = path.join(callerRoot, "cold-service-client.mjs");
  await writeFile(
    coldClient,
    [
      'import { createClient } from "@fixture/greeting-service/client";',
      "const client = createClient({ config: {}, deps: { greeting: {} }, scope: {} });",
      "const native = await client.greeting.greet({});",
      "console.log(JSON.stringify({ native }));",
      "",
    ].join("\n")
  );
  const invoked = await run("bun", [coldClient], { cwd: callerRoot, timeoutMs: 60_000 });
  expect(invoked, invoked.stderr || invoked.stdout).toMatchObject({
    exitCode: 0,
    stderr: "",
    stdout: '{"native":{}}\n',
  });

  const publicCheck = await run(
    nx,
    ["run", "@fixture/caller:check", "--outputStyle=static", "--skipNxCache"],
    { cwd: consumerRoot, env: { PATH: fixturePath }, timeoutMs: 120_000 }
  );
  expect(publicCheck, `${publicCheck.stdout}\n${publicCheck.stderr}`).toMatchObject({
    exitCode: 0,
  });

  await writeFile(callerSourcePath, 'import "../../../services/greeting/src/service/router.ts";\n');
  const rejectedPrivateImport = await run(
    nx,
    ["run", "@fixture/caller:check", "--outputStyle=static", "--skipNxCache"],
    { cwd: consumerRoot, env: { PATH: fixturePath }, timeoutMs: 120_000 }
  );
  expect(rejectedPrivateImport.exitCode).not.toBe(0);
  expect(`${rejectedPrivateImport.stdout}\n${rejectedPrivateImport.stderr}`).toContain(
    "Projects cannot be imported by a relative or absolute path"
  );
  await writeFile(callerSourcePath, publicClientImport);
}

async function listGeneratedServiceFiles(
  root: string,
  relativeRoot = ""
): Promise<readonly string[]> {
  const entries = await readdir(path.join(root, relativeRoot), { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      if (relativeRoot === "" && entry.name === "node_modules") return [];
      const relativePath = path.posix.join(relativeRoot, entry.name);
      if (entry.isDirectory()) return listGeneratedServiceFiles(root, relativePath);
      if (entry.isFile()) return [relativePath];
      throw new Error(`Unexpected generated service entry: ${relativePath}`);
    })
  );
  return files.flat().sort();
}

async function listFiles(root: string, relativeRoot = ""): Promise<readonly string[]> {
  const entries = await readdir(path.join(root, relativeRoot), { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.posix.join(relativeRoot, entry.name);
      if (entry.isDirectory()) return listFiles(root, relativePath);
      if (entry.isFile()) return [relativePath];
      throw new Error(`Unexpected non-file blueprint entry: ${relativePath}`);
    })
  );
  return files.flat().sort();
}

async function packPublicProducts(): Promise<void> {
  if (publishedRegistryVersion !== undefined) return;

  for (const product of products) {
    const packed = await run(
      "npm",
      [
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        path.join(acceptanceRoot, "packages"),
      ],
      { cwd: path.join(workspaceRoot, product.root) }
    );
    if (packed.exitCode !== 0) {
      throw new Error(`Could not pack ${product.name}: ${packed.stderr || packed.stdout}`);
    }
    const output: unknown = JSON.parse(packed.stdout);
    const entries = typeof output === "object" && output !== null ? Object.entries(output) : [];
    const entry =
      entries.length === 1 && entries[0]?.[0] === product.name ? entries[0][1] : undefined;
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("filename" in entry) ||
      entry.filename !== product.filename
    ) {
      throw new Error(`npm packed an unexpected ${product.name} artifact: ${packed.stdout}`);
    }
  }
}

async function startCandidateRegistry(): Promise<string> {
  const registry = (await runServer(
    {
      configPath: path.join(acceptanceRoot, "registry.config.yml"),
      storage: path.join(acceptanceRoot, "registry"),
      uplinks: {},
      packages: {
        // Candidate artifacts enter Verdaccio; public dependency traffic bypasses it.
        "@habitat-ai/*": {
          access: "$all",
          publish: "$all",
          unpublish: "$all",
        },
      },
      log: { format: "pretty", level: "warn", type: "stdout" },
      publish: { allow_offline: true },
    },
    { listenArg: "http://127.0.0.1:0" }
  )) as Server;
  localRegistry = registry;
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    registry.once("error", onError);
    registry.listen(0, "127.0.0.1", () => {
      registry.off("error", onError);
      resolve();
    });
  });
  const address = registry.address();
  if (address === null || typeof address === "string") {
    throw new Error("Verdaccio did not bind a local TCP address.");
  }
  const registryUrl = `http://127.0.0.1:${address.port}`;
  const npmConfig = path.join(acceptanceRoot, "runtime", "config", ".npmrc");
  await writeFile(
    npmConfig,
    [
      `registry=${PUBLIC_NPM_REGISTRY}/`,
      `@habitat-ai:registry=${registryUrl}/`,
      `//127.0.0.1:${address.port}/:_authToken=habitat-acceptance`,
      "",
    ].join("\n")
  );
  process.env.NPM_CONFIG_USERCONFIG = npmConfig;
  delete process.env.NPM_CONFIG_REGISTRY;
  delete process.env.npm_config_registry;
  delete process.env.BUN_CONFIG_REGISTRY;
  delete process.env.BUN_CONFIG_TOKEN;
  return registryUrl;
}

async function stopCandidateRegistry(): Promise<void> {
  const registry = localRegistry;
  localRegistry = undefined;
  if (registry === undefined || !registry.listening) return;
  await new Promise<void>((resolve, reject) => {
    registry.close((error) => {
      if (error !== undefined) reject(error);
      else resolve();
    });
    registry.closeAllConnections();
  });
}

async function publishCandidateProducts(registryUrl: string): Promise<void> {
  for (const product of products) {
    const published = await run(
      "npm",
      [
        "publish",
        path.join(acceptanceRoot, "packages", product.filename),
        "--access",
        "public",
        "--ignore-scripts",
        `--registry=${registryUrl}`,
      ],
      { cwd: acceptanceRoot, timeoutMs: 120_000 }
    );
    if (published.exitCode !== 0) {
      throw new Error(
        `Could not publish candidate ${product.name}: ${published.stderr || published.stdout}`
      );
    }
  }
}

async function createConsumer(): Promise<void> {
  const devDependencies = { nx: "23.1.1" };
  const subjectCount = process.platform === "win32" ? 64 : 1_815;
  const subjectIds = Array.from(
    { length: subjectCount },
    (_, index) => `subject-${String(index).padStart(4, "0")}-${"x".repeat(64)}`
  );
  const relativeSubjectPaths = subjectIds.map(
    (subjectId) => `packages/grit-acceptance/src/${subjectId}.ts`
  );
  const ignoredCompatibilitySubjectPath = "packages/grit-compatibility/src/ignored.ts";
  gritSubjectPaths = relativeSubjectPaths.map((relativePath) =>
    path.join(consumerRoot, relativePath)
  );
  const files: Readonly<Record<string, string>> = {
    ".gitignore": [
      "node_modules/",
      "dist/",
      ".nx/",
      ".habitat/cache/",
      ignoredCompatibilitySubjectPath,
      "",
    ].join("\n"),
    ".habitat/blueprints/grit-acceptance/blueprint.toml": gritAcceptanceBlueprintToml(),
    ".habitat/blueprints/grit-acceptance/no-forbidden.md":
      "# No forbidden calls\n\n```grit\nlanguage js(typescript)\n`forbidden()`\n```\n",
    ".habitat/blueprints/grit-pattern/require_grit_compatibility_inventory_acceptance/baseline.json":
      "[]\n",
    ".habitat/blueprints/grit-pattern/require_grit_compatibility_inventory_acceptance/pattern.md":
      "# Require Grit Compatibility Inventory Acceptance\n\n```grit\nlanguage js(typescript)\n`forbidden()`\n```\n",
    ".habitat/blueprints/grit-pattern/require_grit_compatibility_inventory_acceptance/rule.json":
      gritCompatibilityInventoryAcceptanceRuleJson(),
    ".habitat/blueprints/root-pattern-acceptance/blueprint.toml":
      rootPatternAcceptanceBlueprintToml(),
    ".habitat/blueprints/root-pattern-acceptance/no-forbidden.md":
      "# No forbidden calls\n\n```grit\nlanguage js(typescript)\n`forbidden()`\n```\n",
    ".habitat/index.json": `${JSON.stringify(
      { schemaVersion: 2, ownerRoots: { habitat: "scripts/habitat" } },
      null,
      2
    )}\n`,
    "hook-check.mjs": `import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const root = new URL(".hook-check-repository/", import.meta.url);
mkdirSync(root, { recursive: true });
execFileSync("git", ["init", "--quiet"], { cwd: root });
execFileSync("git", ["config", "user.name", "nested-fixture"], { cwd: root });
`,
    "nx.json": "{}\n",
    "package.json": `${JSON.stringify(
      {
        name: "habitat-installed-consumer",
        private: true,
        type: "module",
        packageManager: "bun@1.3.14",
        workspaces: ["apps/*", "packages/*", "services/*", "tools/*"],
        scripts: { check: "nx run-many -t check" },
        devDependencies,
      },
      null,
      2
    )}\n`,
    "packages/example/habitat.toml": instanceToml(),
    "packages/example/package.json": `${JSON.stringify(
      { name: "@fixture/package", private: true, version: "0.0.0" },
      null,
      2
    )}\n`,
    "packages/example/project.json": `${JSON.stringify(
      {
        name: "@fixture/package",
        projectType: "library",
        sourceRoot: "packages/example/src",
      },
      null,
      2
    )}\n`,
    "packages/example/src/index.ts": "export const installed = true;\n",
    "packages/example/tsconfig.json": `${JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          target: "ES2022",
        },
        include: ["src/**/*.ts"],
      },
      null,
      2
    )}\n`,
    "packages/grit-acceptance/habitat.toml": gritAcceptanceInstanceToml(subjectIds),
    "packages/grit-acceptance/package.json": `${JSON.stringify(
      { name: "@fixture/grit-acceptance", private: true, version: "0.0.0" },
      null,
      2
    )}\n`,
    "packages/grit-acceptance/project.json": `${JSON.stringify(
      {
        name: "@fixture/grit-acceptance",
        projectType: "library",
        sourceRoot: "packages/grit-acceptance/src",
      },
      null,
      2
    )}\n`,
    "packages/grit-compatibility/package.json": `${JSON.stringify(
      { name: "@fixture/grit-compatibility", private: true, version: "0.0.0" },
      null,
      2
    )}\n`,
    "packages/grit-compatibility/project.json": `${JSON.stringify(
      {
        name: "@fixture/grit-compatibility",
        projectType: "library",
        sourceRoot: "packages/grit-compatibility/src",
      },
      null,
      2
    )}\n`,
    [ignoredCompatibilitySubjectPath]: "forbidden();\n",
    "packages/grit-compatibility/src/visible.ts": "allowed();\n",
    "packages/root-pattern-acceptance/habitat.toml": rootPatternAcceptanceInstanceToml(),
    "packages/root-pattern-acceptance/package.json": `${JSON.stringify(
      { name: "@fixture/root-pattern-acceptance", private: true, version: "0.0.0" },
      null,
      2
    )}\n`,
    "packages/root-pattern-acceptance/project.json": `${JSON.stringify(
      {
        name: "@fixture/root-pattern-acceptance",
        projectType: "library",
        sourceRoot: "packages/root-pattern-acceptance/src",
      },
      null,
      2
    )}\n`,
    "packages/root-pattern-acceptance/src/included.ts": "allowed();\n",
    "packages/root-pattern-acceptance/test/excluded.ts": "forbidden();\n",
    "packages/resource-v2-acceptance/contract.ts":
      "export type AcceptanceResource = { readonly ready: true };\n",
    "packages/resource-v2-acceptance/habitat.toml": resourceV2AcceptanceInstanceToml(),
    "packages/resource-v2-acceptance/package.json": `${JSON.stringify(
      { name: "@fixture/resource-v2-acceptance", private: true, version: "0.0.0" },
      null,
      2
    )}\n`,
    "packages/resource-v2-acceptance/providers/acceptance/index.ts":
      "export const acceptanceProvider = { ready: true } as const;\n",
    "packages/resource-v2-acceptance/project.json": `${JSON.stringify(
      {
        name: "@fixture/resource-v2-acceptance",
        projectType: "library",
        sourceRoot: "packages/resource-v2-acceptance",
      },
      null,
      2
    )}\n`,
    "packages/resource-v2-acceptance/tsconfig.build.json": `${JSON.stringify(
      { extends: "./tsconfig.json", exclude: ["test"] },
      null,
      2
    )}\n`,
    "packages/resource-v2-acceptance/tsconfig.json": `${JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          target: "ES2022",
        },
        include: ["contract.ts", "providers/**/*.ts"],
      },
      null,
      2
    )}\n`,
    "tools/hook-check/project.json": `${JSON.stringify(
      {
        name: "@fixture/hook-check",
        root: "tools/hook-check",
        tags: ["type:tool", "role:acceptance-fixture"],
        targets: {
          check: {
            executor: "nx:run-commands",
            cache: false,
            options: { command: "node hook-check.mjs" },
          },
        },
      },
      null,
      2
    )}\n`,
    "tools/hook-check/src/index.ts": "export const customRoot = true;\n",
  };

  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(consumerRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents);
  }

  for (let index = 0; index < relativeSubjectPaths.length; index += 128) {
    await Promise.all(
      relativeSubjectPaths.slice(index, index + 128).map(async (relativePath) => {
        const absolutePath = path.join(consumerRoot, relativePath);
        await mkdir(path.dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, "allowed();\n");
      })
    );
  }

  const initialized = await run("git", ["init", "--quiet"], { cwd: consumerRoot });
  if (initialized.exitCode !== 0) {
    throw new Error(`Could not initialize installed fixture: ${initialized.stderr}`);
  }
  const configured = await run("git", ["config", "user.name", "outer-fixture"], {
    cwd: consumerRoot,
  });
  if (configured.exitCode !== 0) {
    throw new Error(`Could not configure installed fixture: ${configured.stderr}`);
  }
}

async function installConsumer(): Promise<void> {
  const installed = await run("bun", ["install", "--ignore-scripts"], {
    cwd: consumerRoot,
    timeoutMs: 180_000,
  });
  if (installed.exitCode !== 0) {
    throw new Error(`Could not install bare Nx consumer: ${installed.stderr || installed.stdout}`);
  }
}

async function removeOwnedFixture(root: string): Promise<void> {
  const stats = await lstat(root);
  const canonical = await realpath(root);
  const basename = path.basename(canonical);
  const suffix = basename.slice(FIXTURE_PREFIX.length);
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    canonical !== root ||
    path.dirname(canonical) !== temporaryParent ||
    !basename.startsWith(FIXTURE_PREFIX) ||
    suffix.length !== 6 ||
    !/^[A-Za-z0-9]+$/u.test(suffix)
  ) {
    throw new Error(`Refusing to remove unexpected installed-package fixture: ${root}`);
  }
  await rm(canonical, { recursive: true, force: false });
}

async function run(
  executable: string,
  args: readonly string[],
  options: {
    readonly cwd?: string;
    readonly env?: NodeJS.ProcessEnv;
    readonly timeoutMs?: number;
  } = {}
): Promise<CommandResult> {
  const runtimeRoot = path.join(acceptanceRoot, "runtime");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    BUN_INSTALL_CACHE_DIR: path.join(runtimeRoot, "cache", "bun"),
    HOME: path.join(runtimeRoot, "home"),
    NO_COLOR: "1",
    NX_DAEMON: "false",
    NX_ISOLATE_PLUGINS: "false",
    PATH: `${path.join(consumerRoot, "node_modules/.bin")}${path.delimiter}${process.env.PATH ?? ""}`,
    TMPDIR: path.join(runtimeRoot, "tmp"),
    XDG_CACHE_HOME: path.join(runtimeRoot, "cache"),
    XDG_CONFIG_HOME: path.join(runtimeRoot, "config"),
    XDG_DATA_HOME: path.join(runtimeRoot, "data"),
  };
  for (const name of gitLocalEnvironmentVariables) delete env[name];
  Object.assign(env, options.env);
  delete env.FORCE_COLOR;
  // Release dry-runs must not turn disposable consumer initialization into a no-op.
  delete env.NX_DRY_RUN;

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd ?? workspaceRoot,
      env,
      shell: process.platform === "win32",
    });
    const stdout: string[] = [];
    const stderr: string[] = [];
    let settled = false;
    const settle = (finish: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      finish();
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      settle(() => reject(new Error(`${executable} exceeded its acceptance timeout.`)));
    }, options.timeoutMs ?? 30_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => stdout.push(chunk));
    child.stderr.on("data", (chunk: string) => stderr.push(chunk));
    child.on("error", (error) => settle(() => reject(error)));
    child.on("close", (exitCode) =>
      settle(() =>
        resolve({
          exitCode: exitCode ?? 1,
          stderr: stderr.join(""),
          stdout: stdout.join(""),
        })
      )
    );
  });
}

function instanceToml(): string {
  return `schemaVersion = 1
id = "installed-package"
ownerProject = "@fixture/package"
blueprint = "package"
blueprintVersion = 1

[roots]
project = "packages/example"

[selections]
`;
}

function gritAcceptanceBlueprintToml(): string {
  return `schemaVersion = 1
id = "grit-acceptance"
version = 1

[[rules]]
id = "grit_acceptance_no_forbidden"
lane = "enforced"
message = "Grit acceptance subjects must not call forbidden()."
remediate = "Remove the forbidden call."

[rules.runner]
name = "grit"
pattern = "no-forbidden.md"
patternName = "grit_acceptance_no_forbidden"

[rules.runner.acquisition]
kind = "check"
rootRoles = []
selections = ["subjects"]

[instance]
manifest = "habitat.toml"
anchorRoot = "project"

[[instance.roots]]
id = "project"
required = true
kind = "directory"

[[instance.selections]]
id = "subjects"
root = "project"
kind = "file"
memberPattern = "^[a-z][a-z0-9-]*$"
pathTemplate = "src/{member}.ts"
`;
}

function gritAcceptanceInstanceToml(subjectIds: readonly string[]): string {
  return `schemaVersion = 1
id = "grit-acceptance"
ownerProject = "@fixture/grit-acceptance"
blueprint = "grit-acceptance"
blueprintVersion = 1

[roots]
project = "packages/grit-acceptance"

[selections]
subjects = ${JSON.stringify(subjectIds)}
`;
}

function gritCompatibilityInventoryAcceptanceRuleJson(): string {
  const ruleRoot =
    ".habitat/blueprints/grit-pattern/require_grit_compatibility_inventory_acceptance";
  return `${JSON.stringify(
    {
      schemaVersion: 2,
      id: "require_grit_compatibility_inventory_acceptance",
      title: "Require Grit Compatibility Inventory Acceptance",
      placement: { niche: "habitat", blueprint: "grit-pattern", category: "quality" },
      operation: { kind: "check" },
      ownerProject: "habitat",
      lane: "enforced",
      forbids: "an ignored compatibility subject entering Grit evaluation",
      why: "Compatibility acquisition must use the repository's Git-visible source inventory.",
      remediate:
        "Exclude ignored subjects by acquiring compatibility coverage from source inventory.",
      message: "Ignored compatibility subjects must not enter Grit evaluation.",
      pathCoverage: [{ kind: "exact-path", patterns: ["packages/grit-compatibility/src/*.ts"] }],
      hookCheck: true,
      supportFiles: { baseline: `${ruleRoot}/baseline.json` },
      runner: {
        name: "grit",
        files: { pattern: `${ruleRoot}/pattern.md` },
        patternName: "require_grit_compatibility_inventory_acceptance",
        acquisition: { kind: "check", roots: ["packages/grit-compatibility"] },
      },
    },
    null,
    2
  )}\n`;
}

function rootPatternAcceptanceBlueprintToml(): string {
  return `schemaVersion = 1
id = "root-pattern-acceptance"
version = 3

[[rules]]
id = "root_pattern_acceptance_no_forbidden"
lane = "enforced"
message = "Root-pattern acceptance subjects must not call forbidden()."
remediate = "Remove the forbidden call."

[rules.runner]
name = "grit"
pattern = "no-forbidden.md"
patternName = "root_pattern_acceptance_no_forbidden"

[rules.runner.acquisition]
kind = "check"
rootRoles = []
selections = []
rootPatterns = [{ rootRole = "project", patterns = ["src/**/*.ts"] }]

[instance]
manifest = "habitat.toml"
anchorRoot = "project"
selections = []

[[instance.roots]]
id = "project"
required = true
kind = "directory"
`;
}

function rootPatternAcceptanceInstanceToml(): string {
  return `schemaVersion = 1
id = "root-pattern-acceptance"
ownerProject = "@fixture/root-pattern-acceptance"
blueprint = "root-pattern-acceptance"
blueprintVersion = 3

[roots]
project = "packages/root-pattern-acceptance"

[selections]
`;
}

function resourceV2AcceptanceInstanceToml(): string {
  return `schemaVersion = 1
id = "resource-v2-acceptance"
ownerProject = "@fixture/resource-v2-acceptance"
blueprint = "resource"
blueprintVersion = 2

[roots]
project = "packages/resource-v2-acceptance"

[selections]
`;
}
