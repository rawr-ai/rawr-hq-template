import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  access,
  chmod,
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTROLLER_ENTRY_PATH,
  CONTROLLER_RUNTIME_PATH,
  controllerReleasePath,
  controllerSelectorPath,
} from "../layout.ts";

const scriptPath = join(dirname(fileURLToPath(import.meta.url)), "..", "stable-launcher.sh");
const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { force: true, recursive: true })));
});

async function temporaryDirectory(label: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), `rawr-${label}-`));
  cleanup.push(path);
  return path;
}

async function run(
  arguments_: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return await new Promise((resolveProcess, rejectProcess) => {
    const child = spawn(scriptPath, arguments_, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", rejectProcess);
    child.once("exit", (code) => resolveProcess({ code, stdout, stderr }));
  });
}

async function materializeFixture(dataRoot: string, digest: string): Promise<string> {
  const releaseRoot = controllerReleasePath(dataRoot, digest);
  const runtime = join(releaseRoot, CONTROLLER_RUNTIME_PATH);
  const entry = join(releaseRoot, CONTROLLER_ENTRY_PATH);
  await mkdir(dirname(runtime), { recursive: true });
  await mkdir(dirname(entry), { recursive: true });
  await copyFile(process.execPath, runtime);
  await chmod(runtime, 0o755);
  await writeFile(
    entry,
    `console.log(JSON.stringify({
      argv: process.argv.slice(2),
      cwd: process.cwd(),
      home: process.env.HOME,
      xdgConfigHome: process.env.XDG_CONFIG_HOME,
      rawrDataDir: process.env.RAWR_DATA_DIR,
      bunOptions: process.env.BUN_OPTIONS,
      nodeOptions: process.env.NODE_OPTIONS,
      digest: process.env.RAWR_CONTROLLER_DIGEST,
      releaseRoot: process.env.RAWR_CONTROLLER_RELEASE_ROOT,
      operatorCwd: process.env.RAWR_OPERATOR_CWD,
      operatorHome: process.env.RAWR_OPERATOR_HOME,
      operatorHomeSet: process.env.RAWR_OPERATOR_HOME_SET,
      operatorXdgConfigHome: process.env.RAWR_OPERATOR_XDG_CONFIG_HOME,
      operatorXdgConfigHomeSet: process.env.RAWR_OPERATOR_XDG_CONFIG_HOME_SET,
    }));\n`
  );
  await mkdir(dirname(controllerSelectorPath(dataRoot)), { recursive: true });
  await writeFile(controllerSelectorPath(dataRoot), `${digest}\n`);
  return releaseRoot;
}

async function materializeBlockingRuntimeFixture(
  dataRoot: string,
  digest: string,
  readyPath: string,
  proceedPath: string
): Promise<string> {
  const releaseRoot = controllerReleasePath(dataRoot, digest);
  const runtime = join(releaseRoot, CONTROLLER_RUNTIME_PATH);
  const entry = join(releaseRoot, CONTROLLER_ENTRY_PATH);
  await mkdir(dirname(runtime), { recursive: true });
  await mkdir(dirname(entry), { recursive: true });
  await writeFile(
    runtime,
    [
      "#!/bin/sh",
      `touch ${shellQuote(readyPath)}`,
      `while [ ! -f ${shellQuote(proceedPath)} ]; do sleep 0.01; done`,
      `exec ${shellQuote(process.execPath)} "$@"`,
      "",
    ].join("\n")
  );
  await chmod(runtime, 0o755);
  await writeFile(
    entry,
    "console.log(JSON.stringify({ digest: process.env.RAWR_CONTROLLER_DIGEST, releaseRoot: process.env.RAWR_CONTROLLER_RELEASE_ROOT }));\n"
  );
  return releaseRoot;
}

async function waitForPath(path: string): Promise<void> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    try {
      await access(path);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  throw new Error(`Timed out waiting for ${path}`);
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

describe("stable controller launcher", () => {
  test("pins one digest-qualified release and neutralizes ambient Bun inputs", async () => {
    const dataRoot = await temporaryDirectory("data");
    const hostileCwd = await temporaryDirectory("cwd");
    const operatorHome = await temporaryDirectory("home");
    const digest = "a".repeat(64);
    const releaseRoot = await materializeFixture(dataRoot, digest);
    const sentinel = join(hostileCwd, `preload-${randomUUID()}`);
    const preload = join(hostileCwd, "preload.ts");
    await writeFile(preload, `await Bun.write(${JSON.stringify(sentinel)}, "executed");\n`);
    await writeFile(join(hostileCwd, "bunfig.toml"), `preload = [${JSON.stringify(preload)}]\n`);
    await writeFile(join(hostileCwd, ".env"), "RAWR_HOSTILE_ENV=loaded\n");
    await writeFile(join(releaseRoot, "bunfig.toml"), `preload = [${JSON.stringify(preload)}]\n`);

    const result = await run(["doctor", "global"], {
      cwd: hostileCwd,
      env: {
        ...process.env,
        RAWR_DATA_DIR: dataRoot,
        HOME: operatorHome,
        XDG_CONFIG_HOME: join(operatorHome, "config"),
        BUN_OPTIONS: `--preload=${preload}`,
        NODE_OPTIONS: `--require=${preload}`,
        RAWR_CONTROLLER_DIGEST: "spoofed",
        RAWR_CONTROLLER_RELEASE_ROOT: "/spoofed",
      },
    });

    expect(result).toMatchObject({ code: 0, stderr: "" });
    const observed = JSON.parse(result.stdout) as Record<string, unknown>;
    const canonicalReleaseRoot = await realpath(releaseRoot);
    const canonicalHostileCwd = await realpath(hostileCwd);
    expect(observed).toMatchObject({
      argv: ["doctor", "global"],
      cwd: canonicalReleaseRoot,
      home: "/dev/null",
      xdgConfigHome: "/dev/null",
      rawrDataDir: await realpath(dataRoot),
      digest,
      releaseRoot: canonicalReleaseRoot,
      operatorCwd: canonicalHostileCwd,
      operatorHome,
      operatorHomeSet: "1",
      operatorXdgConfigHome: join(operatorHome, "config"),
      operatorXdgConfigHomeSet: "1",
    });
    expect(observed.bunOptions).toBeUndefined();
    expect(observed.nodeOptions).toBeUndefined();
    await expect(readFile(sentinel)).rejects.toThrow();
  });

  test("exports the canonical controller data root when selection comes from HOME", async () => {
    const operatorHome = await temporaryDirectory("home-fallback");
    const dataRoot = join(operatorHome, ".local", "share", "rawr");
    const cwd = await temporaryDirectory("home-fallback-cwd");
    const digest = "1".repeat(64);
    await mkdir(dataRoot, { recursive: true });
    await materializeFixture(dataRoot, digest);
    const env = { ...process.env, HOME: operatorHome };
    delete env.RAWR_DATA_DIR;
    delete env.XDG_DATA_HOME;

    const result = await run([], { cwd, env });

    expect(result).toMatchObject({ code: 0, stderr: "" });
    expect(JSON.parse(result.stdout)).toMatchObject({
      rawrDataDir: await realpath(dataRoot),
      operatorHome,
    });
  });

  test("exports the canonical controller data root when the configured locator is aliased", async () => {
    const parent = await temporaryDirectory("aliased-data-parent");
    const dataRoot = join(parent, "canonical-data");
    const aliasRoot = join(parent, "data-alias");
    const cwd = await temporaryDirectory("aliased-data-cwd");
    const digest = "2".repeat(64);
    await mkdir(dataRoot, { recursive: true });
    await materializeFixture(dataRoot, digest);
    await symlink(dataRoot, aliasRoot);

    const result = await run([], {
      cwd,
      env: { ...process.env, RAWR_DATA_DIR: aliasRoot },
    });

    expect(result).toMatchObject({ code: 0, stderr: "" });
    expect(JSON.parse(result.stdout)).toMatchObject({
      rawrDataDir: await realpath(dataRoot),
    });
  });

  test("rejects noncanonical selector bytes without a fallback", async () => {
    const dataRoot = await temporaryDirectory("invalid-selector");
    const cwd = await temporaryDirectory("invalid-selector-cwd");
    await mkdir(dirname(controllerSelectorPath(dataRoot)), { recursive: true });
    await writeFile(controllerSelectorPath(dataRoot), `${"b".repeat(64)}\nextra\n`);

    const result = await run([], {
      cwd,
      env: { ...process.env, RAWR_DATA_DIR: dataRoot },
    });

    expect(result.code).toBe(78);
    expect(result.stderr).toContain("CONTROLLER_SELECTION_INVALID");
  });

  test.each([
    ["NUL", Buffer.concat([Buffer.from(`${"b".repeat(64)}\n`), Buffer.from([0])])],
    ["trailing byte", Buffer.from(`${"b".repeat(64)}\nx`)],
  ])("rejects canonical-looking selector bytes with a %s suffix", async (_label, bytes) => {
    const dataRoot = await temporaryDirectory("binary-selector");
    const cwd = await temporaryDirectory("binary-selector-cwd");
    await mkdir(dirname(controllerSelectorPath(dataRoot)), { recursive: true });
    await writeFile(controllerSelectorPath(dataRoot), bytes);

    const result = await run([], {
      cwd,
      env: { ...process.env, RAWR_DATA_DIR: dataRoot },
    });

    expect(result.code).toBe(78);
    expect(result.stderr).toContain("CONTROLLER_SELECTION_INVALID");
    expect(result.stderr).not.toContain("CONTROLLER_RUNTIME_REQUIRED");
  });

  test.each([
    "symlink",
    "hardlink",
  ] as const)("rejects a byte-identical %s selector before release lookup", async (aliasKind) => {
    const dataRoot = await temporaryDirectory(`launcher-${aliasKind}`);
    const cwd = await temporaryDirectory(`launcher-${aliasKind}-cwd`);
    const digest = "f".repeat(64);
    await materializeFixture(dataRoot, digest);
    const selectorPath = controllerSelectorPath(dataRoot);
    const outsidePath = join(await temporaryDirectory(`${aliasKind}-selector-outside`), "current");
    await writeFile(outsidePath, `${digest}\n`);
    await rm(selectorPath);
    if (aliasKind === "symlink") await symlink(outsidePath, selectorPath);
    else await link(outsidePath, selectorPath);

    const result = await run([], {
      cwd,
      env: { ...process.env, RAWR_DATA_DIR: dataRoot },
    });

    expect(result.code).toBe(78);
    expect(result.stderr).toContain("CONTROLLER_SELECTION_INVALID");
  });

  test("pins release A when selection changes after the one launcher read but before Bun exec", async () => {
    const dataRoot = await temporaryDirectory("selector-interleaving");
    const cwd = await temporaryDirectory("selector-interleaving-cwd");
    const readyPath = join(cwd, "runtime-a-ready");
    const proceedPath = join(cwd, "runtime-a-proceed");
    const firstDigest = "d".repeat(64);
    const secondDigest = "e".repeat(64);
    const firstRelease = await materializeBlockingRuntimeFixture(
      dataRoot,
      firstDigest,
      readyPath,
      proceedPath
    );
    const secondRelease = await materializeFixture(dataRoot, secondDigest);
    await writeFile(controllerSelectorPath(dataRoot), `${firstDigest}\n`);

    const running = run([], {
      cwd,
      env: { ...process.env, RAWR_DATA_DIR: dataRoot },
    });
    await waitForPath(readyPath);
    await writeFile(controllerSelectorPath(dataRoot), `${secondDigest}\n`);
    await writeFile(proceedPath, "continue\n");

    const first = await running;
    expect(first).toMatchObject({ code: 0, stderr: "" });
    expect(JSON.parse(first.stdout)).toEqual({
      digest: firstDigest,
      releaseRoot: await realpath(firstRelease),
    });

    const second = await run([], {
      cwd,
      env: { ...process.env, RAWR_DATA_DIR: dataRoot },
    });
    expect(second).toMatchObject({ code: 0, stderr: "" });
    expect(JSON.parse(second.stdout)).toMatchObject({
      digest: secondDigest,
      releaseRoot: await realpath(secondRelease),
    });
  });

  test("does not consult cwd when the selected release is absent", async () => {
    const dataRoot = await temporaryDirectory("missing-release");
    const cwd = await temporaryDirectory("misleading-cwd");
    const digest = "c".repeat(64);
    await mkdir(dirname(controllerSelectorPath(dataRoot)), { recursive: true });
    await writeFile(controllerSelectorPath(dataRoot), `${digest}\n`);
    await mkdir(join(cwd, "runtime"), { recursive: true });
    await mkdir(join(cwd, "app"), { recursive: true });
    await copyFile(process.execPath, join(cwd, CONTROLLER_RUNTIME_PATH));
    await writeFile(join(cwd, CONTROLLER_ENTRY_PATH), "console.log('fallback');\n");

    const result = await run([], {
      cwd,
      env: { ...process.env, RAWR_DATA_DIR: dataRoot },
    });

    expect(result.code).toBe(78);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("CONTROLLER_RUNTIME_REQUIRED");
  });
});
