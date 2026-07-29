import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createInstalledPackageEnvironment,
  type InstalledPackageEnvironment,
  installedPackageChildEnvironment,
  removeInstalledPackageEnvironment,
} from "./command-fixture/installed-package-environment";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");
const helloPlugin = "@rawr/plugin-hello";
const forbiddenPackages = [
  "@rawr/example-todo",
  "@rawr/hq-app",
  "@rawr/runtime-context",
  "@rawr/server",
  "@rawr/ui-sdk",
  "@rawr/web",
  "@inngest/workflow-kit",
  "inngest",
  "inngest-cli",
] as const;
const inventoryFixture = path.join(
  import.meta.dirname,
  "command-fixture",
  "discover-command-inventory.ts"
);

const DependencyRecordSchema = Type.Record(Type.String(), Type.String());
const PackageManifestSchema = Type.Object(
  {
    dependencies: Type.Optional(DependencyRecordSchema),
    name: Type.String(),
    oclif: Type.Optional(
      Type.Object(
        {
          plugins: Type.Optional(Type.Array(Type.String())),
        },
        { additionalProperties: true }
      )
    ),
    optionalDependencies: Type.Optional(DependencyRecordSchema),
    peerDependencies: Type.Optional(DependencyRecordSchema),
    private: Type.Optional(Type.Boolean()),
    version: Type.String(),
  },
  { additionalProperties: true }
);
const NxReleaseRootSchema = Type.Object(
  {
    release: Type.Object(
      {
        groups: Type.Object(
          {
            "rawr-cli": Type.Object(
              {
                projects: Type.Array(Type.String()),
                projectsRelationship: Type.Literal("fixed"),
              },
              { additionalProperties: true }
            ),
          },
          { additionalProperties: true }
        ),
      },
      { additionalProperties: true }
    ),
  },
  { additionalProperties: true }
);
const NxProjectNodeSchema = Type.Object(
  {
    data: Type.Optional(
      Type.Object(
        {
          root: Type.Optional(Type.String()),
          tags: Type.Optional(Type.Array(Type.String())),
          targets: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        },
        { additionalProperties: true }
      )
    ),
  },
  { additionalProperties: true }
);
const NxGraphSchema = Type.Object(
  {
    graph: Type.Object(
      {
        nodes: Type.Record(Type.String(), NxProjectNodeSchema),
      },
      { additionalProperties: true }
    ),
  },
  { additionalProperties: true }
);
const PackageLockEntrySchema = Type.Object(
  {
    link: Type.Optional(Type.Boolean()),
    name: Type.Optional(Type.String()),
    resolved: Type.Optional(Type.String()),
    version: Type.Optional(Type.String()),
  },
  { additionalProperties: true }
);
const PackageLockSchema = Type.Object(
  {
    packages: Type.Record(Type.String(), PackageLockEntrySchema),
  },
  { additionalProperties: true }
);
const OclifManifestCommandSchema = Type.Object(
  {
    aliases: Type.Array(Type.String()),
    hidden: Type.Optional(Type.Boolean()),
    hiddenAliases: Type.Array(Type.String()),
    id: Type.String(),
    relativePath: Type.Array(Type.String(), { minItems: 1 }),
  },
  { additionalProperties: true }
);
const OclifManifestSchema = Type.Object(
  {
    commands: Type.Record(Type.String(), OclifManifestCommandSchema),
  },
  { additionalProperties: true }
);
const InstalledCommandSchema = Type.Object(
  {
    id: Type.String(),
    pluginName: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: true }
);
const InstalledCommandInventorySchema = Type.Array(InstalledCommandSchema);
const PluginEntrySchema = Type.Object(
  {
    commandIDs: Type.Optional(Type.Array(Type.String())),
    name: Type.Optional(Type.String()),
    root: Type.Optional(Type.String()),
    type: Type.Optional(Type.String()),
    version: Type.Optional(Type.String()),
  },
  { additionalProperties: true }
);
const PluginListSchema = Type.Array(PluginEntrySchema);
const StatusIssueSchema = Type.Object(
  {
    code: Type.String(),
    detail: Type.String(),
    pluginId: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);
const StatusFactSchema = Type.Object(
  {
    detail: Type.String(),
    kind: Type.String(),
    subject: Type.String(),
  },
  { additionalProperties: false }
);
const BlockedStatusEnvelopeSchema = Type.Object(
  {
    ok: Type.Literal(true),
    data: Type.Object(
      {
        operation: Type.Literal("providers.status"),
        result: Type.Object(
          {
            classification: Type.Literal("Blocked"),
            issues: Type.Array(StatusIssueSchema),
            operation: Type.Literal("status"),
            selection: Type.Null(),
            targets: Type.Array(
              Type.Object(
                {
                  classification: Type.Literal("Blocked"),
                  facts: Type.Array(StatusFactSchema),
                  issues: Type.Array(StatusIssueSchema),
                  operations: Type.Array(Type.Unknown(), { maxItems: 0 }),
                  target: Type.Object(
                    {
                      home: Type.String(),
                      provider: Type.Literal("codex"),
                    },
                    { additionalProperties: false }
                  ),
                },
                { additionalProperties: false }
              ),
              { minItems: 1, maxItems: 1 }
            ),
          },
          { additionalProperties: false }
        ),
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

type PackageManifest = Static<typeof PackageManifestSchema>;

type Artifact = {
  manifest: PackageManifest;
  name: string;
  sha256: string;
  tarball: string;
  version: string;
};

type ProjectNode = {
  name: string;
  root: string;
  tags: readonly string[];
  targets: Record<string, unknown>;
};
type ProjectGraph = Static<typeof NxGraphSchema>["graph"]["nodes"];
type InstalledCommand = Static<typeof InstalledCommandSchema>;
type PluginEntry = Static<typeof PluginEntrySchema>;
type CommandResult = Readonly<{
  status: number;
  stderr: string;
  stdout: string;
}>;

let acceptanceState: InstalledPackageEnvironment | undefined;

beforeAll(() => {
  acceptanceState = createInstalledPackageEnvironment();
});

afterAll(() => {
  if (acceptanceState === undefined) return;
  const { root } = acceptanceState;
  acceptanceState = undefined;
  removeInstalledPackageEnvironment(root);
});

describe("ordinary installed Oclif package", () => {
  it("packs the Nx release group and exercises installed rawr", async ({ annotate }) => {
    const state = requireState();
    const releaseProjects = readReleaseProjects();
    expect(releaseProjects).toHaveLength(19);
    expect(new Set(releaseProjects).size).toBe(releaseProjects.length);

    const graph = await readProjectGraph();
    const releaseNodes = releaseProjects.map((project) => requireProject(graph, project));
    for (const node of releaseNodes) {
      expect(node.tags).toContain("npm:public");
      expect(node.targets.build).toBeDefined();
    }

    const revision = (
      await runChecked("git", ["rev-parse", "HEAD"], workspaceRoot, process.env)
    ).trim();
    const workingTree = await runChecked(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all"],
      workspaceRoot,
      process.env
    );
    const provenance = workingTree === "" ? "HEAD" : "HEAD+working-tree";
    await annotate(`source provenance: ${provenance} at ${revision}`, "provenance");

    const artifacts: Artifact[] = [];
    for (const node of releaseNodes) artifacts.push(await packProject(node, state));
    const hello = await packProject(requireProject(graph, helloPlugin), state);
    expect(artifacts.map(({ name }) => name).sort()).toEqual([...releaseProjects].sort());
    expect(new Set(artifacts.map(({ version }) => version)).size).toBe(1);
    for (const artifact of [...artifacts, hello]) {
      expect(artifact.sha256).toMatch(/^[0-9a-f]{64}$/u);
      await annotate(
        `tarball sha256: ${artifact.name}@${artifact.version} ${artifact.sha256}`,
        "provenance"
      );
    }

    assertPackageClosure(releaseProjects, artifacts);
    await installTarballs(state, artifacts);
    assertInstalledClosure(state, artifacts);

    const cli = requireArtifact(artifacts, "@rawr/cli");
    const cliRoot = installedRoot(state.prefix, cli.name);
    const rawr = path.join(state.prefix, "node_modules", ".bin", "rawr");
    expect(existsSync(rawr)).toBe(true);
    expectContained(state.prefix, realpathSync(rawr));

    const version = await runRawr(rawr, ["--version"]);
    expect(version.status, version.stderr).toBe(0);
    expect(version.stderr).toBe("");
    expect(version.stdout).toMatch(
      new RegExp(
        `^${escapeRegExp(cli.name)}/${escapeRegExp(cli.version)} ${escapeRegExp(
          process.platform
        )}-${escapeRegExp(process.arch)} node-v\\d+\\.\\d+\\.\\d+\\n$`,
        "u"
      )
    );

    const help = await runRawr(rawr, ["--help"]);
    expect(help.status, help.stderr).toBe(0);
    expect(help.stderr).toBe("");
    expect(help.stdout).toContain("USAGE");
    expect(help.stdout).toContain("$ rawr [COMMAND]");

    const expectedInventory: InstalledCommand[] = [];
    for (const name of officialOclifMembers(cli, releaseProjects)) {
      const packageRoot = installedRoot(state.prefix, name);
      for (const command of await manifestCommands(requireArtifact(artifacts, name))) {
        expect(command.relativePath[0], `${name}:${command.id}`).toBe("dist");
        const commandModule = path.resolve(packageRoot, ...command.relativePath);
        expect(isWithin(packageRoot, commandModule), `${name}:${command.id}`).toBe(true);
        expect(existsSync(commandModule), `${name}:${command.id}`).toBe(true);
        const canonicalCommandModule = realpathSync(commandModule);
        expect(isWithin(packageRoot, canonicalCommandModule), `${name}:${command.id}`).toBe(true);
        expect(lstatSync(canonicalCommandModule).isFile(), `${name}:${command.id}`).toBe(true);
        expectedInventory.push({ id: command.id, pluginName: name });
      }
    }
    expectedInventory.sort(compareCommands);
    expect(expectedInventory.length).toBeGreaterThan(0);
    expect(new Set(expectedInventory.map(({ id }) => id)).size).toBe(expectedInventory.length);

    const inventoryPath = path.join(state.prefix, "installed-command-inventory.mjs");
    writeFileSync(inventoryPath, readFileSync(inventoryFixture));
    const inventoryResult = await runChecked(
      "node",
      [inventoryPath, cliRoot],
      state.prefix,
      childEnvironment()
    );
    const installedInventory = parseJson(inventoryResult);
    if (!Value.Check(InstalledCommandInventorySchema, installedInventory)) {
      throw new Error("installed Oclif command inventory is invalid");
    }
    const nativePluginCommands = ["plugins", "plugins:install", "plugins:uninstall"];
    expect(
      installedInventory.filter(({ id }) => nativePluginCommands.includes(id)).sort(compareCommands)
    ).toEqual(
      nativePluginCommands
        .map((id) => ({ id, pluginName: "@oclif/plugin-plugins" }))
        .sort(compareCommands)
    );
    expect(
      installedInventory
        .filter(({ pluginName }) => pluginName?.startsWith("@rawr/") === true)
        .sort(compareCommands)
    ).toEqual(expectedInventory);
    await annotate(`first-party command inventory: ${expectedInventory.length} commands`, "proof");

    expect((await listPlugins(rawr)).some(({ name }) => name === helloPlugin)).toBe(false);
    const helloInstall = await runRawr(rawr, [
      "plugins",
      "install",
      pathToFileURL(hello.tarball).href,
      "--silent",
    ]);
    expect(helloInstall.status, helloInstall.stderr).toBe(0);

    const installedHello = (await listPlugins(rawr)).find(({ name }) => name === helloPlugin);
    expect(installedHello).toMatchObject({
      commandIDs: ["hello"],
      name: helloPlugin,
      type: "user",
      version: hello.version,
    });
    if (installedHello?.root === undefined) throw new Error("installed Hello plugin has no root");
    expectContained(state.xdgData, realpathSync(installedHello.root));

    const helloInvoke = await runRawr(rawr, ["hello"]);
    expect(helloInvoke.status, helloInvoke.stderr).toBe(0);
    expect(helloInvoke.stdout).toBe("hello\n");
    const helloRemove = await runRawr(rawr, ["plugins", "uninstall", helloPlugin]);
    expect(helloRemove.status, helloRemove.stderr).toBe(0);
    expect((await listPlugins(rawr)).some(({ name }) => name === helloPlugin)).toBe(false);
    const helloAfterRemoval = await runRawr(rawr, ["hello"]);
    expect(helloAfterRemoval.status).toBe(2);
    expect(helloAfterRemoval.stderr).toContain("command hello not found");

    const sentinel = path.join(state.providerHome, "sentinel");
    writeFileSync(sentinel, "preserve\n");
    const providerEntries = readdirSync(state.providerHome);
    expect(providerEntries).toEqual(["sentinel"]);
    const statusStateRoots = [
      path.join(state.root, "home"),
      path.join(state.root, "xdg-cache"),
      path.join(state.root, "xdg-config"),
      state.xdgData,
      path.join(state.root, "xdg-state"),
      path.join(state.root, "claude-home"),
      path.join(state.root, "codex-home"),
      state.providerHome,
    ];
    const stateBeforeStatus = snapshotRoots(statusStateRoots);
    const status = await runRawr(rawr, [
      "agent",
      "plugins",
      "status",
      "--content-workspace",
      path.join(state.root, "missing-content-workspace"),
      "--repository-identity",
      "git:installed-package-acceptance",
      "--target",
      `codex=${state.providerHome}`,
      "--json",
    ]);
    expect(status.status, `${status.stderr}\n${status.stdout}`).toBe(2);
    const statusOutput = parseJson(status.stdout);
    if (!Value.Check(BlockedStatusEnvelopeSchema, statusOutput)) {
      throw new Error("installed lifecycle status returned an invalid blocked result");
    }
    expect(statusOutput.data.result).toMatchObject({
      classification: "Blocked",
      operation: "status",
      selection: null,
      targets: [
        {
          classification: "Blocked",
          operations: [],
          target: { home: state.providerHome, provider: "codex" },
        },
      ],
    });
    expect(snapshotRoots(statusStateRoots)).toEqual(stateBeforeStatus);
    expect(readdirSync(state.providerHome)).toEqual(providerEntries);
    expect(readFileSync(sentinel, "utf8")).toBe("preserve\n");
    expect(readdirSync(path.join(state.root, "claude-home"))).toEqual([]);
    expect(readdirSync(path.join(state.root, "codex-home"))).toEqual([]);
  });
});

function readReleaseProjects(): readonly string[] {
  const nx = parseJson(readFileSync(path.join(workspaceRoot, "nx.json"), "utf8"));
  if (!Value.Check(NxReleaseRootSchema, nx)) {
    throw new Error("Nx release group rawr-cli has no fixed project list");
  }
  return Object.freeze([...nx.release.groups["rawr-cli"].projects]);
}

async function readProjectGraph(): Promise<ProjectGraph> {
  const result = await runChecked("bunx", ["nx", "graph", "--print"], workspaceRoot, {
    ...process.env,
    NX_DAEMON: "false",
    NX_TASKS_RUNNER_DYNAMIC_OUTPUT: "false",
  });
  const output = parseJson(result);
  if (!Value.Check(NxGraphSchema, output)) throw new Error("Nx project graph has invalid nodes");
  return output.graph.nodes;
}

function requireProject(graph: ProjectGraph, name: string): ProjectNode {
  const data = graph[name]?.data;
  if (typeof data?.root !== "string" || !Array.isArray(data.tags) || data.targets === undefined) {
    throw new Error(`Nx project graph is incomplete for ${name}`);
  }
  const root = path.resolve(workspaceRoot, data.root);
  if (!isWithin(workspaceRoot, root) || !existsSync(path.join(root, "package.json"))) {
    throw new Error(`Nx project ${name} does not own a package root`);
  }
  return { name, root: data.root, tags: data.tags, targets: data.targets };
}

async function packProject(
  node: ProjectNode,
  state: InstalledPackageEnvironment
): Promise<Artifact> {
  const root = path.resolve(workspaceRoot, node.root);
  const manifestPath = path.join(root, "package.json");
  const sourceBytes = readFileSync(manifestPath);
  const source = parseJson(sourceBytes.toString("utf8"));
  if (!Value.Check(PackageManifestSchema, source) || source.name !== node.name) {
    throw new Error(`${node.name} package metadata is incomplete`);
  }

  const before = new Set(readdirSync(state.tarballs));
  await runChecked(
    "bun",
    ["pm", "pack", "--destination", state.tarballs, "--quiet"],
    root,
    childEnvironment()
  );
  expect(readFileSync(manifestPath)).toEqual(sourceBytes);
  const created = readdirSync(state.tarballs).filter((entry) => !before.has(entry));
  expect(created).toHaveLength(1);
  const tarball = path.join(state.tarballs, created[0] ?? "");
  const manifest = parseJson(await readTarballText(tarball, "package/package.json"));
  if (!Value.Check(PackageManifestSchema, manifest)) {
    throw new Error(`${node.name} packed package manifest is invalid`);
  }
  expect(manifest).toMatchObject({ name: node.name, version: source.version });
  expect(manifest.private).toBe(node.name === helloPlugin);
  expect(JSON.stringify(manifest)).not.toContain("workspace:");
  return {
    manifest,
    name: node.name,
    sha256: createHash("sha256").update(readFileSync(tarball)).digest("hex"),
    tarball,
    version: source.version,
  };
}

function assertPackageClosure(releaseProjects: readonly string[], artifacts: readonly Artifact[]) {
  const byName = new Map(artifacts.map((artifact) => [artifact.name, artifact]));
  const reachable = new Set<string>();
  const visit = (name: string) => {
    if (reachable.has(name)) return;
    const artifact = byName.get(name);
    if (artifact === undefined) throw new Error(`release closure is missing ${name}`);
    reachable.add(name);
    const production = {
      ...artifact.manifest.dependencies,
      ...artifact.manifest.optionalDependencies,
    };
    for (const dependency of Object.keys(production)) {
      if (dependency.startsWith("@rawr/")) visit(dependency);
    }
  };
  visit("@rawr/cli");
  expect([...reachable].sort()).toEqual([...releaseProjects].sort());

  for (const artifact of artifacts) {
    for (const peer of Object.keys(artifact.manifest.peerDependencies ?? {})) {
      if (peer.startsWith("@rawr/")) expect(byName.has(peer)).toBe(true);
    }
    const allDependencies = {
      ...artifact.manifest.dependencies,
      ...artifact.manifest.optionalDependencies,
      ...artifact.manifest.peerDependencies,
    };
    for (const forbidden of forbiddenPackages) {
      expect(allDependencies[forbidden]).toBeUndefined();
    }
  }
}

async function installTarballs(
  state: InstalledPackageEnvironment,
  artifacts: readonly Artifact[]
): Promise<void> {
  const dependencies = Object.fromEntries(
    artifacts.map(({ name, tarball }) => [name, `file:${tarball}`])
  );
  writeFileSync(
    path.join(state.prefix, "package.json"),
    `${JSON.stringify({ name: "rawr-consumer", private: true, dependencies }, null, 2)}\n`
  );
  await runChecked(
    "npm",
    ["install", "--omit=dev", "--no-audit", "--no-fund"],
    state.prefix,
    childEnvironment()
  );
}

function assertInstalledClosure(
  state: InstalledPackageEnvironment,
  artifacts: readonly Artifact[]
) {
  const releaseProjects = artifacts.map(({ name }) => name);
  const installed = readdirSync(path.join(state.prefix, "node_modules", "@rawr"))
    .map((name) => `@rawr/${name}`)
    .sort();
  expect(installed).toEqual([...releaseProjects].sort());
  for (const artifact of artifacts) {
    const root = installedRoot(state.prefix, artifact.name);
    expect(lstatSync(root).isSymbolicLink()).toBe(false);
    expectContained(state.prefix, realpathSync(root));
    const installedManifestText = readFileSync(path.join(root, "package.json"), "utf8");
    expect(installedManifestText).not.toContain("workspace:");
    const installedManifest = parseJson(installedManifestText);
    if (!Value.Check(PackageManifestSchema, installedManifest)) {
      throw new Error(`${artifact.name} installed package manifest is invalid`);
    }
    expect(installedManifest).toMatchObject({
      name: artifact.name,
      version: artifact.version,
    });
  }
  for (const name of forbiddenPackages) {
    expect(existsSync(installedRoot(state.prefix, name))).toBe(false);
  }
  const lockText = readFileSync(path.join(state.prefix, "package-lock.json"), "utf8");
  expect(lockText).not.toContain("workspace:");
  const lock = parseJson(lockText);
  if (!Value.Check(PackageLockSchema, lock)) {
    throw new Error("installed package lock has invalid entries");
  }
  const rawrEntries = Object.entries(lock.packages).filter(([location]) =>
    /(?:^|\/)node_modules\/@rawr\/[^/]+$/u.test(location)
  );
  expect(rawrEntries.map(([location]) => location).sort()).toEqual(
    releaseProjects.map((name) => `node_modules/${name}`).sort()
  );
  const byName = new Map(artifacts.map((artifact) => [artifact.name, artifact]));
  for (const [location, entry] of rawrEntries) {
    const name = location.slice(location.lastIndexOf("node_modules/") + "node_modules/".length);
    const artifact = byName.get(name);
    if (artifact === undefined) throw new Error(`package lock has unexpected ${name}`);
    expect(entry.link).not.toBe(true);
    expect(entry.resolved).toMatch(/^file:/u);
    expect(entry.version).toBe(artifact.version);
    if (entry.name !== undefined) expect(entry.name).toBe(artifact.name);
  }
}

function officialOclifMembers(cli: Artifact, releaseProjects: readonly string[]) {
  const configured = cli.manifest.oclif?.plugins;
  if (configured === undefined) throw new Error("packed CLI has no Oclif plugin list");
  const plugins = configured.filter((plugin) => plugin.startsWith("@rawr/"));
  const members = [cli.name, ...plugins];
  expect(new Set(members).size).toBe(members.length);
  expect(members.every((member) => releaseProjects.includes(member))).toBe(true);
  return members;
}

async function manifestCommands(artifact: Artifact) {
  const manifest = parseJson(
    await readTarballText(artifact.tarball, "package/oclif.manifest.json")
  );
  if (!Value.Check(OclifManifestSchema, manifest)) {
    throw new Error(`${artifact.name} packed Oclif manifest is invalid`);
  }
  return Object.entries(manifest.commands)
    .map(([id, command]) => {
      expect(command.id, `${artifact.name}:${id}`).toBe(id);
      expect(command.aliases, `${artifact.name}:${id}`).toEqual([]);
      expect(command.hiddenAliases, `${artifact.name}:${id}`).toEqual([]);
      expect(command.hidden, `${artifact.name}:${id}`).not.toBe(true);
      return { id: command.id, relativePath: [...command.relativePath] };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function requireArtifact(artifacts: readonly Artifact[], name: string) {
  const artifact = artifacts.find((candidate) => candidate.name === name);
  if (artifact === undefined) throw new Error(`packed release is missing ${name}`);
  return artifact;
}

async function listPlugins(rawr: string): Promise<readonly PluginEntry[]> {
  const result = await runRawr(rawr, ["plugins", "--json"]);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe("");
  const plugins = parseJson(result.stdout);
  if (!Value.Check(PluginListSchema, plugins)) throw new Error("installed plugin list is invalid");
  return plugins;
}

function runRawr(rawr: string, args: readonly string[]): Promise<CommandResult> {
  const state = requireState();
  return execute(rawr, args, state.operator, installedPackageChildEnvironment(state));
}

function childEnvironment(): NodeJS.ProcessEnv {
  return installedPackageChildEnvironment(requireState());
}

function readTarballText(tarball: string, member: string): Promise<string> {
  return runChecked("tar", ["-xOf", tarball, member], workspaceRoot, childEnvironment());
}

async function runChecked(
  executable: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv
): Promise<string> {
  const result = await execute(executable, args, cwd, env);
  if (result.status !== 0) {
    throw new Error(
      `${executable} exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }
  return result.stdout;
}

function execute(
  executable: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      [...args],
      {
        cwd,
        encoding: "utf8",
        env,
        maxBuffer: 32 * 1024 * 1024,
        timeout: 240_000,
      },
      (error, stdout, stderr) => {
        if (error === null) {
          resolve({ status: 0, stderr, stdout });
          return;
        }
        if (typeof error.code === "number") {
          resolve({ status: error.code, stderr, stdout });
          return;
        }
        reject(new Error(`${executable} failed before returning an exit status`, { cause: error }));
      }
    );
  });
}

function parseJson(text: string): unknown {
  return JSON.parse(text);
}

function snapshotRoots(
  roots: readonly string[]
): readonly (readonly [string, readonly string[]])[] {
  return roots.map((root) => [root, snapshotTree(root)] as const);
}

function snapshotTree(root: string): readonly string[] {
  if (!existsSync(root)) return ["missing:."];
  const entries: string[] = [];
  const visit = (candidate: string, relative: string) => {
    const status = lstatSync(candidate);
    if (status.isSymbolicLink()) {
      entries.push(`symlink:${relative}:${readlinkSync(candidate)}`);
      return;
    }
    if (status.isDirectory()) {
      entries.push(`directory:${relative}`);
      for (const name of readdirSync(candidate).sort())
        visit(path.join(candidate, name), path.join(relative, name));
      return;
    }
    if (status.isFile()) {
      const digest = createHash("sha256").update(readFileSync(candidate)).digest("hex");
      entries.push(`file:${relative}:${digest}`);
      return;
    }
    entries.push(`other:${relative}:${status.mode}`);
  };
  visit(root, ".");
  return entries;
}

function installedRoot(prefix: string, name: string) {
  return path.join(prefix, "node_modules", ...name.split("/"));
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function compareCommands(
  left: { id: string; pluginName: string | null },
  right: { id: string; pluginName: string | null }
) {
  return (
    left.id.localeCompare(right.id) ||
    String(left.pluginName).localeCompare(String(right.pluginName))
  );
}

function expectContained(parent: string, candidate: string) {
  expect(isWithin(parent, candidate)).toBe(true);
  expect(isWithin(workspaceRoot, candidate)).toBe(false);
}

function isWithin(parent: string, candidate: string) {
  const relative = path.relative(parent, candidate);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function requireState() {
  if (acceptanceState === undefined) throw new Error("acceptance state is not initialized");
  return acceptanceState;
}
