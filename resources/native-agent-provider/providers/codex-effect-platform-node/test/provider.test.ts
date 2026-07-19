import { afterEach, describe, expect, it } from "bun:test";
import { chmod, lstat, mkdir, mkdtemp, readFile, realpath, rm, rmdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NodeContext } from "@effect/platform-node";
import { Effect, Exit } from "effect";

import type { ArtifactObjectAddress, ArtifactTreeLocation } from "@rawr/resource-agent-plugin-artifact-repository";
import {
  makeArtifactRepositoryResource,
  runNodeArtifactRepository,
} from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import { codexEffectPlatformNodeProvider } from "../index";

const roots: string[] = [];

afterEach(async () => {
  const canonicalTemp = await realpath(tmpdir());
  for (const root of roots.splice(0)) {
    const status = await lstat(root);
    if (
      path.dirname(root) !== canonicalTemp
      || !path.basename(root).startsWith("rawr-native-provider-test-")
      || !status.isDirectory()
      || status.isSymbolicLink()
      || await realpath(root) !== root
    ) {
      throw new Error(`Refusing to remove unexpected test root: ${root}`);
    }
    await rm(root, { recursive: true, force: true });
  }
});

describe("codex-effect-platform-node", () => {
  it("acquires explicit canonical authority and serializes fresh-home commands", async () => {
    const fixture = await makeFixture();
    const session = await Effect.runPromise(
      codexEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer)),
    );

    const probe = await Effect.runPromise(session.probe());
    expect(probe.provider).toBe("codex");
    expect(probe.pluginCommands).toEqual(["add", "list", "remove"]);
    expect(probe.marketplaceCommands).toEqual(["add", "list", "remove"]);
    expect(probe.appServerMethods).toContain("plugin/list");

    await Effect.runPromise(Effect.all([
      session.listPlugins(),
      session.listMarketplaces(),
    ], { concurrency: "unbounded" }));
    const events = (await readFile(path.join(fixture.home, "events.log"), "utf8"))
      .trim()
      .split("\n");
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
  });

  it("uses exact app-server operations and reads provider-selected marketplace and plugin packages", async () => {
    const fixture = await makeFixture();
    const marketplace = await publishMarketplace(fixture.root, "codex-marketplace");
    const pluginRoot = path.join(fixture.home, "plugins", "cache", "rawr-hq", "demo", "1.0.0");
    const ignoredNativeSource = path.join(fixture.root, "unadmitted-source");
    await mkdir(path.join(pluginRoot, "skills", "sample"), { recursive: true });
    await mkdir(ignoredNativeSource);
    await writeFile(path.join(fixture.home, "expected-marketplace-source"), `${marketplace}\n`);
    await writeFile(path.join(pluginRoot, "skills", "sample", "SKILL.md"), "sample\n", { mode: 0o644 });
    await writeProviderJson(fixture.home, "codex-marketplaces.json", {
      marketplaces: [{ name: "rawr-hq", root: marketplace }],
    });
    await writeProviderJson(fixture.home, "codex-plugins.json", {
      installed: [{
        pluginId: "demo@rawr-hq",
        name: "demo",
        marketplaceName: "rawr-hq",
        version: "1.0.0",
        installed: true,
        enabled: true,
        source: { source: "local", path: ignoredNativeSource },
      }],
      available: [],
    });

    const session = await Effect.runPromise(
      codexEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer)),
    );
    const observed = await Effect.runPromise(session.inspectAppServer());
    expect(observed.plugins).toEqual({ marketplaces: [] });
    expect(observed.hooks).toEqual({ hooks: [] });
    expect(await Effect.runPromise(session.readConfiguration())).toEqual({ config: true });
    await Effect.runPromise(session.setPluginEnabled({ selector: "demo@rawr-hq", enabled: false }));
    await Effect.runPromise(session.setMarketplaceSource({ identity: "rawr-hq", source: marketplace }));
    await Effect.runPromise(session.addMarketplace(marketplace));
    await Effect.runPromise(session.removeMarketplace({ identity: "rawr-hq" }));
    await Effect.runPromise(session.addPlugin({ selector: "demo@rawr-hq" }));
    await Effect.runPromise(session.removePlugin({ selector: "demo@rawr-hq" }));

    const marketplaceObservation = await Effect.runPromise(session.readMarketplace({
      identity: "rawr-hq",
      maxEntries: 4,
      maxBytes: 1024,
    }));
    expect(marketplaceObservation.entries.map((entry) => entry.path)).toEqual(["marketplace.json"]);

    const pluginObservation = await Effect.runPromise(session.readPlugin({
      selector: "demo@rawr-hq",
      maxEntries: 4,
      maxBytes: 1024,
    }));
    expect(pluginObservation.entries.map((entry) => entry.path)).toEqual(["skills/sample/SKILL.md"]);
    expect(new TextDecoder().decode(pluginObservation.entries[0]?.bytes)).toBe("sample\n");
    expect(await readLines(path.join(fixture.home, "commands.log"))).toEqual([
      "app-server --listen stdio://",
      "app-server --listen stdio://",
      "app-server --listen stdio://",
      "app-server --listen stdio://",
      `plugin marketplace add ${marketplace} --json`,
      "plugin marketplace remove rawr-hq --json",
      "plugin add demo@rawr-hq --json",
      "plugin remove demo@rawr-hq --json",
      "plugin marketplace list --json",
      "plugin list --json",
    ]);
    expect(await readLines(path.join(fixture.home, "app-server-input.log"))).toEqual([
      ...appServerSessionLines([
        Object.freeze({
          method: "plugin/list",
          params: Object.freeze({ cwds: Object.freeze([]), marketplaceKinds: Object.freeze(["local"]) }),
        }),
        Object.freeze({
          method: "hooks/list",
          params: Object.freeze({ cwds: Object.freeze([fixture.home]) }),
        }),
      ]),
      ...appServerSessionLines([Object.freeze({
        method: "config/read",
        params: Object.freeze({ cwd: fixture.home, includeLayers: true }),
      })]),
      ...appServerSessionLines([Object.freeze({
        method: "config/value/write",
        params: Object.freeze({
          keyPath: "plugins.demo@rawr-hq.enabled",
          value: false,
          mergeStrategy: "upsert",
        }),
      })]),
      ...appServerSessionLines([Object.freeze({
        method: "config/value/write",
        params: Object.freeze({
          keyPath: "marketplaces.rawr-hq.source",
          value: marketplace,
          mergeStrategy: "upsert",
        }),
      })]),
    ]);
  });

  it("rejects missing, duplicate, and aliased provider-selected roots", async () => {
    const fixture = await makeFixture();
    const marketplace = await publishMarketplace(fixture.root, "codex-ambiguous");
    const alias = path.join(fixture.root, "marketplace-alias");
    await symlink(marketplace, alias, "dir");
    const session = await Effect.runPromise(
      codexEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer)),
    );

    const missing = await Effect.runPromiseExit(session.readPlugin({
      selector: "missing@rawr-hq",
      maxEntries: 4,
      maxBytes: 1024,
    }));
    expect(failureReason(missing)).toBe("Missing");

    await writeProviderJson(fixture.home, "codex-marketplaces.json", {
      marketplaces: [
        { name: "rawr-hq", root: marketplace },
        { name: "rawr-hq", root: marketplace },
      ],
    });
    const duplicate = await Effect.runPromiseExit(session.readMarketplace({
      identity: "rawr-hq",
      maxEntries: 4,
      maxBytes: 1024,
    }));
    expect(failureReason(duplicate)).toBe("ProtocolFailed");

    await writeProviderJson(fixture.home, "codex-marketplaces.json", {
      marketplaces: [{ name: "rawr-hq", root: alias }],
    });
    const aliased = await Effect.runPromiseExit(session.readMarketplace({
      identity: "rawr-hq",
      maxEntries: 4,
      maxBytes: 1024,
    }));
    expect(failureReason(aliased)).toBe("Aliased");
  });

  it("fails closed before executing a noncanonical selector or marketplace identity", async () => {
    const fixture = await makeFixture();
    const session = await Effect.runPromise(
      codexEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer)),
    );
    const exit = await Effect.runPromiseExit(session.addPlugin({ selector: "../../wrong" }));
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failure = exit.cause._tag === "Fail" ? exit.cause.error : undefined;
      expect(failure?._tag).toBe("NativeAgentProviderFailure");
      expect(failure?.reason).toBe("InvalidInput");
    }
    const invalidIdentity = await Effect.runPromiseExit(session.removeMarketplace({ identity: "../../wrong" }));
    expect(failureReason(invalidIdentity)).toBe("InvalidInput");
    expect(await Bun.file(path.join(fixture.home, "commands.log")).exists()).toBe(false);
  });

  it("refuses missing or occupied homes before starting a native command", async () => {
    const fixture = await makeFixture();
    const missing = await Effect.runPromiseExit(
      codexEffectPlatformNodeProvider.acquire({
        ...fixture,
        home: path.join(fixture.root, "missing-home"),
      }).pipe(Effect.provide(NodeContext.layer)),
    );
    expect(failureReason(missing)).toBe("Missing");

    await mkdir(path.join(fixture.home, ".rawr-agent-plugin-owner.json"));
    const occupied = await Effect.runPromiseExit(
      codexEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer)),
    );
    expect(failureReason(occupied)).toBe("OwnershipConflict");
    expect(await Bun.file(path.join(fixture.home, "commands.log")).exists()).toBe(false);
  });

  it("rechecks the ownership slot before starting the Codex app server", async () => {
    const fixture = await makeFixture();
    const session = await Effect.runPromise(
      codexEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer)),
    );
    await writeFile(path.join(fixture.home, ".rawr-agent-plugin-owner.json"), "occupied\n");

    const exit = await Effect.runPromiseExit(session.inspectAppServer());

    expect(failureReason(exit)).toBe("OwnershipConflict");
    expect(await Bun.file(path.join(fixture.home, "commands.log")).exists()).toBe(false);
  });

  it("treats a dangling ownership-slot symlink as occupied", async () => {
    const fixture = await makeFixture();
    await symlink(
      path.join(fixture.root, "missing-owner-marker-target"),
      path.join(fixture.home, ".rawr-agent-plugin-owner.json"),
    );

    const exit = await Effect.runPromiseExit(
      codexEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer)),
    );

    expect(failureReason(exit)).toBe("OwnershipConflict");
    expect(await Bun.file(path.join(fixture.home, "commands.log")).exists()).toBe(false);
  });

  it("revalidates the explicit home before command and app-server processes", async () => {
    const fixture = await makeFixture();
    const session = await Effect.runPromise(
      codexEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer)),
    );
    await rmdir(fixture.home);

    const command = await Effect.runPromiseExit(session.listPlugins());
    const appServer = await Effect.runPromiseExit(session.inspectAppServer());

    expect(failureReason(command)).toBe("Missing");
    expect(failureReason(appServer)).toBe("Missing");
    expect(await Bun.file(path.join(fixture.home, "commands.log")).exists()).toBe(false);
  });
});

async function makeFixture(): Promise<Readonly<{ root: string; executablePath: string; home: string }>> {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-native-provider-test-")));
  roots.push(root);
  const home = path.join(root, "home");
  const executablePath = path.join(root, "fake-codex");
  await mkdir(home);
  await writeFile(executablePath, fakeCodexScript(), { mode: 0o755 });
  await chmod(executablePath, 0o755);
  return Object.freeze({ root, executablePath, home });
}

async function publishMarketplace(root: string, objectId: string): Promise<ArtifactTreeLocation> {
  const address: ArtifactObjectAddress = Object.freeze({
    repositoryRoot: path.join(root, "artifacts"),
    namespace: Object.freeze(["marketplaces"]),
    objectId,
  });
  const resource = makeArtifactRepositoryResource();
  const published = await runNodeArtifactRepository(resource.publishTree({
    address,
    entries: Object.freeze([Object.freeze({
      path: "marketplace.json",
      mode: 0o444,
      bytes: new TextEncoder().encode('{"identity":"rawr-hq"}\n'),
    })]),
    limits: Object.freeze({ maxEntries: 4, maxBytes: 1024 }),
  }));
  if (!published.ok || published.value.kind === "Rejected" || published.value.kind === "Unsettled") {
    throw new Error("Failed to publish marketplace fixture");
  }
  const located = await runNodeArtifactRepository(resource.locateTree({
    address,
    limits: Object.freeze({ maxEntries: 4, maxBytes: 1024 }),
  }));
  if (!located.ok || located.value.kind !== "Present") {
    throw new Error("Failed to locate marketplace fixture");
  }
  return located.value.location;
}

async function writeProviderJson(home: string, name: string, value: unknown): Promise<void> {
  await writeFile(path.join(home, name), `${JSON.stringify(value)}\n`);
}

async function readLines(file: string): Promise<readonly string[]> {
  const contents = await readFile(file, "utf8");
  return Object.freeze(contents.trim().split("\n"));
}

function appServerSessionLines(
  requests: readonly Readonly<{ method: string; params: unknown }>[],
): readonly string[] {
  return Object.freeze([
    JSON.stringify({
      id: 1,
      method: "initialize",
      params: {
        clientInfo: { name: "rawr-native-agent-provider-resource", version: "1.0.0" },
        capabilities: { experimentalApi: true },
      },
    }),
    JSON.stringify({ method: "initialized", params: {} }),
    ...requests.map((request, index) => JSON.stringify({
      id: index + 2,
      method: request.method,
      params: request.params,
    })),
  ]);
}

function failureReason<A>(exit: Exit.Exit<A, unknown>): string | undefined {
  if (!Exit.isFailure(exit) || exit.cause._tag !== "Fail") return undefined;
  const failure = exit.cause.error;
  if (typeof failure !== "object" || failure === null || !("reason" in failure)) return undefined;
  return typeof failure.reason === "string" ? failure.reason : undefined;
}

function fakeCodexScript(): string {
  return `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$HOME/commands.log"
printf 'start:%s\\n' "$*" >> "$HOME/events.log"
sleep 0.02
if [ "$*" = "app-server --listen stdio://" ]; then
  while IFS= read -r line; do
    printf '%s\\n' "$line" >> "$HOME/app-server-input.log"
    case "$line" in
      *'"id":1,"method":"initialize"'*) printf '%s\\n' '{"id":1,"result":{}}' ;;
      '{"method":"initialized","params":{}}') ;;
      *'"method":"plugin/list"'*) printf '%s\\n' '{"id":2,"result":{"marketplaces":[]}}' ;;
      *'"method":"hooks/list"'*) printf '%s\\n' '{"id":3,"result":{"hooks":[]}}' ;;
      *'"method":"config/read"'*) printf '%s\\n' '{"id":2,"result":{"config":true}}' ;;
      *'"method":"config/value/write"'*) printf '%s\\n' '{"id":2,"result":null}' ;;
      *) printf 'unexpected app-server input: %s\\n' "$line" >&2; exit 65 ;;
    esac
  done
elif [ "$*" = "plugin --help" ]; then
  printf 'Commands:\\n  list  list plugins\\n  add  add plugin\\n  remove  remove plugin\\n'
elif [ "$*" = "plugin marketplace --help" ]; then
  printf 'Commands:\\n  list  list markets\\n  add  add market\\n  remove  remove market\\n'
elif [ "$*" = "plugin list --json" ]; then
  if [ -f "$HOME/codex-plugins.json" ]; then cat "$HOME/codex-plugins.json"; else printf '%s\\n' '{"installed":[],"available":[]}'; fi
elif [ "$*" = "plugin marketplace list --json" ]; then
  if [ -f "$HOME/codex-marketplaces.json" ]; then cat "$HOME/codex-marketplaces.json"; else printf '%s\\n' '{"marketplaces":[]}'; fi
elif [ "$#" -eq 5 ] && [ "$1" = "plugin" ] && [ "$2" = "marketplace" ] && [ "$3" = "add" ] && [ "$4" = "$(cat "$HOME/expected-marketplace-source")" ] && [ "$5" = "--json" ]; then
  printf '%s\\n' '{}'
elif [ "$*" = "plugin marketplace remove rawr-hq --json" ]; then
  printf '%s\\n' '{}'
elif [ "$*" = "plugin add demo@rawr-hq --json" ]; then
  printf '%s\\n' '{}'
elif [ "$*" = "plugin remove demo@rawr-hq --json" ]; then
  printf '%s\\n' '{}'
else
  printf 'unexpected command: %s\\n' "$*" >&2
  exit 64
fi
printf 'end:%s\\n' "$*" >> "$HOME/events.log"
`;
}
