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

type CommandResult = Readonly<{ exitCode: number; stderr: string; stdout: string }>;

const FIXTURE_PREFIX = "runtime-observation-nx-cache-";
const workspaceRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const observationPath = "packages/core/runtime/observation";
const definitionPath = "packages/core/runtime/definition";
const schemaPath = "packages/core/runtime/schema";
const nx = path.join(workspaceRoot, "node_modules/nx/dist/bin/nx.js");
const temporaryParent = await realpath(tmpdir());

test("restores an unchanged observation build and invalidates owner and upstream inputs", async () => {
  const fixtureRoot = await createFixture();
  const ownerRoot = path.join(fixtureRoot, observationPath);
  const configPath = path.join(ownerRoot, "tsdown.config.ts");
  const outputRoot = path.join(ownerRoot, "dist");
  const outputPath = path.join(outputRoot, "index.js");

  try {
    const originalConfig = await readFile(configPath, "utf8");
    const first = await runBuild(fixtureRoot);
    expect(first, first.stderr || first.stdout).toMatchObject({ exitCode: 0 });
    expect(cacheHit(first)).toBe(false);
    const expectedOutput = await readFile(outputPath);

    await rm(outputRoot, { recursive: true, force: false });
    const restored = await runBuild(fixtureRoot);
    expect(restored, restored.stderr || restored.stdout).toMatchObject({ exitCode: 0 });
    expect(cacheHit(restored), `${restored.stdout}\n${restored.stderr}`).toBe(true);
    expect(await readFile(outputPath)).toEqual(expectedOutput);

    await writeFile(
      configPath,
      `${originalConfig}\n// Relevant-input mutation for the isolated Nx cache proof.\n`
    );
    await rm(outputRoot, { recursive: true, force: false });
    const invalidated = await runBuild(fixtureRoot);
    expect(invalidated, invalidated.stderr || invalidated.stdout).toMatchObject({ exitCode: 0 });
    expect(cacheHit(invalidated)).toBe(false);
    expect(await readFile(outputPath)).toEqual(expectedOutput);

    const upstreamConfig = path.join(fixtureRoot, definitionPath, "tsdown.config.ts");
    await writeFile(
      upstreamConfig,
      `${await readFile(upstreamConfig, "utf8")}\n// Upstream command input changes the dependent hash.\n`
    );
    await rm(outputRoot, { recursive: true, force: false });
    const upstreamInvalidated = await runBuild(fixtureRoot);
    expect(
      upstreamInvalidated,
      upstreamInvalidated.stderr || upstreamInvalidated.stdout
    ).toMatchObject({ exitCode: 0 });
    expect(cacheHit(upstreamInvalidated)).toBe(false);
    expect(await readFile(outputPath)).toEqual(expectedOutput);
  } finally {
    await removeFixture(fixtureRoot);
  }
}, 120_000);

async function createFixture(): Promise<string> {
  const fixtureRoot = await realpath(await mkdtemp(path.join(temporaryParent, FIXTURE_PREFIX)));
  try {
    for (const relativePath of [schemaPath, definitionPath, observationPath]) {
      const source = path.join(workspaceRoot, relativePath);
      const destination = path.join(fixtureRoot, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(source, destination, {
        recursive: true,
        filter: (entry) => {
          const relative = path.relative(source, entry);
          return relative === "" || !relative.split(path.sep).includes("dist");
        },
      });
    }
    for (const file of [
      ".gitignore",
      "bun.lock",
      "bunfig.toml",
      "package.json",
      "tsconfig.base.json",
    ]) {
      await copyFile(path.join(workspaceRoot, file), path.join(fixtureRoot, file));
    }
    await writeNxConfig(fixtureRoot);
    for (const dependency of [
      "@orpc/client",
      "@orpc/experimental-effect",
      "@orpc/contract",
      "@orpc/server",
      "@orpc/shared",
      "@standard-schema/spec",
      "@types/node",
      "bun-types",
      "effect",
      "dotenv",
      "nx",
      "tsdown",
      "typebox",
      "typescript",
    ]) {
      await linkDependency(fixtureRoot, dependency);
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

async function writeNxConfig(fixtureRoot: string): Promise<void> {
  const source = JSON.parse(await readFile(path.join(workspaceRoot, "nx.json"), "utf8")) as {
    namedInputs?: Readonly<Record<string, unknown>>;
    targetDefaults?: Readonly<Record<string, unknown>>;
  };
  const required = (value: unknown, name: string) => {
    if (value === undefined) throw new Error(`Repository nx.json is missing ${name}.`);
    return value;
  };
  const config = {
    $schema: "./node_modules/nx/schemas/nx-schema.json",
    neverConnectToCloud: true,
    namedInputs: {
      default: required(source.namedInputs?.default, "namedInputs.default"),
      production: required(source.namedInputs?.production, "namedInputs.production"),
      bunToolchain: required(source.namedInputs?.bunToolchain, "namedInputs.bunToolchain"),
      typescriptRuntime: required(
        source.namedInputs?.typescriptRuntime,
        "namedInputs.typescriptRuntime"
      ),
    },
    plugins: [],
    targetDefaults: { build: required(source.targetDefaults?.build, "targetDefaults.build") },
  };
  await writeFile(path.join(fixtureRoot, "nx.json"), `${JSON.stringify(config, null, 2)}\n`);
}

async function linkDependency(fixtureRoot: string, dependency: string): Promise<void> {
  const destination = path.join(fixtureRoot, "node_modules", dependency);
  await mkdir(path.dirname(destination), { recursive: true });
  await symlink(
    path.join(workspaceRoot, "node_modules", dependency),
    destination,
    process.platform === "win32" ? "junction" : "dir"
  );
}

async function runBuild(fixtureRoot: string): Promise<CommandResult> {
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
  ])
    delete env[name];

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [nx, "run", "runtime-observation:build", "--outputStyle=static"],
      { cwd: fixtureRoot, env }
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
      timeoutError = new Error("runtime-observation:build exceeded its cache-proof timeout.");
      child.kill("SIGKILL");
    }, 45_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => stdout.push(chunk));
    child.stderr.on("data", (chunk: string) => stderr.push(chunk));
    child.on("error", (error) => settle(() => reject(error)));
    child.on("close", (code) =>
      settle(() =>
        timeoutError === undefined
          ? resolve({ exitCode: code ?? 1, stderr: stderr.join(""), stdout: stdout.join("") })
          : reject(timeoutError)
      )
    );
  });
}

function cacheHit(result: CommandResult): boolean {
  return /nx run runtime-observation:build\s+\[local cache\]/iu.test(
    `${result.stdout}\n${result.stderr}`
  );
}

async function removeFixture(root: string): Promise<void> {
  const stats = await lstat(root);
  const canonical = await realpath(root);
  const name = path.basename(canonical);
  const suffix = name.slice(FIXTURE_PREFIX.length);
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    canonical !== root ||
    path.dirname(canonical) !== temporaryParent ||
    !name.startsWith(FIXTURE_PREFIX) ||
    suffix.length !== 6 ||
    !/^[A-Za-z0-9]+$/u.test(suffix)
  ) {
    throw new Error(`Refusing to remove unexpected runtime-observation Nx fixture: ${root}`);
  }
  await rm(canonical, { recursive: true, force: false });
}
