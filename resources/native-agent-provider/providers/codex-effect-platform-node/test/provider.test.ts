import { afterEach, describe, expect, it } from "bun:test";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NodeServices } from "@effect/platform-node";
import { Cause, Effect, Exit, Fiber } from "effect";
import { TestClock } from "effect/testing";

import { codexEffectPlatformNodeProvider } from "../index";

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

describe("codex-effect-platform-node", () => {
  it("maps exact native inventory and mutation commands in the explicit home", async () => {
    const fixture = await makeFixture();
    const localMarketplace = path.join(fixture.root, "local-marketplace");
    await mkdir(localMarketplace);
    await writeProviderJson(fixture.home, "codex-marketplaces.json", {
      marketplaces: [
        {
          name: "local-hq",
          root: path.join(fixture.home, "plugins", "marketplaces", "local-hq"),
          marketplaceSource: {
            sourceType: "local",
            source: localMarketplace,
          },
        },
        {
          name: "rawr-hq",
          root: path.join(fixture.home, "plugins", "marketplaces", "rawr-hq"),
          marketplaceSource: {
            sourceType: "git",
            source: "https://github.com/rawr-ai/rawr-hq.git",
          },
        },
        {
          name: "unknown-hq",
          root: path.join(fixture.home, "plugins", "marketplaces", "unknown-hq"),
        },
      ],
    });
    await writeProviderJson(fixture.home, "codex-plugins.json", {
      installed: [
        {
          pluginId: "cognition@rawr-hq",
          name: "cognition",
          marketplaceName: "rawr-hq",
          version: "1.2.3",
          installed: true,
          enabled: true,
        },
      ],
      available: [],
    });
    const session = await acquire(fixture);

    const probe = await Effect.runPromise(session.probe());
    const inventory = await Effect.runPromise(session.inventory());
    await Effect.runPromise(session.addMarketplace({ kind: "local", root: localMarketplace }));
    await Effect.runPromise(
      session.addMarketplace({
        kind: "git",
        repositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
        revision: "0123456789abcdef",
        sparsePaths: [".codex-plugin", "plugins/agents"],
      })
    );
    await Effect.runPromise(session.removeMarketplace({ identity: "rawr-hq" }));
    await Effect.runPromise(session.installPlugin({ selector: "cognition@rawr-hq" }));
    await Effect.runPromise(session.removePlugin({ selector: "cognition@rawr-hq" }));

    expect(probe).toEqual({
      provider: "codex",
      executablePath: fixture.executablePath,
      home: fixture.home,
      version: "codex-cli 0.144.6",
      capabilities: [
        "marketplace-list",
        "marketplace-add",
        "marketplace-remove",
        "plugin-list",
        "plugin-install",
        "plugin-remove",
      ],
    });
    expect(inventory).toEqual({
      provider: "codex",
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
            revision: null,
          },
          installedRoot: path.join(fixture.home, "plugins", "marketplaces", "rawr-hq"),
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
          root: null,
        },
      ],
    });
    expect(await commandLines(fixture.home)).toEqual([
      "--version",
      "plugin --help",
      "plugin marketplace --help",
      "plugin marketplace list --json",
      "plugin list --json",
      `plugin marketplace add ${localMarketplace} --json`,
      "plugin marketplace add https://github.com/rawr-ai/rawr-hq.git --ref 0123456789abcdef --sparse .codex-plugin --sparse plugins/agents --json",
      "plugin marketplace remove rawr-hq --json",
      "plugin add cognition@rawr-hq --json",
      "plugin remove cognition@rawr-hq --json",
    ]);
    const environments = await lines(path.join(fixture.home, "env.log"));
    expect(new Set(environments)).toEqual(
      new Set([`${fixture.home}|${fixture.home}|${process.env.CLAUDE_CONFIG_DIR ?? ""}|set`])
    );
  });

  it("rejects malformed native JSON instead of exposing a generic value", async () => {
    const fixture = await makeFixture();
    await writeFile(path.join(fixture.home, "codex-marketplaces.json"), "{broken\n");
    const session = await acquire(fixture);

    const invalidJson = await Effect.runPromiseExit(session.inventory());
    expect(failure(invalidJson)).toMatchObject({
      reason: "InvalidJson",
      commandPhase: "command-returned",
    });

    await writeProviderJson(fixture.home, "codex-marketplaces.json", { marketplaces: [{}] });
    const invalidShape = await Effect.runPromiseExit(session.inventory());
    expect(failure(invalidShape)).toMatchObject({
      reason: "ProtocolFailed",
      commandPhase: "command-returned",
    });
  });

  it("reports command phase for spawn, exit, and timeout failures", {
    timeout: 15_000,
  }, async () => {
    const spawnFixture = await makeFixture();
    const spawnSession = await acquire(spawnFixture);
    await rm(spawnFixture.executablePath);
    const spawn = await Effect.runPromiseExit(
      spawnSession.installPlugin({ selector: "cognition@rawr-hq" })
    );
    expect(failure(spawn)).toMatchObject({ reason: "Missing", commandPhase: "not-started" });

    const exitFixture = await makeFixture();
    const exitSession = await acquire(exitFixture);
    const returned = await Effect.runPromiseExit(
      exitSession.installPlugin({ selector: "fail@rawr-hq" })
    );
    expect(failure(returned)).toMatchObject({
      reason: "CommandFailed",
      commandPhase: "command-returned",
    });

    const timeoutFixture = await makeFixture();
    const timedOut = await Effect.runPromise(
      Effect.gen(function* () {
        const session = yield* codexEffectPlatformNodeProvider.acquire({
          executablePath: timeoutFixture.executablePath,
          home: timeoutFixture.home,
        });
        const fiber = yield* session
          .installPlugin({ selector: "hang@rawr-hq" })
          .pipe(Effect.forkChild({ startImmediately: true }));
        yield* waitForCommandStart(timeoutFixture.home, "plugin add hang@rawr-hq --json");
        yield* TestClock.adjust("3 minutes");
        return yield* Fiber.await(fiber);
      }).pipe(Effect.provide(NodeServices.layer), Effect.provide(TestClock.layer()))
    );
    expect(failure(timedOut)).toMatchObject({
      reason: "CommandTimedOut",
      commandPhase: "started",
    });

    const forceKillFixture = await makeFixture();
    const forceKilled = await Effect.runPromise(
      Effect.gen(function* () {
        const session = yield* codexEffectPlatformNodeProvider.acquire({
          executablePath: forceKillFixture.executablePath,
          home: forceKillFixture.home,
        });
        const fiber = yield* session
          .installPlugin({ selector: "ignore-term@rawr-hq" })
          .pipe(Effect.forkChild({ startImmediately: true }));
        yield* waitForCommandStart(forceKillFixture.home, "plugin add ignore-term@rawr-hq --json");
        yield* waitForEvent(forceKillFixture.home, "ready:ignore-term\n");
        yield* TestClock.adjust("186 seconds");
        return yield* Fiber.await(fiber);
      }).pipe(Effect.provide(NodeServices.layer), Effect.provide(TestClock.layer()))
    );
    expect(failure(forceKilled)).toMatchObject({
      reason: "CommandTimedOut",
      commandPhase: "started",
    });
    const forceKillEvents = await lines(path.join(forceKillFixture.home, "events.log"));
    expect(forceKillEvents).toContain("ready:ignore-term");
    expect(forceKillEvents).not.toContain("end:plugin add ignore-term@rawr-hq --json");
  });

  it("refuses the filesystem root as a provider home before native execution", async () => {
    const fixture = await makeFixture();
    const rootHome = path.parse(fixture.home).root;
    const refused = await Effect.runPromiseExit(
      codexEffectPlatformNodeProvider
        .acquire({ executablePath: fixture.executablePath, home: rootHome })
        .pipe(Effect.provide(NodeServices.layer))
    );
    expect(failure(refused)).toMatchObject({
      operation: "acquire",
      reason: "InvalidInput",
      commandPhase: "not-started",
    });
    expect(await Bun.file(path.join(fixture.home, "commands.log")).exists()).toBe(false);
  });

  it("serializes complete session operations within the process", async () => {
    const fixture = await makeFixture();
    const first = await acquire(fixture);
    const second = await acquire(fixture);
    await Effect.runPromise(
      Effect.all([first.inventory(), second.inventory()], { concurrency: "unbounded" })
    );

    const events = await lines(path.join(fixture.home, "events.log"));
    let active = false;
    for (const event of events) {
      if (event.startsWith("start:")) {
        expect(active).toBe(false);
        active = true;
      } else if (event.startsWith("end:")) {
        expect(active).toBe(true);
        active = false;
      }
    }
    expect(active).toBe(false);
    expect(await commandLines(fixture.home)).toEqual([
      "plugin marketplace list --json",
      "plugin list --json",
      "plugin marketplace list --json",
      "plugin list --json",
    ]);
  });

  it("reads one bounded point-addressed file batch with one native inventory pair", async () => {
    const fixture = await makeFixture();
    const pluginRoot = path.join(fixture.home, "plugins", "cache", "rawr-hq", "cognition", "1.2.3");
    await mkdir(path.join(pluginRoot, ".codex-plugin"), { recursive: true });
    await mkdir(path.join(pluginRoot, "skills", "state-machine-design"), { recursive: true });
    await writeFile(
      path.join(pluginRoot, ".codex-plugin", "plugin.json"),
      '{"name":"cognition"}\n'
    );
    await writeFile(
      path.join(pluginRoot, "skills", "state-machine-design", "SKILL.md"),
      "state machine\n"
    );
    await writeProviderJson(fixture.home, "codex-plugins.json", {
      installed: [
        {
          pluginId: "cognition@rawr-hq",
          name: "cognition",
          marketplaceName: "rawr-hq",
          version: "1.2.3",
          installed: true,
          enabled: true,
        },
      ],
    });
    const session = await acquire(fixture);
    const batch = await Effect.runPromise(
      session.readPluginFiles({
        selector: "cognition@rawr-hq",
        files: [
          { relativePath: ".codex-plugin/plugin.json", maxBytes: 128 },
          { relativePath: "missing.md", maxBytes: 128 },
          { relativePath: "skills/state-machine-design/SKILL.md", maxBytes: 128 },
        ],
      })
    );
    expect(batch.files[1]).toEqual({ kind: "Missing", relativePath: "missing.md" });
    const skill = batch.files[2];
    expect(skill?.kind).toBe("Read");
    if (skill?.kind !== "Read") throw new Error("Expected the skill file observation");
    expect(Buffer.from(skill.contentBase64, "base64").toString("utf8")).toBe("state machine\n");
    expect(await commandLines(fixture.home)).toEqual([
      "plugin marketplace list --json",
      "plugin list --json",
    ]);

    const escaped = await Effect.runPromiseExit(
      session.readPluginFiles({
        selector: "cognition@rawr-hq",
        files: [{ relativePath: "../settings.json", maxBytes: 128 }],
      })
    );
    expect(failure(escaped)).toMatchObject({ reason: "InvalidInput", commandPhase: "not-started" });
    expect(await commandLines(fixture.home)).toEqual([
      "plugin marketplace list --json",
      "plugin list --json",
    ]);

    const aliasTarget = path.join(fixture.root, "aliased-skill.md");
    await writeFile(aliasTarget, "alias\n");
    await symlink(aliasTarget, path.join(pluginRoot, "alias.md"));
    const aliased = await Effect.runPromiseExit(
      session.readPluginFiles({
        selector: "cognition@rawr-hq",
        files: [{ relativePath: "alias.md", maxBytes: 128 }],
      })
    );
    expect(failure(aliased)).toMatchObject({ reason: "Aliased", commandPhase: "not-started" });
  });

  it("exposes no config or app-server mechanics", async () => {
    const session = await acquire(await makeFixture());
    expect(Object.keys(session).sort()).toEqual([
      "addMarketplace",
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
  const executablePath = path.join(root, "fake-codex");
  await mkdir(home);
  await writeFile(executablePath, fakeCodexScript(), { mode: 0o755 });
  await chmod(executablePath, 0o755);
  return Object.freeze({ root, executablePath, home });
}

async function acquire(fixture: Readonly<{ executablePath: string; home: string }>) {
  return Effect.runPromise(
    codexEffectPlatformNodeProvider
      .acquire({ executablePath: fixture.executablePath, home: fixture.home })
      .pipe(Effect.provide(NodeServices.layer))
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
  if (!Exit.isFailure(exit)) return undefined;
  const failed = exit.cause.reasons.find(Cause.isFailReason);
  const value = failed?.error;
  return typeof value === "object" && value !== null ? value : undefined;
}

function waitForCommandStart(home: string, command: string): Effect.Effect<void> {
  return waitForEvent(home, `start:${command}\n`);
}

function waitForEvent(home: string, expected: string): Effect.Effect<void> {
  return Effect.callback<void>((resume) => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const eventsPath = path.join(home, "events.log");

    const poll = () => {
      void readFile(eventsPath, "utf8").then(
        (events) => {
          if (!active) return;
          if (events.includes(expected)) {
            active = false;
            resume(Effect.void);
            return;
          }
          timer = setTimeout(poll, 5);
        },
        () => {
          if (active) timer = setTimeout(poll, 5);
        }
      );
    };

    poll();
    return Effect.sync(() => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
    });
  });
}

function fakeCodexScript(): string {
  return `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$HOME/commands.log"
printf '%s|%s|%s|%s\\n' "$HOME" "$CODEX_HOME" "\${CLAUDE_CONFIG_DIR:-}" "\${PATH:+set}" >> "$HOME/env.log"
printf 'start:%s\\n' "$*" >> "$HOME/events.log"
sleep 0.02
case "$*" in
  "--version") printf '%s\\n' 'codex-cli 0.144.6' ;;
  "plugin --help") printf 'Commands:\\n  list  list plugins\\n  add  add plugin\\n  remove  remove plugin\\n' ;;
  "plugin marketplace --help") printf 'Commands:\\n  list  list markets\\n  add  add market\\n  remove  remove market\\n' ;;
  "plugin marketplace list --json")
    if [ -f "$HOME/codex-marketplaces.json" ]; then cat "$HOME/codex-marketplaces.json"; else printf '%s\\n' '{"marketplaces":[]}'; fi ;;
  "plugin list --json")
    if [ -f "$HOME/codex-plugins.json" ]; then cat "$HOME/codex-plugins.json"; else printf '%s\\n' '{"installed":[],"available":[]}'; fi ;;
  "plugin add fail@rawr-hq --json") printf '%s\\n' 'failed' >&2; exit 9 ;;
  "plugin add hang@rawr-hq --json") sleep 999 ;;
  "plugin add ignore-term@rawr-hq --json")
    trap 'printf "%s\\n" "received:SIGTERM" >> "$HOME/events.log"' TERM
    printf "%s\\n" "ready:ignore-term" >> "$HOME/events.log"
    while :; do sleep 1; done ;;
  "plugin marketplace add "*|"plugin marketplace remove "*|"plugin add "*|"plugin remove "*) printf '%s\\n' '{}' ;;
  *) printf 'unexpected command: %s\\n' "$*" >&2; exit 64 ;;
esac
printf 'end:%s\\n' "$*" >> "$HOME/events.log"
`;
}
