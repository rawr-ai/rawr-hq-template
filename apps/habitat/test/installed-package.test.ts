import { spawn } from "node:child_process";
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
const sdkVersion = await readPackageVersion("packages/habitat-sdk");
const cliVersion = await readPackageVersion("apps/habitat");
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

    const resolved = await run(habitat, ["resolve"], { cwd: consumerRoot });
    expect(resolved, resolved.stderr || resolved.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(JSON.parse(resolved.stdout)).toMatchObject({
      _tag: "Resolved",
      catalog: {
        policyPack: {
          name: "@habitat-ai/sdk",
          protocolVersion: 1,
          version: productVersion("@habitat-ai/sdk"),
        },
        instances: [{ id: "installed-package", ownerProject: "@fixture/package" }],
      },
    });

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
          ruleId: "source_pattern",
          runner: "grit",
          status: "pass",
        },
        {
          instanceId: "installed-package",
          ruleId: "source_shape",
          runner: "habitat",
          status: "pass",
        },
      ],
      ok: true,
    });

    const nx = path.join(consumerRoot, "node_modules/.bin/nx");
    const cliTarball = path.join(
      acceptanceRoot,
      "packages",
      publicProduct("@habitat-ai/cli").filename
    );
    const initialized = await run(
      nx,
      ["add", `@habitat-ai/cli@file:${cliTarball}`, "--no-interactive"],
      { cwd: consumerRoot, timeoutMs: 120_000 }
    );
    expect(initialized, initialized.stderr || initialized.stdout).toMatchObject({ exitCode: 0 });

    const nxPath = path.join(consumerRoot, "nx.json");
    const hooksPath = path.join(consumerRoot, ".codex/hooks.json");
    const packagePath = path.join(consumerRoot, "package.json");
    const firstNx = await readFile(nxPath, "utf8");
    const firstHooks = await readFile(hooksPath, "utf8");
    const firstPackage = await readFile(packagePath, "utf8");
    expect(JSON.parse(firstNx)).toMatchObject({ plugins: ["@habitat-ai/cli/nx-plugin"] });
    expect(JSON.parse(firstPackage)).toMatchObject({ trustedDependencies: ["@getgrit/cli"] });
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

    const repeated = await run(nx, ["generate", "@habitat-ai/cli:init", "--no-interactive"], {
      cwd: consumerRoot,
      timeoutMs: 120_000,
    });
    expect(repeated, repeated.stderr || repeated.stdout).toMatchObject({ exitCode: 0 });
    expect(await readFile(nxPath, "utf8")).toBe(firstNx);
    expect(await readFile(hooksPath, "utf8")).toBe(firstHooks);
    expect(await readFile(packagePath, "utf8")).toBe(firstPackage);

    const projected = await run(nx, ["show", "project", "@fixture/package", "--json"], {
      cwd: consumerRoot,
      timeoutMs: 60_000,
    });
    expect(projected, projected.stderr || projected.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    const project = JSON.parse(projected.stdout) as {
      readonly targets?: Readonly<Record<string, unknown>>;
    };
    const targets = Object.keys(project.targets ?? {})
      .filter((name) => name.startsWith("habitat:application:"))
      .sort();
    expect(targets).toEqual([
      "habitat:application:installed-package:source_pattern",
      "habitat:application:installed-package:source_shape",
    ]);
    const target = "habitat:application:installed-package:source_pattern";

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
    ...products.map((product) => [product.name, `file:../packages/${product.filename}`]),
    ["nx", "23.1.0"],
  ]);
  const files: Readonly<Record<string, string>> = {
    ".habitat/blueprints/package/blueprint.toml": blueprintToml(),
    ".habitat/blueprints/package/source_pattern.md": sourcePattern(),
    ".habitat/blueprints/package/source_shape.structure.toml": structureToml(),
    ".habitat/index.json": `${JSON.stringify(
      { schemaVersion: 2, ownerRoots: { "@fixture/package": "packages/example" } },
      null,
      2
    )}\n`,
    "consumer.ts": consumerSource(),
    "nx.json": "{}\n",
    "package.json": `${JSON.stringify(
      {
        name: "habitat-installed-consumer",
        private: true,
        type: "module",
        workspaces: ["packages/*"],
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
    "packages/example/source.ts": "export const installed = true;\n",
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
    ...options.env,
  };
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

function blueprintToml(): string {
  return `schemaVersion = 1
id = "package"
version = 1

[[rules]]
id = "source_pattern"
lane = "enforced"
message = "Source pattern must remain valid."
remediate = "Restore the declared source pattern."

[rules.runner]
name = "grit"
pattern = "source_pattern.md"
patternName = "source_pattern"

[rules.runner.acquisition]
kind = "check"
rootRoles = ["project"]
selections = []

[[rules]]
id = "source_shape"
lane = "enforced"
message = "Source shape must remain valid."
remediate = "Restore the declared source shape."

[rules.runner]
name = "habitat"
mode = "structure"
structure = "source_shape.structure.toml"

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

function sourcePattern(): string {
  return `# source_pattern

\`\`\`grit
language js(typescript)
\`forbidden()\`
\`\`\`
`;
}

function structureToml(): string {
  return `schemaVersion = 2

[[scopes]]
name = "source"
rootRole = "project"
relativePath = "."
kind = "directory"
mode = "closed"
required = ["habitat.toml", "package.json", "source.ts"]
allowed = []
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
