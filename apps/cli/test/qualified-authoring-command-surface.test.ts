import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ownedTempRoots: string[] = [];

afterEach(async () => {
  for (const root of ownedTempRoots.splice(0)) await removeOwnedCommandFixture(root);
});

describe("qualified authoring command surface", () => {
  it("discovers each named creator and no legacy scaffold topic", { timeout: 30_000 }, () => {
    for (const args of [
      ["cli", "command", "create", "--help"],
      ["cli", "extension", "create", "--help"],
      ["agent", "plugins", "create", "--help"],
    ]) {
      const result = runRawr(args);
      expect(result.status, `${args.join(" ")}\n${result.stderr}`).toBe(0);
    }
    const plugins = runRawr(["plugins", "--help"]);
    expect(plugins.status).toBe(0);
    expect(`${plugins.stdout}\n${plugins.stderr}`).not.toContain("plugins scaffold");
  });

  it("rejects every retired command ID without an alias or forwarder", { timeout: 60_000 }, () => {
    const retiredCommands = [
      { args: ["app", "composition", "show"], id: "app:composition:show" },
      { args: ["app", "composition", "check"], id: "app:composition:check" },
      { args: ["app", "composition", "select"], id: "app:composition:select" },
      { args: ["app", "composition", "unselect"], id: "app:composition:unselect" },
      { args: ["app", "projection", "create"], id: "app:projection:create" },
      { args: ["plugins", "web", "list"], id: "plugins:web:list" },
      { args: ["plugins", "web", "status"], id: "plugins:web:status" },
      { args: ["plugins", "web", "enable"], id: "plugins:web:enable" },
      { args: ["plugins", "web", "enable", "all"], id: "plugins:web:enable:all" },
      { args: ["plugins", "web", "disable"], id: "plugins:web:disable" },
      { args: ["plugins", "scaffold", "command"], id: "plugins:scaffold:command" },
      { args: ["plugins", "scaffold", "web-plugin"], id: "plugins:scaffold:web-plugin" },
      { args: ["plugins", "scaffold", "workflow"], id: "plugins:scaffold:workflow" },
      { args: ["plugins", "export"], id: "plugins:export" },
      { args: ["plugins", "export", "all"], id: "plugins:export:all" },
      { args: ["plugins", "improve"], id: "plugins:improve" },
      { args: ["plugins", "lifecycle", "check"], id: "plugins:lifecycle:check" },
      { args: ["plugins", "status"], id: "plugins:status" },
      { args: ["plugins", "sweep"], id: "plugins:sweep" },
      { args: ["plugins", "sync"], id: "plugins:sync" },
      { args: ["plugins", "sync", "all"], id: "plugins:sync:all" },
      { args: ["plugins", "sync", "drift"], id: "plugins:sync:drift" },
      { args: ["plugins", "sync", "sources", "add"], id: "plugins:sync:sources:add" },
      { args: ["plugins", "sync", "sources", "list"], id: "plugins:sync:sources:list" },
      { args: ["plugins", "sync", "sources", "remove"], id: "plugins:sync:sources:remove" },
      { args: ["workflow", "forge-command"], id: "workflow:forge-command" },
    ] as const;

    for (const retired of retiredCommands) {
      const result = runRawr([...retired.args, "--help"]);
      expect(
        result.status,
        `${retired.args.join(" ")}\n${result.stdout}\n${result.stderr}`
      ).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain(`Command ${retired.id} not found.`);
    }
  });

  it("rejects cross-owner and incomplete inputs before any repository write", {
    timeout: 30_000,
  }, () => {
    const workspaceRoot = path.resolve(cliRoot, "../..");
    const sentinel = path.join(workspaceRoot, "apps", "hq", "rawr.hq.ts");
    const destination = path.join(
      os.tmpdir(),
      `rawr-invalid-authoring-${process.pid}-${randomUUID()}`
    );
    const before = readFileSync(sentinel);
    const beforeMtime = statSync(sentinel, { bigint: true }).mtimeNs;
    expect(existsSync(destination)).toBe(false);

    for (const args of [
      [
        "cli",
        "command",
        "create",
        "sample",
        "inspect",
        "--content-workspace",
        destination,
        "--json",
      ],
      [
        "cli",
        "extension",
        "create",
        "invalid",
        "--destination",
        destination,
        "--content-workspace",
        destination,
        "--json",
      ],
      [
        "agent",
        "plugins",
        "create",
        "invalid",
        "--content-workspace",
        destination,
        "--destination",
        destination,
        "--json",
      ],
    ]) {
      const result = runRawr(args);
      expect(result.status, `${args.join(" ")}\n${result.stdout}\n${result.stderr}`).not.toBe(0);
    }

    expect(readFileSync(sentinel)).toEqual(before);
    expect(statSync(sentinel, { bigint: true }).mtimeNs).toBe(beforeMtime);
    expect(existsSync(destination)).toBe(false);
  });

  it("dry-runs, applies, and converges each creator through the operator command surface", {
    timeout: 120_000,
  }, async () => {
    const personal = await gitFixture({
      origin: "https://github.com/rawr-ai/rawr-hq.git",
      packageName: "rawr-hq",
    });
    const template = await gitFixture({
      origin: "https://github.com/rawr-ai/rawr-hq-template.git",
      packageName: "rawr-hq-template",
      cliPackageName: "@rawr/cli",
    });
    const extensionParent = await commandTempRoot();
    const extension = path.join(extensionParent, "portable-extension");
    const [officialAuthorities, agentAuthorities, extensionAuthorities] = await Promise.all([
      adjacentAuthorityFixture(),
      adjacentAuthorityFixture(),
      adjacentAuthorityFixture(),
    ]);

    const flows = [
      {
        cwd: template,
        args: ["cli", "command", "create", "sample", "inspect"],
        outputRoot: path.join(template, "apps", "cli"),
        authorities: officialAuthorities,
      },
      {
        cwd: cliRoot,
        args: ["agent", "plugins", "create", "research-kit", "--content-workspace", personal],
        outputRoot: path.join(personal, "plugins", "agents", "research-kit"),
        authorities: agentAuthorities,
      },
      {
        cwd: extensionParent,
        args: ["cli", "extension", "create", "portable-tools", "--destination", extension],
        outputRoot: extension,
        authorities: extensionAuthorities,
      },
    ] as const;

    for (const flow of flows) {
      const adjacentBefore = await snapshotTree(flow.authorities.root);
      const outputExistedBeforeDryRun = existsSync(flow.outputRoot);
      const beforeDryRun = outputExistedBeforeDryRun ? await snapshotTree(flow.outputRoot) : null;
      const dryRun = runRawr([...flow.args, "--dry-run", "--json"], flow.cwd, flow.authorities.env);
      expect(dryRun.status, dryRun.stderr || dryRun.stdout).toBe(0);
      expect(JSON.parse(dryRun.stdout)).toMatchObject({
        ok: true,
        data: { kind: "AuthoringDryRun" },
      });
      expect(existsSync(flow.outputRoot)).toBe(outputExistedBeforeDryRun);
      if (beforeDryRun !== null) {
        expect(await snapshotTree(flow.outputRoot)).toEqual(beforeDryRun);
      }
      expect(await snapshotTree(flow.authorities.root)).toEqual(adjacentBefore);

      const applied = runRawr([...flow.args, "--json"], flow.cwd, flow.authorities.env);
      expect(applied.status, applied.stderr || applied.stdout).toBe(0);
      expect(JSON.parse(applied.stdout)).toMatchObject({
        ok: true,
        data: { kind: "AuthoringAuthored" },
      });
      const firstSnapshot = await snapshotTree(flow.outputRoot);
      expect(await snapshotTree(flow.authorities.root)).toEqual(adjacentBefore);

      const repeated = runRawr([...flow.args, "--json"], flow.cwd, flow.authorities.env);
      expect(repeated.status, repeated.stderr || repeated.stdout).toBe(0);
      expect(JSON.parse(repeated.stdout)).toMatchObject({
        ok: true,
        data: { kind: "AuthoringConverged" },
      });
      expect(await snapshotTree(flow.outputRoot)).toEqual(firstSnapshot);
      expect(await snapshotTree(flow.authorities.root)).toEqual(adjacentBefore);
    }

    for (const args of [
      ["install", "--ignore-scripts"],
      ["run", "build"],
      ["run", "test"],
    ]) {
      const result = spawnSync("bun", args, { cwd: extension, encoding: "utf8" });
      expect(result.status, result.stderr || result.stdout).toBe(0);
    }
  });
});

function runRawr(args: readonly string[], cwd = cliRoot, env: NodeJS.ProcessEnv = {}) {
  return spawnSync(
    "bun",
    [path.join(cliRoot, "test", "command-fixture", "command-test-cli.ts"), ...args],
    {
      cwd,
      encoding: "utf8",
      env: { ...process.env, ...env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" },
    }
  );
}

type AdjacentAuthorityFixture = Readonly<{
  root: string;
  env: NodeJS.ProcessEnv;
}>;

async function adjacentAuthorityFixture(): Promise<AdjacentAuthorityFixture> {
  const root = await commandTempRoot();
  const roots = {
    nativeOclif: path.join(root, "native-oclif-config"),
    controller: path.join(root, "controller-selection-home"),
    release: path.join(root, "agent-release-state"),
    build: path.join(root, "agent-build-state"),
    package: path.join(root, "agent-package-state"),
    export: path.join(root, "agent-export-state"),
    provider: path.join(root, "provider-state"),
    promotion: path.join(root, "promotion-state"),
    process: path.join(root, "process-state"),
    personalRecords: path.join(root, "personal-lifecycle-records"),
  } as const;
  const namedRoots = Object.entries(roots);
  await Promise.all(
    namedRoots.map(async ([name, authorityRoot]) => {
      await fs.mkdir(authorityRoot, { recursive: true });
      await fs.writeFile(
        path.join(authorityRoot, "sentinel.json"),
        `${JSON.stringify({ authority: name })}\n`
      );
    })
  );

  const home = path.join(root, "operator-home");
  const xdgConfigHome = path.join(roots.nativeOclif, "xdg-config");
  const xdgDataHome = path.join(roots.nativeOclif, "xdg-data");
  const xdgStateHome = path.join(roots.nativeOclif, "xdg-state");
  const xdgCacheHome = path.join(roots.nativeOclif, "xdg-cache");
  await Promise.all([
    fs.mkdir(home, { recursive: true }),
    fs.mkdir(xdgConfigHome, { recursive: true }),
    fs.mkdir(xdgDataHome, { recursive: true }),
    fs.mkdir(xdgStateHome, { recursive: true }),
    fs.mkdir(xdgCacheHome, { recursive: true }),
  ]);
  await fs.writeFile(path.join(home, "sentinel.json"), '{"authority":"operator-home"}\n');

  const codexHome = path.join(roots.provider, "codex-home");
  const claudeHome = path.join(roots.provider, "claude-home");
  await Promise.all([fs.mkdir(codexHome), fs.mkdir(claudeHome)]);
  return Object.freeze({
    root,
    env: Object.freeze({
      HOME: home,
      XDG_CONFIG_HOME: xdgConfigHome,
      XDG_DATA_HOME: xdgDataHome,
      XDG_STATE_HOME: xdgStateHome,
      XDG_CACHE_HOME: xdgCacheHome,
      RAWR_DATA_DIR: roots.controller,
      CODEX_HOME: codexHome,
      CLAUDE_CONFIG_DIR: claudeHome,
      RAWR_HYPERRESEARCH_CODEX_LEDGER: path.join(roots.process, "hyperresearch-ledger.json"),
    }),
  });
}

async function commandTempRoot(): Promise<string> {
  const created = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-authoring-command-test-"));
  const root = await fs.realpath(created);
  ownedTempRoots.push(root);
  return root;
}

async function gitFixture(
  input: Readonly<{
    origin: string;
    packageName: string;
    cliPackageName?: string;
  }>
): Promise<string> {
  const root = await commandTempRoot();
  await fs.writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify({ name: input.packageName })}\n`
  );
  if (input.cliPackageName) {
    await fs.mkdir(path.join(root, "apps", "cli"), { recursive: true });
    await fs.writeFile(
      path.join(root, "apps", "cli", "package.json"),
      `${JSON.stringify({ name: input.cliPackageName })}\n`
    );
  }
  for (const args of [
    ["init", "--quiet"],
    ["remote", "add", "origin", input.origin],
  ]) {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  }
  return root;
}

type TreeSnapshotEntry = Readonly<{
  kind: "directory" | "file" | "link";
  bytes?: readonly number[];
  target?: string;
  mtimeNs: string;
}>;

async function snapshotTree(root: string): Promise<Readonly<Record<string, TreeSnapshotEntry>>> {
  const snapshot: Record<string, TreeSnapshotEntry> = {};
  async function visit(directory: string): Promise<void> {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      const stat = await fs.lstat(absolute, { bigint: true });
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        snapshot[relative] = Object.freeze({ kind: "directory", mtimeNs: stat.mtimeNs.toString() });
        await visit(absolute);
      } else if (entry.isFile()) {
        const bytes = await fs.readFile(absolute);
        snapshot[relative] = Object.freeze({
          kind: "file",
          bytes: Object.freeze([...bytes]),
          mtimeNs: stat.mtimeNs.toString(),
        });
      } else if (entry.isSymbolicLink()) {
        snapshot[relative] = Object.freeze({
          kind: "link",
          target: await fs.readlink(absolute),
          mtimeNs: stat.mtimeNs.toString(),
        });
      }
    }
  }
  await visit(root);
  return Object.freeze(snapshot);
}

async function removeOwnedCommandFixture(root: string): Promise<void> {
  const expectedParent = await fs.realpath(os.tmpdir());
  const actualParent = await fs.realpath(path.dirname(root));
  const stat = await fs.lstat(root);
  if (
    actualParent !== expectedParent ||
    (await fs.realpath(root)) !== root ||
    !path.basename(root).startsWith("rawr-authoring-command-test-") ||
    !stat.isDirectory() ||
    stat.isSymbolicLink()
  ) {
    throw new Error("Refusing cleanup outside an owned command fixture root");
  }
  await removeDirectoryContents(root);
  await fs.rmdir(root);
}

async function removeDirectoryContents(directory: string): Promise<void> {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      await removeDirectoryContents(target);
      await fs.rmdir(target);
    } else {
      await fs.unlink(target);
    }
  }
}
