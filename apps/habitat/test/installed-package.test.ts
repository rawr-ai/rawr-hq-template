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
const INSTALLED_HABITAT_HOOK_COMMAND =
  'bash -lc \'repo="${CODEX_WORKSPACE_ROOT:-${CLAUDE_PROJECT_DIR:-}}"; if [ -n "$repo" ]; then repo="$(git -C "$repo" rev-parse --show-toplevel 2>/dev/null)"; else repo="$(git rev-parse --show-toplevel 2>/dev/null)"; fi && cd "$repo" 2>/dev/null || { printf "%s\\n" "Habitat agent-stop hook must run inside the repository worktree." >&2; exit 2; }; bunx --bun --no-install --package @habitat-ai/cli habitat hook agent-stop\'';
const PREDECESSOR_HABITAT_HOOK_COMMAND =
  'bash -lc \'repo="${CODEX_WORKSPACE_ROOT:-${CLAUDE_PROJECT_DIR:-}}"; if [ -n "$repo" ]; then repo="$(git -C "$repo" rev-parse --show-toplevel 2>/dev/null)"; else repo="$(git rev-parse --show-toplevel 2>/dev/null)"; fi && cd "$repo" 2>/dev/null || { printf "%s\\n" "Habitat agent-stop hook must run inside the repository worktree." >&2; exit 2; }; bun habitat hook agent-stop\'';
const temporaryParent = await realpath(tmpdir());
const workspaceRoot = fileURLToPath(new URL("../../..", import.meta.url));
const packedProjects: readonly PackedProject[] = [
  {
    exports: {
      "./blueprints/*": "./blueprints/*",
      "./habitat-pack.json": "./habitat-pack.json",
      "./package.json": "./package.json",
    },
    filename: "habitat-blueprints.tgz",
    name: "@habitat-ai/blueprints",
    root: "packages/habitat-blueprints",
    version: await readPackageVersion("packages/habitat-blueprints"),
  },
  {
    exports: {
      ".": { default: "./dist/index.js", types: "./dist/index.d.ts" },
    },
    filename: "habitat-ai-typebox-adapter.tgz",
    name: "@habitat-ai/typebox-adapter",
    root: "packages/typebox-adapter",
    version: await readPackageVersion("packages/typebox-adapter"),
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
    name: "@habitat-ai/resource-rule-evaluation",
    root: "resources/rule-evaluation",
    version: await readPackageVersion("resources/rule-evaluation"),
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
    name: "@habitat-ai/resource-source-inventory",
    root: "resources/source-inventory",
    version: await readPackageVersion("resources/source-inventory"),
  },
  {
    exports: {
      "./client": { default: "./dist/client.js", types: "./dist/client.d.ts" },
    },
    filename: "habitat-service.tgz",
    name: "@habitat-ai/service",
    root: "services/habitat",
    version: await readPackageVersion("services/habitat"),
  },
  {
    exports: {
      "./binding": {
        default: "./dist/lib/binding.js",
        types: "./dist/lib/binding.d.ts",
      },
    },
    filename: "habitat-plugin-cli.tgz",
    name: "@habitat-ai/plugin-cli",
    root: "plugins/cli/commands/habitat",
    version: await readPackageVersion("plugins/cli/commands/habitat"),
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
    name: "@habitat-ai/cli",
    root: "apps/habitat",
    version: await readPackageVersion("apps/habitat"),
  },
];

const expectedInternalRuntimeDependencies: Readonly<Record<string, readonly string[]>> = {
  "@habitat-ai/cli": [
    "@habitat-ai/plugin-cli",
    "@habitat-ai/resource-rule-evaluation",
    "@habitat-ai/resource-source-inventory",
    "@habitat-ai/service",
  ],
  "@habitat-ai/plugin-cli": ["@habitat-ai/service"],
  "@habitat-ai/service": [
    "@habitat-ai/resource-rule-evaluation",
    "@habitat-ai/resource-source-inventory",
    "@habitat-ai/typebox-adapter",
  ],
};

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
        readonly dependencies?: Readonly<Record<string, string>>;
        readonly exports?: unknown;
        readonly name?: unknown;
        readonly peerDependencies?: Readonly<Record<string, string>>;
        readonly version?: unknown;
      };
      expect(manifest).toMatchObject({ name: project.name, version: project.version });
      expect(manifest.exports).toEqual(project.exports);
      for (const dependency of expectedInternalRuntimeDependencies[project.name] ?? []) {
        expect(manifest.dependencies?.[dependency]).toBe(packedProjectVersion(dependency));
      }
      if (project.name === "@habitat-ai/cli") {
        expect(manifest.dependencies?.["@habitat-ai/blueprints"]).toBeUndefined();
        expect(manifest.peerDependencies?.["@habitat-ai/blueprints"]).toBe(
          packedProjectVersion("@habitat-ai/blueprints")
        );
      }
    }

    const policyPackFiles = await listFiles(
      path.join(consumerRoot, "node_modules/@habitat-ai/blueprints")
    );
    expect(policyPackFiles).toEqual(["LICENSE", "README.md", "habitat-pack.json", "package.json"]);

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
        path.join(consumerRoot, "node_modules/@habitat-ai/plugin-cli/oclif.manifest.json"),
        "utf8"
      )
    ) as {
      readonly commands?: Readonly<Record<string, { readonly relativePath?: readonly string[] }>>;
      readonly version?: unknown;
    };
    expect(pluginManifest.version).toBe(packedProjectVersion("@habitat-ai/plugin-cli"));
    expect(Object.keys(pluginManifest.commands ?? {}).sort()).toEqual(["check", "hook", "resolve"]);
    expect(pluginManifest.commands).toMatchObject({
      check: { relativePath: ["dist", "commands", "check.js"] },
      hook: { relativePath: ["dist", "commands", "hook.js"] },
      resolve: { relativePath: ["dist", "commands", "resolve.js"] },
    });

    const appManifest = JSON.parse(
      await readFile(
        path.join(consumerRoot, "node_modules/@habitat-ai/cli/oclif.manifest.json"),
        "utf8"
      )
    ) as { readonly commands?: Record<string, unknown>; readonly version?: unknown };
    expect(appManifest.version).toBe(packedProjectVersion("@habitat-ai/cli"));
    expect(appManifest.commands ?? {}).toEqual({});

    const inventory = await run(
      "bun",
      [
        path.join(consumerRoot, "inventory.mjs"),
        path.join(consumerRoot, "node_modules/@habitat-ai/cli"),
      ],
      { cwd: consumerRoot }
    );
    expect(inventory).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(inventory.stdout)).toEqual([
      { id: "check", pluginName: "@habitat-ai/plugin-cli" },
      { id: "help", pluginName: "@oclif/plugin-help" },
      { id: "hook", pluginName: "@habitat-ai/plugin-cli" },
      { id: "resolve", pluginName: "@habitat-ai/plugin-cli" },
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
        policyPack: {
          name: "@habitat-ai/blueprints",
          version: packedProjectVersion("@habitat-ai/blueprints"),
          protocolVersion: 1,
          blueprints: [],
        },
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
          instanceId: null,
          ruleId: "installed_compatibility",
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
  });

  it("rejects a malformed selected policy pack without fallback", async () => {
    const manifestPath = path.join(
      consumerRoot,
      "node_modules/@habitat-ai/blueprints/habitat-pack.json"
    );
    const original = await readFile(manifestPath, "utf8");
    try {
      await writeFile(
        manifestPath,
        `${JSON.stringify({ protocolVersion: 1, blueprints: [], unexpected: true }, null, 2)}\n`
      );
      const executable = path.join(consumerRoot, "node_modules/.bin/habitat");
      const rejected = await run(executable, ["resolve"], { cwd: fixtureRoot });
      expect(rejected.exitCode).toBe(1);
      expect(rejected.stderr).toBe("");
      expect(JSON.parse(rejected.stdout)).toMatchObject({
        _tag: "Rejected",
        issues: [{ path: "@habitat-ai/blueprints/habitat-pack.json" }],
      });
    } finally {
      await writeFile(manifestPath, original);
    }
  });

  it("projects and executes Habitat targets through an installed Nx host", async () => {
    const nx = path.join(consumerRoot, "node_modules/.bin/nx");
    const initialized = await run(
      nx,
      [
        "add",
        `@habitat-ai/cli@file:${path.join(acceptanceRoot, "packages/habitat-cli.tgz")}`,
        "--no-interactive",
      ],
      { cwd: fixtureRoot, timeoutMs: 120_000 }
    );
    expect(initialized.exitCode, initialized.stderr || initialized.stdout).toBe(0);
    const nxPath = path.join(fixtureRoot, "nx.json");
    const hooksPath = path.join(fixtureRoot, ".codex/hooks.json");
    const packagePath = path.join(fixtureRoot, "package.json");
    const firstNx = await readFile(nxPath, "utf8");
    const firstHooks = await readFile(hooksPath, "utf8");
    const firstPackage = await readFile(packagePath, "utf8");
    expect(JSON.parse(firstNx)).toMatchObject({ plugins: ["@habitat-ai/cli/nx-plugin"] });
    expect(JSON.parse(firstPackage)).toMatchObject({
      trustedDependencies: ["@getgrit/cli"],
    });
    const grit = await run(path.join(consumerRoot, "node_modules/.bin/grit"), ["--version"], {
      cwd: fixtureRoot,
      timeoutMs: 120_000,
    });
    expect(grit.exitCode, grit.stderr || grit.stdout).toBe(0);
    expect(grit.stdout).toMatch(/^grit \d+\.\d+\.\d+/u);
    const gritManifest = JSON.parse(
      await readFile(path.join(consumerRoot, "node_modules/@getgrit/cli/package.json"), "utf8")
    ) as { readonly version?: unknown };
    expect(gritManifest.version).toBe("0.1.0-alpha.1743007075");
    const initializedHooks = JSON.parse(firstHooks) as {
      readonly hooks?: {
        readonly Stop?: readonly {
          readonly _habitat?: { readonly identity?: string; readonly revision?: number };
          readonly hooks?: readonly { readonly command?: string }[];
        }[];
      };
    };
    const habitatGroups = (initializedHooks.hooks?.Stop ?? []).filter(
      (group) => group._habitat?.identity === "@habitat-ai/cli:agent-stop"
    );
    expect(habitatGroups).toHaveLength(1);
    expect(habitatGroups[0]).toMatchObject({
      _habitat: { identity: "@habitat-ai/cli:agent-stop", revision: 1 },
      hooks: [{ command: INSTALLED_HABITAT_HOOK_COMMAND }],
    });
    expect(firstHooks).not.toContain(PREDECESSOR_HABITAT_HOOK_COMMAND);

    const hookCommand = habitatGroups[0]?.hooks?.[0]?.command;
    expect(hookCommand).toBe(INSTALLED_HABITAT_HOOK_COMMAND);
    const hookResult = await run("bash", ["-lc", hookCommand ?? ""], {
      cwd: path.join(fixtureRoot, "packages/example"),
      env: { CLAUDE_PROJECT_DIR: "", CODEX_WORKSPACE_ROOT: "" },
      timeoutMs: 120_000,
    });
    expect(hookResult, hookResult.stderr || hookResult.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: "",
    });

    const repeated = await run(nx, ["generate", "@habitat-ai/cli:init", "--no-interactive"], {
      cwd: fixtureRoot,
      timeoutMs: 60_000,
    });
    expect(repeated, repeated.stderr || repeated.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(await readFile(nxPath, "utf8")).toBe(firstNx);
    expect(await readFile(hooksPath, "utf8")).toBe(firstHooks);
    expect(await readFile(packagePath, "utf8")).toBe(firstPackage);

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
      "check",
      "check:policy",
      "habitat:application:installed-package:source_shape",
      "habitat:rule:installed_compatibility",
    ]);
    const ownerTarget = project.targets?.["check:policy"] as
      | {
          readonly cache?: unknown;
          readonly dependsOn?: unknown;
          readonly executor?: unknown;
          readonly inputs?: readonly unknown[];
          readonly options?: {
            readonly command?: unknown;
          };
        }
      | undefined;
    expect(ownerTarget).toMatchObject({
      cache: true,
      executor: "nx:run-commands",
      options: {
        command: "habitat check --owner @fixture/package",
      },
    });
    expect(ownerTarget).not.toHaveProperty("dependsOn");
    expect(ownerTarget?.inputs).toEqual(
      expect.arrayContaining([
        "{workspaceRoot}/.habitat/**",
        "{workspaceRoot}/.habitat/blueprints/package/source_shape.structure.toml",
        "{workspaceRoot}/packages/example",
        "{workspaceRoot}/packages/example/**/*",
      ])
    );

    const checkGraph = await run(nx, ["run", "@fixture/package:check", "--graph=stdout"], {
      cwd: fixtureRoot,
      timeoutMs: 60_000,
    });
    expect(checkGraph, checkGraph.stderr || checkGraph.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    const taskGraph = JSON.parse(checkGraph.stdout) as {
      readonly tasks?: {
        readonly tasks?: Readonly<Record<string, unknown>>;
      };
    };
    const reachableTaskIds = Object.keys(taskGraph.tasks?.tasks ?? {}).sort();
    expect(reachableTaskIds).toEqual(["@fixture/package:check", "@fixture/package:check:policy"]);
    expect(reachableTaskIds.filter((taskId) => taskId.endsWith(":check:policy"))).toHaveLength(1);
    expect(
      reachableTaskIds.some(
        (taskId) => taskId.includes(":habitat:rule:") || taskId.includes(":habitat:application:")
      )
    ).toBe(false);

    const ownerChecked = await run(
      nx,
      ["run", "@fixture/package:check:policy", "--outputStyle=static", "--skip-nx-cache"],
      { cwd: fixtureRoot, timeoutMs: 120_000 }
    );
    expect(ownerChecked, ownerChecked.stderr || ownerChecked.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(ownerChecked.stdout).toContain('"ruleId": "installed_compatibility"');
    expect(ownerChecked.stdout).toContain('"ruleId": "source_shape"');
    expect(ownerChecked.stdout).toContain("Successfully ran target check:policy");

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

    const compatibilityChecked = await run(
      nx,
      ["run", "@fixture/package:habitat:rule:installed_compatibility", "--outputStyle=static"],
      { cwd: fixtureRoot, timeoutMs: 60_000 }
    );
    expect(
      compatibilityChecked,
      compatibilityChecked.stderr || compatibilityChecked.stdout
    ).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(compatibilityChecked.stdout).toContain('"status": "pass"');
    expect(compatibilityChecked.stdout).toContain(
      "Successfully ran target habitat:rule:installed_compatibility"
    );

    const removed = await run(nx, ["generate", "@habitat-ai/cli:remove-hook", "--no-interactive"], {
      cwd: fixtureRoot,
      timeoutMs: 60_000,
    });
    expect(removed, removed.stderr || removed.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(JSON.parse(await readFile(nxPath, "utf8"))).toMatchObject({
      plugins: ["@habitat-ai/cli/nx-plugin"],
    });
    const removedHooks = await readFile(hooksPath, "utf8");
    expect(removedHooks).not.toContain("@habitat-ai/cli:agent-stop");
    expect(removedHooks).toContain("echo preserved");

    const repeatedRemoval = await run(
      nx,
      ["generate", "@habitat-ai/cli:remove-hook", "--no-interactive"],
      { cwd: fixtureRoot, timeoutMs: 60_000 }
    );
    expect(repeatedRemoval, repeatedRemoval.stderr || repeatedRemoval.stdout).toMatchObject({
      exitCode: 0,
      stderr: "",
    });
    expect(await readFile(hooksPath, "utf8")).toBe(removedHooks);
  });
});

async function assertReleaseGroupInventory(): Promise<void> {
  const nx = JSON.parse(await readFile(path.join(workspaceRoot, "nx.json"), "utf8")) as {
    readonly release?: {
      readonly groups?: Readonly<Record<string, { readonly projects?: readonly string[] }>>;
    };
  };
  const groups = nx.release?.groups;
  expect(groups?.["habitat-cli"]?.projects).not.toContain("@habitat-ai/blueprints");
  expect(groups?.["habitat-blueprints"]?.projects).toEqual(["@habitat-ai/blueprints"]);
  const expectedProjects = ["habitat-cli", "habitat-blueprints", "typebox-adapter"]
    .flatMap((group) => groups?.[group]?.projects ?? [])
    .sort();
  expect(packedProjects.map(({ name }) => name).sort()).toEqual(expectedProjects);
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

function packedProjectVersion(name: string): string {
  const project = packedProjects.find((candidate) => candidate.name === name);
  if (project === undefined) throw new Error(`Unknown packed Habitat project: ${name}`);
  return project.version;
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
    ".habitat/index.json": `${JSON.stringify(
      { schemaVersion: 2, ownerRoots: { "@fixture/package": "packages/example" } },
      null,
      2
    )}\n`,
    ".habitat/compatibility/installed_compatibility/baseline.json": "[]\n",
    ".habitat/compatibility/installed_compatibility/pattern.md":
      "# installed_compatibility\n\n```grit\nlanguage js(typescript)\n`forbidden()`\n```\n",
    ".habitat/compatibility/installed_compatibility/rule.json": `${JSON.stringify(
      compatibilityRule(),
      null,
      2
    )}\n`,
    ".codex/hooks.json": `${JSON.stringify(
      {
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command: "echo preserved",
                  statusMessage: "Consumer-owned Stop hook",
                },
              ],
            },
            {
              hooks: [
                {
                  type: "command",
                  command: PREDECESSOR_HABITAT_HOOK_COMMAND,
                  timeout: 120,
                  statusMessage: "Checking Habitat structure laws",
                },
              ],
            },
          ],
        },
      },
      null,
      2
    )}\n`,
    "nx.json": `${JSON.stringify({}, null, 2)}\n`,
    "packages/example/habitat.toml": instanceToml(),
    "packages/example/package.json": `${JSON.stringify(
      {
        name: "@fixture/package",
        private: true,
        version: "0.0.0",
        nx: {
          targets: {
            check: {
              executor: "nx:noop",
              dependsOn: ["check:policy"],
            },
          },
        },
      },
      null,
      2
    )}\n`,
    "packages/example/source.ts": "export const installed = true;\n",
    "packages/producer-blueprints/project.json": `${JSON.stringify(
      { name: "@habitat-ai/blueprints", projectType: "library", targets: {} },
      null,
      2
    )}\n`,
    "packages/producer-cli/project.json": `${JSON.stringify(
      { name: "@habitat-ai/cli", projectType: "application", targets: {} },
      null,
      2
    )}\n`,
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
  return `import { standard } from "@habitat-ai/typebox-adapter";
import type { RuleEvaluationResource } from "@habitat-ai/resource-rule-evaluation";
import type { GritRuleEvaluationProviderConfig } from "@habitat-ai/resource-rule-evaluation/providers/grit-effect-platform-node";
import type { SourceInventoryResource } from "@habitat-ai/resource-source-inventory";
import type { GitSourceInventoryProviderOptions } from "@habitat-ai/resource-source-inventory/providers/git-effect-platform-node";
import type { Client } from "@habitat-ai/service/client";
import { bindHabitatClient } from "@habitat-ai/plugin-cli/binding";
import { Type } from "typebox";

standard(Type.Object({ ready: Type.Boolean() }));
void bindHabitatClient;
declare const rules: RuleEvaluationResource;
declare const gritConfig: GritRuleEvaluationProviderConfig;
declare const inventory: SourceInventoryResource;
declare const gitOptions: GitSourceInventoryProviderOptions;
const evaluation = rules.evaluate({
  programs: [{ id: "installed", program: "language js(typescript)\\n\`forbidden()\`" }],
  subjectPaths: ["/workspace/source.ts"],
});
void rules;
void evaluation;
void gritConfig;
void inventory;
void gitOptions;

async function useClient(client: Client): Promise<void> {
  const resolved = await client.catalog.resolve({});
  if (resolved._tag === "Resolved") {
    const schemaVersion: 3 = resolved.catalog.schemaVersion;
    const policyPackName: string = resolved.catalog.policyPack.name;
    const policyPackVersion: string = resolved.catalog.policyPack.version;
    const policyPackProtocolVersion: 1 = resolved.catalog.policyPack.protocolVersion;
    const blueprintCount: number = resolved.catalog.policyPack.blueprints.length;
    void schemaVersion;
    void policyPackName;
    void policyPackVersion;
    void policyPackProtocolVersion;
    void blueprintCount;
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
  if (entry.endsWith(".json")) {
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
    "@habitat-ai/blueprints/habitat-pack.json",
    "@habitat-ai/blueprints/package.json",
    "@habitat-ai/typebox-adapter",
    "@habitat-ai/resource-rule-evaluation",
    "@habitat-ai/resource-rule-evaluation/providers/grit-effect-platform-node",
    "@habitat-ai/resource-source-inventory",
    "@habitat-ai/resource-source-inventory/providers/git-effect-platform-node",
    "@habitat-ai/service/client",
    "@habitat-ai/plugin-cli/binding",
    "@habitat-ai/cli/nx-plugin",
    "@habitat-ai/cli/package.json",
  ];
}

async function listFiles(root: string, relativeRoot = ""): Promise<readonly string[]> {
  const directory = path.join(root, relativeRoot);
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relativePath = relativeRoot === "" ? entry.name : path.join(relativeRoot, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(root, relativePath)));
    else if (entry.isFile()) files.push(relativePath.split(path.sep).join("/"));
  }
  return files.sort();
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

function compatibilityRule(): Readonly<Record<string, unknown>> {
  const root = ".habitat/compatibility/installed_compatibility";
  return {
    schemaVersion: 2,
    id: "installed_compatibility",
    title: "Require Installed Compatibility",
    placement: { niche: "fixture", blueprint: "package", category: "boundary" },
    operation: { kind: "check" },
    ownerProject: "@fixture/package",
    lane: "enforced",
    forbids: "the forbidden fixture call",
    why: "The installed Nx host must project compatibility rules under Node.",
    remediate: "Remove the forbidden fixture call.",
    message: "Installed compatibility found a violation.",
    pathCoverage: [{ kind: "exact-path", patterns: ["packages/example/source.ts"] }],
    hookCheck: true,
    supportFiles: { baseline: `${root}/baseline.json` },
    runner: {
      name: "grit",
      files: { pattern: `${root}/pattern.md` },
      patternName: "installed_compatibility",
      acquisition: { kind: "check", roots: ["packages/example/source.ts"] },
    },
  };
}
