import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface AgentPluginNativeBinaries {
  readonly codex: string;
  readonly claude: string;
  readonly git: string;
}

export interface AgentPluginNativeFixture {
  readonly root: string;
  readonly env: Readonly<Record<string, string>>;
  readonly workspaceRoot: string;
  readonly repositoryUrl: string;
  readonly remoteUrl: string;
  readonly expectedRepositoryIdentity: string;
  readonly contentAuthority: string;
  readonly remoteName: string;
  readonly refName: string;
  readonly pluginRoot: string;
  readonly releaseInputPath: string;
  readonly initialCommit: string;
  readonly initialTree: string;
  readonly marketplaceIdentity: string;
  readonly pluginName: string;
  readonly selector: string;
  readonly homes: Readonly<{ codex: string; claude: string }>;
  readonly disposableRoot: string;
  readonly disposableHomes: Readonly<{ codex: string; claude: string }>;
  readonly packageOutputRoot: string;
}

/** Seeds only owned local files and Git history; the installed CLI authors release records. */
export async function createAgentPluginNativeFixture(
  requestedRoot: string,
  binaries: AgentPluginNativeBinaries,
  signal?: AbortSignal
): Promise<AgentPluginNativeFixture> {
  signal?.throwIfAborted();
  if (!path.isAbsolute(requestedRoot)) throw new Error("Native fixture root must be absolute");
  for (const executable of Object.values(binaries)) {
    if (!path.isAbsolute(executable)) throw new Error("Native fixture binaries must be absolute");
    await access(executable, constants.X_OK);
  }
  signal?.throwIfAborted();
  await mkdir(requestedRoot, { mode: 0o700 });
  const root = await realpath(requestedRoot);
  try {
    const workspaceRoot = path.join(root, "workspace");
    const bin = path.join(root, "bin");
    const homes = Object.freeze({
      codex: path.join(root, "codex"),
      claude: path.join(root, "claude"),
    });
    const disposableRoot = path.join(root, "disposable");
    const disposableHomes = Object.freeze({
      codex: path.join(disposableRoot, "codex"),
      claude: path.join(disposableRoot, "claude"),
    });
    const packageOutputRoot = path.join(root, "packages");
    for (const directory of [
      "home",
      "config",
      "cache",
      "data",
      "state",
      "tmp",
      "bin",
      "workspace",
      "codex",
      "claude",
      "disposable",
      "disposable/codex",
      "disposable/claude",
      "packages",
    ]) {
      signal?.throwIfAborted();
      await mkdir(path.join(root, directory), { mode: 0o700 });
    }
    for (const [name, executable] of Object.entries(binaries)) {
      const target = await realpath(executable);
      signal?.throwIfAborted();
      await symlink(target, path.join(bin, name));
    }

    const repositoryUrl = "https://example.invalid/habitat-native-fixture.git";
    const gitConfig = path.join(root, "gitconfig");
    signal?.throwIfAborted();
    await writeFile(gitConfig, "", { mode: 0o600 });
    const env: Readonly<Record<string, string>> = Object.freeze({
      HOME: path.join(root, "home"),
      XDG_CONFIG_HOME: path.join(root, "config"),
      XDG_CACHE_HOME: path.join(root, "cache"),
      XDG_DATA_HOME: path.join(root, "data"),
      XDG_STATE_HOME: path.join(root, "state"),
      TMPDIR: path.join(root, "tmp"),
      TMP: path.join(root, "tmp"),
      TEMP: path.join(root, "tmp"),
      CODEX_HOME: homes.codex,
      CLAUDE_CONFIG_DIR: homes.claude,
      PATH: `${bin}${path.delimiter}/usr/bin${path.delimiter}/bin${path.delimiter}/usr/sbin${path.delimiter}/sbin`,
      GIT_CONFIG_GLOBAL: gitConfig,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_TERMINAL_PROMPT: "0",
      GIT_ALLOW_PROTOCOL: "file",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
      DISABLE_AUTOUPDATER: "1",
      DISABLE_TELEMETRY: "1",
      DISABLE_ERROR_REPORTING: "1",
      NO_COLOR: "1",
      TERM: "dumb",
      LC_ALL: "C",
    });
    const git = async (args: readonly string[]): Promise<string> => {
      signal?.throwIfAborted();
      // Join the bounded native callback before observing abort; execFile's
      // AbortSignal error callback does not itself establish child settlement.
      const result = await execFileAsync(binaries.git, [...args], {
        cwd: workspaceRoot,
        env,
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        timeout: 10_000,
        killSignal: "SIGKILL",
      });
      signal?.throwIfAborted();
      return result.stdout.trim();
    };
    await git(["config", "--global", "user.name", "Habitat Native Fixture"]);
    await git(["config", "--global", "user.email", "fixture@example.invalid"]);
    await git(["config", "--global", "init.defaultBranch", "main"]);
    const localRepositoryUrl = pathToFileURL(workspaceRoot).href;
    await git(["config", "--global", `url.${localRepositoryUrl}.insteadOf`, repositoryUrl]);

    const contentAuthority = "habitat-native-fixture";
    const pluginName = "fixture-skill";
    const pluginRoot = "plugins/agents";
    const memberPath = `${pluginRoot}/${pluginName}`;
    const manifest = {
      name: pluginName,
      version: "0.0.1",
      description: "Inert native fixture skill",
    };
    const files: Readonly<Record<string, string>> = {
      ".agents/plugins/marketplace.json": JSON.stringify({
        name: contentAuthority,
        plugins: [
          {
            name: pluginName,
            source: { source: "local", path: `./${memberPath}` },
            policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
            category: "agent",
          },
        ],
      }),
      ".claude-plugin/marketplace.json": JSON.stringify({
        name: contentAuthority,
        owner: { name: "Habitat Native Fixture" },
        plugins: [
          { name: pluginName, source: `./${memberPath}`, description: manifest.description },
        ],
      }),
      [`${memberPath}/.codex-plugin/plugin.json`]: JSON.stringify(manifest),
      [`${memberPath}/.claude-plugin/plugin.json`]: JSON.stringify(manifest),
      [`${memberPath}/skills/fixture/SKILL.md`]:
        "---\nname: fixture\ndescription: An inert installation fixture.\n---\n\nReturn the fixture marker.",
    };
    for (const [relativePath, contents] of Object.entries(files)) {
      const destination = path.join(workspaceRoot, relativePath);
      signal?.throwIfAborted();
      await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
      signal?.throwIfAborted();
      await writeFile(destination, `${contents}\n`, { mode: 0o644 });
    }
    signal?.throwIfAborted();
    await mkdir(path.join(workspaceRoot, ".habitat"), { mode: 0o700 });
    await git(["init", "--initial-branch=main"]);
    await git(["config", "core.ignorecase", "false"]);
    // Git applies one URL rewrite. The source alias resolves to canonical HTTPS
    // for get-url; native clone of that HTTPS URL resolves separately to local files.
    await git(["config", `url.${repositoryUrl}.insteadOf`, "fixture-origin:"]);
    await git(["remote", "add", "origin", "fixture-origin:"]);
    await git(["add", "--all"]);
    await git(["commit", "-m", "Create inert native agent plugin fixture"]);
    const initialCommit = await git(["rev-parse", "--verify", "HEAD^{commit}"]);
    const initialTree = await git(["rev-parse", "--verify", "HEAD^{tree}"]);
    return Object.freeze({
      root,
      env,
      workspaceRoot,
      repositoryUrl,
      remoteUrl: repositoryUrl,
      expectedRepositoryIdentity: "git:example.invalid/habitat-native-fixture",
      contentAuthority,
      remoteName: "origin",
      refName: "refs/heads/main",
      pluginRoot,
      releaseInputPath: ".habitat/release-input.json",
      initialCommit,
      initialTree,
      marketplaceIdentity: contentAuthority,
      pluginName,
      selector: `${pluginName}@${contentAuthority}`,
      homes,
      disposableRoot,
      disposableHomes,
      packageOutputRoot,
    });
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
