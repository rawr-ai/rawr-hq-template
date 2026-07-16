import { existsSync, mkdirSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertNativeManagerLoadedPath,
  resolveNativeManagerImport,
} from "../../src/lib/external-extensions/native-import-sandbox";
import { removeFixtureRoots, tempRoot } from "./fixtures";

afterEach(removeFixtureRoots);

describe("native manager import sandbox", () => {
  it("allows builtins and modules whose request, resolution, and realpath stay in the release", () => {
    const fixture = sandboxFixture();

    expect(resolveNativeManagerImport({
      ...fixture.input,
      specifier: "node:fs",
    })).toEqual({ kind: "builtin", specifier: "node:fs" });
    expect(resolveNativeManagerImport({
      ...fixture.input,
      specifier: "./inside.js",
      resolveSync: () => fixture.inside,
    })).toEqual({ kind: "file", path: fixture.inside });
    expect(resolveNativeManagerImport({
      ...fixture.input,
      specifier: "@fixture/core",
      resolveSync: () => fixture.inside,
    })).toEqual({ kind: "file", path: fixture.inside });
    expect(() => assertNativeManagerLoadedPath(fixture.releaseRoot, fixture.inside)).not.toThrow();
  });

  it("rejects outside lexical aliases even when they resolve into controller bytes", () => {
    const fixture = sandboxFixture();
    const outsideAlias = path.join(fixture.outsideRoot, "outside-alias.js");
    symlinkSync(fixture.inside, outsideAlias);

    expect(() => resolveNativeManagerImport({
      ...fixture.input,
      specifier: pathToFileURL(outsideAlias).href,
      resolveSync: () => fixture.inside,
    })).toThrow("NATIVE_MANAGER_IMPORT_OUTSIDE_CONTROLLER:requested module");
  });

  it("rejects inside aliases and bare resolutions whose canonical target is outside", () => {
    const fixture = sandboxFixture();
    const insideAlias = path.join(fixture.resolveDir, "inside-alias.js");
    symlinkSync(fixture.outside, insideAlias);

    expect(() => resolveNativeManagerImport({
      ...fixture.input,
      specifier: "./inside-alias.js",
      resolveSync: () => insideAlias,
    })).toThrow("NATIVE_MANAGER_IMPORT_ALIAS_OUTSIDE_CONTROLLER:resolved module");
    expect(() => resolveNativeManagerImport({
      ...fixture.input,
      specifier: "@fixture/outside",
      resolveSync: () => fixture.outside,
    })).toThrow("NATIVE_MANAGER_IMPORT_OUTSIDE_CONTROLLER:resolved module");
    expect(() => assertNativeManagerLoadedPath(fixture.releaseRoot, insideAlias)).toThrow(
      "NATIVE_MANAGER_IMPORT_ALIAS_OUTSIDE_CONTROLLER:loaded module",
    );
  });

  it("rejects imports originating outside the selected release and unknown URL schemes", () => {
    const fixture = sandboxFixture();

    expect(() => resolveNativeManagerImport({
      ...fixture.input,
      importer: fixture.outside,
      specifier: "@fixture/core",
      resolveSync: () => fixture.inside,
    })).toThrow("NATIVE_MANAGER_IMPORT_OUTSIDE_CONTROLLER:importer");
    expect(() => resolveNativeManagerImport({
      ...fixture.input,
      specifier: "https://example.invalid/module.js",
      resolveSync: () => fixture.inside,
    })).toThrow("NATIVE_MANAGER_IMPORT_SCHEME_REJECTED");
  });

  it.each([
    ["ESM", "native-sandbox-esm.mjs", "candidate.mjs", 'import { writeFileSync } from "node:fs"; writeFileSync(process.env.RAWR_SANDBOX_SENTINEL, "loaded");'],
    ["CommonJS", "native-sandbox-cjs.cjs", "candidate.cjs", 'require("node:fs").writeFileSync(process.env.RAWR_SANDBOX_SENTINEL, "loaded");'],
  ])("blocks an outside %s candidate before its module body runs", (_, fixtureName, candidateName, source) => {
    const cliRoot = realpathSync(path.resolve(import.meta.dirname, "../.."));
    const outside = realpathSync(tempRoot("sandbox-runtime-outside"));
    const candidate = path.join(outside, candidateName);
    const sentinel = path.join(outside, "loaded");
    writeFileSync(candidate, source);
    const preload = path.join(cliRoot, "src", "lib", "external-extensions", "native-import-sandbox.ts");
    const entry = path.join(import.meta.dirname, "fixtures", fixtureName);
    const env = {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: outside,
      XDG_CONFIG_HOME: outside,
      RAWR_NATIVE_MANAGER_SANDBOX: "1",
      RAWR_CONTROLLER_RELEASE_ROOT: cliRoot,
      RAWR_SANDBOX_CANDIDATE: candidate,
      RAWR_SANDBOX_SENTINEL: sentinel,
    };

    const result = spawnSync("bun", [
      "--config=/dev/null",
      "--no-env-file",
      "--no-install",
      `--preload=${preload}`,
      entry,
    ], {
      cwd: cliRoot,
      env,
      encoding: "utf8",
    });

    if (fixtureName.endsWith(".mjs")) {
      expect(result.status, JSON.stringify({ stderr: result.stderr, stdout: result.stdout })).not.toBe(0);
      expect(result.stderr).toContain("NATIVE_MANAGER_IMPORT_OUTSIDE_CONTROLLER");
    }
    expect(existsSync(sentinel)).toBe(false);
  });
});

function sandboxFixture() {
  const releaseRoot = realpathSync(tempRoot("sandbox-release"));
  const resolveDir = path.join(releaseRoot, "app");
  mkdirSync(resolveDir, { recursive: true });
  const importer = path.join(resolveDir, "entry.js");
  const inside = path.join(resolveDir, "inside.js");
  writeFileSync(importer, "entry");
  writeFileSync(inside, "inside");
  const outsideRoot = realpathSync(tempRoot("sandbox-outside"));
  const outside = path.join(outsideRoot, "outside.js");
  writeFileSync(outside, "outside");
  return {
    releaseRoot,
    resolveDir,
    inside,
    outside,
    outsideRoot,
    input: {
      specifier: "./inside.js",
      importer,
      resolveDir,
      releaseRoot,
      resolveSync: () => inside,
      canonicalize: realpathSync,
    },
  };
}
