import { afterEach, describe, expect, it } from "bun:test";
import { chmod, lstat, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
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

describe("claude-effect-platform-node", () => {
  it("exposes exact native commands without a generic runner", async () => {
    const fixture = await makeFixture();
    const marketplace = path.join(fixture.home, "marketplace");
    await mkdir(marketplace);
    const session = await Effect.runPromise(
      claudeEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer)),
    );

    const probe = await Effect.runPromise(session.probe());
    expect(probe.pluginCommands).toEqual(["disable", "enable", "install", "list", "uninstall"]);
    expect(probe.marketplaceCommands).toEqual(["add", "list", "remove"]);
    expect((await Effect.runPromise(session.listMarketplaces())).json).toEqual([]);
    expect((await Effect.runPromise(session.listPlugins())).json).toEqual({ installed: [] });
    await Effect.runPromise(session.addMarketplace({ sourcePath: marketplace }));
    await Effect.runPromise(session.removeMarketplace({ identity: "rawr-hq" }));
    await Effect.runPromise(session.installPlugin({ selector: "demo@rawr-hq" }));
    await Effect.runPromise(session.enablePlugin({ selector: "demo@rawr-hq" }));
    await Effect.runPromise(session.disablePlugin({ selector: "demo@rawr-hq" }));
    await Effect.runPromise(session.uninstallPlugin({ selector: "demo@rawr-hq" }));
  });

  it("reads raw configuration and bounded cache bytes", async () => {
    const fixture = await makeFixture();
    await writeFile(path.join(fixture.home, "settings.json"), '{"enabledPlugins":{"demo@rawr-hq":true}}');
    const packageRoot = path.join(fixture.home, "plugins", "cache", "demo");
    await mkdir(packageRoot, { recursive: true });
    await writeFile(path.join(packageRoot, "plugin.json"), "{}\n", { mode: 0o644 });
    const session = await Effect.runPromise(
      claudeEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer)),
    );

    expect(await Effect.runPromise(session.readConfiguration())).toEqual({
      enabledPlugins: { "demo@rawr-hq": true },
    });
    const observed = await Effect.runPromise(session.readPackage({
      root: packageRoot,
      maxEntries: 1,
      maxBytes: 16,
    }));
    expect(observed.entries.map((entry) => entry.path)).toEqual(["plugin.json"]);

    const overflow = await Effect.runPromiseExit(session.readPackage({
      root: packageRoot,
      maxEntries: 1,
      maxBytes: 1,
    }));
    expect(Exit.isFailure(overflow)).toBe(true);
    if (Exit.isFailure(overflow)) {
      const failure = overflow.cause._tag === "Fail" ? overflow.cause.error : undefined;
      expect(failure?.reason).toBe("LimitExceeded");
    }
  });
});

async function makeFixture(): Promise<Readonly<{ executablePath: string; home: string }>> {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-native-provider-test-")));
  roots.push(root);
  const home = path.join(root, "home");
  const executablePath = path.join(root, "fake-claude");
  await mkdir(home);
  await writeFile(executablePath, fakeClaudeScript(), { mode: 0o755 });
  await chmod(executablePath, 0o755);
  return Object.freeze({ executablePath, home });
}

function fakeClaudeScript(): string {
  return `#!/bin/sh
set -eu
if [ "$*" = "plugin --help" ]; then
  printf 'Commands:\\n  list  list plugins\\n  install  install plugin\\n  enable  enable plugin\\n  disable  disable plugin\\n  uninstall  uninstall plugin\\n'
elif [ "$*" = "plugin marketplace --help" ]; then
  printf 'Commands:\\n  list  list markets\\n  add  add market\\n  remove  remove market\\n'
elif [ "$*" = "plugin list --available --json" ]; then
  printf '%s\\n' '{"installed":[]}'
elif [ "$*" = "plugin marketplace list --json" ]; then
  printf '%s\\n' '[]'
else
  printf '%s\\n' '{}'
fi
`;
}
