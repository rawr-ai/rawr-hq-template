import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const repositoryRoot = path.resolve(import.meta.dir, "../../../../../..");
const ruleId = "service_v1_contract_composition";
const patternPath = ".habitat/blueprints/service/components/contract/composition.md";

test("service@1 contract composition accepts adjacent aggregation and rejects broken contract joins", async () => {
  const findings = await checkLaw({
    "valid/src/service/contract.ts": `
      import { oc } from "@orpc/contract";
      import { contract as records } from "./modules/records/contract/index.js";
      export const contract = oc.router({ records });
    `,
    "valid-meta/src/service/contract.ts": `
      import { oc as contractBuilder } from "@orpc/contract";
      import { contract as records } from "./modules/records/contract";
      export const contract = contractBuilder.meta(metadata).router({ records });
    `,
    "valid-routes/src/service/contract.ts": `
      import { oc } from "@orpc/contract";
      import { contract as records } from "./modules/records/contract";
      const routes: { records: typeof records } = { records };
      export const contract = oc.router(routes);
    `,
    "valid-untyped-routes/src/service/contract.ts": `
      import { oc } from "@orpc/contract";
      import { contract as records } from "./modules/records/contract";
      const routes = { records };
      export const contract = oc.router(routes);
    `,
    "valid/src/service/modules/records/contract/index.ts": `
      import { catalog } from "./catalog.js";
      export const contract: typeof catalog = { ...catalog };
    `,
    "valid-aliased/src/service/modules/packaging/contract/index.ts": `
      import { package as packageContract } from "./package";
      export const contract = { package: packageContract };
    `,
    "invalid-contract/src/service/contract.ts": `export const contract = oc.router({ preview });`,
    "invalid-routes/src/service/contract.ts": `
      import { oc } from "@orpc/contract";
      import { contract as records } from "./modules/records/contract";
      const routes = { preview };
      export const contract = oc.router(routes);
    `,
    "invalid-decoy-provenance/src/service/contract.ts": `
      import { oc } from "@example/contract";
      import { contract as records } from "./modules/records/contract";
      const provenance = "@orpc/contract";
      export const contract = oc.router({ records });
    `,
    "invalid-incidental-native/src/service/contract.ts": `
      import { oc } from "@orpc/contract";
      import { contract as records } from "./modules/records/contract";
      export const contract = detached.meta(oc.meta(metadata)).router({ records });
    `,
    "invalid-module-contract/src/service/modules/records/contract/index.ts": `
      import { catalog } from "./catalog";
      export const contract = { preview };
    `,
  });

  expect(findings).toEqual([
    "invalid-contract/src/service/contract.ts",
    "invalid-decoy-provenance/src/service/contract.ts",
    "invalid-incidental-native/src/service/contract.ts",
    "invalid-module-contract/src/service/modules/records/contract/index.ts",
    "invalid-routes/src/service/contract.ts",
  ]);
}, 30_000);

async function checkLaw(files: Readonly<Record<string, string>>): Promise<string[]> {
  const root = await mkdtemp(path.join(tmpdir(), "service-contract-composition-"));
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
