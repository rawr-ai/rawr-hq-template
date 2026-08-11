import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
import * as ts from "typescript";
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

type PackedProductManifest = Readonly<Record<string, unknown>>;

const FIXTURE_PREFIX = "habitat-installed-package-";
const PUBLIC_NPM_REGISTRY = "https://registry.npmjs.org";
const CANDIDATE_VERSION = "0.5.15";
const ABSENT_VENDOR_PACKAGES = ["elysia", "inngest"] as const;
const PACKAGE_DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
  "optionalDependencies",
  "bundledDependencies",
  "bundleDependencies",
] as const;
const PACKAGE_LOAD_PATH_FIELDS = [
  "exports",
  "imports",
  "main",
  "module",
  "browser",
  "bin",
  "types",
  "typesVersions",
] as const;
const PUBLIC_JAVASCRIPT_EXPORTS = {
  "@habitat-ai/cli": ["@habitat-ai/cli/command", "@habitat-ai/cli/nx-plugin"],
  "@habitat-ai/sdk": [
    "@habitat-ai/sdk",
    "@habitat-ai/sdk/app",
    "@habitat-ai/sdk/effect",
    "@habitat-ai/sdk/execution",
    "@habitat-ai/sdk/service",
    "@habitat-ai/sdk/service/schema",
    "@habitat-ai/sdk/plugins/server",
    "@habitat-ai/sdk/plugins/server/effect",
    "@habitat-ai/sdk/plugins/async",
    "@habitat-ai/sdk/plugins/async/effect",
    "@habitat-ai/sdk/plugins/web",
    "@habitat-ai/sdk/runtime/resources",
    "@habitat-ai/sdk/runtime/providers",
    "@habitat-ai/sdk/runtime/providers/effect",
    "@habitat-ai/sdk/runtime/profiles",
    "@habitat-ai/sdk/runtime/derivation",
    "@habitat-ai/sdk/runtime/schema",
    "@habitat-ai/sdk/telemetry",
  ],
} as const satisfies Readonly<Record<PublicProduct["name"], readonly string[]>>;
const PACKED_BLUEPRINT_DIRECTORIES = [
  "app",
  "package",
  "plugin",
  "plugin-nx",
  "provider",
  "resource",
  "runtime-compiler",
  "runtime-definition",
  "runtime-derivation",
  "service",
] as const;
const RUNTIME_COMPILER_V1_CLOSURE = [
  "runtime-compiler/blueprint.toml",
  "runtime-compiler/skill.md",
  "runtime-compiler/structure.toml",
] as const;
const RUNTIME_DERIVATION_RUNTIME_EXPORTS = [
  "PortableRuntimePlanArtifactSchema",
  "decodePortableRuntimePlanArtifact",
  "deriveRuntimeArtifacts",
] as const;
const RUNTIME_DERIVATION_TYPE_EXPORTS = [
  "DerivationFinding",
  "DerivedRoleSurfaceIndex",
  "ExecutionDescriptorRef",
  "ExecutionDescriptorTable",
  "NormalizedAppDefinition",
  "NormalizedPluginDefinition",
  "NormalizedPluginIdentity",
  "NormalizedResourceRequirementIdentity",
  "NormalizedRuntimeProfile",
  "NormalizedRuntimeTopology",
  "NormalizedRuntimeTopologyEdge",
  "NormalizedSemanticDependency",
  "NormalizedServiceDependency",
  "NormalizedServiceUse",
  "NormalizedSurfaceRequirement",
  "PortableRuntimePlanArtifact",
  "ProviderSelection",
  "ResourceRequirement",
  "RuntimeDerivationInput",
  "RuntimeDerivationResult",
  "ServiceBindingPlan",
  "SurfaceRuntimePlan",
  "WebRouteModuleRef",
  "WebRouteModuleTable",
  "WebRouteModuleTableEntry",
  "WorkflowDispatcherDescriptor",
] as const;
const IMMUTABLE_APP_V1_SHA256 = {
  "app/blueprint.toml": "897149c9bcd188d959222fad314372bebcc31e4c835c8a6ae906bd40b153b776",
  "app/skill.md": "244846de684e4f8cdbb2c1c0ab3a93010914e1031ce7b791443d84fb2cd2e254",
  "app/structure.toml": "39353121c563732527f9ba49b6b081feb9e83402dbf4952a1750323138ce8165",
} as const;
const RUNTIME_DEFINITION_CLOSURES = {
  runtimeDefinition1: {
    excludedInventoryPrefixes: ["versions/"],
    files: [
      "runtime-definition/blueprint.toml",
      "runtime-definition/skill.md",
      "runtime-definition/structure.toml",
    ],
    inventoryRoot: "runtime-definition",
    sha256: {
      "runtime-definition/blueprint.toml":
        "6d4d741d07289a3e8f2d2c433deded004a2f955b1be59c1b778f3311b359040c",
      "runtime-definition/skill.md":
        "c8ed34639a1c22aac41d4d7957e6462a452980984c29f36d99cf80296c1e9029",
      "runtime-definition/structure.toml":
        "873fc84965ee72ae0297a884bf0036aa8e3af6b89193e158c175038a42572b6d",
    },
  },
  runtimeDefinition2: {
    excludedInventoryPrefixes: [],
    files: [
      "runtime-definition/versions/2/blueprint.toml",
      "runtime-definition/versions/2/structure.toml",
    ],
    inventoryRoot: "runtime-definition/versions/2",
  },
} as const;
const RUNTIME_DERIVATION_CLOSURES = {
  runtimeDerivation1: {
    excludedInventoryPrefixes: ["versions/"],
    files: [
      "runtime-derivation/blueprint.toml",
      "runtime-derivation/skill.md",
      "runtime-derivation/structure.toml",
    ],
    inventoryRoot: "runtime-derivation",
    sha256: {
      "runtime-derivation/blueprint.toml":
        "1d12c5cfa64ffc7f07226a3d1eb227d68f2525c4a1dec1c05ade8419e774049e",
      "runtime-derivation/skill.md":
        "eee577a525167ff0cda0025d409bf51f4b31647df17538abe844cb56d7091b91",
      "runtime-derivation/structure.toml":
        "3b967abc5e303d436712828cbcae1591be2d62c272f446c0a9e998061cca32ea",
    },
  },
  runtimeDerivation2: {
    excludedInventoryPrefixes: [],
    files: [
      "runtime-derivation/versions/2/blueprint.toml",
      "runtime-derivation/versions/2/structure.toml",
    ],
    inventoryRoot: "runtime-derivation/versions/2",
  },
} as const;
const IMMUTABLE_SERVICE_CLOSURES = {
  service1: {
    excludedInventoryPrefixes: ["versions/"],
    files: [
      "service/README.md",
      "service/blueprint.toml",
      "service/components/contract/authority.md",
      "service/components/contract/composition.md",
      "service/components/funnel/context.md",
      "service/components/funnel/effect-bridge.md",
      "service/components/funnel/router.md",
      "service/components/funnel/source-boundary.md",
      "service/components/spine/client-lineage.md",
      "service/components/spine/public-face.md",
      "service/skill.md",
      "service/structure.toml",
    ],
    inventoryRoot: "service",
    sha256: "08c4e3bdbc936ddde1ee32706ced327eb17a7d46f03fb6da36985861af34d99e",
  },
  service2: {
    excludedInventoryPrefixes: [],
    files: [
      "service/versions/2/blueprint.toml",
      "service/versions/2/components/contract/authority.md",
      "service/versions/2/components/contract/composition.md",
      "service/versions/2/components/funnel/context.md",
      "service/versions/2/components/funnel/effect-bridge.md",
      "service/versions/2/components/funnel/router.md",
      "service/versions/2/components/funnel/source-boundary.md",
      "service/versions/2/components/spine/client-lineage.md",
      "service/versions/2/components/spine/public-face.md",
      "service/versions/2/structure.toml",
    ],
    inventoryRoot: "service/versions/2",
    sha256: "2a94d39de52bbb8bf80f54342b41e8b8a0f5f93730bfb6b940a5ef8ec7d543e4",
  },
} as const;
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
const sdkVersion = await readPackageVersion("packages/core/sdk");
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
    root: "packages/core/sdk",
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
        bunToolchain: [
          "{workspaceRoot}/package.json",
          "{workspaceRoot}/bun.lock",
          "{workspaceRoot}/bunfig.toml",
        ],
        production: [
          "default",
          "!{projectRoot}/test/**",
          "!{projectRoot}/**/*.test.*",
          "!{projectRoot}/**/*.spec.*",
        ],
        typescriptRuntime: ["bunToolchain", "{workspaceRoot}/tsconfig.base.json"],
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
      const packedManifest = JSON.parse(manifestText) as PackedProductManifest;
      expect(manifestText).not.toContain("workspace:");
      expect(packedManifest).toMatchObject({
        name: product.name,
        version: product.version,
      });
      assertPackedManifestExcludesVendors(packedManifest, product.name);
      expect(publicJavaScriptExportSpecifiers(packedManifest, product.name)).toEqual(
        PUBLIC_JAVASCRIPT_EXPORTS[product.name]
      );
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
    ) as {
      readonly dependencies?: Readonly<Record<string, string>>;
      readonly exports?: Readonly<
        Record<
          string,
          | {
              readonly default?: string;
              readonly import?: string;
              readonly types?: string;
            }
          | string
        >
      >;
    };
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
    expect(sdkManifest.exports?.["./runtime/providers"]).toEqual({
      types: "./dist/runtime/providers/index.d.ts",
      import: "./dist/runtime/providers/index.js",
      default: "./dist/runtime/providers/index.js",
    });
    expect(sdkManifest.exports?.["./runtime/providers/effect"]).toEqual({
      types: "./dist/runtime/providers/effect/index.d.ts",
      import: "./dist/runtime/providers/effect/index.js",
      default: "./dist/runtime/providers/effect/index.js",
    });
    const derivationExport = sdkManifest.exports?.["./runtime/derivation"];
    if (typeof derivationExport !== "object" || derivationExport.types === undefined) {
      throw new TypeError("Installed SDK derivation export must declare its type entrypoint.");
    }
    expect(
      inspectTypeScriptModuleExports(path.resolve(installedSdkRoot, derivationExport.types))
    ).toEqual({
      graphFields: [
        "app",
        "executionDescriptorRefs",
        "findings",
        "kind",
        "plugins",
        "profile",
        "resourceRequirements",
        "roleSurfaceIndex",
        "semanticDependencies",
        "serviceBindingPlans",
        "serviceDependencies",
        "serviceUses",
        "surfaceRuntimePlans",
        "topology",
        "webRouteModuleRefs",
        "workflowDispatcherDescriptors",
      ],
      resultFields: [
        "executionDescriptorTable",
        "graph",
        "portableArtifact",
        "topology",
        "webRouteModuleTable",
      ],
      runtime: RUNTIME_DERIVATION_RUNTIME_EXPORTS,
      types: RUNTIME_DERIVATION_TYPE_EXPORTS,
    });

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
    const consumerRequire = createRequire(path.join(consumerRoot, "package.json"));
    for (const vendorPackage of ABSENT_VENDOR_PACKAGES) {
      expect(
        resolvePackageIfPresent(consumerRequire, vendorPackage),
        vendorPackage
      ).toBeUndefined();
    }
    await assertInstalledWebProjection(generatedServiceRoot);
    await assertInstalledRuntimeDerivation(generatedServiceRoot);
    await assertInstalledProviderAuthoring(generatedServiceRoot);

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
        'const serverPlugins = await import("@habitat-ai/sdk/plugins/server");',
        'const { os } = await import("@orpc/server");',
        "const serverEffectBefore = typeof os.effect;",
        'const serverEffect = await import("@habitat-ai/sdk/plugins/server/effect");',
        "const serverEffectAfter = typeof os.effect;",
        'const app = await import("@habitat-ai/sdk/app");',
        'const effect = await import("@habitat-ai/sdk/effect");',
        'const execution = await import("@habitat-ai/sdk/execution");',
        'const service = await import("@habitat-ai/sdk/service");',
        'const schema = await import("@habitat-ai/sdk/service/schema");',
        'const sdk = await import("@habitat-ai/sdk");',
        'const asyncPlugins = await import("@habitat-ai/sdk/plugins/async");',
        'const asyncEffect = await import("@habitat-ai/sdk/plugins/async/effect");',
        'const derivation = await import("@habitat-ai/sdk/runtime/derivation");',
        'const resources = await import("@habitat-ai/sdk/runtime/resources");',
        'const providers = await import("@habitat-ai/sdk/runtime/providers");',
        'const providerEffect = await import("@habitat-ai/sdk/runtime/providers/effect");',
        'const profiles = await import("@habitat-ai/sdk/runtime/profiles");',
        'const runtimeSchema = await import("@habitat-ai/sdk/runtime/schema");',
        'const telemetry = await import("@habitat-ai/sdk/telemetry");',
        'await import("@habitat-ai/sdk/package.json", { with: { type: "json" } });',
        'await import("@habitat-ai/sdk/habitat-pack.json", { with: { type: "json" } });',
        "console.log(JSON.stringify({ app: Object.keys(app).sort(), asyncEffect: Object.keys(asyncEffect).sort(), asyncPlugins: Object.keys(asyncPlugins).sort(), derivation: Object.keys(derivation).sort(), effect: Object.keys(effect).sort(), execution: Object.keys(execution).sort(), profiles: Object.keys(profiles).sort(), providerEffect: Object.keys(providerEffect).sort(), providers: Object.keys(providers).sort(), resources: Object.keys(resources).sort(), runtimeSchema: Object.keys(runtimeSchema).sort(), sdk: Object.keys(sdk), schema: Object.keys(schema), serverEffect: Object.keys(serverEffect).sort(), serverEffectAfter, serverEffectBefore, serverPlugins: Object.keys(serverPlugins).sort(), service: Object.keys(service).sort(), telemetry: Object.keys(telemetry).sort() }));",
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
      app: ["defineApp", "defineEntrypoint", "defineProcessCatalog", "runtimeLaunchIdentity"],
      asyncEffect: ["defineAsyncStepEffect"],
      asyncPlugins: [
        "defineAsyncConsumerPlugin",
        "defineAsyncSchedulePlugin",
        "defineAsyncWorkflowPlugin",
        "defineConsumer",
        "defineSchedule",
        "defineWorkflow",
        "useService",
      ],
      derivation: [
        "PortableRuntimePlanArtifactSchema",
        "decodePortableRuntimePlanArtifact",
        "deriveRuntimeArtifacts",
      ],
      effect: ["Effect", "TaggedError"],
      execution: [],
      profiles: ["defineRuntimeProfile", "providerSelection"],
      providerEffect: ["providerFx"],
      providers: ["defineRuntimeProvider"],
      resources: ["defineRuntimeResource", "requireResource"],
      runtimeSchema: [
        "RuntimeLifecyclePhaseSchema",
        "RuntimeObservationRecordSchema",
        "RuntimeSchema",
      ],
      sdk: ["createHabitatClientForWorkspace"],
      schema: ["standard"],
      serverEffect: [],
      serverEffectAfter: "function",
      serverEffectBefore: "undefined",
      serverPlugins: [
        "defineServerApiPlugin",
        "defineServerInternalPlugin",
        "implementServerApiPlugin",
        "implementServerInternalPlugin",
        "useService",
      ],
      service: [
        "createAnalyticsMiddlewareCallback",
        "createObservabilityMiddlewareCallback",
        "defineService",
        "getProcedureMetadata",
        "procedureMetadata",
        "resourceDep",
        "semanticDep",
        "serviceDep",
        "useService",
      ],
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

    for (const product of products) {
      const callerRoot = product.name === "@habitat-ai/cli" ? consumerRoot : generatedServiceRoot;
      for (const specifier of PUBLIC_JAVASCRIPT_EXPORTS[product.name]) {
        await assertColdPublicJavaScriptExport(callerRoot, specifier);
      }
    }

    expect(await readFile(path.join(installedCliRoot, "dist/command.js"))).toEqual(
      await readFile(path.join(workspaceRoot, "apps/habitat/dist/command.js"))
    );

    const installedPackPath = generatedServiceRequire.resolve("@habitat-ai/sdk/habitat-pack.json");
    const installedBlueprintPath = generatedServiceRequire.resolve(
      "@habitat-ai/sdk/blueprints/package/blueprint.toml"
    );
    const installedPack = JSON.parse(await readFile(installedPackPath, "utf8")) as {
      readonly blueprints?: readonly {
        readonly id?: unknown;
        readonly version?: unknown;
      }[];
      readonly protocolVersion?: unknown;
    };
    expect(installedPack).toEqual(
      JSON.parse(
        await readFile(path.join(workspaceRoot, "packages/core/sdk/habitat-pack.json"), "utf8")
      )
    );
    expect(installedPack.protocolVersion).toBe(1);
    expect(installedPack.blueprints?.map(({ id, version }) => `${id}@${version}`)).toEqual([
      "app@1",
      "package@1",
      "plugin@1",
      "plugin-nx@1",
      "provider@1",
      "resource@1",
      "resource@2",
      "runtime-compiler@1",
      "runtime-definition@1",
      "runtime-definition@2",
      "runtime-derivation@1",
      "runtime-derivation@2",
      "service@1",
      "service@2",
      "service@3",
    ]);

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
      "runtime-definition/versions/2/structure.toml",
      "runtime-derivation/versions/2/structure.toml",
      "service/versions/2/structure.toml",
      "service/versions/3/structure.toml",
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
    for (const [relativePath, expectedSha256] of Object.entries(IMMUTABLE_APP_V1_SHA256)) {
      expect(await sha256File(path.join(canonicalBlueprintRoot, relativePath)), relativePath).toBe(
        expectedSha256
      );
      expect(await sha256File(path.join(installedBlueprintRoot, relativePath)), relativePath).toBe(
        expectedSha256
      );
    }
    for (const blueprintRoot of [canonicalBlueprintRoot, installedBlueprintRoot]) {
      const compilerClosure = (await listFiles(path.join(blueprintRoot, "runtime-compiler")))
        .map((relativePath) => path.posix.join("runtime-compiler", relativePath))
        .sort();
      expect(compilerClosure, blueprintRoot).toEqual([...RUNTIME_COMPILER_V1_CLOSURE]);
    }
    for (const relativePath of RUNTIME_COMPILER_V1_CLOSURE) {
      expect(await readFile(path.join(installedBlueprintRoot, relativePath)), relativePath).toEqual(
        await readFile(path.join(canonicalBlueprintRoot, relativePath))
      );
    }
    for (const closure of Object.values(RUNTIME_DEFINITION_CLOSURES)) {
      for (const blueprintRoot of [canonicalBlueprintRoot, installedBlueprintRoot]) {
        const closureInventory = (await listFiles(path.join(blueprintRoot, closure.inventoryRoot)))
          .filter(
            (relativePath) =>
              !closure.excludedInventoryPrefixes.some((prefix) => relativePath.startsWith(prefix))
          )
          .map((relativePath) => path.posix.join(closure.inventoryRoot, relativePath))
          .sort();
        expect(closureInventory, closure.inventoryRoot).toEqual([...closure.files].sort());
      }
      for (const relativePath of closure.files) {
        expect(
          await readFile(path.join(installedBlueprintRoot, relativePath)),
          relativePath
        ).toEqual(await readFile(path.join(canonicalBlueprintRoot, relativePath)));
      }
      if ("sha256" in closure) {
        for (const [relativePath, expectedSha256] of Object.entries(closure.sha256)) {
          expect(
            await sha256File(path.join(canonicalBlueprintRoot, relativePath)),
            relativePath
          ).toBe(expectedSha256);
          expect(
            await sha256File(path.join(installedBlueprintRoot, relativePath)),
            relativePath
          ).toBe(expectedSha256);
        }
      }
    }
    for (const closure of Object.values(RUNTIME_DERIVATION_CLOSURES)) {
      for (const blueprintRoot of [canonicalBlueprintRoot, installedBlueprintRoot]) {
        const closureInventory = (await listFiles(path.join(blueprintRoot, closure.inventoryRoot)))
          .filter(
            (relativePath) =>
              !closure.excludedInventoryPrefixes.some((prefix) => relativePath.startsWith(prefix))
          )
          .map((relativePath) => path.posix.join(closure.inventoryRoot, relativePath))
          .sort();
        expect(closureInventory, closure.inventoryRoot).toEqual([...closure.files].sort());
      }
      if ("sha256" in closure) {
        for (const [relativePath, expectedSha256] of Object.entries(closure.sha256)) {
          expect(
            await sha256File(path.join(canonicalBlueprintRoot, relativePath)),
            relativePath
          ).toBe(expectedSha256);
          expect(
            await sha256File(path.join(installedBlueprintRoot, relativePath)),
            relativePath
          ).toBe(expectedSha256);
        }
      }
    }
    for (const { excludedInventoryPrefixes, files, inventoryRoot, sha256 } of Object.values(
      IMMUTABLE_SERVICE_CLOSURES
    )) {
      for (const blueprintRoot of [canonicalBlueprintRoot, installedBlueprintRoot]) {
        const closureInventory = (await listFiles(path.join(blueprintRoot, inventoryRoot)))
          .filter(
            (relativePath) =>
              !excludedInventoryPrefixes.some((prefix) => relativePath.startsWith(prefix))
          )
          .map((relativePath) => path.posix.join(inventoryRoot, relativePath))
          .sort();
        expect(closureInventory, inventoryRoot).toEqual([...files].sort());
      }
      expect(await sha256FileSet(canonicalBlueprintRoot, files), files.join(", ")).toBe(sha256);
      expect(await sha256FileSet(installedBlueprintRoot, files), files.join(", ")).toBe(sha256);
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
            blueprint: "runtime-compiler",
            blueprintVersion: 1,
            id: "runtime-compiler-acceptance",
            ownerProject: "@fixture/runtime-compiler-acceptance",
          }),
          expect.objectContaining({
            blueprint: "runtime-definition",
            blueprintVersion: 2,
            id: "runtime-definition-acceptance",
            ownerProject: "@fixture/runtime-definition-acceptance",
          }),
          expect.objectContaining({
            blueprint: "runtime-derivation",
            blueprintVersion: 2,
            id: "runtime-derivation-acceptance",
            ownerProject: "@fixture/runtime-derivation-acceptance",
          }),
          expect.objectContaining({
            blueprint: "service",
            blueprintVersion: 3,
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
          expect.objectContaining({
            blueprintVersion: 1,
            instanceId: "runtime-compiler-acceptance",
            ruleId: "runtime_compiler_v1_structure",
            provenance: expect.objectContaining({ kind: "policy-pack" }),
            runner: expect.objectContaining({
              name: "habitat",
              structure: expect.objectContaining({
                provenance: expect.objectContaining({ kind: "policy-pack" }),
              }),
            }),
          }),
          expect.objectContaining({
            blueprintVersion: 2,
            instanceId: "runtime-definition-acceptance",
            ruleId: "runtime_definition_v2_structure",
            provenance: expect.objectContaining({ kind: "policy-pack" }),
            runner: expect.objectContaining({
              name: "habitat",
              structure: expect.objectContaining({
                provenance: expect.objectContaining({ kind: "policy-pack" }),
              }),
            }),
          }),
          expect.objectContaining({
            blueprintVersion: 2,
            instanceId: "runtime-derivation-acceptance",
            ruleId: "runtime_derivation_v2_structure",
            provenance: expect.objectContaining({ kind: "policy-pack" }),
            runner: expect.objectContaining({ name: "habitat" }),
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
      {
        id: "runtime-compiler",
        path: "dist/blueprints/runtime-compiler/blueprint.toml",
        version: 1,
      },
      {
        id: "runtime-definition",
        path: "dist/blueprints/runtime-definition/blueprint.toml",
        version: 1,
      },
      {
        id: "runtime-definition",
        path: "dist/blueprints/runtime-definition/versions/2/blueprint.toml",
        version: 2,
      },
      {
        id: "runtime-derivation",
        path: "dist/blueprints/runtime-derivation/blueprint.toml",
        version: 1,
      },
      {
        id: "runtime-derivation",
        path: "dist/blueprints/runtime-derivation/versions/2/blueprint.toml",
        version: 2,
      },
      { id: "service", path: "dist/blueprints/service/blueprint.toml", version: 1 },
      {
        id: "service",
        path: "dist/blueprints/service/versions/2/blueprint.toml",
        version: 2,
      },
      {
        id: "service",
        path: "dist/blueprints/service/versions/3/blueprint.toml",
        version: 3,
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
          definition: expect.objectContaining({ id: "runtime-compiler", version: 1 }),
          provenance: expect.objectContaining({ kind: "policy-pack" }),
        }),
        expect.objectContaining({
          definition: expect.objectContaining({ id: "runtime-definition", version: 1 }),
          provenance: expect.objectContaining({ kind: "policy-pack" }),
        }),
        expect.objectContaining({
          definition: expect.objectContaining({ id: "runtime-definition", version: 2 }),
          provenance: expect.objectContaining({ kind: "policy-pack" }),
        }),
        expect.objectContaining({
          definition: expect.objectContaining({ id: "runtime-derivation", version: 2 }),
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
          disposition: { kind: "evaluated" },
          instanceId: "runtime-compiler-acceptance",
          ownerProject: "@fixture/runtime-compiler-acceptance",
          ruleId: "runtime_compiler_v1_structure",
          runner: "habitat",
          status: "pass",
        }),
        expect.objectContaining({
          disposition: { kind: "evaluated" },
          instanceId: "runtime-definition-acceptance",
          ownerProject: "@fixture/runtime-definition-acceptance",
          ruleId: "runtime_definition_v2_structure",
          runner: "habitat",
          status: "pass",
        }),
        expect.objectContaining({
          disposition: { kind: "evaluated" },
          instanceId: "runtime-derivation-acceptance",
          ownerProject: "@fixture/runtime-derivation-acceptance",
          ruleId: "runtime_derivation_v2_structure",
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
          ruleId: "service_v3_client_lineage",
          runner: "grit",
          status: "pass",
        }),
      ]),
      ok: true,
    });

    const checkedRuntimeDefinition = await run(
      habitat,
      [
        "check",
        "--instance",
        "runtime-definition-acceptance",
        "--rule",
        "runtime_definition_v2_structure",
      ],
      { cwd: consumerRoot }
    );
    expect(
      checkedRuntimeDefinition,
      checkedRuntimeDefinition.stderr || checkedRuntimeDefinition.stdout
    ).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(checkedRuntimeDefinition.stdout)).toMatchObject({
      _tag: "Completed",
      applications: [
        expect.objectContaining({
          disposition: { kind: "evaluated" },
          instanceId: "runtime-definition-acceptance",
          ownerProject: "@fixture/runtime-definition-acceptance",
          ruleId: "runtime_definition_v2_structure",
          runner: "habitat",
          status: "pass",
        }),
      ],
      ok: true,
    });

    const runtimeCompilerCheckArgs = [
      "check",
      "--instance",
      "runtime-compiler-acceptance",
      "--rule",
      "runtime_compiler_v1_structure",
    ] as const;
    const checkedRuntimeCompiler = await run(habitat, runtimeCompilerCheckArgs, {
      cwd: consumerRoot,
    });
    expect(
      checkedRuntimeCompiler,
      checkedRuntimeCompiler.stderr || checkedRuntimeCompiler.stdout
    ).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(checkedRuntimeCompiler.stdout)).toMatchObject({
      _tag: "Completed",
      applications: [
        expect.objectContaining({
          disposition: { kind: "evaluated" },
          findings: [],
          instanceId: "runtime-compiler-acceptance",
          ownerProject: "@fixture/runtime-compiler-acceptance",
          ruleId: "runtime_compiler_v1_structure",
          runner: "habitat",
          status: "pass",
        }),
      ],
      ok: true,
    });

    const runtimeCompilerFixtureRoot = path.join(
      consumerRoot,
      "packages/runtime-compiler-acceptance"
    );
    const compiledPlanPath = path.join(runtimeCompilerFixtureRoot, "src/compiled-process-plan.ts");
    const compiledPlanBytes = await readFile(compiledPlanPath);
    await rm(compiledPlanPath);
    try {
      const missingCompiledPlan = await run(habitat, runtimeCompilerCheckArgs, {
        cwd: consumerRoot,
      });
      expect(
        missingCompiledPlan,
        missingCompiledPlan.stderr || missingCompiledPlan.stdout
      ).toMatchObject({ exitCode: 1, stderr: "" });
      expect(JSON.parse(missingCompiledPlan.stdout)).toMatchObject({
        _tag: "Completed",
        applications: [
          expect.objectContaining({
            findings: [
              expect.objectContaining({
                code: "missing-required-child",
                path: "packages/runtime-compiler-acceptance/src",
              }),
            ],
            instanceId: "runtime-compiler-acceptance",
            ownerProject: "@fixture/runtime-compiler-acceptance",
            ruleId: "runtime_compiler_v1_structure",
            runner: "habitat",
            status: "fail",
          }),
        ],
        ok: false,
      });
    } finally {
      await writeFile(compiledPlanPath, compiledPlanBytes);
    }

    const forbiddenPackagePath = path.join(runtimeCompilerFixtureRoot, "package.json");
    await writeFile(forbiddenPackagePath, '{"private":true}\n');
    try {
      const unexpectedPackage = await run(habitat, runtimeCompilerCheckArgs, {
        cwd: consumerRoot,
      });
      expect(unexpectedPackage, unexpectedPackage.stderr || unexpectedPackage.stdout).toMatchObject(
        { exitCode: 1, stderr: "" }
      );
      expect(JSON.parse(unexpectedPackage.stdout)).toMatchObject({
        _tag: "Completed",
        applications: [
          expect.objectContaining({
            findings: [
              expect.objectContaining({
                code: "unexpected-child",
                path: "packages/runtime-compiler-acceptance/package.json",
              }),
            ],
            instanceId: "runtime-compiler-acceptance",
            ownerProject: "@fixture/runtime-compiler-acceptance",
            ruleId: "runtime_compiler_v1_structure",
            runner: "habitat",
            status: "fail",
          }),
        ],
        ok: false,
      });
    } finally {
      await rm(forbiddenPackagePath, { force: true });
    }

    const restoredRuntimeCompiler = await run(habitat, runtimeCompilerCheckArgs, {
      cwd: consumerRoot,
    });
    expect(
      restoredRuntimeCompiler,
      restoredRuntimeCompiler.stderr || restoredRuntimeCompiler.stdout
    ).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(restoredRuntimeCompiler.stdout)).toMatchObject({
      _tag: "Completed",
      applications: [
        expect.objectContaining({
          findings: [],
          instanceId: "runtime-compiler-acceptance",
          ruleId: "runtime_compiler_v1_structure",
          runner: "habitat",
          status: "pass",
        }),
      ],
      ok: true,
    });

    const checkedRuntimeDerivation = await run(
      habitat,
      [
        "check",
        "--instance",
        "runtime-derivation-acceptance",
        "--rule",
        "runtime_derivation_v2_structure",
      ],
      { cwd: consumerRoot }
    );
    expect(
      checkedRuntimeDerivation,
      checkedRuntimeDerivation.stderr || checkedRuntimeDerivation.stdout
    ).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(checkedRuntimeDerivation.stdout)).toMatchObject({
      _tag: "Completed",
      applications: [
        expect.objectContaining({
          disposition: { kind: "evaluated" },
          instanceId: "runtime-derivation-acceptance",
          ownerProject: "@fixture/runtime-derivation-acceptance",
          ruleId: "runtime_derivation_v2_structure",
          runner: "habitat",
          status: "pass",
        }),
      ],
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

function assertPackedManifestExcludesVendors(
  manifest: PackedProductManifest,
  productName: PublicProduct["name"]
): void {
  for (const field of PACKAGE_DEPENDENCY_FIELDS) {
    const declarations = manifest[field];
    if (declarations === undefined) continue;
    const declaredPackages = Array.isArray(declarations)
      ? declarations
      : isRecord(declarations)
        ? Object.keys(declarations)
        : undefined;
    if (
      declaredPackages === undefined ||
      !declaredPackages.every((dependency) => typeof dependency === "string")
    ) {
      throw new Error(`${productName} packed manifest has an invalid ${field} field.`);
    }
    for (const vendorPackage of ABSENT_VENDOR_PACKAGES) {
      expect(declaredPackages, `${productName} ${field}`).not.toContain(vendorPackage);
    }
  }

  for (const field of PACKAGE_LOAD_PATH_FIELDS) {
    const declarations = manifest[field];
    if (declarations === undefined) continue;
    const loadPathStrings = collectManifestStrings(declarations);
    for (const vendorPackage of ABSENT_VENDOR_PACKAGES) {
      expect(
        loadPathStrings.filter((candidate) => candidate.includes(vendorPackage)),
        `${productName} ${field}`
      ).toEqual([]);
    }
  }
}

function collectManifestStrings(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectManifestStrings);
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...collectManifestStrings(child)]);
}

function publicJavaScriptExportSpecifiers(
  manifest: PackedProductManifest,
  productName: PublicProduct["name"]
): readonly string[] {
  if (!isRecord(manifest.exports)) {
    throw new Error(`${productName} packed manifest has no public exports map.`);
  }

  return Object.entries(manifest.exports)
    .filter(([, target]) => hasJavaScriptExportTarget(target))
    .map(([subpath]) => {
      if (subpath === ".") return productName;
      if (!subpath.startsWith("./") || subpath.includes("*")) {
        throw new Error(`${productName} has an unsupported public JavaScript export: ${subpath}`);
      }
      return `${productName}/${subpath.slice(2)}`;
    });
}

function hasJavaScriptExportTarget(target: unknown): boolean {
  if (typeof target === "string") return /\.[cm]?js$/u.test(target);
  if (Array.isArray(target)) return target.some(hasJavaScriptExportTarget);
  if (isRecord(target)) return Object.values(target).some(hasJavaScriptExportTarget);
  return false;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolvePackageIfPresent(
  requireFromConsumer: NodeJS.Require,
  specifier: string
): string | undefined {
  try {
    return requireFromConsumer.resolve(specifier);
  } catch (error) {
    if (isRecord(error) && error.code === "MODULE_NOT_FOUND") return undefined;
    throw error;
  }
}

async function assertColdPublicJavaScriptExport(
  callerRoot: string,
  specifier: string
): Promise<void> {
  const coldEntrypoint = path.join(callerRoot, "cold-public-javascript-export.mjs");
  await writeFile(
    coldEntrypoint,
    [
      'import { createRequire } from "node:module";',
      "const specifier = process.argv[2];",
      'if (specifier === undefined) throw new Error("Missing public export specifier.");',
      "const require = createRequire(import.meta.url);",
      `for (const name of ${JSON.stringify(ABSENT_VENDOR_PACKAGES)}) {`,
      "  try {",
      "    const resolved = require.resolve(name);",
      "    throw new Error(`${name} unexpectedly resolved to ${resolved}`);",
      "  } catch (error) {",
      '    if (error?.code !== "MODULE_NOT_FOUND") throw error;',
      "  }",
      "}",
      "await import(specifier);",
      "console.log(specifier);",
      "",
    ].join("\n"),
    "utf8"
  );

  try {
    const imported = await run("bun", [coldEntrypoint, specifier], {
      cwd: callerRoot,
      timeoutMs: 30_000,
    });
    expect(imported, `${specifier}\n${imported.stderr || imported.stdout}`).toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: `${specifier}\n`,
    });
  } finally {
    await rm(coldEntrypoint, { force: true });
  }
}

function inspectTypeScriptModuleExports(declarationPath: string): {
  readonly graphFields: readonly string[];
  readonly resultFields: readonly string[];
  readonly runtime: readonly string[];
  readonly types: readonly string[];
} {
  const program = ts.createProgram({
    rootNames: [declarationPath],
    options: {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const sourceFile = program.getSourceFile(declarationPath);
  if (sourceFile === undefined) {
    throw new TypeError(`TypeScript did not load ${declarationPath}.`);
  }
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (moduleSymbol === undefined) {
    throw new TypeError(`TypeScript did not resolve module ${declarationPath}.`);
  }
  const runtime: string[] = [];
  const types: string[] = [];
  const moduleExports = checker.getExportsOfModule(moduleSymbol);

  for (const exportedSymbol of moduleExports) {
    const target =
      (exportedSymbol.flags & ts.SymbolFlags.Alias) === 0
        ? exportedSymbol
        : checker.getAliasedSymbol(exportedSymbol);
    if ((target.flags & ts.SymbolFlags.Value) !== 0) {
      runtime.push(exportedSymbol.name);
    } else if ((target.flags & ts.SymbolFlags.Type) !== 0) {
      types.push(exportedSymbol.name);
    }
  }

  const deriveExport = moduleExports.find((symbol) => symbol.name === "deriveRuntimeArtifacts");
  if (deriveExport === undefined) {
    throw new TypeError("Installed SDK derivation declaration has no derivation operation.");
  }
  const deriveTarget =
    (deriveExport.flags & ts.SymbolFlags.Alias) === 0
      ? deriveExport
      : checker.getAliasedSymbol(deriveExport);
  const deriveDeclaration = deriveTarget.valueDeclaration ?? deriveTarget.declarations?.[0];
  if (deriveDeclaration === undefined) {
    throw new TypeError("Installed SDK derivation operation has no declaration.");
  }
  const signature = checker
    .getTypeOfSymbolAtLocation(deriveTarget, deriveDeclaration)
    .getCallSignatures()[0];
  if (signature === undefined) {
    throw new TypeError("Installed SDK derivation operation has no call signature.");
  }
  const resultType = signature.getReturnType();
  const graphSymbol = resultType.getProperty("graph");
  const graphDeclaration = graphSymbol?.valueDeclaration ?? graphSymbol?.declarations?.[0];
  if (graphSymbol === undefined || graphDeclaration === undefined) {
    throw new TypeError("Installed SDK derivation result has no structural graph contract.");
  }
  const graphType = checker.getTypeOfSymbolAtLocation(graphSymbol, graphDeclaration);

  return {
    graphFields: graphType
      .getProperties()
      .map(({ name }) => name)
      .sort(),
    resultFields: resultType
      .getProperties()
      .map(({ name }) => name)
      .sort(),
    runtime: runtime.sort(),
    types: types.sort(),
  };
}

async function assertInstalledRuntimeDerivation(callerRoot: string): Promise<void> {
  const entrypointPath = path.join(callerRoot, "cold-installed-runtime-derivation.mjs");

  try {
    await writeFile(
      entrypointPath,
      [
        'import { defineApp, defineEntrypoint, defineProcessCatalog } from "@habitat-ai/sdk/app";',
        'import { Effect } from "@habitat-ai/sdk/effect";',
        'import { defineAsyncWorkflowPlugin, defineWorkflow } from "@habitat-ai/sdk/plugins/async";',
        'import { defineAsyncStepEffect } from "@habitat-ai/sdk/plugins/async/effect";',
        'import { defineWebAppPlugin } from "@habitat-ai/sdk/plugins/web";',
        'import { deriveRuntimeArtifacts, decodePortableRuntimePlanArtifact } from "@habitat-ai/sdk/runtime/derivation";',
        'import { defineRuntimeProfile } from "@habitat-ai/sdk/runtime/profiles";',
        'import { RuntimeSchema } from "@habitat-ai/sdk/runtime/schema";',
        'import { Type } from "typebox";',
        "let effectCalls = 0;",
        "let loaderCalls = 0;",
        "const authoredStep = defineAsyncStepEffect({",
        '  id: "deliver",',
        "  policy: {},",
        "  effect: () => {",
        "    effectCalls += 1;",
        '    return Effect.succeed("delivered");',
        "  },",
        "});",
        "const workflow = defineWorkflow({",
        '  id: "delivery",',
        "  inputSchema: RuntimeSchema.fromTypeBox(Type.Object({ id: Type.String() })),",
        "  steps: [authoredStep],",
        "});",
        "const asyncPlugin = defineAsyncWorkflowPlugin.factory()({",
        '  capability: "delivery",',
        "  services: {},",
        "  workflows: [workflow],",
        "})();",
        "const loadRouteModule = async () => {",
        "  loaderCalls += 1;",
        '  return { page: "delivery" };',
        "};",
        "const webPlugin = defineWebAppPlugin.factory()({",
        '  capability: "delivery",',
        "  routes: [",
        '    { id: "delivery.index", path: "/delivery", module: loadRouteModule },',
        "  ],",
        "})();",
        'const app = defineApp({ id: "installed-candidate", plugins: [asyncPlugin, webPlugin] });',
        "const process = defineProcessCatalog({",
        '  application: { id: "application", roles: ["async", "web"] },',
        "}).application;",
        'const profile = defineRuntimeProfile({ id: "installed", providers: [] });',
        "const entrypoint = defineEntrypoint({",
        '  id: "installed",',
        "  app,",
        "  profile,",
        "  process,",
        "  identity: {",
        '    app: "installed-candidate",',
        '    process: "application",',
        '    entrypoint: "installed",',
        '    deployment: "acceptance",',
        '    source: "installed-package",',
        "  },",
        "});",
        'const result = deriveRuntimeArtifacts({ entrypoint, profileId: "installed" });',
        "const executionEntries = result.executionDescriptorTable.entries();",
        "const webEntries = result.webRouteModuleTable.entries();",
        "const decoded = decodePortableRuntimePlanArtifact(result.portableArtifact);",
        "let surplusRejected = false;",
        "try {",
        "  decodePortableRuntimePlanArtifact({ ...result.portableArtifact, surplus: true });",
        "} catch (error) {",
        "  surplusRejected = error instanceof TypeError;",
        "}",
        "console.log(JSON.stringify({",
        "  artifactJson: JSON.stringify(result.portableArtifact),",
        "  artifactIdPattern: /^sha256:[0-9a-f]{64}$/.test(result.portableArtifact.artifactId),",
        "  artifactKeys: Object.keys(result.portableArtifact).sort(),",
        "  decodedEqual: JSON.stringify(decoded) === JSON.stringify(result.portableArtifact),",
        "  effectCalls,",
        "  executionBoundary: executionEntries[0]?.[0].boundary,",
        "  executionCount: executionEntries.length,",
        "  executionIdentity: result.executionDescriptorTable.get(executionEntries[0][0]) === executionEntries[0][1],",
        "  graphTopologyIdentity: result.graph.topology === result.topology,",
        "  loaderCalls,",
        "  resultKeys: Object.keys(result).sort(),",
        "  surplusRejected,",
        "  webCount: webEntries.length,",
        "  webLoaderIdentity: result.webRouteModuleTable.get(webEntries[0].ref) === loadRouteModule,",
        "}));",
      ].join("\n"),
      "utf8"
    );
    const firstDerived = await run("bun", [entrypointPath], {
      cwd: callerRoot,
      timeoutMs: 30_000,
    });
    const secondDerived = await run("bun", [entrypointPath], {
      cwd: callerRoot,
      timeoutMs: 30_000,
    });
    expect(firstDerived, firstDerived.stderr || firstDerived.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(secondDerived, secondDerived.stderr || secondDerived.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    const firstOutput = JSON.parse(firstDerived.stdout) as Record<string, unknown>;
    const secondOutput = JSON.parse(secondDerived.stdout) as Record<string, unknown>;
    expect(secondOutput.artifactJson).toBe(firstOutput.artifactJson);
    const { artifactJson, ...summary } = firstOutput;
    expect(typeof artifactJson).toBe("string");
    expect(summary).toEqual({
      artifactIdPattern: true,
      artifactKeys: [
        "artifactId",
        "executionDescriptorRefs",
        "identity",
        "kind",
        "profileId",
        "roles",
        "surfaces",
      ],
      decodedEqual: true,
      effectCalls: 0,
      executionBoundary: "plugin.async-step",
      executionCount: 1,
      executionIdentity: true,
      graphTopologyIdentity: true,
      loaderCalls: 0,
      resultKeys: [
        "executionDescriptorTable",
        "graph",
        "portableArtifact",
        "topology",
        "webRouteModuleTable",
      ],
      surplusRejected: true,
      webCount: 1,
      webLoaderIdentity: true,
    });
  } finally {
    await rm(entrypointPath, { force: true });
  }
}

async function assertInstalledProviderAuthoring(callerRoot: string): Promise<void> {
  const entrypointPath = path.join(callerRoot, "cold-installed-provider-authoring.mjs");

  try {
    await writeFile(
      entrypointPath,
      [
        'const sdk = await import("@habitat-ai/sdk");',
        'const providers = await import("@habitat-ai/sdk/runtime/providers");',
        'const providerEffect = await import("@habitat-ai/sdk/runtime/providers/effect");',
        'const resources = await import("@habitat-ai/sdk/runtime/resources");',
        'const providersAgain = await import("@habitat-ai/sdk/runtime/providers");',
        'const providerEffectAgain = await import("@habitat-ai/sdk/runtime/providers/effect");',
        "let acquireCalls = 0;",
        "let buildCalls = 0;",
        "let releaseCalls = 0;",
        "const resource = resources.defineRuntimeResource({",
        '  id: "installed.provider",',
        '  title: "Installed provider",',
        '  purpose: "Prove cold installed provider authoring.",',
        "});",
        "const build = () => {",
        "  buildCalls += 1;",
        "  return providerEffect.providerFx.acquireRelease({",
        "    acquire: providerEffect.providerFx.tryPromise({",
        "      try: () => {",
        "        acquireCalls += 1;",
        "        return { ready: true };",
        "      },",
        '      catch: () => ({ _tag: "InstalledAcquireFailure" }),',
        "    }),",
        "    release: () => {",
        "      releaseCalls += 1;",
        "      return providerEffect.providerFx.succeed(undefined);",
        "    },",
        "  });",
        "};",
        "const provider = providers.defineRuntimeProvider({",
        '  id: "installed.provider",',
        '  title: "Installed provider",',
        "  provides: resource,",
        "  requires: [],",
        "  build,",
        "});",
        "const forbiddenNames = [",
        '  "Effect",',
        '  "Exit",',
        '  "Layer",',
        '  "ManagedRuntime",',
        '  "ProviderScope",',
        '  "Scope",',
        '  "acquireRelease",',
        '  "readProviderEffectPlan",',
        '  "runPromise",',
        '  "runPromiseExit",',
        "];",
        "console.log(JSON.stringify({",
        "  callbackCalls: { acquireCalls, buildCalls, releaseCalls },",
        "  excludedProviderEffectNames: forbiddenNames.filter((name) => Object.hasOwn(providerEffect, name)),",
        "  excludedProviderNames: forbiddenNames.filter((name) => Object.hasOwn(providers, name)),",
        "  facadeFrozen: Object.isFrozen(providerEffect.providerFx),",
        "  facadeKeys: Object.keys(providerEffect.providerFx).sort(),",
        "  providerBuildIdentity: provider.build === build,",
        "  providerEffectExports: Object.keys(providerEffect).sort(),",
        "  providerEffectIdentity: providerEffect.providerFx === providerEffectAgain.providerFx,",
        "  providerExports: Object.keys(providers).sort(),",
        "  providerFrozen: Object.isFrozen(provider),",
        "  providerIdentity: providers.defineRuntimeProvider === providersAgain.defineRuntimeProvider,",
        '  rootProviderExports: Object.keys(sdk).filter((name) => name === "defineRuntimeProvider" || name === "providerFx"),',
        "}));",
      ].join("\n"),
      "utf8"
    );
    const authored = await run("node", [entrypointPath], {
      cwd: callerRoot,
      timeoutMs: 30_000,
    });
    expect(authored, authored.stderr || authored.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(JSON.parse(authored.stdout)).toEqual({
      callbackCalls: { acquireCalls: 0, buildCalls: 0, releaseCalls: 0 },
      excludedProviderEffectNames: [],
      excludedProviderNames: [],
      facadeFrozen: true,
      facadeKeys: ["acquireRelease", "succeed", "tryPromise"],
      providerBuildIdentity: true,
      providerEffectExports: ["providerFx"],
      providerEffectIdentity: true,
      providerExports: ["defineRuntimeProvider"],
      providerFrozen: true,
      providerIdentity: true,
      rootProviderExports: [],
    });
  } finally {
    await rm(entrypointPath, { force: true });
  }
}

async function assertInstalledWebProjection(callerRoot: string): Promise<void> {
  const entrypoint = path.join(callerRoot, "cold-installed-web-projection.mjs");

  try {
    await writeFile(
      entrypoint,
      [
        'import { registerHooks } from "node:module";',
        "let routerVendorResolutions = 0;",
        "registerHooks({",
        "  resolve(specifier, context, nextResolve) {",
        '    if (specifier === "@orpc/server" || specifier.startsWith("@orpc/server/")) {',
        "      routerVendorResolutions += 1;",
        '      throw new Error("The cold web face must not resolve the server router vendor.");',
        "    }",
        "    return nextResolve(specifier, context);",
        "  },",
        "});",
        'const web = await import("@habitat-ai/sdk/plugins/web");',
        "let loaderCalls = 0;",
        "const loadRouteModule = async () => {",
        "  loaderCalls += 1;",
        '  throw new Error("Installed web route loader must remain cold.");',
        "};",
        "const definition = web.defineWebAppPlugin.factory()({",
        '  capability: "installed-candidate",',
        "  routes: [",
        "    {",
        '      id: "installed-candidate.index",',
        '      path: "/installed-candidate",',
        "      module: loadRouteModule,",
        "    },",
        "  ],",
        "})();",
        "const projection = definition.project({ pluginId: definition.id });",
        "const projectedRoutes = projection.facts.routes;",
        "const forbiddenRuntimeKeys = [",
        '  "adapter",',
        '  "browser",',
        '  "harness",',
        '  "host",',
        '  "live",',
        '  "mount",',
        '  "runtime",',
        "];",
        "console.log(",
        "  JSON.stringify({",
        "    definition: {",
        "      capability: definition.capability,",
        "      frozen: Object.isFrozen(definition),",
        "      id: definition.id,",
        "      keys: Object.keys(definition).sort(),",
        "      kind: definition.kind,",
        "      resourceRequirements: definition.resourceRequirements,",
        "      resourceRequirementsFrozen: Object.isFrozen(definition.resourceRequirements),",
        "      role: definition.role,",
        "      routeFrozen: Object.isFrozen(definition.routes[0]),",
        "      routeLoaderIdentity: definition.routes[0]?.module === loadRouteModule,",
        "      routesFrozen: Object.isFrozen(definition.routes),",
        "      services: definition.services,",
        "      servicesFrozen: Object.isFrozen(definition.services),",
        "      surface: definition.surface,",
        "    },",
        "    exports: Object.keys(web).sort(),",
        "    forbiddenRuntimeKeysPresent: forbiddenRuntimeKeys.filter((key) =>",
        "      [web, definition, projection, projection.facts].some((value) =>",
        "        Object.hasOwn(value, key)",
        "      )",
        "    ),",
        "    loaderCalls,",
        "    routerVendorResolutions,",
        "    projection: {",
        "      factsFrozen: Object.isFrozen(projection.facts),",
        "      frozen: Object.isFrozen(projection),",
        "      projectedRouteFrozen: Object.isFrozen(projectedRoutes[0]),",
        "      projectedRoutesFrozen: Object.isFrozen(projectedRoutes),",
        "      snapshot: JSON.parse(JSON.stringify(projection)),",
        "    },",
        "  })",
        ");",
        "",
      ].join("\n"),
      "utf8"
    );

    const projected = await run("node", [entrypoint], {
      cwd: callerRoot,
      timeoutMs: 30_000,
    });
    expect(projected, projected.stderr || projected.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(JSON.parse(projected.stdout)).toEqual({
      definition: {
        capability: "installed-candidate",
        frozen: true,
        id: "web.app.installed-candidate",
        keys: [
          "capability",
          "id",
          "kind",
          "project",
          "resourceRequirements",
          "role",
          "routes",
          "services",
          "surface",
        ],
        kind: "plugin.definition",
        resourceRequirements: [],
        resourceRequirementsFrozen: true,
        role: "web",
        routeFrozen: true,
        routeLoaderIdentity: true,
        routesFrozen: true,
        services: {},
        servicesFrozen: true,
        surface: "web/app",
      },
      exports: ["defineWebAppPlugin"],
      forbiddenRuntimeKeysPresent: [],
      loaderCalls: 0,
      routerVendorResolutions: 0,
      projection: {
        factsFrozen: true,
        frozen: true,
        projectedRouteFrozen: true,
        projectedRoutesFrozen: true,
        snapshot: {
          kind: "plugin.projection",
          facts: {
            pluginId: "web.app.installed-candidate",
            lane: "web/app",
            routes: [
              {
                id: "installed-candidate.index",
                path: "/installed-candidate",
              },
            ],
          },
        },
      },
    });
  } finally {
    await rm(entrypoint, { force: true });
  }
}

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
  const servicePackagePath = path.join(serviceRoot, "package.json");
  const generatedServiceManifest = await readFile(servicePackagePath, "utf8");
  const servicePackage = JSON.parse(generatedServiceManifest) as {
    readonly dependencies?: Readonly<Record<string, string>>;
  };
  expect(servicePackage.dependencies).toEqual({
    "@habitat-ai/sdk": installVersion,
    "@orpc/contract": "2.0.0-beta.23",
    "@orpc/server": "2.0.0-beta.23",
    typebox: "1.3.8",
  });

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
    service_v3_client_lineage: [`${serviceRootInput}/src/client.ts`],
    service_v3_context_funnel: [
      `${serviceRootInput}/src/service/base.ts`,
      `${serviceRootInput}/src/service/impl.ts`,
      `${serviceRootInput}/src/service/middleware/*.ts`,
      `${serviceRootInput}/src/service/modules/*/module.ts`,
      `${serviceRootInput}/src/service/modules/*/router/*.ts`,
    ],
    service_v3_contract_authority: [`${serviceRootInput}/src/service/modules/*/contract/*.ts`],
    service_v3_contract_composition: [
      `${serviceRootInput}/src/service/contract.ts`,
      `${serviceRootInput}/src/service/modules/*/contract/index.ts`,
    ],
    service_v3_effect_bridge: [
      `${serviceRootInput}/src/client.ts`,
      `${serviceRootInput}/src/service/**/*.ts`,
    ],
    service_v3_public_face: [`${serviceRootInput}/package.json`],
    service_v3_router_composition: [
      `${serviceRootInput}/src/service/modules/*/router.ts`,
      `${serviceRootInput}/src/service/modules/*/router/*.ts`,
      `${serviceRootInput}/src/service/router.ts`,
    ],
    service_v3_source_boundary: [
      `${serviceRootInput}/src/client.ts`,
      `${serviceRootInput}/src/service/**/*.ts`,
    ],
  } as const;
  const expectedServiceTargets = [
    ...Object.keys(expectedServiceInputsByRule).map((ruleId) => `${serviceTargetPrefix}${ruleId}`),
    `${serviceTargetPrefix}service_v3_structure`,
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
    project.targets?.[`${serviceTargetPrefix}service_v3_structure`]?.inputs ?? []
  ).filter(
    (input): input is string => typeof input === "string" && input.startsWith(serviceRootInput)
  );
  expect(structureInputs).toEqual([serviceRootInput, `${serviceRootInput}/**/*`]);

  await writeFile(
    servicePackagePath,
    `${JSON.stringify(
      {
        ...servicePackage,
        dependencies: {
          ...servicePackage.dependencies,
          effect: "4.0.0-beta.101",
        },
      },
      null,
      2
    )}\n`
  );
  const installedEffectImplementationOwner = await run("bun", ["install", "--ignore-scripts"], {
    cwd: consumerRoot,
    timeoutMs: 120_000,
  });
  expect(
    installedEffectImplementationOwner,
    installedEffectImplementationOwner.stderr || installedEffectImplementationOwner.stdout
  ).toMatchObject({ exitCode: 0 });

  const generatedServiceRequire = createRequire(servicePackagePath);
  const installedSdkManifestPath = await realpath(
    generatedServiceRequire.resolve("@habitat-ai/sdk/package.json")
  );
  const installedSdkRequire = createRequire(installedSdkManifestPath);
  const installedEffectExtensionManifestPath = await realpath(
    installedSdkRequire.resolve("@orpc/experimental-effect/package.json")
  );
  const installedEffectExtensionRequire = createRequire(installedEffectExtensionManifestPath);
  const installedEffectExtensionPath = await realpath(
    installedSdkRequire.resolve("@orpc/experimental-effect/extensions/effect")
  );
  const installedServerManifestPath = await realpath(
    generatedServiceRequire.resolve("@orpc/server/package.json")
  );
  const installedEffectManifestPath = await realpath(
    generatedServiceRequire.resolve("effect/package.json")
  );
  expect(await realpath(installedSdkRequire.resolve("@orpc/server/package.json"))).toBe(
    installedServerManifestPath
  );
  expect(await realpath(installedSdkRequire.resolve("effect/package.json"))).toBe(
    installedEffectManifestPath
  );
  expect(
    await realpath(installedSdkRequire.resolve("@orpc/experimental-effect/extensions/effect"))
  ).toBe(installedEffectExtensionPath);
  expect(await realpath(installedEffectExtensionRequire.resolve("@orpc/server/package.json"))).toBe(
    installedServerManifestPath
  );
  expect(await realpath(installedEffectExtensionRequire.resolve("effect/package.json"))).toBe(
    installedEffectManifestPath
  );

  const telemetryTypeConsumerPath = path.join(serviceRoot, "src/telemetry-type-consumer.ts");
  const runtimeTypeConsumerPath = path.join(serviceRoot, "src/runtime-type-consumer.ts");
  const serviceImplementationPath = path.join(serviceRoot, "src/service/impl.ts");
  const generatedServiceImplementation = await readFile(serviceImplementationPath, "utf8");
  const pluginImplementationConsumerPath = path.join(
    serviceRoot,
    "src/installed-plugin-implementation-consumer.ts"
  );
  await writeFile(
    serviceImplementationPath,
    `${generatedServiceImplementation.trimEnd()}\n\nimport "@habitat-ai/sdk/plugins/server/effect";\n`
  );
  await writeFile(
    telemetryTypeConsumerPath,
    [
      'import { TelemetryAvailabilitySchema, type TelemetryAvailability } from "@habitat-ai/sdk/telemetry";',
      'export const telemetryAvailability: TelemetryAvailability = "disabled";',
      "void TelemetryAvailabilitySchema;",
      "",
    ].join("\n")
  );
  await writeFile(
    runtimeTypeConsumerPath,
    [
      'import type { oc as NativeOc } from "@orpc/contract";',
      'import type { implement as NativeImplement, os as NativeOs } from "@orpc/server";',
      'import type { HabitatEffect } from "@habitat-ai/sdk/effect";',
      'import type { EffectExecutionDescriptor } from "@habitat-ai/sdk/execution";',
      'import type { RuntimeDerivationResult } from "@habitat-ai/sdk/runtime/derivation";',
      'import { defineRuntimeProvider, type ProviderBuildContext, type RuntimeProvider, type RuntimeProviderHealthDescriptor, type RuntimeResourceMap } from "@habitat-ai/sdk/runtime/providers";',
      'import { providerFx, type ProviderAcquire, type ProviderEffectPlan, type ProviderFx, type ProviderFxFacade, type ProviderRelease } from "@habitat-ai/sdk/runtime/providers/effect";',
      'import { defineRuntimeResource, type RuntimeResourceValue } from "@habitat-ai/sdk/runtime/resources";',
      'import { defineWebAppPlugin } from "@habitat-ai/sdk/plugins/web";',
      'import { defineService, serviceDep, useService } from "@habitat-ai/sdk/service";',
      'import type { ServiceBoundaryContext, ServiceContractOf, ServiceModuleContextProjection, ServiceUse, ServiceUses } from "@habitat-ai/sdk/service";',
      'import { RuntimeSchema, type RuntimeSchemaValue } from "@habitat-ai/sdk/runtime/schema";',
      'import { Type } from "typebox";',
      "// @ts-expect-error ProviderEffectPlan is isolated to the provider Effect face.",
      'import type { ProviderEffectPlan as ProviderRootPlanLeak } from "@habitat-ai/sdk/runtime/providers";',
      "// @ts-expect-error The private provider-plan accessor is not public.",
      'import type { readProviderEffectPlan as ProviderEffectAccessorLeak } from "@habitat-ai/sdk/runtime/providers/effect";',
      "// @ts-expect-error Raw Effect is not a provider Effect face export.",
      'import type { Effect as RawProviderEffectLeak } from "@habitat-ai/sdk/runtime/providers/effect";',
      "// @ts-expect-error Provider plans do not leak from the SDK root.",
      'import type { ProviderEffectPlan as RootProviderPlanLeak } from "@habitat-ai/sdk";',
      "",
      "type Equal<TLeft, TRight> =",
      "  (<T>() => T extends TLeft ? 1 : 2) extends",
      "  (<T>() => T extends TRight ? 1 : 2)",
      "    ? (<T>() => T extends TRight ? 1 : 2) extends",
      "      (<T>() => T extends TLeft ? 1 : 2)",
      "      ? true",
      "      : false",
      "    : false;",
      "type Assert<T extends true> = T;",
      'type InstalledProcessDefaults = NonNullable<RuntimeDerivationResult["graph"]["profile"]["processDefaults"]>;',
      "type InstalledNestedProcessDefaults = Extract<",
      "  InstalledProcessDefaults[string],",
      "  Readonly<Record<string, unknown>>",
      ">;",
      "type InstalledProcessDefaultsIsNever = [InstalledProcessDefaults] extends [never] ? true : false;",
      "type InstalledNestedProcessDefaultsIsNever = [InstalledNestedProcessDefaults] extends [never] ? true : false;",
      "",
      'type InstalledDeps = { readonly siblingClient: { readonly id: "sibling" } };',
      "type InstalledScope = { readonly workspaceId: string };",
      "type InstalledConfig = { readonly readOnly: boolean };",
      "type InstalledInvocation = { readonly traceId: string };",
      'type InstalledProvided = { readonly repository: { readonly kind: "installed" } };',
      "type InstalledBoundaryContext = ServiceBoundaryContext<",
      "  InstalledDeps,",
      "  InstalledScope,",
      "  InstalledConfig,",
      "  InstalledInvocation,",
      "  InstalledProvided",
      ">;",
      "type InstalledModuleProjection = {",
      "  readonly actor: { readonly id: string };",
      '  readonly feature: "installed";',
      "};",
      "declare const installedBoundaryContext: InstalledBoundaryContext;",
      "declare const installedProcessDefaults: InstalledProcessDefaults;",
      "declare const installedNestedDefaults: InstalledNestedProcessDefaults;",
      "const installedProcessDefaultsFixture: InstalledProcessDefaults = {",
      "  retries: 3,",
      '  nested: { enabled: true, labels: ["primary", { region: "test" }] },',
      "};",
      "void installedProcessDefaultsFixture;",
      "",
      'interface ExecutionFailure { readonly _tag: "ExecutionFailure"; }',
      "interface ExecutionContext { readonly traceId: string; }",
      "interface RuntimeRequirement { readonly clock: true; }",
      "type Descriptor = EffectExecutionDescriptor<",
      "  { readonly jobId: string },",
      '  "complete",',
      "  ExecutionFailure,",
      "  ExecutionContext,",
      "  RuntimeRequirement",
      ">;",
      'type ExecutionValues = typeof import("@habitat-ai/sdk/execution");',
      'type ProviderRootValues = typeof import("@habitat-ai/sdk/runtime/providers");',
      'type ProviderEffectValues = typeof import("@habitat-ai/sdk/runtime/providers/effect");',
      'type SdkRootValues = typeof import("@habitat-ai/sdk");',
      "",
      'interface InstalledAcquireFailure { readonly _tag: "InstalledAcquireFailure"; }',
      "const installedProviderResource = defineRuntimeResource<",
      '  "installed.provider",',
      "  { readonly ready: true }",
      ">({",
      '  id: "installed.provider",',
      '  title: "Installed provider",',
      '  purpose: "Prove the installed provider authoring contract.",',
      "});",
      "type InstalledProviderValue = RuntimeResourceValue<typeof installedProviderResource>;",
      "const installedProviderHealth: RuntimeProviderHealthDescriptor = {",
      '  kind: "provider.health",',
      "};",
      "const installedProviderFxFacade: ProviderFxFacade = providerFx;",
      "const installedAcquire: ProviderAcquire<InstalledProviderValue, InstalledAcquireFailure> =",
      "  providerFx.tryPromise({",
      "    try: () => ({ ready: true as const }),",
      '    catch: () => ({ _tag: "InstalledAcquireFailure" as const }),',
      "  });",
      "const installedRelease: ProviderRelease<InstalledProviderValue> = () =>",
      "  providerFx.succeed(undefined);",
      "let installedProviderBuildCalls = 0;",
      "const installedProvider = defineRuntimeProvider({",
      '  id: "installed.provider",',
      '  title: "Installed provider",',
      "  provides: installedProviderResource,",
      "  requires: [],",
      "  health: installedProviderHealth,",
      "  build: (context) => {",
      "    installedProviderBuildCalls += 1;",
      "    const exactContext: ProviderBuildContext<undefined> = context;",
      "    const exactMap: RuntimeResourceMap = exactContext.resources;",
      "    void exactMap;",
      "    void exactContext.observation;",
      "    return providerFx.acquireRelease({",
      "      acquire: installedAcquire,",
      "      release: installedRelease,",
      "    });",
      "  },",
      "});",
      "void installedProviderBuildCalls;",
      "void installedProviderFxFacade;",
      "",
      "const sibling = defineService({",
      '  id: "sibling",',
      "  deps: {},",
      "  scope: RuntimeSchema.fromTypeBox(Type.Object({ workspaceId: Type.String() })),",
      "  config: RuntimeSchema.fromTypeBox(Type.Object({ readOnly: Type.Boolean() })),",
      "  invocation: RuntimeSchema.fromTypeBox(Type.Object({ traceId: Type.String() })),",
      "});",
      "const dependent = defineService({",
      '  id: "dependent",',
      "  deps: { sibling: serviceDep(sibling) },",
      "});",
      "const siblingContract = sibling.oc.router({ read: sibling.oc });",
      "const siblingUse = useService(sibling, { contract: siblingContract });",
      "const selectedSiblingUse = useService(sibling, {",
      "  contract: siblingContract,",
      '  instance: "secondary",',
      "});",
      "const siblingUses = { workItems: siblingUse } as const satisfies ServiceUses;",
      "function createPackedWebDefinition() {",
      "  return defineWebAppPlugin.factory()({",
      '    capability: "installed-web",',
      "    routes: [",
      "      {",
      '        id: "installed-web.index",',
      '        path: "/installed-web",',
      '        module: async () => ({ mount: "installed-web" } as const),',
      '        label: "not-a-route-field" as const,',
      "      },",
      "    ] as const,",
      "  })();",
      "}",
      "type PackedWebDefinition = ReturnType<typeof createPackedWebDefinition>;",
      "declare const packedWebDefinition: PackedWebDefinition;",
      'type ServiceValues = typeof import("@habitat-ai/sdk/service");',
      "if (false) {",
      "  // @ts-expect-error Canonical dependency context is immutable.",
      "  installedBoundaryContext.deps = installedBoundaryContext.deps;",
      "  // @ts-expect-error Canonical scope context is immutable.",
      "  installedBoundaryContext.scope = installedBoundaryContext.scope;",
      "  // @ts-expect-error Canonical config context is immutable.",
      "  installedBoundaryContext.config = installedBoundaryContext.config;",
      "  // @ts-expect-error Canonical invocation context is immutable.",
      "  installedBoundaryContext.invocation = installedBoundaryContext.invocation;",
      "  // @ts-expect-error Canonical provided context is immutable.",
      "  installedBoundaryContext.provided = installedBoundaryContext.provided;",
      "  // @ts-expect-error A service use always carries an explicit contract witness.",
      "  useService(sibling);",
      "  // @ts-expect-error An empty options object cannot omit the contract witness.",
      "  useService(sibling, {});",
      "  // @ts-expect-error The predecessor alias field is not part of the cold relation.",
      '  useService(sibling, { contract: siblingContract, alias: "legacy" });',
      "  // @ts-expect-error Packed web route snapshots are readonly.",
      '  packedWebDefinition.routes[0].path = "/changed";',
      "  // @ts-expect-error Surplus author fields are absent from the packed route type.",
      "  packedWebDefinition.routes[0].label;",
      "  // @ts-expect-error Installed top-level process defaults are immutable.",
      "  installedProcessDefaults.retries = 3;",
      "  // @ts-expect-error Installed nested process defaults are recursively immutable.",
      "  installedNestedDefaults.enabled = false;",
      "}",
      "",
      "export type PackedRuntimeDefinitionOracle = readonly [",
      "  Assert<Equal<InstalledProcessDefaultsIsNever, false>>,",
      "  Assert<Equal<InstalledNestedProcessDefaultsIsNever, false>>,",
      "  Assert<",
      "    Equal<",
      "      InstalledBoundaryContext,",
      "      {",
      "        readonly deps: InstalledDeps;",
      "        readonly scope: InstalledScope;",
      "        readonly config: InstalledConfig;",
      "        readonly invocation: InstalledInvocation;",
      "        readonly provided: InstalledProvided;",
      "      }",
      "    >",
      "  >,",
      "  Assert<",
      "    Equal<",
      "      ServiceModuleContextProjection<InstalledModuleProjection>,",
      "      InstalledModuleProjection",
      "    >",
      "  >,",
      "  Assert<Equal<ServiceModuleContextProjection<{ readonly deps: unknown }>, never>>,",
      "  Assert<Equal<ServiceModuleContextProjection<{ readonly scope: unknown }>, never>>,",
      "  Assert<Equal<ServiceModuleContextProjection<{ readonly config: unknown }>, never>>,",
      "  Assert<Equal<ServiceModuleContextProjection<{ readonly invocation: unknown }>, never>>,",
      "  Assert<Equal<ServiceModuleContextProjection<{ readonly provided: unknown }>, never>>,",
      "  Assert<Equal<ServiceModuleContextProjection<{ readonly scope?: unknown }>, never>>,",
      "  Assert<",
      "    Equal<",
      "      ServiceModuleContextProjection<",
      "        { readonly moduleValue: true } | { readonly invocation: unknown }",
      "      >,",
      "      never",
      "    >",
      "  >,",
      "  Assert<",
      "    Equal<",
      "      ServiceModuleContextProjection<Readonly<Record<string, unknown>>>,",
      "      never",
      "    >",
      "  >,",
      "  Assert<",
      "    Equal<",
      '      ReturnType<Descriptor["run"]>,',
      '      HabitatEffect<"complete", ExecutionFailure, RuntimeRequirement>',
      "    >",
      "  >,",
      '  Assert<Equal<Extract<keyof ExecutionValues, "defineEffectExecution">, never>>,',
      "  Assert<",
      "    Equal<",
      "      typeof installedProvider,",
      "      RuntimeProvider<",
      "        typeof installedProviderResource,",
      "        undefined,",
      "        InstalledAcquireFailure",
      "      >",
      "    >",
      "  >,",
      "  Assert<",
      "    Equal<",
      "      ReturnType<typeof installedProvider.build>,",
      "      ProviderEffectPlan<InstalledProviderValue, InstalledAcquireFailure>",
      "    >",
      "  >,",
      "  Assert<",
      "    Equal<",
      "      ProviderFx<InstalledProviderValue, InstalledAcquireFailure>,",
      "      HabitatEffect<InstalledProviderValue, InstalledAcquireFailure, never>",
      "    >",
      "  >,",
      "  Assert<Equal<Extract<ReturnType<typeof installedProvider.build>, Promise<unknown>>, never>>,",
      '  Assert<Equal<Extract<keyof ProviderRootValues, "providerFx" | "readProviderEffectPlan">, never>>,',
      '  Assert<Equal<Extract<keyof ProviderEffectValues, "defineRuntimeProvider" | "Effect" | "ManagedRuntime" | "readProviderEffectPlan">, never>>,',
      '  Assert<Equal<Extract<keyof SdkRootValues, "defineRuntimeProvider" | "providerFx">, never>>,',
      "  Assert<",
      "    Equal<",
      "      RuntimeSchemaValue<NonNullable<typeof sibling.scope>>,",
      "      { workspaceId: string }",
      "    >",
      "  >,",
      "  Assert<",
      "    Equal<",
      "      RuntimeSchemaValue<NonNullable<typeof sibling.config>>,",
      "      { readOnly: boolean }",
      "    >",
      "  >,",
      "  Assert<",
      "    Equal<",
      "      RuntimeSchemaValue<NonNullable<typeof sibling.invocation>>,",
      "      { traceId: string }",
      "    >",
      "  >,",
      "  Assert<Equal<typeof dependent.deps.sibling.service, typeof sibling>>,",
      "  Assert<Equal<typeof sibling.oc, typeof NativeOc>>,",
      "  Assert<Equal<typeof sibling.createMiddleware, typeof NativeOs.middleware>>,",
      "  Assert<Equal<typeof sibling.createImplementer, typeof NativeImplement>>,",
      "  Assert<Equal<ServiceContractOf<typeof siblingUse>, typeof siblingContract>>,",
      '  Assert<Equal<keyof typeof siblingUses, "workItems">>,',
      '  Assert<Equal<Extract<keyof ServiceUse, string>, "kind" | "serviceId" | "serviceInstance">>,',
      '  Assert<Equal<typeof siblingUse.kind, "service.use">>,',
      "  Assert<Equal<typeof selectedSiblingUse.serviceInstance, string | undefined>>,",
      '  Assert<Equal<Extract<keyof ServiceValues, "readServiceUse">, never>>,',
      '  Assert<Equal<PackedWebDefinition["id"], "web.app.installed-web">>,',
      '  Assert<Equal<PackedWebDefinition["role"], "web">>,',
      '  Assert<Equal<PackedWebDefinition["surface"], "web/app">>,',
      '  Assert<Equal<PackedWebDefinition["routes"][0]["id"], "installed-web.index">>,',
      '  Assert<Equal<PackedWebDefinition["routes"][0]["path"], "/installed-web">>,',
      "  Assert<",
      "    Equal<",
      '      Awaited<ReturnType<PackedWebDefinition["routes"][0]["module"]>>,',
      '      { readonly mount: "installed-web" }',
      "    >",
      "  >,",
      "  Assert<",
      "    Equal<",
      '      Extract<keyof PackedWebDefinition["routes"][0], string>,',
      '      "id" | "path" | "module"',
      "    >",
      "  >,",
      '  Assert<Equal<PackedWebDefinition["resourceRequirements"], readonly []>>,',
      '  Assert<Equal<keyof PackedWebDefinition["services"], never>>,',
      "];",
      "",
    ].join("\n")
  );
  await writeFile(
    pluginImplementationConsumerPath,
    [
      'import "./service/impl";',
      "",
      'import { oc } from "@orpc/contract";',
      'import { createRouterClient, implement as nativeImplement } from "@orpc/server";',
      'import { Effect as NativeEffect } from "effect";',
      'import { Type } from "typebox";',
      'import { Effect as HabitatEffect } from "@habitat-ai/sdk/effect";',
      "import {",
      "  defineAsyncConsumerPlugin,",
      "  defineAsyncSchedulePlugin,",
      "  defineAsyncWorkflowPlugin,",
      "  defineConsumer,",
      "  defineSchedule,",
      "  defineWorkflow,",
      "  useService as useAsyncService,",
      "  type ServiceContractOf as AsyncServiceContractOf,",
      "  type ServiceUses as AsyncServiceUses,",
      '} from "@habitat-ai/sdk/plugins/async";',
      'import { defineAsyncStepEffect, type AsyncStepExecutionContext } from "@habitat-ai/sdk/plugins/async/effect";',
      "import {",
      "  defineServerApiPlugin,",
      "  defineServerInternalPlugin,",
      "  implementServerApiPlugin,",
      "  implementServerInternalPlugin,",
      "  useService as useServerService,",
      "  type ServiceContractOf as ServerServiceContractOf,",
      "  type ServiceUses as ServerServiceUses,",
      '} from "@habitat-ai/sdk/plugins/server";',
      'import { RuntimeSchema } from "@habitat-ai/sdk/runtime/schema";',
      'import { defineService, useService as useServiceFace, type ServiceUse } from "@habitat-ai/sdk/service";',
      "",
      "type Equal<TLeft, TRight> =",
      "  (<T>() => T extends TLeft ? 1 : 2) extends",
      "  (<T>() => T extends TRight ? 1 : 2)",
      "    ? (<T>() => T extends TRight ? 1 : 2) extends",
      "      (<T>() => T extends TLeft ? 1 : 2)",
      "      ? true",
      "      : false",
      "    : false;",
      "type Assert<T extends true> = T;",
      "",
      "let bodyRuns = 0;",
      'const consumedService = defineService({ id: "installed-service", deps: {} });',
      "const consumedContract = oc.router({ read: oc });",
      "const serviceUse = useServiceFace(consumedService, { contract: consumedContract });",
      "const selectedServiceUse = useAsyncService(consumedService, {",
      "  contract: consumedContract,",
      '  instance: "secondary",',
      "});",
      "const services = { workItems: serviceUse } as const satisfies",
      "  ServerServiceUses & AsyncServiceUses;",
      "const publicContract = oc.router({ sync: oc, promise: oc, effect: oc });",
      "const internalContract = oc.router({ sync: oc });",
      "const publicImplementation = implementServerApiPlugin(publicContract);",
      "const internalImplementation = implementServerInternalPlugin(internalContract);",
      "const publicRouter = publicImplementation.router({",
      "  sync: publicImplementation.sync.handler(() => {",
      "    bodyRuns += 1;",
      '    return "sync";',
      "  }),",
      "  promise: publicImplementation.promise.handler(async () => {",
      "    bodyRuns += 1;",
      '    return Promise.resolve("promise");',
      "  }),",
      "  effect: publicImplementation.effect.effect(function* () {",
      "    bodyRuns += 1;",
      '    return yield* NativeEffect.succeed("effect");',
      "  }),",
      "});",
      "const internalRouter = internalImplementation.router({",
      "  sync: internalImplementation.sync.handler(() => {",
      "    bodyRuns += 1;",
      '    return "internal";',
      "  }),",
      "});",
      "const publicClient = createRouterClient(publicRouter, { context: {} });",
      "const internalClient = createRouterClient(internalRouter, { context: {} });",
      "const operationOutcomes = {",
      "  effect: await publicClient.effect(),",
      "  internal: await internalClient.sync(),",
      "  promise: await publicClient.promise(),",
      "  sync: await publicClient.sync(),",
      "};",
      "",
      "const createServerApiPlugin = defineServerApiPlugin.factory()({",
      '  capability: "installed-candidate",',
      '  routeBase: "/installed-candidate",',
      "  services,",
      "  api: () => publicRouter,",
      "});",
      "const createServerInternalPlugin = defineServerInternalPlugin.factory()({",
      '  capability: "installed-candidate",',
      '  routeBase: "/installed-candidate-internal",',
      "  services,",
      "  internal: () => internalRouter,",
      "});",
      "const serverApiPlugin = createServerApiPlugin();",
      "const serverInternalPlugin = createServerInternalPlugin();",
      "",
      "const asyncStep = defineAsyncStepEffect({",
      '  id: "installed-candidate-step",',
      "  policy: {},",
      "  effect: ({ event, clients, resources, telemetry, execution }) => {",
      "    void event;",
      "    void clients;",
      "    void resources;",
      "    void telemetry;",
      "    void execution;",
      "    bodyRuns += 1;",
      "    return HabitatEffect.succeed({ accepted: true as const });",
      "  },",
      "});",
      "const payloadSchema = RuntimeSchema.fromTypeBox(",
      "  Type.Object({ value: Type.String() })",
      ");",
      "const workflow = defineWorkflow({",
      '  id: "installed-candidate-workflow",',
      "  inputSchema: payloadSchema,",
      "  steps: [asyncStep],",
      "});",
      "const schedule = defineSchedule({",
      '  id: "installed-candidate-schedule",',
      '  cron: "0 0 * * *",',
      "  steps: [asyncStep],",
      "});",
      "const consumer = defineConsumer({",
      '  id: "installed-candidate-consumer",',
      '  eventName: "installed.candidate.requested",',
      "  eventSchema: payloadSchema,",
      "  steps: [asyncStep],",
      "});",
      "const workflowPlugin = defineAsyncWorkflowPlugin.factory()({",
      '  capability: "installed-candidate",',
      "  services,",
      "  workflows: [workflow],",
      "})();",
      "const schedulePlugin = defineAsyncSchedulePlugin.factory()({",
      '  capability: "installed-candidate",',
      "  services,",
      "  schedules: [schedule],",
      "})();",
      "const consumerPlugin = defineAsyncConsumerPlugin.factory()({",
      '  capability: "installed-candidate",',
      "  services,",
      "  consumers: [consumer],",
      "})();",
      "",
      "export type InstalledPluginTypeOracle = readonly [",
      "  Assert<Equal<typeof implementServerApiPlugin, typeof nativeImplement>>,",
      "  Assert<Equal<typeof implementServerInternalPlugin, typeof nativeImplement>>,",
      '  Assert<Equal<typeof serverApiPlugin.id, "server.api.installed-candidate">>,',
      '  Assert<Equal<typeof serverInternalPlugin.id, "server.internal.installed-candidate">>,',
      '  Assert<Equal<typeof workflow.kind, "async.workflow">>,',
      '  Assert<Equal<typeof schedule.kind, "async.schedule">>,',
      '  Assert<Equal<typeof consumer.kind, "async.consumer">>,',
      '  Assert<Equal<typeof asyncStep.kind, "async.step-effect">>,',
      "  Assert<Equal<Parameters<typeof asyncStep.effect>[0], AsyncStepExecutionContext>>,",
      '  Assert<Equal<keyof typeof serverApiPlugin.services, "workItems">>,',
      '  Assert<Equal<keyof typeof workflowPlugin.services, "workItems">>,',
      '  Assert<Equal<Extract<keyof ServiceUse, string>, "kind" | "serviceId" | "serviceInstance">>,',
      '  Assert<Equal<typeof serviceUse.kind, "service.use">>,',
      "  Assert<",
      "    Equal<",
      "      ServerServiceContractOf<typeof serverApiPlugin.services.workItems>,",
      "      typeof consumedContract",
      "    >",
      "  >,",
      "  Assert<",
      "    Equal<",
      "      AsyncServiceContractOf<typeof workflowPlugin.services.workItems>,",
      "      typeof consumedContract",
      "    >",
      "  >,",
      "];",
      "",
      "console.log(",
      "  JSON.stringify({",
      "    bodyRuns,",
      "    declarations: {",
      "      consumer: consumer.kind,",
      "      schedule: schedule.kind,",
      "      step: asyncStep.kind,",
      "      workflow: workflow.kind,",
      "    },",
      "    factories: {",
      "      asyncConsumer: consumerPlugin.id,",
      "      asyncSchedule: schedulePlugin.id,",
      "      asyncWorkflow: workflowPlugin.id,",
      "      serverApi: serverApiPlugin.id,",
      "      serverInternal: serverInternalPlugin.id,",
      "    },",
      "    nativeImplementers:",
      "      implementServerApiPlugin === nativeImplement &&",
      "      implementServerInternalPlugin === nativeImplement,",
      "    operationOutcomes,",
      "    serviceUse: {",
      "      frozen: Object.isFrozen(serviceUse),",
      "      helperIdentity:",
      "        useServiceFace === useServerService && useServerService === useAsyncService,",
      "      json: JSON.parse(JSON.stringify(serviceUse)),",
      "      keys: Object.keys(serviceUse).sort(),",
      "      selectedInstance: selectedServiceUse.serviceInstance,",
      "      selectedKeys: Object.keys(selectedServiceUse).sort(),",
      "    },",
      "    serviceMapRetention: {",
      "      asyncConsumer: consumerPlugin.services.workItems === serviceUse,",
      "      asyncSchedule: schedulePlugin.services.workItems === serviceUse,",
      "      asyncWorkflow: workflowPlugin.services.workItems === serviceUse,",
      "      serverApi: serverApiPlugin.services.workItems === serviceUse,",
      "      serverInternal: serverInternalPlugin.services.workItems === serviceUse,",
      "    },",
      "    officialEffectMethods: {",
      "      api: typeof publicImplementation.effect.effect,",
      "      internal: typeof internalImplementation.sync.effect,",
      "    },",
      "    routerKeys: {",
      "      api: Object.keys(publicRouter).sort(),",
      "      internal: Object.keys(internalRouter).sort(),",
      "    },",
      "  })",
      ");",
      "",
    ].join("\n")
  );
  const typechecked = await run(
    nx,
    ["run", "@fixture/greeting-service:typecheck", "--outputStyle=static"],
    { cwd: consumerRoot, env: { PATH: fixturePath }, timeoutMs: 120_000 }
  );
  const constructedPlugins = await run("bun", [pluginImplementationConsumerPath], {
    cwd: serviceRoot,
    timeoutMs: 60_000,
  });
  await rm(telemetryTypeConsumerPath);
  await rm(runtimeTypeConsumerPath);
  await rm(pluginImplementationConsumerPath);
  const effectEnabledPolicy = await run(
    nx,
    ["run", "@fixture/greeting-service:check:policy", "--outputStyle=static", "--skipNxCache"],
    { cwd: consumerRoot, env: { PATH: fixturePath }, timeoutMs: 120_000 }
  );
  await writeFile(serviceImplementationPath, generatedServiceImplementation);
  await writeFile(servicePackagePath, generatedServiceManifest);
  const restoredGeneratedService = await run("bun", ["install", "--ignore-scripts"], {
    cwd: consumerRoot,
    timeoutMs: 120_000,
  });
  expect(typechecked, `${typechecked.stdout}\n${typechecked.stderr}`).toMatchObject({
    exitCode: 0,
  });
  expect(constructedPlugins, constructedPlugins.stderr || constructedPlugins.stdout).toMatchObject({
    exitCode: 0,
    stderr: "",
  });
  expect(
    effectEnabledPolicy,
    `${effectEnabledPolicy.stdout}\n${effectEnabledPolicy.stderr}`
  ).toMatchObject({ exitCode: 0 });
  expect(JSON.parse(constructedPlugins.stdout)).toEqual({
    bodyRuns: 4,
    declarations: {
      consumer: "async.consumer",
      schedule: "async.schedule",
      step: "async.step-effect",
      workflow: "async.workflow",
    },
    factories: {
      asyncConsumer: "async.consumer.installed-candidate",
      asyncSchedule: "async.schedule.installed-candidate",
      asyncWorkflow: "async.workflow.installed-candidate",
      serverApi: "server.api.installed-candidate",
      serverInternal: "server.internal.installed-candidate",
    },
    nativeImplementers: true,
    operationOutcomes: {
      effect: "effect",
      internal: "internal",
      promise: "promise",
      sync: "sync",
    },
    serviceUse: {
      frozen: true,
      helperIdentity: true,
      json: { kind: "service.use", serviceId: "installed-service" },
      keys: ["kind", "serviceId"],
      selectedInstance: "secondary",
      selectedKeys: ["kind", "serviceId", "serviceInstance"],
    },
    serviceMapRetention: {
      asyncConsumer: true,
      asyncSchedule: true,
      asyncWorkflow: true,
      serverApi: true,
      serverInternal: true,
    },
    officialEffectMethods: { api: "function", internal: "function" },
    routerKeys: {
      api: ["effect", "promise", "sync"],
      internal: ["sync"],
    },
  });
  expect(
    restoredGeneratedService,
    restoredGeneratedService.stderr || restoredGeneratedService.stdout
  ).toMatchObject({ exitCode: 0 });

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

async function sha256File(filePath: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

async function sha256FileSet(root: string, relativePaths: readonly string[]): Promise<string> {
  const hash = createHash("sha256");
  for (const relativePath of [...relativePaths].sort()) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(path.join(root, relativePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
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
    ...runtimeCompilerAcceptanceFiles(),
    ...runtimeDefinitionAcceptanceFiles(),
    ...runtimeDerivationAcceptanceFiles(),
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

function runtimeCompilerAcceptanceFiles(): Readonly<Record<string, string>> {
  const root = "packages/runtime-compiler-acceptance";
  const sourceFiles = [
    "compile-runtime-plan.ts",
    "compiled-process-plan.ts",
    "index.ts",
    "runtime-compilation-reference-table.ts",
  ];
  const proofFiles = [
    "compile-runtime-plan.test.ts",
    "derivation-handoff.test.ts",
    "nx-cache.test.ts",
  ];

  return {
    [`${root}/AGENTS.md`]: "# Runtime Compiler Acceptance Fixture\n",
    [`${root}/habitat.toml`]: runtimeCompilerAcceptanceInstanceToml(),
    [`${root}/project.json`]: `${JSON.stringify(
      {
        name: "@fixture/runtime-compiler-acceptance",
        projectType: "library",
        root,
        sourceRoot: `${root}/src`,
        tags: ["type:runtime", "role:runtime-compiler-acceptance"],
      },
      null,
      2
    )}\n`,
    [`${root}/tsconfig.json`]: `${JSON.stringify(
      {
        extends: "../../../tsconfig.base.json",
        compilerOptions: { noEmit: true },
        include: ["src/**/*.ts", "test/**/*.ts"],
      },
      null,
      2
    )}\n`,
    [`${root}/tsconfig.test.json`]: `${JSON.stringify(
      { extends: "./tsconfig.json", include: ["test/**/*.ts"] },
      null,
      2
    )}\n`,
    [`${root}/tsdown.config.ts`]: 'export default { entry: ["src/index.ts"] };\n',
    ...Object.fromEntries(
      sourceFiles.map((filename) => [`${root}/src/${filename}`, "export {};\n"])
    ),
    ...Object.fromEntries(
      proofFiles.map((filename) => [`${root}/test/${filename}`, "export {};\n"])
    ),
  };
}

function runtimeCompilerAcceptanceInstanceToml(): string {
  return `schemaVersion = 1
id = "runtime-compiler-acceptance"
ownerProject = "@fixture/runtime-compiler-acceptance"
blueprint = "runtime-compiler"
blueprintVersion = 1

[roots]
project = "packages/runtime-compiler-acceptance"

[selections]
`;
}

function runtimeDefinitionAcceptanceFiles(): Readonly<Record<string, string>> {
  const root = "packages/runtime-definition-acceptance";
  const sourceFiles = [
    "app.ts",
    "effect.ts",
    "execution.ts",
    "index.ts",
    "observation.ts",
    "plugin.ts",
    "profile.ts",
    "provider-effect-plan.ts",
    "provider.ts",
    "resource.ts",
    "service.ts",
  ];
  const proofFiles = ["definition.test.ts", "provider-effect-plan.test.ts", "nx-cache.test.ts"];

  return {
    [`${root}/AGENTS.md`]: "# Runtime Definition Acceptance Fixture\n",
    [`${root}/habitat.toml`]: runtimeDefinitionAcceptanceInstanceToml(),
    [`${root}/project.json`]: `${JSON.stringify(
      {
        name: "@fixture/runtime-definition-acceptance",
        projectType: "library",
        root,
        sourceRoot: `${root}/src`,
        tags: ["type:runtime", "role:runtime-definition-acceptance"],
      },
      null,
      2
    )}\n`,
    [`${root}/tsconfig.json`]: `${JSON.stringify(
      {
        extends: "../../../tsconfig.base.json",
        compilerOptions: { noEmit: true },
        include: ["src/**/*.ts", "test/**/*.ts"],
      },
      null,
      2
    )}\n`,
    [`${root}/tsconfig.test.json`]: `${JSON.stringify(
      { extends: "./tsconfig.json", include: ["test/**/*.ts"] },
      null,
      2
    )}\n`,
    [`${root}/tsdown.config.ts`]: 'export default { entry: ["src/index.ts"] };\n',
    ...Object.fromEntries(
      sourceFiles.map((filename) => [`${root}/src/${filename}`, "export {};\n"])
    ),
    ...Object.fromEntries(
      proofFiles.map((filename) => [`${root}/test/${filename}`, "export {};\n"])
    ),
  };
}

function runtimeDefinitionAcceptanceInstanceToml(): string {
  return `schemaVersion = 1
id = "runtime-definition-acceptance"
ownerProject = "@fixture/runtime-definition-acceptance"
blueprint = "runtime-definition"
blueprintVersion = 2

[roots]
project = "packages/runtime-definition-acceptance"

[selections]
`;
}

function runtimeDerivationAcceptanceFiles(): Readonly<Record<string, string>> {
  const root = "packages/runtime-derivation-acceptance";
  const sourceFiles = [
    "derive-execution-descriptor-table.ts",
    "derive-runtime-artifacts.ts",
    "execution-descriptor-ref.ts",
    "identity-policy.ts",
    "index.ts",
    "normalized-authoring-graph.ts",
    "normalized-runtime-topology.ts",
    "portable-runtime-plan-artifact.ts",
    "service-binding-plan.ts",
    "surface-runtime-plan.ts",
    "web-route-module-table.ts",
    "workflow-dispatcher-descriptor.ts",
  ];
  const proofFiles = [
    "complete-derivation.test.ts",
    "normalized-topology.test.ts",
    "nx-cache.test.ts",
  ];

  return {
    [`${root}/AGENTS.md`]: "# Runtime Derivation Acceptance Fixture\n",
    [`${root}/habitat.toml`]: runtimeDerivationAcceptanceInstanceToml(),
    [`${root}/project.json`]: `${JSON.stringify(
      {
        name: "@fixture/runtime-derivation-acceptance",
        projectType: "library",
        root,
        sourceRoot: `${root}/src`,
        tags: ["type:runtime", "role:runtime-derivation-acceptance"],
      },
      null,
      2
    )}\n`,
    [`${root}/tsconfig.json`]: `${JSON.stringify(
      {
        extends: "../../../tsconfig.base.json",
        compilerOptions: { noEmit: true },
        include: ["src/**/*.ts", "test/**/*.ts"],
      },
      null,
      2
    )}\n`,
    [`${root}/tsconfig.test.json`]: `${JSON.stringify(
      { extends: "./tsconfig.json", include: ["test/**/*.ts"] },
      null,
      2
    )}\n`,
    [`${root}/tsdown.config.ts`]: 'export default { entry: ["src/index.ts"] };\n',
    ...Object.fromEntries(
      sourceFiles.map((filename) => [`${root}/src/${filename}`, "export {};\n"])
    ),
    ...Object.fromEntries(
      proofFiles.map((filename) => [`${root}/test/${filename}`, "export {};\n"])
    ),
  };
}

function runtimeDerivationAcceptanceInstanceToml(): string {
  return `schemaVersion = 1
id = "runtime-derivation-acceptance"
ownerProject = "@fixture/runtime-derivation-acceptance"
blueprint = "runtime-derivation"
blueprintVersion = 2

[roots]
project = "packages/runtime-derivation-acceptance"

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
