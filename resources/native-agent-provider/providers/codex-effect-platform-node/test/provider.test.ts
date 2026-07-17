import { afterEach, describe, expect, it } from "bun:test";
import { chmod, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NodeContext } from "@effect/platform-node";
import { Effect, Exit } from "effect";

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

  it("uses exact app-server operations and reads a bounded package cache", async () => {
    const fixture = await makeFixture();
    const packageRoot = path.join(fixture.home, "plugins", "cache", "demo");
    await mkdir(path.join(packageRoot, "skills", "sample"), { recursive: true });
    await writeFile(path.join(packageRoot, "skills", "sample", "SKILL.md"), "sample\n", { mode: 0o644 });

    const session = await Effect.runPromise(
      codexEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer)),
    );
    const observed = await Effect.runPromise(session.inspectAppServer());
    expect(observed.plugins).toEqual({ marketplaces: [] });
    expect(observed.hooks).toEqual({ hooks: [] });
    expect(await Effect.runPromise(session.readConfiguration())).toEqual({ config: true });
    await Effect.runPromise(session.setPluginEnabled({ selector: "demo@rawr-hq", enabled: false }));
    await Effect.runPromise(session.setMarketplaceSource({ identity: "rawr-hq", sourcePath: packageRoot }));

    const packageObservation = await Effect.runPromise(session.readPackage({
      root: packageRoot,
      maxEntries: 4,
      maxBytes: 1024,
    }));
    expect(packageObservation.entries.map((entry) => entry.path)).toEqual(["skills/sample/SKILL.md"]);
    expect(new TextDecoder().decode(packageObservation.entries[0]?.bytes)).toBe("sample\n");
  });

  it("fails closed before executing a noncanonical selector", async () => {
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
  });
});

async function makeFixture(): Promise<Readonly<{ executablePath: string; home: string }>> {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-native-provider-test-")));
  roots.push(root);
  const home = path.join(root, "home");
  const executablePath = path.join(root, "fake-codex");
  await mkdir(home);
  await writeFile(executablePath, fakeCodexScript(), { mode: 0o755 });
  await chmod(executablePath, 0o755);
  return Object.freeze({ executablePath, home });
}

function fakeCodexScript(): string {
  return `#!/bin/sh
set -eu
printf 'start:%s\\n' "$*" >> "$HOME/events.log"
sleep 0.02
if [ "$1" = "app-server" ]; then
  while IFS= read -r line; do
    case "$line" in
      *'"id":1'*) printf '%s\\n' '{"id":1,"result":{}}' ;;
      *'"method":"plugin/list"'*) printf '%s\\n' '{"id":2,"result":{"marketplaces":[]}}' ;;
      *'"method":"hooks/list"'*) printf '%s\\n' '{"id":3,"result":{"hooks":[]}}' ;;
      *'"method":"config/read"'*) printf '%s\\n' '{"id":2,"result":{"config":true}}' ;;
      *'"method":"config/value/write"'*) printf '%s\\n' '{"id":2,"result":null}' ;;
    esac
  done
elif [ "$*" = "plugin --help" ]; then
  printf 'Commands:\\n  list  list plugins\\n  add  add plugin\\n  remove  remove plugin\\n'
elif [ "$*" = "plugin marketplace --help" ]; then
  printf 'Commands:\\n  list  list markets\\n  add  add market\\n  remove  remove market\\n'
elif [ "$*" = "plugin list --available --json" ]; then
  printf '%s\\n' '{"installed":[],"available":[]}'
elif [ "$*" = "plugin marketplace list --json" ]; then
  printf '%s\\n' '{"marketplaces":[]}'
else
  printf '%s\\n' '{}'
fi
printf 'end:%s\\n' "$*" >> "$HOME/events.log"
`;
}
