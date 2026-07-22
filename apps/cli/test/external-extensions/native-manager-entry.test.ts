import type { Config } from "@oclif/core";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { executeNativeManagerInvocation } from "../../src/lib/external-extensions/native-manager-entry";
import {
  NATIVE_MANAGER_PROTOCOL_VERSION,
  encodeNativeManagerInvocation,
  sha256RegularFile,
} from "../../src/lib/external-extensions/native-manager-protocol";
import { GUARDED_NATIVE_MANAGER_CONTRACT } from "../../src/lib/external-extensions/native-mutation";
import { nativeManagerEnvironment } from "../../src/lib/external-extensions/native-subprocess";
import { removeFixtureRoots, tempRoot } from "./fixtures";

afterEach(() => {
  vi.unstubAllEnvs();
  removeFixtureRoots();
});

describe("native manager entry", () => {
  it("loads a user-plugin-free config and invokes only the selected public command class", async () => {
    const fixture = entryFixture();
    const options: unknown[] = [];
    const calls: unknown[] = [];
    vi.stubEnv("RAWR_CONTROLLER_RELEASE_ROOT", fixture.releaseRoot);

    await executeNativeManagerInvocation(
      {
        protocolVersion: NATIVE_MANAGER_PROTOCOL_VERSION,
        cliRoot: fixture.cliRoot,
        nativeDataDir: fixture.nativeDataDir,
        request: {
          commandExport: "plugins:uninstall",
          argv: ["@fixture/external"],
          contract: GUARDED_NATIVE_MANAGER_CONTRACT,
        },
      },
      {
        async loadConfig(value) {
          options.push(value);
          return { dataDir: fixture.nativeDataDir } as Config;
        },
        commands: {
          "plugins:uninstall": {
            async run(argv, config) {
              calls.push({ argv, dataDir: config.dataDir });
            },
          },
        },
      }
    );

    expect(options).toEqual([
      {
        root: fixture.cliRoot,
        userPlugins: false,
        devPlugins: false,
        jitPlugins: false,
      },
    ]);
    expect(calls).toEqual([{ argv: ["@fixture/external"], dataDir: fixture.nativeDataDir }]);
  });

  it("rejects an install artifact changed after inspection before config or command load", async () => {
    const fixture = entryFixture();
    const requestedArtifact = path.join(tempRoot("entry-artifact"), "candidate.tgz");
    writeFileSync(requestedArtifact, "inspected");
    const artifact = realpathSync(requestedArtifact);
    const sha256 = await sha256RegularFile(artifact);
    writeFileSync(artifact, "changed");
    const loadConfig = vi.fn();
    const run = vi.fn();
    vi.stubEnv("RAWR_CONTROLLER_RELEASE_ROOT", fixture.releaseRoot);

    await expect(
      executeNativeManagerInvocation(
        {
          protocolVersion: NATIVE_MANAGER_PROTOCOL_VERSION,
          cliRoot: fixture.cliRoot,
          nativeDataDir: fixture.nativeDataDir,
          request: {
            commandExport: "plugins:install",
            argv: [`file:${artifact}`, "--silent"],
            contract: GUARDED_NATIVE_MANAGER_CONTRACT,
            inspectedArtifact: { path: artifact, sha256 },
          },
        },
        {
          loadConfig,
          commands: { "plugins:install": { run } },
        }
      )
    ).rejects.toThrow("NATIVE_MANAGER_ARTIFACT_HASH_MISMATCH");

    expect(loadConfig).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("gives a real child Config.load the sole operator native data directory", () => {
    const workspaceRoot = realpathSync(path.resolve(import.meta.dirname, "../../../.."));
    const cliRoot = path.join(workspaceRoot, "apps", "cli");
    const temporaryRoot = realpathSync(tempRoot("manager-real-child"));
    const nativeDataDir = path.join(temporaryRoot, "operator-native-data");
    const bunPath = realpathSync(execFileSync("which", ["bun"], { encoding: "utf8" }).trim());
    const directories = {
      bin: path.dirname(bunPath),
      cacheHome: path.join(temporaryRoot, "cache"),
      configHome: path.join(temporaryRoot, "config"),
      home: path.join(temporaryRoot, "home"),
      temporaryDataHome: path.join(temporaryRoot, "temporary-data"),
      temporaryDirectory: path.join(temporaryRoot, "tmp"),
    };
    for (const directory of Object.values(directories).filter(
      (value) => value !== directories.bin
    )) {
      mkdirSync(directory);
    }
    const env: Record<string, string> = {
      ...nativeManagerEnvironment({
        ...directories,
        controllerDigest: "a".repeat(64),
        nativeDataDir,
        releaseRoot: workspaceRoot,
      }),
      RAWR_NATIVE_MANAGER_SANDBOX_DIAGNOSTICS: "1",
    };
    expect(env.XDG_DATA_HOME).not.toBe(nativeDataDir);
    expect(env.RAWR_DATA_DIR).toBe(nativeDataDir);
    const invocation = encodeNativeManagerInvocation({
      protocolVersion: NATIVE_MANAGER_PROTOCOL_VERSION,
      cliRoot,
      nativeDataDir,
      request: {
        commandExport: "plugins:update",
        argv: [],
        contract: GUARDED_NATIVE_MANAGER_CONTRACT,
      },
    });

    const result = spawnSync(
      bunPath,
      [
        "--config=/dev/null",
        "--no-env-file",
        "--no-install",
        `--preload=${path.join(cliRoot, "src", "lib", "external-extensions", "native-import-sandbox.ts")}`,
        path.join(cliRoot, "src", "lib", "external-extensions", "native-manager-entry.ts"),
      ],
      {
        cwd: workspaceRoot,
        env,
        input: invocation,
        encoding: "utf8",
      }
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).not.toContain("NATIVE_MANAGER_DATA_DIR_MISMATCH");
    expect(existsSync(nativeDataDir)).toBe(false);
  });
});

function entryFixture() {
  const releaseRoot = realpathSync(tempRoot("manager-entry-release"));
  const cliRoot = path.join(releaseRoot, "app");
  mkdirSync(cliRoot);
  return {
    releaseRoot,
    cliRoot,
    nativeDataDir: path.join(tempRoot("manager-entry-native"), "data"),
  };
}
