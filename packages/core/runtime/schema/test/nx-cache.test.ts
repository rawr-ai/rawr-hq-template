import { expect, test } from "bun:test";
import { spawn } from "node:child_process";
import {
  copyFile,
  cp,
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
import { fileURLToPath } from "node:url";

type CommandResult = Readonly<{
  exitCode: number;
  stderr: string;
  stdout: string;
}>;

const FIXTURE_PREFIX = "runtime-schema-nx-cache-";
const workspaceRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const ownerRelativePath = "packages/core/runtime/schema";
const ownerRoot = path.join(workspaceRoot, ownerRelativePath);
const nx = path.join(workspaceRoot, "node_modules/nx/dist/bin/nx.js");
const temporaryParent = await realpath(tmpdir());

test("restores an unchanged build and invalidates on a declared relevant input", async () => {
  const fixtureRoot = await createFixture();
  const fixtureOwnerRoot = path.join(fixtureRoot, ownerRelativePath);
  const configPath = path.join(fixtureOwnerRoot, "tsdown.config.ts");
  const outputRoot = path.join(fixtureOwnerRoot, "dist");

  try {
    const originalConfig = await readFile(configPath, "utf8");
    const first = await runNxBuild(fixtureRoot);
    expect(first, first.stderr || first.stdout).toMatchObject({ exitCode: 0 });
    expect(cacheHit(first)).toBe(false);
    const firstOutput = await readFile(path.join(outputRoot, "index.js"));

    await rm(outputRoot, { recursive: true, force: false });
    const restored = await runNxBuild(fixtureRoot);
    expect(restored, restored.stderr || restored.stdout).toMatchObject({ exitCode: 0 });
    expect(cacheHit(restored)).toBe(true);
    expect(await readFile(path.join(outputRoot, "index.js"))).toEqual(firstOutput);

    await writeFile(
      configPath,
      `${originalConfig}\n// Relevant-input mutation for the Nx cache acceptance proof.\n`
    );
    await rm(outputRoot, { recursive: true, force: false });
    const invalidated = await runNxBuild(fixtureRoot);
    expect(invalidated, invalidated.stderr || invalidated.stdout).toMatchObject({ exitCode: 0 });
    expect(cacheHit(invalidated)).toBe(false);
    expect(await readFile(path.join(outputRoot, "index.js"))).toEqual(firstOutput);
  } finally {
    await removeFixture(fixtureRoot);
  }
}, 120_000);

async function createFixture(): Promise<string> {
  const fixtureRoot = await realpath(await mkdtemp(path.join(temporaryParent, FIXTURE_PREFIX)));

  try {
    const fixtureOwnerRoot = path.join(fixtureRoot, ownerRelativePath);
    await mkdir(path.dirname(fixtureOwnerRoot), { recursive: true });
    await cp(ownerRoot, fixtureOwnerRoot, {
      recursive: true,
      filter: (source) => {
        const relative = path.relative(ownerRoot, source);
        return relative === "" || !relative.split(path.sep).includes("dist");
      },
    });

    for (const relativePath of [".gitignore", "bun.lock", "package.json", "tsconfig.base.json"]) {
      await copyFile(path.join(workspaceRoot, relativePath), path.join(fixtureRoot, relativePath));
    }
    await writeFixtureNxConfig(fixtureRoot);
    for (const dependency of [
      "@standard-schema/spec",
      "@types/node",
      "bun-types",
      "nx",
      "tsdown",
      "typebox",
      "typescript",
    ]) {
      await linkFixtureDependency(fixtureRoot, dependency);
    }
    await symlink(
      path.join(workspaceRoot, "node_modules/.bin"),
      path.join(fixtureRoot, "node_modules/.bin"),
      process.platform === "win32" ? "junction" : "dir"
    );

    return fixtureRoot;
  } catch (error) {
    await removeFixture(fixtureRoot);
    throw error;
  }
}

async function linkFixtureDependency(fixtureRoot: string, dependency: string): Promise<void> {
  const source = path.join(workspaceRoot, "node_modules", dependency);
  const destination = path.join(fixtureRoot, "node_modules", dependency);
  await mkdir(path.dirname(destination), { recursive: true });
  await symlink(source, destination, process.platform === "win32" ? "junction" : "dir");
}

async function writeFixtureNxConfig(fixtureRoot: string): Promise<void> {
  const source = JSON.parse(await readFile(path.join(workspaceRoot, "nx.json"), "utf8")) as {
    namedInputs?: Readonly<Record<string, unknown>>;
    targetDefaults?: Readonly<Record<string, unknown>>;
  };
  const fixture = {
    $schema: "./node_modules/nx/schemas/nx-schema.json",
    neverConnectToCloud: true,
    namedInputs: {
      default: requiredNxValue(source.namedInputs?.default, "namedInputs.default"),
      production: requiredNxValue(source.namedInputs?.production, "namedInputs.production"),
      typescriptRuntime: requiredNxValue(
        source.namedInputs?.typescriptRuntime,
        "namedInputs.typescriptRuntime"
      ),
    },
    plugins: [],
    targetDefaults: {
      build: requiredNxValue(source.targetDefaults?.build, "targetDefaults.build"),
    },
  };
  await writeFile(path.join(fixtureRoot, "nx.json"), `${JSON.stringify(fixture, null, 2)}\n`);
}

function requiredNxValue(value: unknown, name: string): unknown {
  if (value === undefined) throw new Error(`Repository nx.json is missing ${name}.`);
  return value;
}

async function runNxBuild(fixtureRoot: string): Promise<CommandResult> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    INIT_CWD: fixtureRoot,
    NO_COLOR: "1",
    NX_CACHE_DIRECTORY: path.join(fixtureRoot, ".nx/cache"),
    NX_COMPILE_CACHE: "false",
    NX_DAEMON: "false",
    NX_ISOLATE_PLUGINS: "false",
    NX_NATIVE_FILE_CACHE_DIRECTORY: path.join(fixtureRoot, ".nx/native-file-cache"),
    NX_SKIP_REMOTE_CACHE: "true",
    NX_TASKS_RUNNER_DYNAMIC_OUTPUT: "false",
    NX_WORKSPACE_DATA_DIRECTORY: path.join(fixtureRoot, ".nx/workspace-data"),
    PWD: fixtureRoot,
  };
  for (const name of [
    "FORCE_COLOR",
    "NX_DISABLE_NX_CACHE",
    "NX_DRY_RUN",
    "NX_PROJECT_GRAPH_CACHE_DIRECTORY",
    "NX_SKIP_NX_CACHE",
    "NX_WORKSPACE_ROOT_PATH",
  ]) {
    delete env[name];
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [nx, "run", "runtime-schema:build", "--outputStyle=static"],
      {
        cwd: fixtureRoot,
        env,
      }
    );
    const stdout: string[] = [];
    const stderr: string[] = [];
    let settled = false;
    let timeoutError: Error | undefined;
    const settle = (finish: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      finish();
    };
    const timer = setTimeout(() => {
      timeoutError = new Error("runtime-schema:build exceeded its cache-proof timeout.");
      child.kill("SIGKILL");
    }, 30_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => stdout.push(chunk));
    child.stderr.on("data", (chunk: string) => stderr.push(chunk));
    child.on("error", (error) => settle(() => reject(error)));
    child.on("close", (code) => {
      settle(() =>
        timeoutError === undefined
          ? resolve({ exitCode: code ?? 1, stderr: stderr.join(""), stdout: stdout.join("") })
          : reject(timeoutError)
      );
    });
  });
}

function cacheHit(result: CommandResult): boolean {
  return /(?:existing outputs match the cache|read the output from the cache|\[local cache\])/iu.test(
    `${result.stdout}\n${result.stderr}`
  );
}

async function removeFixture(root: string): Promise<void> {
  const stats = await lstat(root);
  const canonical = await realpath(root);
  const basename = path.basename(canonical);
  const suffix = basename.slice(FIXTURE_PREFIX.length);
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    canonical !== root ||
    path.dirname(canonical) !== temporaryParent ||
    !basename.startsWith(FIXTURE_PREFIX) ||
    suffix.length !== 6 ||
    !/^[A-Za-z0-9]+$/u.test(suffix)
  ) {
    throw new Error(`Refusing to remove unexpected runtime-schema Nx fixture: ${root}`);
  }
  await rm(canonical, { recursive: true, force: false });
}
