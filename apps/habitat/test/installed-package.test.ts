import { execFileSync, spawn } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
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
let adoptionRoot = "";
let consumerRoot = "";
let gritSubjectPaths: readonly string[] = [];
let localRegistry: Server | undefined;
const originalRegistryEnvironment = new Map(
  ["BUN_CONFIG_REGISTRY", "BUN_CONFIG_TOKEN", "NPM_CONFIG_USERCONFIG", "npm_config_registry"].map(
    (name) => [name, process.env[name]]
  )
);
const installVersion = publishedRegistryVersion ?? sdkVersion;

beforeAll(async () => {
  acceptanceRoot = await realpath(await mkdtemp(path.join(temporaryParent, FIXTURE_PREFIX)));
  adoptionRoot = path.join(acceptanceRoot, "adoption");
  consumerRoot = path.join(acceptanceRoot, "consumer");
  await mkdir(path.join(acceptanceRoot, "packages"), { recursive: true });
  await Promise.all(
    ["cache", "config", "data", "home", "tmp"].map((directory) =>
      mkdir(path.join(acceptanceRoot, "runtime", directory), { recursive: true })
    )
  );
  await mkdir(adoptionRoot, { recursive: true });
  await mkdir(consumerRoot, { recursive: true });
  await packPublicProducts();
  if (publishedRegistryVersion === undefined) {
    await startCandidateRegistry();
    await publishCandidateProducts();
  }
  await createAdoptionConsumer();
  await installAdoptionConsumer();
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
});

describe("installed Habitat products", () => {
  it("adopts the packed CLI and preset into a bare Bun Nx repository", async () => {
    const cliRoot = path.join(adoptionRoot, "node_modules/@habitat-ai/cli");
    await expect(lstat(cliRoot)).rejects.toMatchObject({ code: "ENOENT" });

    const nx = path.join(adoptionRoot, "node_modules/.bin/nx");
    const added = await run(nx, ["add", `@habitat-ai/cli@${installVersion}`, "--no-interactive"], {
      cwd: adoptionRoot,
      env: {
        PATH: `${path.join(adoptionRoot, "node_modules/.bin")}${path.delimiter}${process.env.PATH ?? ""}`,
      },
      timeoutMs: 120_000,
    });
    expect(added, added.stderr || added.stdout).toMatchObject({ exitCode: 0 });

    const cliStats = await lstat(cliRoot);
    expect(cliStats.isDirectory()).toBe(true);
    expect(cliStats.isSymbolicLink()).toBe(false);
    expect(await readFile(path.join(cliRoot, "preset.schema.json"), "utf8")).toContain(
      '"additionalProperties": true'
    );
    expect(JSON.parse(await readFile(path.join(adoptionRoot, "nx.json"), "utf8"))).toMatchObject({
      plugins: ["@habitat-ai/cli/nx-plugin"],
    });
    expect(
      JSON.parse(await readFile(path.join(adoptionRoot, "package.json"), "utf8"))
    ).toMatchObject({
      packageManager: "bun@1.3.14",
      scripts: { prepare: "husky" },
      devDependencies: { husky: "9.1.7" },
      trustedDependencies: ["@getgrit/cli"],
    });
    const hookConfig = await run("git", ["config", "--local", "--get", "core.hooksPath"], {
      cwd: adoptionRoot,
    });
    expect(hookConfig, hookConfig.stderr || hookConfig.stdout).toMatchObject({
      exitCode: 0,
      stdout: ".husky/_\n",
    });

    const fixturePath = `${path.join(adoptionRoot, "node_modules/.bin")}${path.delimiter}${process.env.PATH ?? ""}`;
    const preset = await run(
      nx,
      ["generate", "@habitat-ai/cli:preset", "--packageManager=bun", "--no-interactive"],
      { cwd: adoptionRoot, env: { PATH: fixturePath }, timeoutMs: 120_000 }
    );
    expect(preset, preset.stderr || preset.stdout).toMatchObject({ exitCode: 0 });
    expect(JSON.parse(await readFile(path.join(adoptionRoot, "nx.json"), "utf8"))).toMatchObject({
      namedInputs: {
        production: [
          "default",
          "!{projectRoot}/test/**",
          "!{projectRoot}/**/*.test.*",
          "!{projectRoot}/**/*.spec.*",
        ],
      },
    });

    const exampleRoot = path.join(adoptionRoot, "packages/example");
    await mkdir(path.join(exampleRoot, "src"), { recursive: true });
    await writeFile(path.join(exampleRoot, "src/index.ts"), "export const answer = 42;\n");
    await writeFile(
      path.join(exampleRoot, "project.json"),
      `${JSON.stringify(
        {
          name: "adoption-example",
          targets: {
            build: {
              executor: "nx:run-commands",
              options: {
                command: "bun build src/index.ts --outdir dist",
                cwd: "packages/example",
              },
            },
          },
        },
        null,
        2
      )}\n`
    );
    const built = await run(nx, ["run", "adoption-example:build", "--outputStyle=static"], {
      cwd: adoptionRoot,
      env: { PATH: fixturePath },
      timeoutMs: 60_000,
    });
    expect(built, built.stderr || built.stdout).toMatchObject({ exitCode: 0 });
    expect(await readFile(path.join(exampleRoot, "dist/index.js"), "utf8")).toContain("answer");
  });

  it("creates the portable Bun repository before activating post-Git hooks", async () => {
    const name = "preset-consumer";
    const root = path.join(acceptanceRoot, name);
    const cliSpecifier = `@habitat-ai/cli@${installVersion}`;
    const created = await run(
      "bunx",
      [
        "--bun",
        "create-nx-workspace@23.1.0",
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
      devDependencies: { "@biomejs/biome": "2.5.3" },
    });
    expect(JSON.parse(firstPackage)).not.toHaveProperty("scripts.prepare");
    expect(JSON.parse(firstNx)).toMatchObject({
      plugins: ["@habitat-ai/cli/nx-plugin"],
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
      await readFile(projectPath, "utf8"),
      await readFile(path.join(root, "tsconfig.base.json"), "utf8"),
    ].join("\n");
    expect(generatedAuthority).not.toContain("rawr");
    expect(generatedAuthority).not.toContain("pnpm");
    expect(generatedAuthority).not.toContain(workspaceRoot);
  });

  it("installs, executes, and initializes the public SDK and CLI boundary", async () => {
    const consumerBlueprintRoot = path.join(consumerRoot, ".habitat/blueprints");
    const consumerBlueprintInventory = [
      "grit-acceptance/blueprint.toml",
      "grit-acceptance/no-forbidden.md",
    ];
    for (const product of products) {
      const packageRoot = path.join(consumerRoot, "node_modules", product.name);
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
      "sdk",
    ]);

    const cliManifest = JSON.parse(
      await readFile(path.join(consumerRoot, "node_modules/@habitat-ai/cli/package.json"), "utf8")
    ) as { readonly dependencies?: Readonly<Record<string, string>> };
    const habitatDependencies = Object.keys(cliManifest.dependencies ?? {})
      .filter((name) => name.startsWith("@habitat-ai/"))
      .sort();
    expect(habitatDependencies).toEqual(["@habitat-ai/sdk"]);
    expect(cliManifest.dependencies?.["@habitat-ai/sdk"]).toBe(productVersion("@habitat-ai/sdk"));

    const sdkManifest = JSON.parse(
      await readFile(path.join(consumerRoot, "node_modules/@habitat-ai/sdk/package.json"), "utf8")
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

    const consumerRequire = createRequire(path.join(consumerRoot, "package.json"));
    const installedPackPath = consumerRequire.resolve("@habitat-ai/sdk/habitat-pack.json");
    const installedBlueprintPath = consumerRequire.resolve(
      "@habitat-ai/sdk/blueprints/package/blueprint.toml"
    );
    expect(JSON.parse(await readFile(installedPackPath, "utf8"))).toEqual(
      JSON.parse(
        await readFile(path.join(workspaceRoot, "packages/habitat-sdk/habitat-pack.json"), "utf8")
      )
    );

    const canonicalBlueprintRoot = path.join(workspaceRoot, ".habitat/blueprints");
    const installedBlueprintRoot = path.resolve(path.dirname(installedBlueprintPath), "..");
    const blueprintInventory = await listFiles(canonicalBlueprintRoot);
    expect(await listFiles(installedBlueprintRoot)).toEqual(blueprintInventory);
    for (const relativePath of blueprintInventory) {
      expect(await readFile(path.join(installedBlueprintRoot, relativePath))).toEqual(
        await readFile(path.join(canonicalBlueprintRoot, relativePath))
      );
    }

    const typecheck = await run(process.execPath, [
      path.join(workspaceRoot, "node_modules/typescript/bin/tsc"),
      "-p",
      path.join(consumerRoot, "tsconfig.json"),
    ]);
    expect(typecheck, typecheck.stderr || typecheck.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });

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
        ]),
      },
    });
    expect(resolvedCatalog.catalog.policyPack.blueprints).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "package", version: 1 })])
    );
    expect(resolvedCatalog.catalog.blueprints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          definition: expect.objectContaining({ id: "package", version: 1 }),
          provenance: expect.objectContaining({ kind: "policy-pack" }),
        }),
      ])
    );

    const checked = await run(habitat, ["check"], { cwd: consumerRoot });
    expect(checked, checked.stderr || checked.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(JSON.parse(checked.stdout)).toMatchObject({
      _tag: "Completed",
      applications: expect.arrayContaining([
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
    const initialized = await run(nx, ["generate", "@habitat-ai/cli:init", "--no-interactive"], {
      cwd: consumerRoot,
      timeoutMs: 120_000,
    });
    expect(initialized, initialized.stderr || initialized.stdout).toMatchObject({ exitCode: 0 });

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
    expect(JSON.parse(firstNx)).toMatchObject({ plugins: ["@habitat-ai/cli/nx-plugin"] });
    expect(JSON.parse(firstPackage)).toMatchObject({
      scripts: { check: "node hook-check.mjs", prepare: "husky" },
      devDependencies: { husky: "9.1.7" },
      trustedDependencies: ["@getgrit/cli"],
    });
    const huskyManifest = JSON.parse(
      await readFile(path.join(consumerRoot, "node_modules/husky/package.json"), "utf8")
    ) as { readonly version?: string };
    expect(huskyManifest.version).toBe("9.1.7");
    expect(firstLock).toContain('"husky": ["husky@9.1.7"');
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

    const inertRepeat = await run(nx, ["generate", "@habitat-ai/cli:init", "--no-interactive"], {
      cwd: consumerRoot,
      timeoutMs: 120_000,
    });
    expect(inertRepeat, inertRepeat.stderr || inertRepeat.stdout).toMatchObject({ exitCode: 0 });
    expect(await readFile(nxPath, "utf8")).toBe(firstNx);
    expect(await readFile(hooksPath, "utf8")).toBe(firstHooks);
    expect(await readFile(prePushPath, "utf8")).toBe(firstPrePush);
    expect(await readFile(packagePath, "utf8")).toBe(firstPackage);
    expect(await readFile(lockPath, "utf8")).toBe(firstLock);
    expect(await readFile(instancePath, "utf8")).toBe(firstInstance);
    expect(await listFiles(consumerBlueprintRoot)).toEqual(consumerBlueprintInventory);

    await rename(path.join(consumerRoot, ".husky/_"), path.join(consumerRoot, ".husky/_disabled"));
    const brokeHookConfig = await run("git", ["config", "core.hooksPath", ".broken-hooks"], {
      cwd: consumerRoot,
    });
    expect(brokeHookConfig, brokeHookConfig.stderr || brokeHookConfig.stdout).toMatchObject({
      exitCode: 0,
    });
    const repeated = await run(nx, ["generate", "@habitat-ai/cli:init", "--no-interactive"], {
      cwd: consumerRoot,
      timeoutMs: 120_000,
    });
    expect(repeated, repeated.stderr || repeated.stdout).toMatchObject({ exitCode: 0 });
    expect(await readFile(nxPath, "utf8")).toBe(firstNx);
    expect(await readFile(hooksPath, "utf8")).toBe(firstHooks);
    expect(await readFile(prePushPath, "utf8")).toBe(firstPrePush);
    expect(await readFile(packagePath, "utf8")).toBe(firstPackage);
    expect(await readFile(lockPath, "utf8")).toBe(firstLock);
    expect(await readFile(instancePath, "utf8")).toBe(firstInstance);
    expect(await listFiles(consumerBlueprintRoot)).toEqual(consumerBlueprintInventory);
    expect((await lstat(path.join(consumerRoot, ".husky/_/pre-push"))).isFile()).toBe(true);
    const repairedHookConfig = await run("git", ["config", "--local", "--get", "core.hooksPath"], {
      cwd: consumerRoot,
    });
    expect(
      repairedHookConfig,
      repairedHookConfig.stderr || repairedHookConfig.stdout
    ).toMatchObject({
      exitCode: 0,
      stdout: ".husky/_\n",
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

    const customPrePush = 'printf "%s\\n" "consumer-hook" > .consumer-hook-ran\n';
    await writeFile(prePushPath, customPrePush);
    const preserved = await run(nx, ["generate", "@habitat-ai/cli:init", "--no-interactive"], {
      cwd: consumerRoot,
      timeoutMs: 120_000,
    });
    expect(preserved, preserved.stderr || preserved.stdout).toMatchObject({ exitCode: 0 });
    expect(await readFile(prePushPath, "utf8")).toBe(customPrePush);
    const customHook = await run("git", ["hook", "run", "pre-push", "--", "origin"], {
      cwd: consumerRoot,
      timeoutMs: 60_000,
    });
    expect(customHook, customHook.stderr || customHook.stdout).toMatchObject({ exitCode: 0 });
    expect(await readFile(path.join(consumerRoot, ".consumer-hook-ran"), "utf8")).toBe(
      "consumer-hook\n"
    );

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

async function startCandidateRegistry(): Promise<void> {
  const registry = (await runServer(
    {
      configPath: path.join(acceptanceRoot, "registry.config.yml"),
      storage: path.join(acceptanceRoot, "registry"),
      uplinks: { npmjs: { maxage: "60m", url: "https://registry.npmjs.org" } },
      packages: {
        "@habitat-ai/*": { access: "$all", publish: "$all", unpublish: "$all" },
        "**": { access: "$all", proxy: "npmjs", publish: "$all", unpublish: "$all" },
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
  const npmConfig = path.join(acceptanceRoot, "runtime", "config", "npmrc");
  await writeFile(
    npmConfig,
    [
      `registry=${registryUrl}/`,
      `//127.0.0.1:${address.port}/:_authToken=habitat-acceptance`,
      "",
    ].join("\n")
  );
  process.env.NPM_CONFIG_USERCONFIG = npmConfig;
  process.env.npm_config_registry = registryUrl;
  process.env.BUN_CONFIG_REGISTRY = registryUrl;
  process.env.BUN_CONFIG_TOKEN = "habitat-acceptance";
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

async function publishCandidateProducts(): Promise<void> {
  for (const product of products) {
    const published = await run(
      "npm",
      [
        "publish",
        path.join(acceptanceRoot, "packages", product.filename),
        "--access",
        "public",
        "--ignore-scripts",
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

async function createAdoptionConsumer(): Promise<void> {
  const files: Readonly<Record<string, string>> = {
    "nx.json": "{}\n",
    "package.json": `${JSON.stringify(
      {
        name: "habitat-adoption-consumer",
        private: true,
        type: "module",
        packageManager: "bun@1.3.14",
        dependencies: { "@habitat-ai/sdk": installVersion },
        devDependencies: { nx: "23.1.0" },
      },
      null,
      2
    )}\n`,
  };

  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(adoptionRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents);
  }

  const initialized = await run("git", ["init", "--quiet"], { cwd: adoptionRoot });
  if (initialized.exitCode !== 0) {
    throw new Error(`Could not initialize adoption fixture: ${initialized.stderr}`);
  }
}

async function installAdoptionConsumer(): Promise<void> {
  const installed = await run("bun", ["install", "--ignore-scripts"], {
    cwd: adoptionRoot,
    timeoutMs: 180_000,
  });
  if (installed.exitCode !== 0) {
    throw new Error(`Could not install adoption fixture: ${installed.stderr || installed.stdout}`);
  }
}

async function createConsumer(): Promise<void> {
  const dependencies = Object.fromEntries([
    ...products.map((product) => [product.name, installVersion]),
    ["nx", "23.1.0"],
    ["typebox", "1.3.8"],
  ]);
  const subjectCount = process.platform === "win32" ? 64 : 1_815;
  const subjectIds = Array.from(
    { length: subjectCount },
    (_, index) => `subject-${String(index).padStart(4, "0")}-${"x".repeat(64)}`
  );
  const relativeSubjectPaths = subjectIds.map(
    (subjectId) => `packages/grit-acceptance/src/${subjectId}.ts`
  );
  gritSubjectPaths = relativeSubjectPaths.map((relativePath) =>
    path.join(consumerRoot, relativePath)
  );
  const files: Readonly<Record<string, string>> = {
    ".habitat/blueprints/grit-acceptance/blueprint.toml": gritAcceptanceBlueprintToml(),
    ".habitat/blueprints/grit-acceptance/no-forbidden.md":
      "# No forbidden calls\n\n```grit\nlanguage js(typescript)\n`forbidden()`\n```\n",
    "consumer.ts": consumerSource(),
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
        workspaces: ["packages/*"],
        scripts: { check: "node hook-check.mjs" },
        dependencies,
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
    "packages/producer-sdk/project.json": `${JSON.stringify(
      { name: "@habitat-ai/sdk", projectType: "library", targets: {} },
      null,
      2
    )}\n`,
    "tsconfig.json": `${JSON.stringify(
      {
        compilerOptions: {
          lib: ["ES2022", "ESNext.Disposable", "DOM", "DOM.Iterable"],
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: "ES2022",
        },
        include: ["consumer.ts"],
      },
      null,
      2
    )}\n`,
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
    throw new Error(`Could not install Habitat products: ${installed.stderr || installed.stdout}`);
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

function consumerSource(): string {
  return `import {
  createHabitatClientForWorkspace,
  standard,
  type HabitatClient,
  type TypeBoxStandardSchema,
} from "@habitat-ai/sdk";
import { Type } from "typebox";

const Ready = Type.Object({ ready: Type.Boolean() });
const readySchema: TypeBoxStandardSchema<typeof Ready> = standard(Ready);
const createClient: (workspaceRoot: string) => Promise<HabitatClient> =
  createHabitatClientForWorkspace;

void readySchema;
void createClient;
`;
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
