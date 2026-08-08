import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const repositoryRoot = path.resolve(import.meta.dir, "../../../../../..");
const ruleId = "service_v1_public_face";
const patternPath = ".habitat/blueprints/service/components/spine/public-face.md";

test("service@1 public face accepts the canonical client and rejects every other package face", async () => {
  const findings = await checkLaw({
    "valid-direct-source/package.json": JSON.stringify({
      exports: { "./client": "./src/client.ts" },
    }),
    "valid-source-conditionals/package.json": JSON.stringify({
      exports: { "./client": { types: "./src/client.ts", default: "./src/client.ts" } },
    }),
    "valid-dist-conditionals/package.json": JSON.stringify({
      exports: { "./client": { types: "./dist/client.d.ts", default: "./dist/client.js" } },
    }),
    "valid-nested-conditionals/package.json": JSON.stringify({
      exports: {
        "./client": {
          node: { types: "./dist/client.d.ts", import: "./dist/client.mjs" },
          default: ["./dist/client.js", "./src/client.ts"],
        },
      },
    }),
    "invalid-missing/package.json": JSON.stringify({ name: "@example/missing-exports" }),
    "invalid-nonobject/package.json": JSON.stringify({ exports: "./src/client.ts" }),
    "invalid-root/package.json": JSON.stringify({ exports: { ".": "./src/client.ts" } }),
    "invalid-deep/package.json": JSON.stringify({
      exports: { "./client/internal": "./src/client.ts" },
    }),
    "invalid-private/package.json": JSON.stringify({
      exports: { "./private": "./src/client.ts" },
    }),
    "invalid-extra/package.json": JSON.stringify({
      exports: { "./client": "./src/client.ts", "./private": "./src/client.ts" },
    }),
    "invalid-target/package.json": JSON.stringify({
      exports: { "./client": "./src/service/router.ts" },
    }),
    "invalid-conditional-target/package.json": JSON.stringify({
      exports: {
        "./client": { types: "./dist/client.d.ts", default: "./dist/service/router.js" },
      },
    }),
    "invalid-fallback-target/package.json": JSON.stringify({
      exports: { "./client": ["./dist/client.js", "./dist/private.js"] },
    }),
    "invalid-empty-conditions/package.json": JSON.stringify({
      exports: { "./client": {} },
    }),
    "invalid-empty-fallbacks/package.json": JSON.stringify({
      exports: { "./client": [] },
    }),
    "invalid-nested-empty-conditions/package.json": JSON.stringify({
      exports: {
        "./client": { node: { types: "./dist/client.d.ts", default: {} } },
      },
    }),
    "invalid-primitive-leaf/package.json": JSON.stringify({
      exports: { "./client": { types: "./dist/client.d.ts", default: null } },
    }),
  });

  expect(findings).toEqual([
    "invalid-conditional-target/package.json",
    "invalid-deep/package.json",
    "invalid-empty-conditions/package.json",
    "invalid-empty-fallbacks/package.json",
    "invalid-extra/package.json",
    "invalid-fallback-target/package.json",
    "invalid-missing/package.json",
    "invalid-nested-empty-conditions/package.json",
    "invalid-nonobject/package.json",
    "invalid-primitive-leaf/package.json",
    "invalid-private/package.json",
    "invalid-root/package.json",
    "invalid-target/package.json",
  ]);
}, 30_000);

async function checkLaw(files: Readonly<Record<string, string>>): Promise<string[]> {
  const root = await mkdtemp(path.join(tmpdir(), "service-public-face-"));
  try {
    return await runGrit(root, files);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function runGrit(root: string, files: Readonly<Record<string, string>>): Promise<string[]> {
  const gritDirectory = path.join(root, ".grit");
  await mkdir(gritDirectory);
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents);
  }
  const markdown = await readFile(path.join(repositoryRoot, patternPath), "utf8");
  const program = markdown.match(/```grit\r?\n([\s\S]*?)\r?\n```/u)?.[1];
  if (program === undefined) throw new Error(`Missing Grit program for ${ruleId}`);
  await writeFile(
    path.join(gritDirectory, "grit.yaml"),
    `${JSON.stringify({ version: "0.0.2", patterns: [{ name: ruleId, level: "error", body: program }] })}\n`
  );
  const child = Bun.spawn(
    [
      gritEntrypoint,
      "--json",
      "check",
      "--no-cache",
      "--grit-dir",
      gritDirectory,
      ...Object.keys(files),
    ],
    { cwd: root, env: gritEnv(), stdout: "pipe", stderr: "pipe" }
  );
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, 25_000);
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]).finally(() => clearTimeout(timer));
  if (timedOut) throw new Error(`Grit timed out for ${ruleId}`);
  if (exitCode !== 0) throw new Error(`Grit failed for ${ruleId}: ${stderr || stdout}`);
  const report = parseReport(stderr, stdout) as { results: readonly { path: string }[] };
  return [...new Set(report.results.map((result) => result.path))].sort();
}

function gritEnv() {
  return {
    ...Bun.env,
    CLICOLOR: "0",
    FORCE_COLOR: "0",
    GRIT_DOWNLOADS_DISABLED: "true",
    GRIT_TELEMETRY_DISABLED: "true",
    NO_COLOR: "1",
  };
}

function parseReport(...outputs: string[]): unknown {
  const line = outputs
    .flatMap((output) => output.split(/\r?\n/u))
    .map((item) => item.trim())
    .find((item) => item.startsWith("{") && item.endsWith("}"));
  if (line === undefined) throw new Error(`Grit emitted no JSON report for ${ruleId}`);
  return JSON.parse(line);
}
