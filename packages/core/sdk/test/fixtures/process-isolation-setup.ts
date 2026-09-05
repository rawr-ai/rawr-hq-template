import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

const workspaceRoot = resolve(import.meta.dirname, "../../../../..");
const workspaceRequire = createRequire(join(workspaceRoot, "package.json"));
const execute = promisify(execFile);
const nativePackages = [
  "@orpc/client",
  "@orpc/contract",
  "@orpc/experimental-effect",
  "@orpc/openapi",
  "@orpc/server",
  "effect",
  "elysia",
  "inngest",
  "typebox",
] as const;

/** Build ordinary installed-package children outside the repository's Nx project graph. */
export async function prepareProcessIsolation(): Promise<{
  root: string;
  serverEntry: string;
  asyncEntry: string;
  cleanup: () => Promise<void>;
}> {
  const root = await realpath(await mkdtemp(join(tmpdir(), "habitat-process-isolation-")));
  const appRoot = join(root, "app");
  const cleanup = () => rm(root, { recursive: true, force: true });
  try {
    await cp(join(import.meta.dirname, "process-isolation"), appRoot, { recursive: true });
    await mkdir(join(root, "artifacts"));
    await mkdir(join(root, "build"));
    await mkdir(join(root, ".habitat"));
    await run(
      [
        "bun",
        "pm",
        "pack",
        "--ignore-scripts",
        "--quiet",
        "--filename",
        join(root, "artifacts/sdk.tgz"),
      ],
      join(workspaceRoot, "packages/core/sdk")
    );

    const versions: Record<string, string> = {};
    for (const name of [...nativePackages, "typescript", "@types/node"]) {
      const manifest = JSON.parse(
        await readFile(workspaceRequire.resolve(`${name}/package.json`), "utf8")
      ) as { version: string };
      versions[name] = manifest.version;
    }
    const workspace = JSON.parse(await readFile(join(workspaceRoot, "package.json"), "utf8")) as {
      packageManager: string;
    };
    const files = {
      "package.json": JSON.stringify({
        name: "habitat-process-isolation-proof",
        private: true,
        type: "module",
        packageManager: workspace.packageManager,
        dependencies: {
          "@habitat-ai/sdk": "file:./artifacts/sdk.tgz",
          ...Object.fromEntries(nativePackages.map((name) => [name, versions[name]])),
        },
        devDependencies: {
          typescript: versions.typescript,
          "@types/node": versions["@types/node"],
        },
      }),
      ".gitignore": "node_modules/\nbuild/\nartifacts/\n.habitat/cache/\n",
      ".habitat/index.json": JSON.stringify({
        schemaVersion: 2,
        ownerRoots: { "process-isolation-app": "app" },
      }),
      "app/package.json": JSON.stringify({
        name: "process-isolation-app",
        private: true,
        type: "module",
      }),
      "app/project.json": JSON.stringify({
        name: "process-isolation-app",
        projectType: "application",
        sourceRoot: "app/src",
      }),
      "app/habitat.toml": [
        "schemaVersion = 1",
        'id = "process-isolation"',
        'ownerProject = "process-isolation-app"',
        'blueprint = "app"',
        "blueprintVersion = 2",
        "[roots]",
        'project = "app"',
        "[selections]",
        "",
      ].join("\n"),
      "app/tsconfig.json": JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          lib: ["ESNext", "DOM"],
          types: ["node"],
          strict: true,
          skipLibCheck: false,
          noEmit: true,
        },
        include: ["**/*.ts"],
      }),
    };
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(root, name), `${content}\n`);
    }
    await run(["bun", "install", "--ignore-scripts"], root);

    const appRequire = createRequire(join(appRoot, "package.json"));
    const sdkManifest = await realpath(appRequire.resolve("@habitat-ai/sdk/package.json"));
    assert(
      !relative(root, sdkManifest).startsWith(".."),
      "SDK must be an isolated package artifact"
    );
    const sdkRequire = createRequire(sdkManifest);
    for (const name of nativePackages) {
      const appPath = await realpath(appRequire.resolve(`${name}/package.json`));
      assert.equal(await realpath(sdkRequire.resolve(`${name}/package.json`)), appPath, name);
      assert.equal(JSON.parse(await readFile(appPath, "utf8")).version, versions[name], name);
    }

    // The pinned native CLI evaluates this exact packed packet, not a copied source evaluator.
    await cp(
      join(dirname(sdkManifest), "dist/blueprints/app/versions/2"),
      join(root, ".habitat/blueprints/app"),
      { recursive: true }
    );
    await run(["git", "init", "--quiet"], root);
    const report = JSON.parse(
      await run(
        [
          join(workspaceRoot, "node_modules/.bin/habitat"),
          "check",
          "--instance",
          "process-isolation",
        ],
        root
      )
    ) as {
      _tag: string;
      ok: boolean;
      applications: { instanceId: string; ruleId: string; status: string; findings: unknown[] }[];
    };
    assert.equal(report._tag, "Completed");
    assert.equal(report.ok, true);
    assert.deepEqual(
      report.applications
        .map(({ instanceId, ruleId, status, findings }) => ({
          instanceId,
          ruleId,
          status,
          findings,
        }))
        .sort((left, right) => left.ruleId.localeCompare(right.ruleId)),
      ["app_v2_selection", "app_v2_structure"].map((ruleId) => ({
        instanceId: "process-isolation",
        ruleId,
        status: "pass",
        findings: [],
      }))
    );

    for (const role of ["server", "async"] as const) {
      await writeFile(
        join(root, `tsconfig.${role}.json`),
        JSON.stringify({
          extends: "./app/tsconfig.json",
          files: [`./app/${role}.ts`],
          include: [],
        })
      );
      await run(["bun", "node_modules/typescript/bin/tsc", "-p", `tsconfig.${role}.json`], root);
      await run(
        [
          "bun",
          "build",
          `./app/${role}.ts`,
          "--target=bun",
          "--format=esm",
          "--packages=external",
          `--outfile=build/${role}.js`,
        ],
        root
      );
    }
    return {
      root,
      serverEntry: join(root, "build/server.js"),
      asyncEntry: join(root, "build/async.js"),
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function run(command: string[], cwd: string): Promise<string> {
  const [file, ...args] = command;
  assert(file);
  const { stdout } = await execute(file, args, {
    cwd,
    env: { ...process.env, NO_COLOR: "1", GRIT_TELEMETRY_DISABLED: "true" },
    timeout: 120_000,
    killSignal: "SIGKILL",
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}
