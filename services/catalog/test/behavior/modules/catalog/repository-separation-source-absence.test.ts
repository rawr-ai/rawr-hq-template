import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const repositoryRoot = path.resolve(import.meta.dir, "../../../../../..");
const ruleId = "require_repository_separation_predecessor_source_absence";
const patternPath =
  ".habitat/overlays/repository-separation/rules/require_repository_separation_predecessor_source_absence/pattern.md";

test("repository separation rejects source-spelled static ES predecessor specifiers", async () => {
  const findings = await checkLaw({
    "apps/habitat/src/invalid-static.ts": `
      import { legacy } from "@habitat-ai/rawr-dev";
    `,
    "packages/core/src/invalid-subpath.ts": `
      import type { Legacy } from "@habitat-ai/rawr-hq-sdk/client";
    `,
    "plugins/fixtures/invalid-reexport.ts": `
      export * from "@rawr/runtime-context/private";
    `,
    "resources/fixtures/runtime-loaders.ts": `
      export const dynamic = import("@rawr/web/runtime");
      module.exports = require('@rawr/test-utils/command');
      export const resolved = require.resolve("runtime-realization-type-env/runner");
      export const templateDynamic = import(\`@habitat-ai/rawr-session-intelligence/client\`);
      module.exports = require(\`@rawr/bootgraph/private\`);
      export const templateResolved = require.resolve(\`@habitat-ai/rawr-dev-node/fs\`);
    `,
    "apps/habitat/src/retired-identifiers.ts": `
      export class Legacy extends RawrCommand {}
      export const render = (result: RawrResult) => result;
      export const root = findWorkspaceRoot();
    `,
    "apps/habitat/src/current.ts": `
      import { HabitatCommand } from "@habitat-ai/cli/command";
      import type { Telemetry } from "@habitat-ai/rawr-core/telemetry";
      export { current } from "../../../packages/core/src/current.js";
    `,
    "apps/habitat/src/typescript-owned-resolution.ts": `
      import { escaped } from "@habitat-ai/ra\\x77r-dev";
      import Legacy = require("@habitat-ai/rawr-dev");
      export { escaped, Legacy };
    `,
    "services/catalog/src/computed.ts": `
      const selected = "@habitat-ai/rawr-hq-sdk/client";
      export const dynamic = import(selected);
      export const required = require(selected);
      export const resolved = require.resolve(selected);
      export const templateDynamic = import(\`@rawr/web/\${selected}\`);
      export const templateRequired = require(\`@rawr/web/\${selected}\`);
      export const templateResolved = require.resolve(\`@rawr/web/\${selected}\`);
    `,
    "tools/fixtures/ordinary-strings.ts": `
      export const history = ["RawrCommand", "RawrResult", "findWorkspaceRoot"];
      export const nearName = () => findWorkspaceRooted();
    `,
    "vitest.config.ts": `
      import { defineConfig } from "vitest/config";
      export default defineConfig({});
    `,
  });

  expect(findings).toEqual([
    "apps/habitat/src/invalid-static.ts",
    "packages/core/src/invalid-subpath.ts",
    "plugins/fixtures/invalid-reexport.ts",
  ]);
}, 30_000);

async function checkLaw(files: Readonly<Record<string, string>>): Promise<string[]> {
  const root = await mkdtemp(path.join(tmpdir(), "repository-separation-source-"));
  try {
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
    return [
      ...new Set(
        report.results.map((result) =>
          (path.isAbsolute(result.path)
            ? path.relative(root, result.path)
            : result.path
          ).replaceAll(path.sep, "/")
        )
      ),
    ].sort();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
