import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const repositoryRoot = path.resolve(import.meta.dir, "../../../../../..");
const ruleId = "service_v1_effect_bridge";
const patternPath = ".habitat/blueprints/service/components/funnel/effect-bridge.md";

test("service@1 Effect bridge owns bootstrap placement and execution terminal provenance", async () => {
  const findings = await checkLaw({
    "valid-bootstrap/src/service/impl.ts": `
      import "@orpc/experimental-effect/extensions/effect";
      export const service = base.use(auth).use(stores);
    `,
    "valid-effect-handler/src/service/modules/records/router/read.ts": `
      export const read = module.read.effect(function* ({ context }) {
        return yield* context.inventory;
      });
    `,
    "valid-native-handler/src/service/modules/records/router/read.ts": `
      export const read = module.read.handler(async () => Promise.resolve("ready"));
    `,
    "valid-native-only/src/service/impl.ts": `
      export const service = impl;
    `,
    "valid-unrelated-runner/src/service/modules/records/router/read.ts": `
      import { taskRunner } from "@example/task-runner";
      export const read = () => taskRunner.runPromise(program);
    `,
    "valid-unrelated-import/src/client.ts": `
      import { runPromise } from "@example/task-runner";
      export const read = () => runPromise(program);
    `,
    "valid-effect-api/src/service/modules/records/router/read.ts": `
      import { Effect } from "effect";
      export const program = Effect.succeed("ready").pipe(Effect.map(String));
    `,
    "valid-proof/test/support/service/fixture.ts": `
      import { Effect } from "effect";
      export const run = () => Effect.runPromise(program);
    `,
    "src/service/base.ts": `
      import "@orpc/experimental-effect/extensions/effect";
      export const base = os.$context<Context>();
    `,
    "invalid-bootstrap-client/src/client.ts": `
      void import("@orpc/experimental-effect/extensions/effect");
    `,
    "invalid-bootstrap-reexport/src/service/router.ts": `
      export * from "@orpc/experimental-effect/extensions/effect";
    `,
    "invalid-bootstrap-require/src/service/middleware/telemetry.ts": `
      require("@orpc/experimental-effect/extensions/effect");
    `,
    "invalid-runner/src/service/modules/records/router/read.ts": `
      import { Effect } from "effect";
      export const read = module.read.handler(() => Effect.runPromise(program));
    `,
    "invalid-runner-alias/src/service/modules/records/router/read.ts": `
      import { Effect as Fx } from "effect";
      export const read = module.read.handler(() => Fx.runPromise(program));
    `,
    "invalid-extracted-runner/src/service/modules/records/router/read.ts": `
      import { Effect } from "effect";
      const execute = Effect.runPromise;
      export const read = module.read.handler(() => execute(program));
    `,
    "invalid-imported-runner/src/service/modules/records/router/read.ts": `
      import { runPromise as execute } from "effect/Effect";
      export const read = module.read.handler(() => execute(program));
    `,
    "invalid-imported-runner-direct/src/service/modules/records/router/read.ts": `
      import { runPromise } from "effect/Effect";
      export const read = module.read.handler(() => runPromise(program));
    `,
    "invalid-module-runner/src/service/modules/records/router/read.ts": `
      import * as EffectModule from "effect/Effect";
      const execute = EffectModule.runPromise;
      export const read = module.read.handler(() => execute(program));
    `,
    "invalid-root-module-runner/src/service/modules/records/router/read.ts": `
      import * as Effects from "effect";
      const execute = Effects.Effect.runPromise;
      export const read = module.read.handler(() => execute(program));
    `,
    "invalid-official-terminal/src/service/modules/records/router/read.ts": `
      import { runPromise } from "@orpc/experimental-effect";
      export const read = module.read.handler(() => runPromise(program));
    `,
    "invalid-custom-promise-bridge/src/service/modules/records/router/read.ts": `
      import { Effect } from "effect";
      const execute = (program: Effect.Effect<string>) =>
        new Promise((resolve) => Effect.runCallback(program, { onExit: resolve }));
      export const read = module.read.handler(() => execute(program));
    `,
    "invalid-client-runner/src/client.ts": `
      import { Effect } from "effect";
      export const read = () => Effect.runPromise(program);
    `,
    "invalid-impl-runner/src/service/impl.ts": `
      import { runPromise } from "effect/Effect";
      export const service = runPromise(program);
    `,
    "invalid-middleware-runner/src/service/middleware/telemetry.ts": `
      import { Effect as Fx } from "effect";
      export const middleware = base.middleware(() => Fx.runSync(program));
    `,
  });

  expect(findings).toEqual([
    "invalid-bootstrap-client/src/client.ts",
    "invalid-bootstrap-reexport/src/service/router.ts",
    "invalid-bootstrap-require/src/service/middleware/telemetry.ts",
    "invalid-client-runner/src/client.ts",
    "invalid-custom-promise-bridge/src/service/modules/records/router/read.ts",
    "invalid-extracted-runner/src/service/modules/records/router/read.ts",
    "invalid-impl-runner/src/service/impl.ts",
    "invalid-imported-runner-direct/src/service/modules/records/router/read.ts",
    "invalid-imported-runner/src/service/modules/records/router/read.ts",
    "invalid-middleware-runner/src/service/middleware/telemetry.ts",
    "invalid-module-runner/src/service/modules/records/router/read.ts",
    "invalid-official-terminal/src/service/modules/records/router/read.ts",
    "invalid-root-module-runner/src/service/modules/records/router/read.ts",
    "invalid-runner-alias/src/service/modules/records/router/read.ts",
    "invalid-runner/src/service/modules/records/router/read.ts",
    "src/service/base.ts",
  ]);
}, 30_000);

async function checkLaw(files: Readonly<Record<string, string>>): Promise<string[]> {
  const root = await mkdtemp(path.join(tmpdir(), "service-effect-bridge-"));
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
