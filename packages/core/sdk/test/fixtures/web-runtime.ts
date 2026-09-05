import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { freePort } from "./async-native/dev-server.js";

const workspaceRoot = resolve(import.meta.dirname, "../../../../..");
const workspaceRequire = createRequire(join(workspaceRoot, "package.json"));
const execute = promisify(execFile);
const root = await realpath(await mkdtemp(join(tmpdir(), "habitat-web-native-")));
async function run(file: string, args: string[], cwd: string, env = process.env) {
  const result = await execute(file, args, {
    cwd,
    env: { ...env, NO_COLOR: "1" },
    timeout: 120_000,
    killSignal: "SIGKILL",
    maxBuffer: 10 * 1024 * 1024,
  });
  return result.stdout;
}
try {
  await cp(join(import.meta.dirname, "web-native"), join(root, "source"), { recursive: true });
  await mkdir(join(root, "artifacts"));
  await run(
    "bun",
    ["pm", "pack", "--ignore-scripts", "--quiet", "--filename", join(root, "artifacts/sdk.tgz")],
    join(workspaceRoot, "packages/core/sdk")
  );
  const versions: Record<string, string> = {};
  for (const name of ["effect", "typescript", "@types/node"]) {
    versions[name] = JSON.parse(
      await readFile(workspaceRequire.resolve(`${name}/package.json`), "utf8")
    ).version;
  }
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "habitat-web-native-proof",
      private: true,
      type: "module",
      dependencies: { "@habitat-ai/sdk": "file:./artifacts/sdk.tgz", effect: versions.effect },
      devDependencies: { typescript: versions.typescript, "@types/node": versions["@types/node"] },
    })
  );
  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify({
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
      include: ["source/**/*.ts"],
    })
  );
  await run("bun", ["install", "--ignore-scripts"], root);
  const localRequire = createRequire(join(root, "package.json"));
  const sdkManifest = await realpath(localRequire.resolve("@habitat-ai/sdk/package.json"));
  assert(!relative(root, sdkManifest).startsWith(".."), "SDK must be an isolated artifact");
  assert.equal(
    await realpath(createRequire(sdkManifest).resolve("effect/package.json")),
    await realpath(localRequire.resolve("effect/package.json")),
    "One ordinary native Effect dependency realm"
  );
  await run("bun", ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"], root);
  const receipts = [];
  for (const variant of ["unsplit", "split-minified"]) {
    await run(
      "bun",
      [
        "build",
        "./source/entry.ts",
        "--target=bun",
        "--format=esm",
        "--packages=external",
        `--outdir=${variant}`,
        ...(variant === "split-minified" ? ["--splitting", "--minify"] : []),
      ],
      root
    );
  }
  // Neither native build can fall back to route, HTML, JS or CSS sources at execution time.
  await rename(join(root, "source"), join(root, "unavailable-source"));
  for (const variant of ["unsplit", "split-minified"]) {
    const stdout = await run("bun", ["entry.js"], join(root, variant), {
      ...process.env,
      HABITAT_WEB_PORT: String(await freePort()),
    });
    const receipt = JSON.parse(stdout.trim().split("\n").at(-1)!);
    assert.equal(receipt.result, "PASS");
    receipts.push({ variant, ...receipt });
  }
  console.log(JSON.stringify({ result: "PASS", receipts }));
} finally {
  await rm(root, { recursive: true, force: true });
}
