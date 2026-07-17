import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

type CliProc = ReturnType<typeof runRawrFrom>;

const tempDirs: string[] = [];
const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commandTestCli = path.join(cliRoot, "test", "command-fixture", "command-test-cli.ts");

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function runRawrFrom(input: {
  cwd: string;
  args: string[];
  home: string;
  env?: Record<string, string>;
}) {
  return spawnSync("bun", [commandTestCli, ...input.args], {
    cwd: input.cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      HOME: input.home,
      XDG_CONFIG_HOME: path.join(input.home, ".config"),
      XDG_DATA_HOME: path.join(input.home, ".local", "share"),
      XDG_STATE_HOME: path.join(input.home, ".local", "state"),
      CODEX_HOME: path.join(input.home, ".codex-rawr"),
      CLAUDE_PLUGINS_LOCAL: path.join(input.home, ".claude", "plugins", "local"),
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
      RAWR_WORKSPACE_ROOT: "",
      RAWR_HQ_ROOT: "",
      ...(input.env ?? {}),
    },
  });
}

function parseJson(proc: CliProc) {
  expect(proc.stdout, proc.stderr).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

function snapshotTree(root: string, input: { ignoreTopLevel?: string[] } = {}) {
  if (!existsSync(root)) return [];
  const ignored = new Set(input.ignoreTopLevel ?? []);
  const entries: Array<{ path: string; type: "dir" | "file"; content?: string }> = [];

  function visit(absPath: string, relPath: string) {
    const stat = statSync(absPath);
    if (stat.isDirectory()) {
      if (relPath && ignored.has(relPath.split(path.sep)[0] ?? "")) return;
      entries.push({ path: relPath || ".", type: "dir" });
      for (const entry of readdirSync(absPath).sort()) {
        visit(path.join(absPath, entry), relPath ? path.join(relPath, entry) : entry);
      }
      return;
    }
    if (stat.isFile()) {
      entries.push({ path: relPath, type: "file", content: readFileSync(absPath, "utf8") });
    }
  }

  visit(root, "");
  return entries;
}

function makeWorkspace(input: {
  rootName: string;
  pluginName: string;
  packageName: string;
  rawrKind: "agent" | "toolkit";
  skillName: string;
}) {
  const workspaceRoot = mkdtempSync(path.join(os.tmpdir(), `${input.rootName}-`));
  tempDirs.push(workspaceRoot);

  const pluginRoot = path.join(
    workspaceRoot,
    "plugins",
    input.rawrKind === "agent" ? "agents" : "cli",
    input.pluginName,
  );
  const skillRoot = path.join(pluginRoot, "skills", input.skillName);
  mkdirSync(skillRoot, { recursive: true });
  writeFileSync(
    path.join(workspaceRoot, "package.json"),
    JSON.stringify({ name: input.rootName, version: "0.0.0" }, null, 2),
    "utf8",
  );
  writeFileSync(
    path.join(pluginRoot, "package.json"),
    JSON.stringify({
      name: input.packageName,
      version: "1.0.0",
      description: `${input.pluginName} fixture`,
      rawr: {
        kind: input.rawrKind,
        capability: "plugin-sync-source-workspace-test",
      },
    }, null, 2),
    "utf8",
  );
  writeFileSync(
    path.join(skillRoot, "SKILL.md"),
    `# ${input.skillName}\n\nFixture skill for source-workspace sync proof.\n`,
    "utf8",
  );

  return { workspaceRoot, pluginRoot, skillRoot };
}

function seedManagedCodexSkillResidue(input: {
  codexHome: string;
  pluginName: string;
  skillName: string;
  sourcePluginRoot: string;
  sharedSkillName?: string;
}) {
  const userRoot = path.basename(input.codexHome) === ".codex" || path.basename(input.codexHome) === ".codex-rawr"
    ? path.dirname(input.codexHome)
    : input.codexHome;
  const rootSkill = path.join(input.codexHome, "skills", input.skillName);
  const runtimeSkill = path.join(userRoot, ".agents", "skills", input.skillName);
  const sharedRootSkill = input.sharedSkillName ? path.join(input.codexHome, "skills", input.sharedSkillName) : null;
  const sharedRuntimeSkill = input.sharedSkillName ? path.join(userRoot, ".agents", "skills", input.sharedSkillName) : null;
  mkdirSync(rootSkill, { recursive: true });
  mkdirSync(runtimeSkill, { recursive: true });
  if (sharedRootSkill) mkdirSync(sharedRootSkill, { recursive: true });
  if (sharedRuntimeSkill) mkdirSync(sharedRuntimeSkill, { recursive: true });
  mkdirSync(path.join(input.codexHome, "plugins"), { recursive: true });
  writeFileSync(path.join(rootSkill, "SKILL.md"), "# stale root skill\n", "utf8");
  writeFileSync(path.join(runtimeSkill, "SKILL.md"), "# stale runtime skill\n", "utf8");
  if (sharedRootSkill) writeFileSync(path.join(sharedRootSkill, "SKILL.md"), "# shared root skill\n", "utf8");
  if (sharedRuntimeSkill) writeFileSync(path.join(sharedRuntimeSkill, "SKILL.md"), "# shared runtime skill\n", "utf8");
  writeFileSync(
    path.join(input.codexHome, "plugins", "registry.json"),
    JSON.stringify({
      plugins: [{
        name: input.pluginName,
        prompts: [],
        skills: [input.skillName, ...(input.sharedSkillName ? [input.sharedSkillName] : [])],
        scripts: [],
        agents: [],
        managed_by: "@rawr/plugin-plugins",
        source_plugin_path: input.sourcePluginRoot,
      }, ...(input.sharedSkillName ? [{
        name: "other-plugin",
        prompts: [],
        skills: [input.sharedSkillName],
        scripts: [],
        agents: [],
        managed_by: "@rawr/plugin-plugins",
        source_plugin_path: path.join(path.dirname(input.sourcePluginRoot), "other-plugin"),
      }] : [])],
    }, null, 2),
    "utf8",
  );
}

function readManagedRegistry(codexHome: string) {
  return readFileSync(path.join(codexHome, "plugins", "registry.json"), "utf8");
}

describe("plugins --source-workspace sync proof", () => {
  it("executes the template CLI and exposes native source-workspace sync flags", { timeout: 30000 }, () => {
    const invocation = makeWorkspace({
      rootName: "rawr-template-invocation",
      pluginName: "template-plugin",
      packageName: "@rawr/template-plugin",
      rawrKind: "toolkit",
      skillName: "template-skill",
    });
    const home = mkdtempSync(path.join(os.tmpdir(), "rawr-source-workspace-home-"));
    tempDirs.push(home);

    const proc = runRawrFrom({
      cwd: invocation.workspaceRoot,
      home,
      args: ["plugins", "sync", "--help"],
    });

    expect(proc.status).toBe(0);
    const out = `${proc.stdout}\n${proc.stderr}`;
    expect(out).toContain("Deploy one RAWR plugin through native provider plugin paths");
    expect(out).toContain("--source-workspace");
    expect(out).toContain("--codex-package");
    expect(out).toContain("--codex-install");
    expect(out).toContain("--cleanup-behind");
    expect(out).toContain("--destination-projection");
  });

  it("resolves single-plugin sync from the external source workspace", { timeout: 60000 }, () => {
    const invocation = makeWorkspace({
      rootName: "rawr-template-invocation",
      pluginName: "template-plugin",
      packageName: "@rawr/template-plugin",
      rawrKind: "toolkit",
      skillName: "template-skill",
    });
    const source = makeWorkspace({
      rootName: "rawr-personal-source",
      pluginName: "personal-agent",
      packageName: "@rawr/personal-agent",
      rawrKind: "agent",
      skillName: "personal-skill",
    });
    const home = mkdtempSync(path.join(os.tmpdir(), "rawr-source-workspace-home-"));
    const codexHome = path.join(home, ".codex-rawr");
    tempDirs.push(home);

    const homeBefore = snapshotTree(home);
    const codexBefore = snapshotTree(codexHome);
    const invocationBefore = snapshotTree(invocation.workspaceRoot, { ignoreTopLevel: [".rawr"] });
    const sourceBefore = snapshotTree(source.workspaceRoot, { ignoreTopLevel: [".rawr"] });
    const syncOne = runRawrFrom({
      cwd: invocation.workspaceRoot,
      home,
      args: [
        "plugins",
        "sync",
        "personal-agent",
        "--json",
        "--dry-run",
        "--agent",
        "codex",
        "--codex-home",
        codexHome,
        "--source-workspace",
        source.workspaceRoot,
      ],
    });

    expect(syncOne.status).toBe(0);
    const syncOneJson = parseJson(syncOne);
    expect(syncOneJson.ok).toBe(true);
    expect(syncOneJson.data.sourcePlugin.dirName).toBe("personal-agent");
    expect(syncOneJson.data.sourcePlugin.absPath).toBe(source.pluginRoot);
    expect(syncOneJson.data.sourcePlugin.absPath).not.toBe(invocation.pluginRoot);
    expect(syncOneJson.data.scanned.skills).toEqual(["personal-skill"]);
    expect(syncOneJson.data.codexPackage.packages).toEqual([expect.objectContaining({
      plugin: "personal-agent",
      action: "planned",
      skillCount: 1,
    })]);
    expect(syncOneJson.data.codexInstall.actions).toEqual([expect.objectContaining({
      action: "planned",
      plugin: "personal-agent",
      codexHome,
    })]);
    expect(syncOneJson.data.undo.available).toBe(false);

    expect(snapshotTree(home)).toEqual(homeBefore);
    expect(snapshotTree(codexHome)).toEqual(codexBefore);
    expect(snapshotTree(invocation.workspaceRoot, { ignoreTopLevel: [".rawr"] })).toEqual(invocationBefore);
    expect(snapshotTree(source.workspaceRoot, { ignoreTopLevel: [".rawr"] })).toEqual(sourceBefore);
  });

  it("uses an external source workspace for status, drift, dry-run sync, and cleanup planning", { timeout: 90000 }, () => {
    const invocation = makeWorkspace({
      rootName: "rawr-template-invocation",
      pluginName: "template-plugin",
      packageName: "@rawr/template-plugin",
      rawrKind: "toolkit",
      skillName: "template-skill",
    });
    const source = makeWorkspace({
      rootName: "rawr-personal-source",
      pluginName: "personal-agent",
      packageName: "@rawr/personal-agent",
      rawrKind: "agent",
      skillName: "personal-skill",
    });
    const home = mkdtempSync(path.join(os.tmpdir(), "rawr-source-workspace-home-"));
    const codexHome = path.join(home, ".codex-rawr");
    const claudeHome = path.join(home, ".claude", "plugins", "local");
    tempDirs.push(home);
    seedManagedCodexSkillResidue({
      codexHome,
      pluginName: "personal-agent",
      skillName: "personal-skill",
      sourcePluginRoot: source.pluginRoot,
      sharedSkillName: "shared-skill",
    });
    const registryBefore = readManagedRegistry(codexHome);
    const rootSkill = path.join(codexHome, "skills", "personal-skill", "SKILL.md");
    const runtimeSkill = path.join(home, ".agents", "skills", "personal-skill", "SKILL.md");
    const sharedRootSkill = path.join(codexHome, "skills", "shared-skill", "SKILL.md");
    const sharedRuntimeSkill = path.join(home, ".agents", "skills", "shared-skill", "SKILL.md");

    const status = runRawrFrom({
      cwd: invocation.workspaceRoot,
      home,
      args: [
        "plugins",
        "status",
        "--json",
        "--no-fail",
        "--material-only",
        "--agent",
        "codex",
        "--scope",
        "agents",
        "--codex-home",
        codexHome,
        "--source-workspace",
        source.workspaceRoot,
      ],
    });
    expect(status.status, status.stderr).toBe(0);
    const statusJson = parseJson(status);
    expect(statusJson.ok).toBe(true);
    expect(statusJson.data.workspaceRoot).toBe(source.workspaceRoot);
    expect(statusJson.data.statuses.install).toBeUndefined();
    expect(statusJson.data.sync.plugins.map((plugin: any) => plugin.dirName)).toEqual(["personal-agent"]);
    expect(statusJson.data.sync.plugins.map((plugin: any) => plugin.dirName)).not.toContain("template-plugin");

    const drift = runRawrFrom({
      cwd: invocation.workspaceRoot,
      home,
      args: [
        "plugins",
        "sync",
        "drift",
        "--json",
        "--no-fail-on-drift",
        "--include-items",
        "--agent",
        "codex",
        "--scope",
        "agents",
        "--codex-home",
        codexHome,
        "--source-workspace",
        source.workspaceRoot,
      ],
    });
    expect(drift.status).toBe(0);
    const driftJson = parseJson(drift);
    expect(driftJson.ok).toBe(true);
    expect(driftJson.data.workspaceRoot).toBe(source.workspaceRoot);
    expect(driftJson.data.includeOclif).toBe(false);
    expect(driftJson.data.plugins.map((plugin: any) => plugin.dirName)).toEqual(["personal-agent"]);
    expect(driftJson.data.plugins.map((plugin: any) => plugin.dirName)).not.toContain("template-plugin");

    const homeBefore = snapshotTree(home);
    const codexBefore = snapshotTree(codexHome);
    const claudeBefore = snapshotTree(claudeHome);
    const invocationBefore = snapshotTree(invocation.workspaceRoot, { ignoreTopLevel: [".rawr"] });
    const sourceBefore = snapshotTree(source.workspaceRoot, { ignoreTopLevel: [".rawr"] });
    const syncAll = runRawrFrom({
      cwd: invocation.workspaceRoot,
      home,
      args: [
        "plugins",
        "sync",
        "all",
        "--json",
        "--dry-run",
        "--allow-partial",
        "--agent",
        "codex",
        "--scope",
        "agents",
        "--codex-home",
        codexHome,
        "--claude-home",
        claudeHome,
        "--source-workspace",
        source.workspaceRoot,
      ],
    });
    expect(syncAll.status).toBe(0);
    const syncAllJson = parseJson(syncAll);
    expect(syncAllJson.ok).toBe(true);
    expect(syncAllJson.data.workspaceRoot).toBe(source.workspaceRoot);
    expect(syncAllJson.data.results.map((result: any) => result.dirName)).toEqual(["personal-agent"]);
    expect(syncAllJson.data.results.map((result: any) => result.dirName)).not.toContain("template-plugin");
    expect(syncAllJson.data.codexPackage.packages).toEqual([expect.objectContaining({
      plugin: "personal-agent",
      action: "planned",
      skillCount: 1,
    })]);
    expect(syncAllJson.data.codexInstall.actions).toEqual([expect.objectContaining({
      action: "planned",
      plugin: "personal-agent",
      codexHome,
    })]);
    expect(syncAllJson.data.cleanupBehind.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: "planned",
        target: path.join(codexHome, "skills", "personal-skill"),
      }),
      expect.objectContaining({
        action: "planned",
        target: path.join(home, ".agents", "skills", "personal-skill"),
      }),
    ]));
    expect(syncAllJson.data.installReconcile).toBeUndefined();
    expect(syncAllJson.data.undo.available).toBe(false);
    expect(syncAllJson.data.cleanupBehind.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: "skipped",
        target: path.join(codexHome, "skills", "shared-skill"),
      }),
      expect.objectContaining({
        action: "skipped",
        target: path.join(home, ".agents", "skills", "shared-skill"),
      }),
    ]));
    expect(syncAllJson.data.cleanupBehind.retainedResidue).toEqual(expect.arrayContaining([
      expect.objectContaining({ reason: "shared-claim-retained" }),
      expect.objectContaining({ reason: "shared-runtime-claim-retained" }),
    ]));

    expect(readManagedRegistry(codexHome)).toBe(registryBefore);
    expect(readFileSync(rootSkill, "utf8")).toBe("# stale root skill\n");
    expect(readFileSync(runtimeSkill, "utf8")).toBe("# stale runtime skill\n");
    expect(readFileSync(sharedRootSkill, "utf8")).toBe("# shared root skill\n");
    expect(readFileSync(sharedRuntimeSkill, "utf8")).toBe("# shared runtime skill\n");
    expect(existsSync(path.join(source.workspaceRoot, "dist"))).toBe(false);
    expect(existsSync(path.join(invocation.workspaceRoot, "dist"))).toBe(false);
    expect(snapshotTree(home)).toEqual(homeBefore);
    expect(snapshotTree(codexHome)).toEqual(codexBefore);
    expect(snapshotTree(claudeHome)).toEqual(claudeBefore);
    expect(snapshotTree(invocation.workspaceRoot, { ignoreTopLevel: [".rawr"] })).toEqual(invocationBefore);
    expect(snapshotTree(source.workspaceRoot, { ignoreTopLevel: [".rawr"] })).toEqual(sourceBefore);
  });
});
