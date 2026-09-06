import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const repositoryRoot = path.resolve(import.meta.dir, "../../../../../..");
const contextLanes = ["deps", "scope", "config", "invocation", "provided"] as const;
const context = `export type Context = { ${contextLanes.map((lane) => `readonly ${lane}: object;`).join(" ")} };`;

test.each([
  1, 3, 4,
] as const)("service@%i context funnel accepts terminal curation and rejects broken capability descent", async (version) => {
  const findings = await checkLaw(version, {
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

test("service@4 admits an author-free Context while service@3 still requires the base value", async () => {
  const files = {
    "plain/src/service/base.ts": context,
    "with-type-import/src/service/base.ts": `import type { EffectContext } from "@habitat-ai/sdk/effect/context"; ${context}`,
  };
  expect(await checkLaw(3, files)).toEqual(Object.keys(files).sort());
  expect(await checkLaw(4, files)).toEqual([]);
}, 30_000);

test("service@4 keeps all five lanes mandatory and qualifies every present native base", async () => {
  const files: Record<string, string> = {
    "valid-author/src/service/base.ts": `import { os } from "@orpc/server"; ${context} export const base = os.$context<Context>();`,
    "valid-alias/src/service/base.ts": `import { implement, os as native } from '@orpc/server'; ${context} export const base = native.$context<Context>();`,
    "valid-plain/src/service/base.ts": `export type Context = { deps: object; scope: object; config: object; invocation: object; provided: object; };`,
    "valid-native-context/src/service/impl.ts": `
      import "@habitat-ai/sdk/plugins/server/effect";
      import type { EffectContext } from "@habitat-ai/sdk/effect/context";
      import { implement } from "@orpc/server";
      import type { Context as ServiceContext } from "./base";
      import { contract } from "./contract";
      type Context = ServiceContext & { readonly "effect/context": EffectContext<never> };
      export const impl = implement(contract).$context<Context>();
      export const service = impl;
    `,
    "invalid-no-context/src/service/base.ts": `export const ready = true;`,
    "invalid-source/src/service/base.ts": `import { os } from "@example/orpc"; ${context} export const base = os.$context<Context>();`,
    "invalid-export-name/src/service/base.ts": `import { implement as os } from "@orpc/server"; ${context} export const base = os.$context<Context>();`,
    "invalid-export-alias/src/service/base.ts": `import { implement as native } from "@orpc/server"; ${context} export const base = native.$context<Context>();`,
    "invalid-default/src/service/base.ts": `import os from "@orpc/server"; ${context} export const base = os.$context<Context>();`,
    "invalid-local/src/service/base.ts": `const os = preview; ${context} export const base = os.$context<Context>();`,
    "invalid-value/src/service/base.ts": `import { os } from "@orpc/server"; ${context} export const base = preview;`,
    "invalid-generic/src/service/base.ts": `import { os } from "@orpc/server"; ${context} export const base = os.$context<object>();`,
    "invalid-incidental/src/service/base.ts": `import { os } from "@orpc/server"; ${context} os.$context<Context>(); export const base = preview;`,
    "invalid-let/src/service/base.ts": `import { os } from "@orpc/server"; ${context} export let base = os.$context<Context>();`,
    "invalid-var/src/service/base.ts": `import { os } from "@orpc/server"; ${context} export var base = os.$context<Context>();`,
    "invalid-function/src/service/base.ts": `${context} export function base() { return preview; }`,
    "invalid-class/src/service/base.ts": `${context} export class base { static middleware = preview; }`,
    "invalid-reexport/src/service/base.ts": `${context} export { base } from "./preview";`,
    "invalid-reexport-alias/src/service/base.ts": `${context} export { preview as base } from "./preview";`,
    "invalid-reexport-namespace/src/service/base.ts": `${context} export * as base from "./preview";`,
    "invalid-local-export/src/service/base.ts": `${context} const base = preview; export { base };`,
  };
  for (const lane of contextLanes) {
    const incomplete = context.replace(`readonly ${lane}: object;`, "");
    files[`invalid-missing-${lane}/src/service/base.ts`] = incomplete;
    files[`invalid-author-missing-${lane}/src/service/base.ts`] =
      `import { os } from "@orpc/server"; ${incomplete} export const base = os.$context<Context>();`;
  }
  expect(await checkLaw(4, files)).toEqual(
    Object.keys(files)
      .filter((filename) => filename.startsWith("invalid-"))
      .sort()
  );
}, 30_000);

async function checkLaw(
  version: 1 | 3 | 4,
  files: Readonly<Record<string, string>>
): Promise<string[]> {
  const ruleId = `service_v${version}_context_funnel`;
  const patternRoot =
    version === 1
      ? ".habitat/blueprints/service"
      : `.habitat/blueprints/service/versions/${version}`;
  const patternPath = `${patternRoot}/components/funnel/context.md`;
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
    const report = parseReport(ruleId, stderr, stdout) as { results: readonly { path: string }[] };
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

function parseReport(ruleId: string, ...outputs: string[]): unknown {
  const line = outputs
    .flatMap((output) => output.split(/\r?\n/u))
    .map((item) => item.trim())
    .find((item) => item.startsWith("{") && item.endsWith("}"));
  if (line === undefined) throw new Error(`Grit emitted no JSON report for ${ruleId}`);
  return JSON.parse(line);
}
