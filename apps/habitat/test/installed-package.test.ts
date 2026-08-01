import { spawn } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

type CommandResult = Readonly<{
  exitCode: number;
  stderr: string;
  stdout: string;
}>;

type PackedProject = Readonly<{
  exports: Readonly<Record<string, unknown>>;
  filename: string;
  name: string;
  root: string;
  version: string;
}>;

const FIXTURE_PREFIX = "habitat-installed-package-";
const temporaryParent = await realpath(tmpdir());
const workspaceRoot = fileURLToPath(new URL("../../..", import.meta.url));
const packedProjects: readonly PackedProject[] = [
  {
    exports: {
      ".": { default: "./dist/index.js", types: "./dist/index.d.ts" },
    },
    filename: "rawr-typebox-adapter.tgz",
    name: "@rawr/typebox-adapter",
    root: "packages/typebox-adapter",
    version: "0.1.0",
  },
  {
    exports: {
      ".": { default: "./dist/contract.js", types: "./dist/contract.d.ts" },
      "./providers/grit-effect-platform-node": {
        default: "./dist/providers/grit-effect-platform-node/index.js",
        types: "./dist/providers/grit-effect-platform-node/index.d.ts",
      },
    },
    filename: "habitat-resource-rule-evaluation.tgz",
    name: "@habitat/resource-rule-evaluation",
    root: "resources/rule-evaluation",
    version: "0.2.0",
  },
  {
    exports: {
      ".": { default: "./dist/contract.js", types: "./dist/contract.d.ts" },
      "./providers/git-effect-platform-node": {
        default: "./dist/providers/git-effect-platform-node/index.js",
        types: "./dist/providers/git-effect-platform-node/index.d.ts",
      },
    },
    filename: "habitat-resource-source-inventory.tgz",
    name: "@habitat/resource-source-inventory",
    root: "resources/source-inventory",
    version: "0.2.0",
  },
  {
    exports: {
      "./client": { default: "./dist/client.js", types: "./dist/client.d.ts" },
    },
    filename: "habitat-service.tgz",
    name: "@habitat/service",
    root: "services/habitat",
    version: "0.2.0",
  },
  {
    exports: {
      "./binding": {
        default: "./dist/lib/binding.js",
        types: "./dist/lib/binding.d.ts",
      },
    },
    filename: "habitat-plugin-cli.tgz",
    name: "@habitat/plugin-cli",
    root: "plugins/cli/commands/habitat",
    version: "0.2.0",
  },
  {
    exports: {
      "./nx-plugin": {
        default: "./dist/nx-plugin.js",
        import: "./dist/nx-plugin.js",
        types: "./src/nx-plugin.d.ts",
      },
      "./package.json": "./package.json",
    },
    filename: "habitat-cli.tgz",
    name: "@habitat/cli",
    root: "apps/habitat",
    version: "0.2.0",
  },
];

let acceptanceRoot = "";
let consumerRoot = "";
let fixtureRoot = "";

beforeAll(async () => {
  await assertReleaseGroupInventory();
  acceptanceRoot = await realpath(await mkdtemp(path.join(temporaryParent, FIXTURE_PREFIX)));
  consumerRoot = path.join(acceptanceRoot, "consumer");
  fixtureRoot = consumerRoot;
  await mkdir(path.join(acceptanceRoot, "packages"), { recursive: true });
  await Promise.all(
    ["cache", "config", "data", "home", "tmp"].map((directory) =>
      mkdir(path.join(acceptanceRoot, "runtime", directory), { recursive: true })
    )
  );
  await mkdir(consumerRoot, { recursive: true });
  await createInstalledConsumer();
  await createWorkspaceFixture();
}, 180_000);

afterAll(async () => {
  if (acceptanceRoot !== "") await removeOwnedFixture(acceptanceRoot);
});

describe("installed Habitat package", () => {
  it("ships one portable public artifact closure", async () => {
    for (const project of packedProjects) {
      const packageRoot = path.join(consumerRoot, "node_modules", project.name);
      const stats = await lstat(packageRoot);
      expect(stats.isDirectory()).toBe(true);
      expect(stats.isSymbolicLink()).toBe(false);
      const manifestText = await readFile(path.join(packageRoot, "package.json"), "utf8");
      expect(manifestText).not.toContain("workspace:");
      const manifest = JSON.parse(manifestText) as {
        readonly exports?: unknown;
        readonly name?: unknown;
        readonly version?: unknown;
      };
      expect(manifest).toMatchObject({ name: project.name, version: project.version });
      expect(manifest.exports).toEqual(project.exports);
    }

    const typecheck = await run("node", [
      path.join(workspaceRoot, "node_modules/typescript/bin/tsc"),
      "-p",
      path.join(consumerRoot, "tsconfig.json"),
    ]);
    expect(typecheck, typecheck.stderr || typecheck.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });

    const runtime = await run("bun", [path.join(consumerRoot, "runtime.mjs")], {
      cwd: consumerRoot,
    });
    expect(runtime).toMatchObject({ exitCode: 0, stderr: "" });
    const runtimeEntries = JSON.parse(runtime.stdout) as readonly {
      readonly entry: string;
      readonly url: string;
    }[];
    expect(runtimeEntries.map(({ entry }) => entry)).toEqual(publicEntries());
    const installedNodeModules = await realpath(path.join(consumerRoot, "node_modules"));
    for (const { url } of runtimeEntries) {
      const resolvedPath = await realpath(fileURLToPath(url));
      const relativePath = path.relative(installedNodeModules, resolvedPath);
      expect(path.isAbsolute(relativePath)).toBe(false);
      expect(relativePath).not.toBe("..");
      expect(relativePath.startsWith(`..${path.sep}`)).toBe(false);
    }
  });

  it("discovers and executes native Oclif commands from the installed app", async () => {
    const pluginManifest = JSON.parse(
      await readFile(
        path.join(consumerRoot, "node_modules/@habitat/plugin-cli/oclif.manifest.json"),
        "utf8"
      )
    ) as {
      readonly commands?: Readonly<Record<string, { readonly relativePath?: readonly string[] }>>;
    };
    expect(Object.keys(pluginManifest.commands ?? {}).sort()).toEqual(["check", "hook", "resolve"]);
    expect(pluginManifest.commands).toMatchObject({
      check: { relativePath: ["dist", "commands", "check.js"] },
      hook: { relativePath: ["dist", "commands", "hook.js"] },
      resolve: { relativePath: ["dist", "commands", "resolve.js"] },
    });

    const appManifest = JSON.parse(
      await readFile(
        path.join(consumerRoot, "node_modules/@habitat/cli/oclif.manifest.json"),
        "utf8"
      )
    ) as { readonly commands?: Record<string, unknown> };
    expect(appManifest.commands ?? {}).toEqual({});

    const inventory = await run(
      "bun",
      [
        path.join(consumerRoot, "inventory.mjs"),
        path.join(consumerRoot, "node_modules/@habitat/cli"),
      ],
      { cwd: consumerRoot }
    );
    expect(inventory).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(inventory.stdout)).toEqual([
      { id: "check", pluginName: "@habitat/plugin-cli" },
      { id: "help", pluginName: "@oclif/plugin-help" },
      { id: "hook", pluginName: "@habitat/plugin-cli" },
      { id: "resolve", pluginName: "@habitat/plugin-cli" },
    ]);

    const executable = path.join(consumerRoot, "node_modules/.bin/habitat");
    const help = await run(executable, ["--help"], { cwd: fixtureRoot });
    expect(help.exitCode).toBe(0);
    expect(help.stderr).toBe("");
    expect(help.stdout).toContain("check");
    expect(help.stdout).toContain("hook");
    expect(help.stdout).toContain("resolve");

    const hooked = await run(executable, ["hook", "agent-stop"], { cwd: fixtureRoot });
    expect(hooked).toMatchObject({ exitCode: 0, stderr: "", stdout: "" });

    const resolved = await run(executable, ["resolve"], { cwd: fixtureRoot });
    expect(resolved).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(resolved.stdout)).toMatchObject({
      _tag: "Resolved",
      catalog: {
        schemaVersion: 3,
        instances: [{ id: "installed-package", ownerProject: "@fixture/package" }],
      },
    });

    const checked = await run(executable, ["check"], { cwd: fixtureRoot });
    expect(checked).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(checked.stdout)).toMatchObject({
      _tag: "Completed",
      applications: [
        {
          instanceId: "installed-package",
          ruleId: "source_shape",
          runner: "habitat",
          status: "pass",
        },
      ],
      ok: true,
    });
  });

  it("projects and executes Habitat targets through an installed Nx host", async () => {
    const nx = path.join(consumerRoot, "node_modules/.bin/nx");
    const projected = await run(nx, ["show", "project", "@fixture/package", "--json"], {
      cwd: fixtureRoot,
      timeoutMs: 60_000,
    });
    expect(projected, projected.stderr || projected.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    const project = JSON.parse(projected.stdout) as {
      readonly targets?: Readonly<Record<string, unknown>>;
    };
    expect(Object.keys(project.targets ?? {}).sort()).toEqual([
      "check:policy",
      "habitat:application:installed-package:source_shape",
    ]);

    const checked = await run(
      nx,
      [
        "run",
        "@fixture/package:habitat:application:installed-package:source_shape",
        "--outputStyle=static",
      ],
      { cwd: fixtureRoot, timeoutMs: 60_000 }
    );
    expect(checked, checked.stderr || checked.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(checked.stdout).toContain('"status": "pass"');
    expect(checked.stdout).toContain(
      "Successfully ran target habitat:application:installed-package:source_shape"
    );
  });
});

async function assertReleaseGroupInventory(): Promise<void> {
  const nx = JSON.parse(await readFile(path.join(workspaceRoot, "nx.json"), "utf8")) as {
    readonly release?: {
      readonly groups?: Readonly<Record<string, { readonly projects?: readonly string[] }>>;
    };
  };
  const groups = nx.release?.groups;
  const expectedProjects = ["habitat-cli", "typebox-adapter"]
    .flatMap((group) => groups?.[group]?.projects ?? [])
    .sort();
  expect(packedProjects.map(({ name }) => name).sort()).toEqual(expectedProjects);
}

async function createInstalledConsumer(): Promise<void> {
  const packageRoot = path.join(acceptanceRoot, "packages");
  for (const project of packedProjects) {
    const packed = await run(
      "bun",
      [
        "pm",
        "pack",
        "--ignore-scripts",
        "--quiet",
        "--filename",
        path.join(packageRoot, project.filename),
      ],
      { cwd: path.join(workspaceRoot, project.root) }
    );
    if (packed.exitCode !== 0) {
      throw new Error(`Could not pack ${project.name}: ${packed.stderr || packed.stdout}`);
    }
  }

  const dependencies = {
    ...Object.fromEntries(
      packedProjects.map((project) => [project.name, `file:../packages/${project.filename}`])
    ),
    nx: "23.1.0",
  };
  await writeFile(
    path.join(consumerRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "habitat-installed-consumer",
        private: true,
        type: "module",
        workspaces: ["packages/*"],
        dependencies,
      },
      null,
      2
    )}\n`
  );
  await writeFile(
    path.join(consumerRoot, "tsconfig.json"),
    `${JSON.stringify(
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
    )}\n`
  );
  await writeFile(path.join(consumerRoot, "consumer.ts"), consumerSource());
  await writeFile(path.join(consumerRoot, "runtime.mjs"), runtimeSource());
  await writeFile(path.join(consumerRoot, "inventory.mjs"), inventorySource());

  const installed = await run(
    "npm",
    ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: consumerRoot, timeoutMs: 120_000 }
  );
  if (installed.exitCode !== 0) {
    throw new Error(
      `Could not install Habitat package closure: ${installed.stderr || installed.stdout}`
    );
  }
}

async function createWorkspaceFixture(): Promise<void> {
  const files: Readonly<Record<string, string>> = {
    ".habitat/blueprints/package/blueprint.toml": blueprintToml(),
    ".habitat/blueprints/package/source_shape.structure.toml": structureToml(),
    "nx.json": `${JSON.stringify({ plugins: ["@habitat/cli/nx-plugin"] }, null, 2)}\n`,
    "packages/example/habitat.toml": instanceToml(),
    "packages/example/package.json": `${JSON.stringify(
      { name: "@fixture/package", private: true, version: "0.0.0" },
      null,
      2
    )}\n`,
    "packages/example/source.ts": "export const installed = true;\n",
  };

  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(fixtureRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents);
  }

  const initialized = await run("git", ["init", "--quiet"], { cwd: fixtureRoot });
  if (initialized.exitCode !== 0) {
    throw new Error(`Could not initialize installed fixture: ${initialized.stderr}`);
  }
}

async function removeOwnedFixture(root: string): Promise<void> {
  const canonical = await realpath(root);
  const basename = path.basename(canonical);
  if (
    canonical !== root ||
    path.dirname(canonical) !== temporaryParent ||
    !basename.startsWith(FIXTURE_PREFIX)
  ) {
    throw new Error(`Refusing to remove unexpected installed-package fixture: ${root}`);
  }
  const stats = await lstat(canonical);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`Refusing to remove non-directory installed-package fixture: ${root}`);
  }
  await rm(canonical, { recursive: true, force: false });
}

async function run(
  executable: string,
  args: readonly string[],
  options: { readonly cwd?: string; readonly timeoutMs?: number } = {}
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
  delete env.FORCE_COLOR;

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd ?? workspaceRoot,
      env,
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
  return `import { standard } from "@rawr/typebox-adapter";
import type { RuleEvaluationResource } from "@habitat/resource-rule-evaluation";
import type { GritRuleEvaluationProviderConfig } from "@habitat/resource-rule-evaluation/providers/grit-effect-platform-node";
import type { SourceInventoryResource } from "@habitat/resource-source-inventory";
import type { GitSourceInventoryProviderOptions } from "@habitat/resource-source-inventory/providers/git-effect-platform-node";
import type { Client } from "@habitat/service/client";
import { bindHabitatClient } from "@habitat/plugin-cli/binding";
import { Type } from "typebox";

standard(Type.Object({ ready: Type.Boolean() }));
void bindHabitatClient;
declare const rules: RuleEvaluationResource;
declare const gritConfig: GritRuleEvaluationProviderConfig;
declare const inventory: SourceInventoryResource;
declare const gitOptions: GitSourceInventoryProviderOptions;
void rules;
void gritConfig;
void inventory;
void gitOptions;

async function useClient(client: Client): Promise<void> {
  const resolved = await client.catalog.resolve({});
  if (resolved._tag === "Resolved") {
    const schemaVersion: 3 = resolved.catalog.schemaVersion;
    void schemaVersion;
  }

  const checked = await client.catalog.check({});
  if (checked._tag === "Completed") {
    const ok: boolean = checked.ok;
    void ok;
  }
}

void useClient;
`;
}

function runtimeSource(): string {
  return `const publicEntries = ${JSON.stringify(publicEntries(), null, 2)};

const resolved = [];
for (const entry of publicEntries) {
  const url = import.meta.resolve(entry);
  resolved.push({ entry, url });
  if (entry === "@habitat/cli/package.json") {
    await Bun.file(new URL(url)).json();
  } else {
    await import(entry);
  }
}

console.log(JSON.stringify(resolved));
`;
}

function publicEntries(): readonly string[] {
  return [
    "@rawr/typebox-adapter",
    "@habitat/resource-rule-evaluation",
    "@habitat/resource-rule-evaluation/providers/grit-effect-platform-node",
    "@habitat/resource-source-inventory",
    "@habitat/resource-source-inventory/providers/git-effect-platform-node",
    "@habitat/service/client",
    "@habitat/plugin-cli/binding",
    "@habitat/cli/nx-plugin",
    "@habitat/cli/package.json",
  ];
}

function inventorySource(): string {
  return `import { Config } from "@oclif/core";

const root = process.argv[2];
if (!root) throw new Error("Installed CLI root argument is required.");

const config = await Config.load({
  devPlugins: false,
  jitPlugins: false,
  root,
  userPlugins: false,
});

const commands = config.commands
  .map(({ id, pluginName }) => ({ id, pluginName: pluginName ?? null }))
  .sort((left, right) => left.id.localeCompare(right.id));

process.stdout.write(JSON.stringify(commands));
`;
}

function blueprintToml(): string {
  return `schemaVersion = 1
id = "package"
version = 1

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

function structureToml(): string {
  return `schemaVersion = 2

[[scopes]]
name = "source"
rootRole = "project"
relativePath = "."
kind = "directory"
mode = "open"
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
