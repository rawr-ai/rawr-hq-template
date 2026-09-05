import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const repositoryRoot = path.resolve(import.meta.dir, "../../../../..");
const ruleId = "require_sdk_server_effect_facade_source";
const patternPath =
  ".habitat/overlays/repository/rules/require_sdk_server_effect_facade_source/pattern.md";
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

test("the SDK server Effect face delegates only to the official extension", async () => {
  const findings = await checkLaw({
    "packages/core/sdk/src/plugins/server/effect/index.ts": `
      import "@orpc/experimental-effect/extensions/effect";
      export {};
    `,
    "valid-comment/packages/core/sdk/src/plugins/server/effect/index.ts": `
      // Installing this side effect patches the shared oRPC module realm.
      import "@orpc/experimental-effect/extensions/effect"

      export { }
    `,
    "invalid-helper/packages/core/sdk/src/plugins/server/effect/index.ts": `
      import "@orpc/experimental-effect/extensions/effect";
      const installed = true;
      export {};
    `,
    "invalid-export/packages/core/sdk/src/plugins/server/effect/index.ts": `
      import "@orpc/experimental-effect/extensions/effect";
      export const installed = true;
      export {};
    `,
    "invalid-extra-import/packages/core/sdk/src/plugins/server/effect/index.ts": `
      import "@orpc/experimental-effect/extensions/effect";
      import "effect";
      export {};
    `,
    "packages/core/sdk/src/plugins/server/index.ts": `
      export { defineServerApiPlugin } from "../../../runtime/definition/src/plugin";
    `,
    "valid-facade-source-near/packages/core/sdk/src/plugins/server/index.ts": `
      import "@habitat-ai/sdk/plugins/server/effects.mjs";
      export * from "../effects/index.ts";
      void import("../effect/index.tsx");
      require("./effect/internal.js");
    `,
    "invalid-facade-package-import/packages/core/sdk/src/plugins/server/index.ts": `
      import "@habitat-ai/sdk/plugins/server/effect";
    `,
    "invalid-facade-package-js-reexport/packages/core/sdk/src/plugins/server/index.ts": `
      export * from "@habitat-ai/sdk/plugins/server/effect.js";
    `,
    "invalid-facade-relative-import/packages/core/sdk/src/plugins/server/index.ts": `
      import "./effect";
    `,
    "invalid-facade-relative-js-dynamic/packages/core/sdk/src/plugins/server/index.ts": `
      void import("./effect.js");
    `,
    "invalid-facade-relative-index-require/packages/core/sdk/src/plugins/server/index.ts": `
      require("./effect/index");
    `,
    "invalid-facade-relative-index-js-reexport/packages/core/sdk/src/plugins/server/index.ts": `
      export * from "./effect/index.js";
    `,
    "invalid-facade-nested-relative/packages/core/sdk/src/plugins/server/nested/bridge.ts": `
      import "../effect/index.js";
    `,
    "invalid-facade-deep-relative/packages/core/sdk/src/plugins/server/nested/deeper/bridge.ts": `
      void import("../../effect.mts");
    `,
    "invalid-facade-source-extension/packages/core/sdk/src/plugins/server/nested/bridge.ts": `
      export * from "../effect/index.cts";
    `,
    "packages/core/runtime/definition/src/plugin.ts": `
      import { Effect } from "effect";
      export const definePlugin = () => Effect.succeed("ready");
    `,
    "valid-exact-names/packages/core/sdk/src/plugins/server/exact.ts": `
      import { ManagedRuntimeFactory, runPromiseLater } from "effect";
      export { ManagedRuntimeFactory, runPromiseLater };
    `,
    "packages/core/sdk/src/plugins/server/direct.ts": `
      import "@orpc/experimental-effect/extensions/effect";
    `,
    "packages/core/sdk/src/plugins/server/dynamic.ts": `
      void import("@orpc/experimental-effect/extensions/effect");
    `,
    "packages/core/sdk/src/plugins/server/reexport.ts": `
      export * from "@orpc/experimental-effect/extensions/effect";
    `,
    "packages/core/sdk/src/plugins/server/required.ts": `
      require("@orpc/experimental-effect/extensions/effect");
    `,
    "packages/core/sdk/src/plugins/server/handler.ts": `
      import { handlerGen } from "@orpc/experimental-effect";
      export const implementEffect = handlerGen;
    `,
    "packages/core/sdk/src/plugins/server/handler-alias.ts": `
      import { handlerGen as implementEffect } from "@orpc/experimental-effect";
      export { implementEffect };
    `,
    "packages/core/sdk/src/plugins/server/handler-namespace.ts": `
      import * as bridge from "@orpc/experimental-effect";
      export const implementEffect = bridge.handlerGen;
    `,
    "packages/core/sdk/src/plugins/server/handler-reexport.ts": `
      export { handlerGen } from "@orpc/experimental-effect";
    `,
    "packages/core/sdk/src/plugins/server/vendor-dynamic.ts": `
      void import("@orpc/experimental-effect");
    `,
    "packages/core/sdk/src/plugins/server/vendor-reexport.ts": `
      export * from "@orpc/experimental-effect";
    `,
    "packages/core/sdk/src/plugins/server/vendor-required.ts": `
      require("@orpc/experimental-effect");
    `,
    "packages/core/sdk/src/plugins/server/vendor-subpath.ts": `
      import "@orpc/experimental-effect/internal";
    `,
    "packages/core/sdk/src/plugins/server/manual.ts": `
      import { Effect } from "effect";
      export const execute = () => Effect.runPromiseWith(program);
    `,
    "packages/core/sdk/src/plugins/server/manual-alias.ts": `
      import { Effect as Fx } from "effect";
      export const execute = () => Fx.runSyncWith(program);
    `,
    "packages/core/sdk/src/plugins/server/manual-import.ts": `
      import { runPromiseExitWith as execute } from "effect/Effect";
      export { execute };
    `,
    "packages/core/sdk/src/plugins/server/manual-import-direct.ts": `
      import { runSyncExitWith } from "effect";
      export { runSyncExitWith };
    `,
    "packages/core/sdk/src/plugins/server/manual-namespace.ts": `
      import * as Fx from "effect/Effect";
      export const execute = () => Fx.runForkWith(program);
    `,
    "packages/core/sdk/src/plugins/server/manual-root-namespace.ts": `
      import * as Effects from "effect";
      export const execute = () => Effects.Effect.runCallbackWith(program);
    `,
    "packages/core/sdk/src/plugins/server/managed-root.ts": `
      import { ManagedRuntime } from "effect";
      export const runtime = ManagedRuntime.make(layer);
    `,
    "packages/core/sdk/src/plugins/server/managed-root-alias.ts": `
      import { ManagedRuntime as Runtime } from "effect";
      export const runtime = Runtime.make(layer);
    `,
    "packages/core/sdk/src/plugins/server/managed-root-namespace.ts": `
      import * as Effects from "effect";
      export const runtime = Effects.ManagedRuntime.make(layer);
    `,
    "packages/core/sdk/src/plugins/server/managed-subpath.ts": `
      import { make } from "effect/ManagedRuntime";
      export const runtime = make(layer);
    `,
    "packages/core/sdk/src/plugins/server/managed-subpath-namespace.ts": `
      import * as Runtime from "effect/ManagedRuntime";
      export const runtime = Runtime.make(layer);
    `,
    "packages/core/sdk/src/plugins/server/managed-subpath-dynamic.ts": `
      void import("effect/ManagedRuntime");
    `,
    "packages/core/sdk/src/plugins/server/managed-subpath-reexport.ts": `
      export * from "effect/ManagedRuntime";
    `,
    "packages/core/sdk/src/plugins/server/managed-subpath-required.ts": `
      require("effect/ManagedRuntime");
    `,
    "invalid-runtime-terminal/packages/core/runtime/definition/src/plugin.ts": `
      import { Effect } from "effect";
      export const execute = () => Effect.runPromiseExit(program);
    `,
    "invalid-runtime-managed/packages/core/runtime/definition/src/plugin.ts": `
      import { ManagedRuntime } from "effect";
      export const runtime = ManagedRuntime.make(layer);
    `,
    "invalid-runtime-managed-subpath/packages/core/runtime/definition/src/plugin.ts": `
      import * as Runtime from "effect/ManagedRuntime";
      export const runtime = Runtime.make(layer);
    `,
    ...Object.fromEntries(
      effectExecutionTerminals.map((terminal) => [
        `invalid-terminal-${terminal}/packages/core/sdk/src/plugins/server/manual.ts`,
        `import { Effect } from "effect"; export const execute = () => Effect.${terminal}(program);`,
      ])
    ),
  });

  expect(findings).toEqual(
    [
      "invalid-export/packages/core/sdk/src/plugins/server/effect/index.ts",
      "invalid-extra-import/packages/core/sdk/src/plugins/server/effect/index.ts",
      "invalid-facade-package-import/packages/core/sdk/src/plugins/server/index.ts",
      "invalid-facade-package-js-reexport/packages/core/sdk/src/plugins/server/index.ts",
      "invalid-facade-deep-relative/packages/core/sdk/src/plugins/server/nested/deeper/bridge.ts",
      "invalid-facade-nested-relative/packages/core/sdk/src/plugins/server/nested/bridge.ts",
      "invalid-facade-relative-import/packages/core/sdk/src/plugins/server/index.ts",
      "invalid-facade-relative-index-js-reexport/packages/core/sdk/src/plugins/server/index.ts",
      "invalid-facade-relative-index-require/packages/core/sdk/src/plugins/server/index.ts",
      "invalid-facade-relative-js-dynamic/packages/core/sdk/src/plugins/server/index.ts",
      "invalid-facade-source-extension/packages/core/sdk/src/plugins/server/nested/bridge.ts",
      "invalid-helper/packages/core/sdk/src/plugins/server/effect/index.ts",
      "invalid-runtime-managed-subpath/packages/core/runtime/definition/src/plugin.ts",
      "invalid-runtime-managed/packages/core/runtime/definition/src/plugin.ts",
      "invalid-runtime-terminal/packages/core/runtime/definition/src/plugin.ts",
      "packages/core/sdk/src/plugins/server/direct.ts",
      "packages/core/sdk/src/plugins/server/dynamic.ts",
      "packages/core/sdk/src/plugins/server/handler-alias.ts",
      "packages/core/sdk/src/plugins/server/handler-namespace.ts",
      "packages/core/sdk/src/plugins/server/handler-reexport.ts",
      "packages/core/sdk/src/plugins/server/handler.ts",
      "packages/core/sdk/src/plugins/server/managed-root-alias.ts",
      "packages/core/sdk/src/plugins/server/managed-root-namespace.ts",
      "packages/core/sdk/src/plugins/server/managed-root.ts",
      "packages/core/sdk/src/plugins/server/managed-subpath-dynamic.ts",
      "packages/core/sdk/src/plugins/server/managed-subpath-namespace.ts",
      "packages/core/sdk/src/plugins/server/managed-subpath-reexport.ts",
      "packages/core/sdk/src/plugins/server/managed-subpath-required.ts",
      "packages/core/sdk/src/plugins/server/managed-subpath.ts",
      "packages/core/sdk/src/plugins/server/manual-alias.ts",
      "packages/core/sdk/src/plugins/server/manual-import-direct.ts",
      "packages/core/sdk/src/plugins/server/manual-import.ts",
      "packages/core/sdk/src/plugins/server/manual-namespace.ts",
      "packages/core/sdk/src/plugins/server/manual-root-namespace.ts",
      "packages/core/sdk/src/plugins/server/manual.ts",
      "packages/core/sdk/src/plugins/server/reexport.ts",
      "packages/core/sdk/src/plugins/server/required.ts",
      "packages/core/sdk/src/plugins/server/vendor-dynamic.ts",
      "packages/core/sdk/src/plugins/server/vendor-reexport.ts",
      "packages/core/sdk/src/plugins/server/vendor-required.ts",
      "packages/core/sdk/src/plugins/server/vendor-subpath.ts",
      ...effectExecutionTerminals.map(
        (terminal) => `invalid-terminal-${terminal}/packages/core/sdk/src/plugins/server/manual.ts`
      ),
    ].sort()
  );

  expect(
    await checkLaw({
      "packages/core/sdk/src/plugins/server/effect/index.ts": `
        import "@orpc/experimental-effect/extensions/effect";
        export const run = () => Effect.runPromise(program);
      `,
    })
  ).toEqual(["packages/core/sdk/src/plugins/server/effect/index.ts"]);
}, 30_000);

test("native request context type imports do not grant vendor bootstrap authority", async () => {
  expect(
    await checkLaw({
      "erased/packages/core/runtime/definition/src/plugin.ts":
        'import type { WithEffectContext as Context, EffectWrapOptions } from "@orpc/experimental-effect";',
      "value/packages/core/runtime/definition/src/plugin.ts":
        'import { WithEffectContext } from "@orpc/experimental-effect";',
      "side-effect/packages/core/runtime/definition/src/plugin.ts":
        'import "@orpc/experimental-effect";',
      "subpath/packages/core/runtime/definition/src/plugin.ts":
        'import type { Unknown } from "@orpc/experimental-effect/extensions/effect";',
      "mixed/packages/core/runtime/definition/src/plugin.ts":
        'import { type WithEffectContext, handlerGen } from "@orpc/experimental-effect";',
    })
  ).toEqual([
    "mixed/packages/core/runtime/definition/src/plugin.ts",
    "side-effect/packages/core/runtime/definition/src/plugin.ts",
    "subpath/packages/core/runtime/definition/src/plugin.ts",
    "value/packages/core/runtime/definition/src/plugin.ts",
  ]);
}, 30_000);

async function checkLaw(files: Readonly<Record<string, string>>): Promise<string[]> {
  const root = await mkdtemp(path.join(tmpdir(), "sdk-server-effect-facade-source-"));
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
