import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const repositoryRoot = path.resolve(import.meta.dir, "../../../../..");
const ruleId = "service_v3_effect_bridge";
const patternPath = ".habitat/blueprints/service/versions/3/components/funnel/effect-bridge.md";
const effectExecutionTerminals = [
  "runFork",
  "runForkWith",
  "runCallback",
  "runCallbackWith",
  "runPromise",
  "runPromiseWith",
  "runPromiseExit",
  "runPromiseExitWith",
  "runSync",
  "runSyncWith",
  "runSyncExit",
  "runSyncExitWith",
] as const;

test("service@3 admits only the SDK Effect bootstrap at the service implementation", async () => {
  const findings = await checkLaw({
    "valid-facade/src/service/impl.ts": `
      import "@habitat-ai/sdk/plugins/server/effect";
      export const service = base.use(auth).use(stores);
    `,
    "valid-native-only/src/service/impl.ts": `
      export const service = impl;
    `,
    "valid-effect-handler/src/service/modules/records/router/read.ts": `
      export const read = module.read.effect(function* ({ context }) {
        return yield* context.inventory;
      });
    `,
    "valid-effect-api/src/service/modules/records/router/read.ts": `
      import { Effect } from "effect";
      export const program = Effect.succeed("ready").pipe(Effect.map(String));
    `,
    "valid-exact-names/src/service/modules/records/router/read.ts": `
      import { ManagedRuntimeFactory, runPromiseLater } from "effect";
      export { ManagedRuntimeFactory, runPromiseLater };
    `,
    "valid-unrelated-handler/src/service/modules/records/router/read.ts": `
      import { handlerGen } from "@example/effect-bridge";
      export const read = module.read.handler(handlerGen(program));
    `,
    "invalid-vendor-impl/src/service/impl.ts": `
      import "@orpc/experimental-effect/extensions/effect";
      export const service = impl;
    `,
    "invalid-vendor-base/src/service/base.ts": `
      void import("@orpc/experimental-effect/extensions/effect");
    `,
    "invalid-vendor-reexport/src/service/router.ts": `
      export * from "@orpc/experimental-effect/extensions/effect";
    `,
    "invalid-vendor-require/src/service/middleware/telemetry.ts": `
      require("@orpc/experimental-effect/extensions/effect");
    `,
    "invalid-facade-client/src/client.ts": `
      void import("@habitat-ai/sdk/plugins/server/effect");
    `,
    "invalid-facade-base/src/service/base.ts": `
      import "@habitat-ai/sdk/plugins/server/effect";
    `,
    "invalid-facade-reexport/src/service/router.ts": `
      export * from "@habitat-ai/sdk/plugins/server/effect";
    `,
    "invalid-facade-require/src/service/middleware/telemetry.ts": `
      require("@habitat-ai/sdk/plugins/server/effect");
    `,
    "invalid-facade-dynamic-impl/src/service/impl.ts": `
      void import("@habitat-ai/sdk/plugins/server/effect");
      export const service = impl;
    `,
    "invalid-facade-require-impl/src/service/impl.ts": `
      require("@habitat-ai/sdk/plugins/server/effect");
      export const service = impl;
    `,
    "invalid-facade-reexport-impl/src/service/impl.ts": `
      export * from "@habitat-ai/sdk/plugins/server/effect";
    `,
    "invalid-facade-binding-impl/src/service/impl.ts": `
      import * as effectBootstrap from "@habitat-ai/sdk/plugins/server/effect";
      export const service = effectBootstrap;
    `,
    "invalid-facade-attribute-impl/src/service/impl.ts": `
      import "@habitat-ai/sdk/plugins/server/effect" with { type: "json" };
      export const service = impl;
    `,
    "invalid-facade-duplicate-impl/src/service/impl.ts": `
      import "@habitat-ai/sdk/plugins/server/effect";
      import "@habitat-ai/sdk/plugins/server/effect";
      export const service = impl;
    `,
    "invalid-handler-gen/src/service/modules/records/router/read.ts": `
      import { handlerGen } from "@orpc/experimental-effect";
      export const read = module.read.handler(handlerGen(program));
    `,
    "invalid-handler-gen-alias/src/service/modules/records/router/read.ts": `
      import { handlerGen as adapt } from "@orpc/experimental-effect";
      export const read = module.read.handler(adapt(program));
    `,
    "invalid-handler-gen-namespace/src/service/modules/records/router/read.ts": `
      import * as bridge from "@orpc/experimental-effect";
      export const read = module.read.handler(bridge.handlerGen(program));
    `,
    "invalid-handler-gen-reexport/src/service/router.ts": `
      export { handlerGen } from "@orpc/experimental-effect";
    `,
    "invalid-vendor-root-dynamic/src/service/modules/records/router/read.ts": `
      void import("@orpc/experimental-effect");
    `,
    "invalid-vendor-root-require/src/service/modules/records/router/read.ts": `
      require("@orpc/experimental-effect");
    `,
    "invalid-vendor-subpath/src/service/modules/records/router/read.ts": `
      export * from "@orpc/experimental-effect/internal";
    `,
    "invalid-terminal/src/service/modules/records/router/read.ts": `
      import { Effect } from "effect";
      export const read = module.read.handler(() => Effect.runPromiseWith(program));
    `,
    "invalid-terminal-alias/src/service/modules/records/router/read.ts": `
      import { Effect as Fx } from "effect";
      export const read = module.read.handler(() => Fx.runSyncWith(program));
    `,
    "invalid-imported-terminal/src/service/modules/records/router/read.ts": `
      import { runPromiseExitWith as execute } from "effect/Effect";
      export const read = module.read.handler(() => execute(program));
    `,
    "invalid-imported-terminal-direct/src/service/modules/records/router/read.ts": `
      import { runSyncExitWith } from "effect";
      export const read = module.read.handler(() => runSyncExitWith(program));
    `,
    "invalid-terminal-namespace/src/service/modules/records/router/read.ts": `
      import * as Fx from "effect/Effect";
      export const read = module.read.handler(() => Fx.runForkWith(program));
    `,
    "invalid-terminal-root-namespace/src/service/modules/records/router/read.ts": `
      import * as Effects from "effect";
      export const read = module.read.handler(() => Effects.Effect.runCallbackWith(program));
    `,
    "invalid-managed-root/src/service/modules/records/router/read.ts": `
      import { ManagedRuntime } from "effect";
      export const runtime = ManagedRuntime.make(layer);
    `,
    "invalid-managed-root-alias/src/service/modules/records/router/read.ts": `
      import { ManagedRuntime as Runtime } from "effect";
      export const runtime = Runtime.make(layer);
    `,
    "invalid-managed-root-namespace/src/service/modules/records/router/read.ts": `
      import * as Effects from "effect";
      export const runtime = Effects.ManagedRuntime.make(layer);
    `,
    "invalid-managed-subpath/src/service/modules/records/router/read.ts": `
      import { make } from "effect/ManagedRuntime";
      export const runtime = make(layer);
    `,
    "invalid-managed-subpath-namespace/src/service/modules/records/router/read.ts": `
      import * as Runtime from "effect/ManagedRuntime";
      export const runtime = Runtime.make(layer);
    `,
    "invalid-managed-subpath-dynamic/src/service/modules/records/router/read.ts": `
      void import("effect/ManagedRuntime");
    `,
    "invalid-managed-subpath-reexport/src/service/modules/records/router/read.ts": `
      export * from "effect/ManagedRuntime";
    `,
    "invalid-managed-subpath-required/src/service/modules/records/router/read.ts": `
      require("effect/ManagedRuntime");
    `,
    ...Object.fromEntries(
      effectExecutionTerminals.map((terminal) => [
        `invalid-exact-terminal-${terminal}/src/service/modules/records/router/read.ts`,
        `import { Effect } from "effect"; export const read = () => Effect.${terminal}(program);`,
      ])
    ),
  });

  expect(findings).toEqual(
    [
      "invalid-facade-attribute-impl/src/service/impl.ts",
      "invalid-facade-base/src/service/base.ts",
      "invalid-facade-binding-impl/src/service/impl.ts",
      "invalid-facade-client/src/client.ts",
      "invalid-facade-duplicate-impl/src/service/impl.ts",
      "invalid-facade-dynamic-impl/src/service/impl.ts",
      "invalid-facade-reexport-impl/src/service/impl.ts",
      "invalid-facade-reexport/src/service/router.ts",
      "invalid-facade-require-impl/src/service/impl.ts",
      "invalid-facade-require/src/service/middleware/telemetry.ts",
      "invalid-handler-gen-alias/src/service/modules/records/router/read.ts",
      "invalid-handler-gen-namespace/src/service/modules/records/router/read.ts",
      "invalid-handler-gen-reexport/src/service/router.ts",
      "invalid-handler-gen/src/service/modules/records/router/read.ts",
      "invalid-imported-terminal-direct/src/service/modules/records/router/read.ts",
      "invalid-imported-terminal/src/service/modules/records/router/read.ts",
      "invalid-managed-root-alias/src/service/modules/records/router/read.ts",
      "invalid-managed-root-namespace/src/service/modules/records/router/read.ts",
      "invalid-managed-root/src/service/modules/records/router/read.ts",
      "invalid-managed-subpath-dynamic/src/service/modules/records/router/read.ts",
      "invalid-managed-subpath-namespace/src/service/modules/records/router/read.ts",
      "invalid-managed-subpath-reexport/src/service/modules/records/router/read.ts",
      "invalid-managed-subpath-required/src/service/modules/records/router/read.ts",
      "invalid-managed-subpath/src/service/modules/records/router/read.ts",
      "invalid-terminal-alias/src/service/modules/records/router/read.ts",
      "invalid-terminal-namespace/src/service/modules/records/router/read.ts",
      "invalid-terminal-root-namespace/src/service/modules/records/router/read.ts",
      "invalid-terminal/src/service/modules/records/router/read.ts",
      "invalid-vendor-base/src/service/base.ts",
      "invalid-vendor-impl/src/service/impl.ts",
      "invalid-vendor-reexport/src/service/router.ts",
      "invalid-vendor-require/src/service/middleware/telemetry.ts",
      "invalid-vendor-root-dynamic/src/service/modules/records/router/read.ts",
      "invalid-vendor-root-require/src/service/modules/records/router/read.ts",
      "invalid-vendor-subpath/src/service/modules/records/router/read.ts",
      ...effectExecutionTerminals.map(
        (terminal) =>
          `invalid-exact-terminal-${terminal}/src/service/modules/records/router/read.ts`
      ),
    ].sort()
  );
}, 30_000);

async function checkLaw(files: Readonly<Record<string, string>>): Promise<string[]> {
  const root = await mkdtemp(path.join(tmpdir(), "service-v3-effect-bridge-"));
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
