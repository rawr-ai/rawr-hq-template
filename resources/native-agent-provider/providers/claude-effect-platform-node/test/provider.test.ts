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

import { FileSystem } from "@effect/platform";
import { SystemError } from "@effect/platform/Error";
import { NodeContext } from "@effect/platform-node";
import { Effect, Exit } from "effect";

import type {
  ArtifactObjectAddress,
  ArtifactTreeLocation,
} from "@rawr/resource-agent-plugin-artifact-repository";
import {
  makeArtifactRepositoryResource,
  runNodeArtifactRepository,
} from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
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
  it("exposes exact native commands without a generic runner", async () => {
    const fixture = await makeFixture();
    const marketplace = await publishMarketplace(fixture.root, "claude-marketplace");
    await writeFile(path.join(fixture.home, "expected-marketplace-source"), `${marketplace}\n`);
    await writeProviderJson(fixture.home, "claude-marketplaces.json", [
      {
        name: "rawr-hq",
        source: "directory",
        path: marketplace,
        installLocation: marketplace,
      },
    ]);
    const session = await Effect.runPromise(
      claudeEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer))
    );

    const probe = await Effect.runPromise(session.probe());
    expect(probe.pluginCommands).toEqual(["disable", "enable", "install", "list", "uninstall"]);
    expect(probe.marketplaceCommands).toEqual(["add", "list", "remove"]);
    expect((await Effect.runPromise(session.listMarketplaces())).json).toEqual([
      {
        name: "rawr-hq",
        source: "directory",
        path: marketplace,
        installLocation: marketplace,
      },
    ]);
    expect((await Effect.runPromise(session.listPlugins())).json).toEqual({ installed: [] });
    expect(
      (
        await Effect.runPromise(
          session.readMarketplace({
            identity: "rawr-hq",
            maxEntries: 4,
            maxBytes: 1024,
          })
        )
      ).entries.map((entry) => entry.path)
    ).toEqual(["marketplace.json"]);
    await Effect.runPromise(session.addMarketplace(marketplace));
    await Effect.runPromise(session.removeMarketplace({ identity: "rawr-hq" }));
    await Effect.runPromise(session.installPlugin({ selector: "demo@rawr-hq" }));
    await Effect.runPromise(session.enablePlugin({ selector: "demo@rawr-hq" }));
    await Effect.runPromise(session.disablePlugin({ selector: "demo@rawr-hq" }));
    await Effect.runPromise(session.uninstallPlugin({ selector: "demo@rawr-hq" }));
    expect(await readLines(path.join(fixture.home, "commands.log"))).toEqual([
      "plugin --help",
      "plugin marketplace --help",
      "plugin marketplace list --json",
      "plugin list --available --json",
      "plugin marketplace list --json",
      `plugin marketplace add ${marketplace} --scope user`,
      "plugin marketplace remove rawr-hq --scope user",
      "plugin install demo@rawr-hq --scope user",
      "plugin enable demo@rawr-hq --scope user",
      "plugin disable demo@rawr-hq --scope user",
      "plugin uninstall demo@rawr-hq --scope user",
    ]);
  });

  it("reads raw configuration and the uniquely selected bounded plugin cache", async () => {
    const fixture = await makeFixture();
    await writeFile(
      path.join(fixture.home, "settings.json"),
      '{"enabledPlugins":{"demo@rawr-hq":true}}'
    );
    const packageRoot = path.join(fixture.home, "plugins", "cache", "rawr-hq", "demo", "1.0.0");
    await mkdir(packageRoot, { recursive: true });
    await writeFile(path.join(packageRoot, "README.md"), "readme\n", { mode: 0o644 });
    await writeFile(path.join(packageRoot, "plugin.json"), "{}\n", { mode: 0o644 });
    await writeProviderJson(fixture.home, "claude-installed.json", [
      {
        id: "demo@rawr-hq",
        version: "1.0.0",
        scope: "user",
        enabled: true,
        installPath: packageRoot,
      },
    ]);
    const session = await Effect.runPromise(
      claudeEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer))
    );

    expect(await Effect.runPromise(session.readConfiguration())).toEqual({
      enabledPlugins: { "demo@rawr-hq": true },
    });
    const observed = await Effect.runPromise(
      session.readPlugin({
        selector: "demo@rawr-hq",
        maxEntries: 2,
        maxBytes: 16,
      })
    );
    expect(observed.entries.map((entry) => entry.path)).toEqual(["README.md", "plugin.json"]);

    const entryOverflow = await Effect.runPromiseExit(
      session.readPlugin({
        selector: "demo@rawr-hq",
        maxEntries: 1,
        maxBytes: 1024,
      })
    );
    expect(failureReason(entryOverflow)).toBe("LimitExceeded");

    const byteOverflow = await Effect.runPromiseExit(
      session.readPlugin({
        selector: "demo@rawr-hq",
        maxEntries: 2,
        maxBytes: 1,
      })
    );
    expect(Exit.isFailure(byteOverflow)).toBe(true);
    if (Exit.isFailure(byteOverflow)) {
      const failure = byteOverflow.cause._tag === "Fail" ? byteOverflow.cause.error : undefined;
      expect(failure?.reason).toBe("LimitExceeded");
    }

    const target = path.join(fixture.root, "aliased-plugin-file");
    await writeFile(target, "not admitted\n");
    await symlink(target, path.join(packageRoot, "alias"));
    const unsupported = await Effect.runPromiseExit(
      session.readPlugin({
        selector: "demo@rawr-hq",
        maxEntries: 4,
        maxBytes: 1024,
      })
    );
    expect(failureReason(unsupported)).toBe("UnsupportedEntry");
  });

  it("counts empty directories against the package entry limit", async () => {
    const fixture = await makeFixture();
    const packageRoot = path.join(fixture.home, "plugins", "cache", "rawr-hq", "demo", "1.0.0");
    await mkdir(path.join(packageRoot, "first", "second", "overflow"), { recursive: true });
    await writeProviderJson(fixture.home, "claude-installed.json", [installedPlugin(packageRoot)]);
    const session = await Effect.runPromise(
      claudeEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer))
    );

    const overflow = await Effect.runPromiseExit(
      session.readPlugin({
        selector: "demo@rawr-hq",
        maxEntries: 2,
        maxBytes: 1024,
      })
    );

    expect(failureReason(overflow)).toBe("LimitExceeded");
  });

  it("rejects an oversized package file before reading its bytes", async () => {
    const fixture = await makeFixture();
    const packageRoot = path.join(fixture.home, "plugins", "cache", "rawr-hq", "demo", "1.0.0");
    const oversizedFile = path.join(packageRoot, "plugin.json");
    await mkdir(packageRoot, { recursive: true });
    await writeFile(oversizedFile, "oversized\n");
    await writeProviderJson(fixture.home, "claude-installed.json", [installedPlugin(packageRoot)]);
    let packageReadCount = 0;
    const session = await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const observed: FileSystem.FileSystem = {
          ...fs,
          readFile: (candidate) => {
            if (candidate === oversizedFile) packageReadCount += 1;
            return fs.readFile(candidate);
          },
        };
        return yield* claudeEffectPlatformNodeProvider
          .acquire(fixture)
          .pipe(Effect.provideService(FileSystem.FileSystem, observed));
      }).pipe(Effect.provide(NodeContext.layer))
    );

    const overflow = await Effect.runPromiseExit(
      session.readPlugin({
        selector: "demo@rawr-hq",
        maxEntries: 1,
        maxBytes: 1,
      })
    );

    expect(failureReason(overflow)).toBe("LimitExceeded");
    expect(packageReadCount).toBe(0);
  });

  it("rejects installed plugin roots outside the provider home or with a non-directory shape", async () => {
    const fixture = await makeFixture();
    const outside = path.join(fixture.root, "outside-plugin");
    const unsupported = path.join(fixture.home, "unsupported-plugin");
    await mkdir(outside);
    await writeFile(path.join(outside, "plugin.json"), "{}\n");
    await writeFile(unsupported, "not a directory\n");
    const session = await Effect.runPromise(
      claudeEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer))
    );

    await writeProviderJson(fixture.home, "claude-installed.json", [installedPlugin(outside)]);
    const escaped = await Effect.runPromiseExit(
      session.readPlugin({
        selector: "demo@rawr-hq",
        maxEntries: 4,
        maxBytes: 1024,
      })
    );
    expect(failureReason(escaped)).toBe("Aliased");

    await writeProviderJson(fixture.home, "claude-installed.json", [installedPlugin(unsupported)]);
    const wrongShape = await Effect.runPromiseExit(
      session.readPlugin({
        selector: "demo@rawr-hq",
        maxEntries: 4,
        maxBytes: 1024,
      })
    );
    expect(failureReason(wrongShape)).toBe("UnsupportedEntry");
  });

  it("rejects missing and ambiguous Claude marketplace identities", async () => {
    const fixture = await makeFixture();
    const marketplace = await publishMarketplace(fixture.root, "claude-ambiguous");
    const session = await Effect.runPromise(
      claudeEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer))
    );

    const missing = await Effect.runPromiseExit(
      session.readMarketplace({
        identity: "rawr-hq",
        maxEntries: 4,
        maxBytes: 1024,
      })
    );
    expect(failureReason(missing)).toBe("Missing");

    const entry = Object.freeze({
      name: "rawr-hq",
      source: "directory",
      path: marketplace,
      installLocation: marketplace,
    });
    await writeProviderJson(fixture.home, "claude-marketplaces.json", [entry, entry]);
    const ambiguous = await Effect.runPromiseExit(
      session.readMarketplace({
        identity: "rawr-hq",
        maxEntries: 4,
        maxBytes: 1024,
      })
    );
    expect(failureReason(ambiguous)).toBe("ProtocolFailed");
  });

  it("rechecks the ownership slot before starting a Claude command", async () => {
    const fixture = await makeFixture();
    const session = await Effect.runPromise(
      claudeEffectPlatformNodeProvider.acquire(fixture).pipe(Effect.provide(NodeContext.layer))
    );
    await writeFile(path.join(fixture.home, ".rawr-agent-plugin-owner.json"), "occupied\n");

    const exit = await Effect.runPromiseExit(session.probe());

    expect(failureReason(exit)).toBe("OwnershipConflict");
    expect(await Bun.file(path.join(fixture.home, "commands.log")).exists()).toBe(false);
  });

  it("maps an unreadable ownership slot to a collision before native execution", async () => {
    const fixture = await makeFixture();
    const ownerSlot = path.join(fixture.home, ".rawr-agent-plugin-owner.json");
    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const injected: FileSystem.FileSystem = {
          ...fs,
          readLink: (candidate) =>
            candidate === ownerSlot
              ? Effect.fail(
                  new SystemError({
                    reason: "PermissionDenied",
                    module: "FileSystem",
                    method: "readLink",
                    pathOrDescriptor: candidate,
                  })
                )
              : fs.readLink(candidate),
        };
        return yield* claudeEffectPlatformNodeProvider
          .acquire(fixture)
          .pipe(Effect.provideService(FileSystem.FileSystem, injected));
      }).pipe(Effect.provide(NodeContext.layer))
    );

    expect(failureReason(exit)).toBe("OwnershipConflict");
    expect(await Bun.file(path.join(fixture.home, "commands.log")).exists()).toBe(false);
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

async function publishMarketplace(root: string, objectId: string): Promise<ArtifactTreeLocation> {
  const address: ArtifactObjectAddress = Object.freeze({
    repositoryRoot: path.join(root, "artifacts"),
    namespace: Object.freeze(["marketplaces"]),
    objectId,
  });
  const resource = makeArtifactRepositoryResource();
  const published = await runNodeArtifactRepository(
    resource.publishTree({
      address,
      entries: Object.freeze([
        Object.freeze({
          path: "marketplace.json",
          mode: 0o444,
          bytes: new TextEncoder().encode('{"identity":"rawr-hq"}\n'),
        }),
      ]),
      limits: Object.freeze({ maxEntries: 4, maxBytes: 1024 }),
    })
  );
  if (
    !published.ok ||
    published.value.kind === "Rejected" ||
    published.value.kind === "Unsettled"
  ) {
    throw new Error("Failed to publish marketplace fixture");
  }
  const located = await runNodeArtifactRepository(
    resource.locateTree({
      address,
      limits: Object.freeze({ maxEntries: 4, maxBytes: 1024 }),
    })
  );
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

function installedPlugin(installPath: string): Readonly<Record<string, unknown>> {
  return Object.freeze({
    id: "demo@rawr-hq",
    version: "1.0.0",
    scope: "user",
    enabled: true,
    installPath,
  });
}

function failureReason<A>(exit: Exit.Exit<A, unknown>): string | undefined {
  if (!Exit.isFailure(exit) || exit.cause._tag !== "Fail") return undefined;
  const failure = exit.cause.error;
  if (typeof failure !== "object" || failure === null || !("reason" in failure)) return undefined;
  return typeof failure.reason === "string" ? failure.reason : undefined;
}

function fakeClaudeScript(): string {
  return `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$HOME/commands.log"
if [ "$*" = "plugin --help" ]; then
  printf 'Commands:\\n  list  list plugins\\n  install  install plugin\\n  enable  enable plugin\\n  disable  disable plugin\\n  uninstall  uninstall plugin\\n'
elif [ "$*" = "plugin marketplace --help" ]; then
  printf 'Commands:\\n  list  list markets\\n  add  add market\\n  remove  remove market\\n'
elif [ "$*" = "plugin list --available --json" ]; then
  printf '%s\\n' '{"installed":[]}'
elif [ "$*" = "plugin list --json" ]; then
  if [ -f "$HOME/claude-installed.json" ]; then cat "$HOME/claude-installed.json"; else printf '%s\\n' '[]'; fi
elif [ "$*" = "plugin marketplace list --json" ]; then
  if [ -f "$HOME/claude-marketplaces.json" ]; then cat "$HOME/claude-marketplaces.json"; else printf '%s\\n' '[]'; fi
elif [ "$#" -eq 6 ] && [ "$1" = "plugin" ] && [ "$2" = "marketplace" ] && [ "$3" = "add" ] && [ "$4" = "$(cat "$HOME/expected-marketplace-source")" ] && [ "$5" = "--scope" ] && [ "$6" = "user" ]; then
  printf '%s\\n' '{}'
elif [ "$*" = "plugin marketplace remove rawr-hq --scope user" ]; then
  printf '%s\\n' '{}'
elif [ "$*" = "plugin install demo@rawr-hq --scope user" ]; then
  printf '%s\\n' '{}'
elif [ "$*" = "plugin enable demo@rawr-hq --scope user" ]; then
  printf '%s\\n' '{}'
elif [ "$*" = "plugin disable demo@rawr-hq --scope user" ]; then
  printf '%s\\n' '{}'
elif [ "$*" = "plugin uninstall demo@rawr-hq --scope user" ]; then
  printf '%s\\n' '{}'
else
  printf 'unexpected command: %s\\n' "$*" >&2
  exit 64
fi
`;
}
