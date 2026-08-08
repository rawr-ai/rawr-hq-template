import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const repositoryRoot = path.resolve(import.meta.dir, "../../../../../..");
const ruleId = "service_v1_source_boundary";
const patternPath = ".habitat/blueprints/service/components/funnel/source-boundary.md";

test("service@1 source boundary rejects only service-local lexical import direction violations", async () => {
  const findings = await checkLaw({
    "valid/src/client.ts": `
      import type { Inventory } from "@habitat-ai/resource-source-inventory";
      import type { Client } from "@example/catalog-service/client";
    `,
    "valid/src/service/modules/records/router/read.ts": `
      import { readPolicy } from "../model/policy/index.js";
      import { sharedPolicy } from "../../../model/policy/index.js";
      export const read = module.read.handler(() => ({ readPolicy, sharedPolicy }));
    `,
    "valid/src/service/db/stores/records.ts": `import { schema } from "../schema/records.js";`,
    "valid/src/service/middleware/stores.ts": `import { store } from "../db/stores/records.js";`,
    "valid-provider-module/src/service/router.ts": `
      import { router as providers } from "./modules/providers/router";
      export const router = impl.router({ providers });
    `,
    "nx-owned-provider-edge/src/service/base.ts": `
      import { make } from "@example/resource/providers/node";
      export const base = make();
    `,
    "effect-owned-extension/src/service/base.ts": `
      import "@orpc/experimental-effect/extensions/effect";
      export const base = os.$context<Context>();
    `,
    "effect-owned-terminal/src/service/modules/records/router/read.ts": `
      import { Effect } from "effect";
      export const read = module.read.handler(() => Effect.runPromise(program));
    `,
    "computed-source/src/service/base.ts": `
      const platform = "node:fs";
      export const load = () => import(platform);
    `,
    "invalid-sibling-root/src/service/modules/records/module.ts": `
      import { preview } from "../preview/module.js";
    `,
    "src/service/modules/records/router/read.ts": `
      import { preview } from "../../preview/model/policy/index.js";
    `,
    "invalid-sibling-model/src/service/modules/records/model/policy/read.ts": `
      import { preview } from "../../../preview/model/policy/index.js";
    `,
    "invalid-db-client/src/client.ts": `
      export { records } from "./service/db/stores/records.js";
    `,
    "invalid-db-root/src/service/base.ts": `
      import { records } from "./db/stores/records.js";
    `,
    "invalid-db-module/src/service/modules/records/router/read.ts": `
      const records = require("../../../db/stores/records.js");
    `,
    "invalid-proof/src/service/router.ts": `
      import { fixture } from "../../test/support/service/fixture.js";
    `,
    "invalid-proof-deep/src/service/modules/records/router/read.ts": `
      const fixture = import("../../../../../test/support/modules/records.js");
    `,
    "invalid-platform-node/src/service/base.ts": `
      import { readFile } from "node:fs";
    `,
    "invalid-platform-path/src/service/router.ts": `
      export { join } from "path";
    `,
    "invalid-platform-bun/src/client.ts": `
      const test = import("bun:test");
    `,
    "invalid-platform-effect/src/service/impl.ts": `
      const platform = require("@effect/platform-node/NodeContext");
    `,
  });

  expect(findings).toEqual([
    "invalid-db-client/src/client.ts",
    "invalid-db-module/src/service/modules/records/router/read.ts",
    "invalid-db-root/src/service/base.ts",
    "invalid-platform-bun/src/client.ts",
    "invalid-platform-effect/src/service/impl.ts",
    "invalid-platform-node/src/service/base.ts",
    "invalid-platform-path/src/service/router.ts",
    "invalid-proof-deep/src/service/modules/records/router/read.ts",
    "invalid-proof/src/service/router.ts",
    "invalid-sibling-model/src/service/modules/records/model/policy/read.ts",
    "invalid-sibling-root/src/service/modules/records/module.ts",
    "src/service/modules/records/router/read.ts",
  ]);
}, 30_000);

async function checkLaw(files: Readonly<Record<string, string>>): Promise<string[]> {
  const root = await mkdtemp(path.join(tmpdir(), "service-source-boundary-"));
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
    return [...new Set(report.results.map((result) => result.path))].sort();
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
