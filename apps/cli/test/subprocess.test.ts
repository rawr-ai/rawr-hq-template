import { afterEach, describe, expect, it } from "vitest";
import { lstatSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { bindVerifiedControllerReentryAuthority } from "@rawr/core";
import { resolveCliReentry } from "../src/lib/subprocess";

const temporaryRoots: string[] = [];
const TEMPORARY_ROOT_PREFIX = "rawr-command-entry-";

function removeTemporaryRoot(root: string): void {
  const canonicalTemporaryRoot = realpathSync(tmpdir());
  const canonicalRoot = realpathSync(root);
  const status = lstatSync(root);
  if (
    !status.isDirectory() ||
    status.isSymbolicLink() ||
    canonicalRoot !== root ||
    path.dirname(canonicalRoot) !== canonicalTemporaryRoot ||
    !path.basename(canonicalRoot).startsWith(TEMPORARY_ROOT_PREFIX)
  ) {
    throw new Error(`refusing to remove invalid command-entry test root: ${root}`);
  }
  rmSync(canonicalRoot, { recursive: true, force: true });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    removeTemporaryRoot(root);
  }
});

describe("CLI subprocess reentry", () => {
  it("reuses one bound authority despite later ambient mutation", () => {
    const root = realpathSync(
      mkdtempSync(path.join(realpathSync(tmpdir()), TEMPORARY_ROOT_PREFIX))
    );
    temporaryRoots.push(root);
    const entrypoint = path.join(root, "command-test-cli.ts");
    writeFileSync(entrypoint, "export {};\n");

    bindVerifiedControllerReentryAuthority({
      runtimePath: process.execPath,
      entryPath: entrypoint,
      releaseRoot: root,
      dataRoot: root,
      controllerDigest: "a".repeat(64),
      operatorCwd: "/operator/workspace",
      operatorHome: "/operator/home",
      operatorConfigHome: "/operator/config",
    });
    const names = [
      "BUN_OPTIONS",
      "BUN_RUNTIME_TRANSPILER_CACHE_PATH",
      "NODE_OPTIONS",
      "RAWR_CONTROLLER_DIGEST",
      "RAWR_CONTROLLER_RELEASE_ROOT",
    ] as const;
    const prior = new Map(names.map((name) => [name, process.env[name]]));
    try {
      process.env.BUN_OPTIONS = "--preload=hostile.ts";
      process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH = "/hostile/transpiler-cache";
      process.env.NODE_OPTIONS = "--require=hostile.js";
      process.env.RAWR_CONTROLLER_DIGEST = "b".repeat(64);
      process.env.RAWR_CONTROLLER_RELEASE_ROOT = "/hostile/release";

      const result = resolveCliReentry();

      expect(result).toMatchObject({
        cmd: process.execPath,
        args: ["--config=/dev/null", "--no-env-file", "--no-install", entrypoint],
        cwd: root,
      });
      expect(result.env).toMatchObject({
        HOME: "/dev/null",
        XDG_CONFIG_HOME: "/dev/null",
        BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
        RAWR_DATA_DIR: root,
        RAWR_CONTROLLER_DIGEST: "a".repeat(64),
        RAWR_CONTROLLER_RELEASE_ROOT: root,
        RAWR_OPERATOR_CWD: "/operator/workspace",
        RAWR_OPERATOR_HOME: "/operator/home",
        RAWR_OPERATOR_HOME_SET: "1",
        RAWR_OPERATOR_XDG_CONFIG_HOME: "/operator/config",
        RAWR_OPERATOR_XDG_CONFIG_HOME_SET: "1",
      });
      expect(result.env.BUN_OPTIONS).toBeUndefined();
      expect(result.env.NODE_OPTIONS).toBeUndefined();
    } finally {
      for (const [name, value] of prior) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });
});
