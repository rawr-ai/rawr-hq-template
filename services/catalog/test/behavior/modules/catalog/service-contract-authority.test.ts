import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const repositoryRoot = path.resolve(import.meta.dir, "../../../../../..");
const ruleId = "service_v1_contract_authority";
const patternPath = ".habitat/blueprints/service/components/contract/authority.md";

test("service@1 contract authority accepts native optional schemas and rejects alternate schema authority", async () => {
  const findings = await checkLaw({
    "valid-alias/src/service/modules/records/contract/read.ts": `
      import { standard as adapt } from "@habitat-ai/sdk/service/schema";
      import { oc as contract } from "@orpc/contract";
      import { Type as T } from "typebox";
      import { Record } from "../model/dto/record.js";
      export const read = contract
        .input(adapt(T.Object({ id: T.String({ description: "Record id." }) })))
        .output(adapt(Record));
    `,
    "valid-input-only/src/service/modules/records/contract/read.ts": `
      import { standard } from "@habitat-ai/sdk/service/schema";
      import { oc } from "@orpc/contract";
      import { ReadInput } from "../model/dto/record.js";
      export const read = oc.input(standard(ReadInput));
    `,
    "valid-detached-errors/src/service/modules/records/contract/read.ts": `
      import { oc } from "@orpc/contract";
      const failures = { NOT_FOUND: { message: "Record not found" } };
      export const read = oc.errors(failures);
    `,
    "valid-group/src/service/modules/records/contract/records.ts": `
      import { standard } from "@habitat-ai/sdk/service/schema";
      import { oc } from "@orpc/contract";
      import { ReadInput, ReadOutput } from "../model/dto/record.js";
      export const records = {
        read: oc.input(standard(ReadInput)).output(standard(ReadOutput)),
      };
    `,
    "invalid-unwrapped/src/service/modules/records/contract/read.ts": `
      import { standard } from "@habitat-ai/sdk/service/schema";
      import { oc } from "@orpc/contract";
      import { Type } from "typebox";
      export const read = oc.input(Type.String());
    `,
    "invalid-bridge/src/service/modules/records/contract/read.ts": `
      import { standard } from "@example/schema";
      import { oc } from "@orpc/contract";
      import { Type } from "typebox";
      export const read = oc.output(standard(Type.String()));
    `,
    "invalid-description/src/service/modules/records/contract/read.ts": `
      import { standard } from "@habitat-ai/sdk/service/schema";
      import { oc } from "@orpc/contract";
      import { Type } from "typebox";
      export const read = oc.input(standard(Type.Object({ id: Type.String() })));
    `,
    "invalid-error-data/src/service/modules/records/contract/read.ts": `
      import { standard } from "@habitat-ai/sdk/service/schema";
      import { oc } from "@orpc/contract";
      import { Type } from "typebox";
      export const read = oc.errors({ NOT_FOUND: { message: "Missing", data: Type.String() } });
    `,
    "invalid-detached-root/src/service/modules/records/contract/read.ts": `
      import { standard } from "@habitat-ai/sdk/service/schema";
      import { oc } from "@orpc/contract";
      import { Type } from "typebox";
      export const read = detached.input(standard(Type.String()));
    `,
    "invalid-decoy-provenance/src/service/modules/records/contract/read.ts": `
      import { standard } from "@habitat-ai/sdk/service/schema";
      import { oc } from "@example/contract";
      import { Type } from "typebox";
      const provenance = "@orpc/contract";
      export const read = oc.input(standard(Type.String()));
    `,
    "invalid-incidental-native/src/service/modules/records/contract/read.ts": `
      import { oc } from "@orpc/contract";
      export const read = detached.errors({
        NOT_FOUND: { message: oc.meta(metadata) },
      });
    `,
  });

  expect(findings).toEqual([
    "invalid-bridge/src/service/modules/records/contract/read.ts",
    "invalid-decoy-provenance/src/service/modules/records/contract/read.ts",
    "invalid-description/src/service/modules/records/contract/read.ts",
    "invalid-detached-root/src/service/modules/records/contract/read.ts",
    "invalid-error-data/src/service/modules/records/contract/read.ts",
    "invalid-incidental-native/src/service/modules/records/contract/read.ts",
    "invalid-unwrapped/src/service/modules/records/contract/read.ts",
  ]);
}, 30_000);

async function checkLaw(files: Readonly<Record<string, string>>): Promise<string[]> {
  const root = await mkdtemp(path.join(tmpdir(), "service-contract-authority-"));
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
