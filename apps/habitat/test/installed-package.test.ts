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
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const registryVersion = process.env.HABITAT_ACCEPTANCE_REGISTRY_VERSION?.trim();
if (
  registryVersion !== undefined &&
  (registryVersion.length === 0 || registryVersion !== sdkVersion || registryVersion !== cliVersion)
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

beforeAll(async () => {
  acceptanceRoot = await realpath(await mkdtemp(path.join(temporaryParent, FIXTURE_PREFIX)));
  consumerRoot = path.join(acceptanceRoot, "consumer");
  await mkdir(path.join(acceptanceRoot, "packages"), { recursive: true });
  await Promise.all(
    ["cache", "config", "data", "home", "tmp"].map((directory) =>
      mkdir(path.join(acceptanceRoot, "runtime", directory), { recursive: true })
    )
  );
  await mkdir(consumerRoot, { recursive: true });
  await packPublicProducts();
  await createConsumer();
  await installConsumer();
}, 180_000);

afterAll(async () => {
  if (acceptanceRoot !== "") await removeOwnedFixture(acceptanceRoot);
});

describe("installed Habitat products", () => {
  it("installs, executes, and initializes the public SDK and CLI boundary", async () => {
    const consumerBlueprintRoot = path.join(consumerRoot, ".habitat/blueprints");
    for (const product of products) {
      const packageRoot = path.join(consumerRoot, "node_modules", product.name);
      const stats = await lstat(packageRoot);
      expect(stats.isDirectory()).toBe(true);
      expect(stats.isSymbolicLink()).toBe(false);

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

    await expect(lstat(consumerBlueprintRoot)).rejects.toMatchObject({ code: "ENOENT" });
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
        instances: [
          {
            id: "installed-package",
            ownerProject: "@fixture/package",
            roots: [{ id: "project", path: "packages/example" }],
          },
        ],
        applications: [
          {
            instanceId: "installed-package",
            ruleId: "package_v1_structure",
            provenance: { kind: "policy-pack" },
            runner: {
              structure: { provenance: { kind: "policy-pack" } },
            },
          },
        ],
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
      applications: [
        {
          instanceId: "installed-package",
          ruleId: "package_v1_structure",
          runner: "habitat",
          status: "pass",
        },
      ],
      ok: true,
    });

    const nx = path.join(consumerRoot, "node_modules/.bin/nx");
    const cliSpecifier =
      registryVersion ??
      `file:${path.join(acceptanceRoot, "packages", publicProduct("@habitat-ai/cli").filename)}`;
    const initialized = await run(
      nx,
      ["add", `@habitat-ai/cli@${cliSpecifier}`, "--no-interactive"],
      { cwd: consumerRoot, timeoutMs: 120_000 }
    );
    expect(initialized, initialized.stderr || initialized.stdout).toMatchObject({ exitCode: 0 });

    const nxPath = path.join(consumerRoot, "nx.json");
    const hooksPath = path.join(consumerRoot, ".codex/hooks.json");
    const prePushPath = path.join(consumerRoot, ".husky/pre-push");
    const packagePath = path.join(consumerRoot, "package.json");
    const packageLockPath = path.join(consumerRoot, "package-lock.json");
    const instancePath = path.join(consumerRoot, "packages/example/habitat.toml");
    const firstNx = await readFile(nxPath, "utf8");
    const firstHooks = await readFile(hooksPath, "utf8");
    const firstPrePush = await readFile(prePushPath, "utf8");
    const firstPackage = await readFile(packagePath, "utf8");
    const firstPackageLock = await readFile(packageLockPath, "utf8");
    const firstInstance = await readFile(instancePath, "utf8");
    await expect(lstat(consumerBlueprintRoot)).rejects.toMatchObject({ code: "ENOENT" });
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
    const packageLock = JSON.parse(firstPackageLock) as {
      readonly packages?: Readonly<Record<string, { readonly version?: string }>>;
    };
    expect(packageLock.packages?.["node_modules/husky"]?.version).toBe("9.1.7");
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
    expect(await readFile(packageLockPath, "utf8")).toBe(firstPackageLock);
    expect(await readFile(instancePath, "utf8")).toBe(firstInstance);
    await expect(lstat(consumerBlueprintRoot)).rejects.toMatchObject({ code: "ENOENT" });

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
    expect(await readFile(packageLockPath, "utf8")).toBe(firstPackageLock);
    expect(await readFile(instancePath, "utf8")).toBe(firstInstance);
    await expect(lstat(consumerBlueprintRoot)).rejects.toMatchObject({ code: "ENOENT" });
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
    ).toEqual([{ externalDependencies: ["@habitat-ai/cli", "@habitat-ai/sdk"] }]);
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
      const relativePath = path.join(relativeRoot, entry.name);
      if (entry.isDirectory()) return listFiles(root, relativePath);
      if (entry.isFile()) return [relativePath];
      throw new Error(`Unexpected non-file blueprint entry: ${relativePath}`);
    })
  );
  return files.flat().sort();
}

async function packPublicProducts(): Promise<void> {
  if (registryVersion !== undefined) return;

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

async function createConsumer(): Promise<void> {
  const dependencies = Object.fromEntries([
    ...products.map((product) => [
      product.name,
      registryVersion ?? `file:../packages/${product.filename}`,
    ]),
    ["nx", "23.1.0"],
  ]);
  const files: Readonly<Record<string, string>> = {
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
    "tsconfig.json": `${JSON.stringify(
      {
        compilerOptions: {
          lib: ["ES2022", "DOM", "DOM.Iterable"],
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
  const installed = await run(
    "npm",
    ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: consumerRoot, timeoutMs: 180_000 }
  );
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
