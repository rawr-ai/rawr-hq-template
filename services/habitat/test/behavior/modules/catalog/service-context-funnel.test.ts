import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const repositoryRoot = path.resolve(import.meta.dir, "../../../../../..");
const ruleId = "service_v1_context_funnel";
const patternPath = ".habitat/blueprints/service/components/funnel/context.md";

test("service@1 context funnel accepts terminal curation and rejects broken capability descent", async () => {
  const findings = await checkLaw({
    "valid/src/service/base.ts": `
      import { os } from "@orpc/server";
      export type Context = { readonly deps: object; readonly scope: object; readonly config: object; readonly invocation: object; readonly provided: object; };
      export const base = os.$context<Context>();
    `,
    "valid-plain/src/service/base.ts": `
      import { os } from "@orpc/server";
      export type Context = { deps: object; scope: object; config: object; invocation: object; provided: object; };
      export const base = os.$context<Context>();
    `,
    "valid/src/service/impl.ts": `
      import { implement } from "@orpc/server";
      import { contract } from "./contract.js";
      export const impl = implement(contract).$context<Context>();
      export const service = impl;
    `,
    "valid-chain/src/service/impl.ts": `
      import { implement } from "@orpc/server";
      import { contract } from "./contract";
      export const impl = implement(contract).$context<Context>();
      export const service = impl.use(observability).use(analytics);
    `,
    "valid/src/service/middleware/telemetry.ts": `
      import { base } from "../base.js";
      export const middleware = base.middleware(({ next }) => next());
    `,
    "valid/src/service/modules/records/module.ts": `
      import { service } from "../../impl";
      export const module = service.records.use(async ({ context, next }) =>
        next({ context: { records: context.deps.records } }));
    `,
    "valid-policy-chain/src/service/modules/catalog/module.ts": `
      import { service } from "../../impl";
      export const module = service.catalog.use(currentCatalog).use(async ({ context, next }) =>
        next({ context: { catalog: context.deps.catalog } }));
    `,
    "invalid-base/src/service/base.ts": `export type Context = { readonly deps: object };`,
    "invalid-impl/src/service/impl.ts": `export const impl = implement(preview);`,
    "invalid-service-root/src/service/impl.ts": `
      import { implement } from "@orpc/server";
      import { contract } from "./contract";
      export const impl = implement(contract).$context<Context>();
      export const service = preview.use(observability);
    `,
    "invalid-middleware/src/service/middleware/telemetry.ts": `export const middleware = preview.middleware(run);`,
    "invalid-incidental-middleware/src/service/middleware/telemetry.ts": `
      import { base } from "../base.js";
      base.middleware(({ next }) => next());
      export const middleware = preview.middleware(run);
    `,
    "invalid-branch/src/service/modules/records/module.ts": `
      export const module = service.preview.use(async ({ context, next }) =>
        next({ context: { records: context.deps.records } }));
    `,
    "invalid-empty/src/service/modules/records/module.ts": `
      export const module = service.records.use(async ({ next }) => next({ context: {} }));
    `,
    "invalid-incidental-module/src/service/modules/records/module.ts": `
      import { service } from "../../impl";
      service.records.use(async ({ context, next }) =>
        next({ context: { records: context.deps.records } }));
      export const module = service.preview.use(run);
    `,
    "invalid-raw/src/service/modules/records/router/read.ts": `
      export const read = module.read.handler(({ context }) => context.deps.records.read());
    `,
  });

  expect(findings).toEqual([
    "invalid-base/src/service/base.ts",
    "invalid-branch/src/service/modules/records/module.ts",
    "invalid-empty/src/service/modules/records/module.ts",
    "invalid-impl/src/service/impl.ts",
    "invalid-incidental-middleware/src/service/middleware/telemetry.ts",
    "invalid-incidental-module/src/service/modules/records/module.ts",
    "invalid-middleware/src/service/middleware/telemetry.ts",
    "invalid-raw/src/service/modules/records/router/read.ts",
    "invalid-service-root/src/service/impl.ts",
  ]);
}, 30_000);

async function checkLaw(files: Readonly<Record<string, string>>): Promise<string[]> {
  const root = await mkdtemp(path.join(tmpdir(), "service-context-funnel-"));
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
