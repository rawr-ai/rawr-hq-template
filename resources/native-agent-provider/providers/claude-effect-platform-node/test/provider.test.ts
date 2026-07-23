import { afterEach, describe, expect, it } from "bun:test";
import { chmod, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NodeContext } from "@effect/platform-node";
import { Effect, Exit } from "effect";

import { claudeEffectPlatformNodeProvider } from "../index";

const roots: string[] = [];

afterEach(async () => {
  const canonicalTemp = await realpath(tmpdir());
  for (const root of roots.splice(0)) {
    const status = await lstat(root);
    if (
      path.dirname(root) !== canonicalTemp ||
      !path.basename(root).startsWith("rawr-native-provider-test-") ||
      !status.isDirectory() ||
      status.isSymbolicLink() ||
      (await realpath(root)) !== root
    ) {
      throw new Error(`Refusing to remove unexpected test root: ${root}`);
    }
    await rm(root, { recursive: true, force: true });
  }
});

describe("claude-effect-platform-node", () => {
  it("maps exact scoped native commands and normalized inventory", async () => {
    const fixture = await makeFixture();
    const localMarketplace = path.join(fixture.root, "local-marketplace");
    const nativeMarketplace = path.join(fixture.home, "plugins", "marketplaces", "rawr-hq");
    const pluginRoot = path.join(fixture.home, "plugins", "cache", "rawr-hq", "cognition", "1.2.3");
    await mkdir(localMarketplace);
    await writeProviderJson(fixture.home, "claude-marketplaces.json", [
      {
        name: "local-hq",
        source: "directory",
        path: localMarketplace,
        installLocation: path.join(fixture.home, "plugins", "marketplaces", "local-hq"),
      },
      {
        name: "rawr-hq",
        source: "git",
        url: "https://github.com/rawr-ai/rawr-hq.git",
        installLocation: nativeMarketplace,
        ref: "v2026.2.8",
      },
      {
        name: "unknown-hq",
        installLocation: path.join(fixture.home, "plugins", "marketplaces", "unknown-hq"),
      },
    ]);
    await writeProviderJson(fixture.home, "claude-plugins.json", [
      {
        id: "cognition@rawr-hq",
        version: "1.2.3",
        enabled: true,
        installPath: pluginRoot,
      },
    ]);
    const session = await acquire(fixture);

    const probe = await Effect.runPromise(session.probe());
    const inventory = await Effect.runPromise(session.inventory());
    await Effect.runPromise(session.addMarketplace({ kind: "local", root: localMarketplace }));
    await Effect.runPromise(
      session.addMarketplace({
        kind: "git",
        repositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
        revision: "v2026.2.8",
        sparsePaths: ["plugins/agents", ".claude-plugin"],
      })
    );
    await Effect.runPromise(session.removeMarketplace({ identity: "rawr-hq" }));
    await Effect.runPromise(session.installPlugin({ selector: "cognition@rawr-hq" }));
    await Effect.runPromise(session.enablePlugin({ selector: "cognition@rawr-hq" }));
    await Effect.runPromise(session.removePlugin({ selector: "cognition@rawr-hq" }));

    expect(probe).toEqual({
      provider: "claude",
      executablePath: fixture.executablePath,
      home: fixture.home,
      version: "2.1.215 (Claude Code)",
      capabilities: [
        "marketplace-list",
        "marketplace-add",
        "marketplace-remove",
        "marketplace-update",
        "plugin-list",
        "plugin-install",
        "plugin-enable",
        "plugin-disable",
        "plugin-remove",
        "plugin-update",
      ],
    });
    expect(inventory).toEqual({
      provider: "claude",
      marketplaces: [
        {
          identity: "local-hq",
          source: {
            kind: "local",
            root: localMarketplace,
          },
          installedRoot: path.join(fixture.home, "plugins", "marketplaces", "local-hq"),
        },
        {
          identity: "rawr-hq",
          source: {
            kind: "git",
            repositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
            revision: "v2026.2.8",
          },
          installedRoot: nativeMarketplace,
        },
        {
          identity: "unknown-hq",
          source: null,
          installedRoot: path.join(fixture.home, "plugins", "marketplaces", "unknown-hq"),
        },
      ],
      plugins: [
        {
          selector: "cognition@rawr-hq",
          marketplaceIdentity: "rawr-hq",
          name: "cognition",
          installed: true,
          enabled: true,
          version: "1.2.3",
          root: pluginRoot,
        },
      ],
    });
    expect(await commandLines(fixture.home)).toEqual([
      "--version",
      "plugin --help",
      "plugin marketplace --help",
      "plugin marketplace list --json",
      "plugin list --json",
      `plugin marketplace add ${localMarketplace} --scope user`,
      "plugin marketplace add https://github.com/rawr-ai/rawr-hq.git#v2026.2.8 --scope user --sparse .claude-plugin plugins/agents",
      "plugin marketplace remove rawr-hq --scope user",
      "plugin install cognition@rawr-hq --scope user",
      "plugin enable cognition@rawr-hq --scope user",
      "plugin uninstall cognition@rawr-hq --scope user",
    ]);
    const environments = await lines(path.join(fixture.home, "env.log"));
    expect(new Set(environments)).toEqual(
      new Set([`${fixture.home}|${process.env.CODEX_HOME ?? ""}|${fixture.home}|set`])
    );
  });

  it("rejects malformed and contradictory native inventory", async () => {
    const fixture = await makeFixture();
    const session = await acquire(fixture);
    await writeProviderJson(fixture.home, "claude-marketplaces.json", {});
    const invalidShape = await Effect.runPromiseExit(session.inventory());
    expect(failure(invalidShape)).toMatchObject({
      reason: "ProtocolFailed",
      commandPhase: "command-returned",
    });

    await writeProviderJson(fixture.home, "claude-marketplaces.json", []);
    await writeProviderJson(fixture.home, "claude-plugins.json", [
      { id: "not-a-selector", enabled: true },
    ]);
    const invalidSelector = await Effect.runPromiseExit(session.inventory());
    expect(failure(invalidSelector)).toMatchObject({
      reason: "ProtocolFailed",
      commandPhase: "command-returned",
    });
  });

  it("maps native Claude command failures to ordinary execution phases", async () => {
    const fixture = await makeFixture();
    const session = await acquire(fixture);
    const returned = await Effect.runPromiseExit(
      session.enablePlugin({ selector: "fail@rawr-hq" })
    );
    expect(failure(returned)).toMatchObject({
      reason: "CommandFailed",
      commandPhase: "command-returned",
    });

    await rm(fixture.executablePath);
    const notStarted = await Effect.runPromiseExit(
      session.removePlugin({ selector: "cognition@rawr-hq" })
    );
    expect(failure(notStarted)).toMatchObject({ reason: "Missing", commandPhase: "not-started" });
  });

  it("reads only one selected bounded native package batch per inventory pair", async () => {
    const fixture = await makeFixture();
    const pluginRoot = path.join(fixture.home, "plugins", "cache", "rawr-hq", "cognition", "1.2.3");
    await mkdir(path.join(pluginRoot, ".claude-plugin"), { recursive: true });
    await mkdir(path.join(pluginRoot, "skills", "state-machine-design", "references"), {
      recursive: true,
    });
    await writeFile(
      path.join(pluginRoot, ".claude-plugin", "plugin.json"),
      '{"name":"cognition"}\n'
    );
    await writeFile(
      path.join(pluginRoot, "skills", "state-machine-design", "references", "guide.md"),
      "state machine guide\n"
    );
    await writeProviderJson(fixture.home, "claude-plugins.json", [
      {
        id: "cognition@rawr-hq",
        version: "1.2.3",
        enabled: true,
        installPath: pluginRoot,
      },
    ]);
    const session = await acquire(fixture);
    const batch = await Effect.runPromise(
      session.readPluginFiles({
        selector: "cognition@rawr-hq",
        files: [
          { relativePath: ".claude-plugin/plugin.json", maxBytes: 128 },
          {
            relativePath: "skills/state-machine-design/references/guide.md",
            maxBytes: 128,
          },
        ],
      })
    );
    const guide = batch.files[1];
    expect(guide?.kind).toBe("Read");
    if (guide?.kind !== "Read") throw new Error("Expected the selected guide observation");
    expect(Buffer.from(guide.contentBase64, "base64").toString("utf8")).toBe(
      "state machine guide\n"
    );
    expect(await commandLines(fixture.home)).toEqual([
      "plugin marketplace list --json",
      "plugin list --json",
    ]);

    const bounded = await Effect.runPromise(
      session.readPluginFiles({
        selector: "cognition@rawr-hq",
        files: [
          {
            relativePath: "skills/state-machine-design/references/guide.md",
            maxBytes: 1,
          },
        ],
      })
    );
    expect(bounded.files).toEqual([
      { kind: "TooLarge", relativePath: "skills/state-machine-design/references/guide.md" },
    ]);
  });

  it("exposes enablement but no disable, update, config, or generic execution API", async () => {
    const session = await acquire(await makeFixture());
    expect(Object.keys(session).sort()).toEqual([
      "addMarketplace",
      "enablePlugin",
      "executablePath",
      "home",
      "installPlugin",
      "inventory",
      "probe",
      "provider",
      "readPluginFiles",
      "removeMarketplace",
      "removePlugin",
    ]);
  });
});

async function makeFixture(): Promise<
  Readonly<{ root: string; executablePath: string; home: string }>
> {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-native-provider-test-")));
  roots.push(root);
  const home = path.join(root, "home");
  const executablePath = path.join(root, "fake-claude");
  await mkdir(home);
  await writeFile(executablePath, fakeClaudeScript(), { mode: 0o755 });
  await chmod(executablePath, 0o755);
  return Object.freeze({ root, executablePath, home });
}

async function acquire(fixture: Readonly<{ executablePath: string; home: string }>) {
  return Effect.runPromise(
    claudeEffectPlatformNodeProvider
      .acquire({ executablePath: fixture.executablePath, home: fixture.home })
      .pipe(Effect.provide(NodeContext.layer))
  );
}

async function writeProviderJson(home: string, name: string, value: unknown): Promise<void> {
  await writeFile(path.join(home, name), `${JSON.stringify(value)}\n`);
}

async function lines(file: string): Promise<readonly string[]> {
  const text = await readFile(file, "utf8");
  return text.trim() === "" ? [] : text.trim().split("\n");
}

async function commandLines(home: string): Promise<readonly string[]> {
  return lines(path.join(home, "commands.log"));
}

function failure<A>(exit: Exit.Exit<A, unknown>): Readonly<Record<string, unknown>> | undefined {
  if (!Exit.isFailure(exit) || exit.cause._tag !== "Fail") return undefined;
  const value = exit.cause.error;
  return typeof value === "object" && value !== null ? value : undefined;
}

function fakeClaudeScript(): string {
  return `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$HOME/commands.log"
printf '%s|%s|%s|%s\\n' "$HOME" "\${CODEX_HOME:-}" "$CLAUDE_CONFIG_DIR" "\${PATH:+set}" >> "$HOME/env.log"
case "$*" in
  "--version") printf '%s\\n' '2.1.215 (Claude Code)' ;;
  "plugin --help") printf 'Commands:\\n  list  list plugins\\n  install  install plugin\\n  enable  enable plugin\\n  disable  disable plugin\\n  uninstall  uninstall plugin\\n  update  update plugin\\n' ;;
  "plugin marketplace --help") printf 'Commands:\\n  list  list markets\\n  add  add market\\n  remove  remove market\\n  update  update market\\n' ;;
  "plugin marketplace list --json")
    if [ -f "$HOME/claude-marketplaces.json" ]; then cat "$HOME/claude-marketplaces.json"; else printf '%s\\n' '[]'; fi ;;
  "plugin list --json")
    if [ -f "$HOME/claude-plugins.json" ]; then cat "$HOME/claude-plugins.json"; else printf '%s\\n' '[]'; fi ;;
  "plugin enable fail@rawr-hq --scope user") printf '%s\\n' 'failed' >&2; exit 7 ;;
  "plugin marketplace add "*|"plugin marketplace remove "*|"plugin install "*|"plugin enable "*|"plugin uninstall "*) printf '%s\\n' '{}' ;;
  *) printf 'unexpected command: %s\\n' "$*" >&2; exit 64 ;;
esac
`;
}
