import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const repositoryRoot = path.resolve(import.meta.dir, "../../../../../..");
const ruleId = "service_v1_router_composition";
const patternPath = ".habitat/blueprints/service/components/funnel/router.md";

test("service@1 router composition accepts native and official local authorship only", async () => {
  const findings = await checkLaw({
    "valid/src/service/modules/records/router.ts": `
      import { read } from "./router/read.js";
      export const router = { read };
    `,
    "valid-aliased/src/service/modules/packaging/router.ts": `
      import { package as packageOperation } from "./router/package";
      export const router = { package: packageOperation };
    `,
    "valid-native/src/service/modules/records/router/read.ts": `
      import { module } from "../module";
      export const read = module.read.handler(({ context }) => context.records.read());
    `,
    "valid-native-function/src/service/modules/records/router/read.ts": `
      import { module } from "../module";
      export const read = module.read.handler(async function ({ context }) {
        return context.records.read();
      });
    `,
    "valid-effect/src/service/modules/records/router/read.ts": `
      import { module } from "../module";
      export const read = module.read.effect(function* ({ context }) {
        return yield* context.records.read();
      });
    `,
    "valid-effect-local-export/src/service/modules/packaging/router/package.ts": `
      import { module } from "../module";
      const packageOperation = module.package.effect(function* ({ context }) {
        return yield* context.packaging.write();
      });
      export { packageOperation as package };
    `,
    "valid/src/service/router.ts": `
      import { impl } from "./impl";
      import { router as records } from "./modules/records/router.js";
      export const router = impl.router({ records });
    `,
    "invalid-custom-adapter/src/service/modules/records/router/read.ts": `
      import { module } from "../module";
      export const read = module.read.handler(customAdapter(function* () { return "ready"; }));
    `,
    "invalid-handlergen/src/service/modules/records/router/read.ts": `
      import { handlerGen } from "@orpc/experimental-effect";
      import { module } from "../module";
      export const read = module.read.handler(handlerGen(function* () { return "ready"; }));
    `,
    "invalid-detached-effect/src/service/modules/records/router/read.ts": `
      import { module } from "../module";
      const readHandler = function* () { return "ready"; };
      export const read = module.read.effect(readHandler);
    `,
    "invalid-detached-native/src/service/modules/records/router/read.ts": `
      import { module } from "../module";
      const handler = () => "ready";
      export const read = module.read.handler(handler);
    `,
    "invalid-incidental-operation/src/service/modules/records/router/read.ts": `
      import { module } from "../module";
      module.read.handler(() => "ready");
      export const read = preview.read.handler(() => "detached");
    `,
    "invalid-incidental-local-export/src/service/modules/packaging/router/package.ts": `
      import { module } from "../module";
      const packageOperation = module.package.effect(function* () { return "ready"; });
      const detachedPackage = preview.package.effect(function* () { return "detached"; });
      export { detachedPackage as package };
    `,
    "invalid-module-router/src/service/modules/records/router.ts": `export const router = { read };`,
    "invalid-root-router/src/service/router.ts": `export const router = impl.router({ preview });`,
    "invalid-incidental-root-router/src/service/router.ts": `
      import { impl } from "./impl";
      import { router as records } from "./modules/records/router.js";
      impl.router({ records });
      export const router = preview.router({ records });
    `,
  });

  expect(findings).toEqual([
    "invalid-custom-adapter/src/service/modules/records/router/read.ts",
    "invalid-detached-effect/src/service/modules/records/router/read.ts",
    "invalid-detached-native/src/service/modules/records/router/read.ts",
    "invalid-handlergen/src/service/modules/records/router/read.ts",
    "invalid-incidental-local-export/src/service/modules/packaging/router/package.ts",
    "invalid-incidental-operation/src/service/modules/records/router/read.ts",
    "invalid-incidental-root-router/src/service/router.ts",
    "invalid-module-router/src/service/modules/records/router.ts",
    "invalid-root-router/src/service/router.ts",
  ]);
}, 30_000);

async function checkLaw(files: Readonly<Record<string, string>>): Promise<string[]> {
  const root = await mkdtemp(path.join(tmpdir(), "service-router-composition-"));
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
