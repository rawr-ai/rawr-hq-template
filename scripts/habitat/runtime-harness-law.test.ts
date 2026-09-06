import { test } from "bun:test";
import { assertNativeRuntimeImportLaw } from "./runtime-law-fixture";

test("native harness law preserves contract imports and rejects lifecycle-owner imports", async () => {
  await assertNativeRuntimeImportLaw({
    owner: "runtime-harnesses",
    version: 1,
    rule: "runtime_harnesses_v1_imports",
    allowed: {
      "owner/src/harness-descriptor.ts":
        'import type { RuntimeLaunchIdentity } from "../../definition/src/index";\nimport type { ProcessRuntimeAccess } from "../../process-runtime/src/index";\n',
      "owner/src/native/host.ts":
        'import { Effect } from "effect";\nexport const mount = async input => ({ stop: async () => {} });\nconst example = "../../mounting/src/index";\nvoid import("native-host", { with: { note: "@habitat-ai/sdk" } });\n',
      "owner/test/fixture.test.ts":
        'import { provisionProcess } from "../../substrate/effect/src/index";\n',
    },
    forbidden: {
      "owner/src/native/sdk.ts": 'import type { HabitatClient } from "@habitat-ai/sdk";\n',
      "owner/src/native/mounting.ts": 'export * from "../../../mounting/src/index";\n',
      "owner/src/native/substrate.ts": 'void import("../../../substrate/effect/src/index");\n',
      "owner/src/native/observation.ts": 'require("../../../observation/src/index");\n',
      "owner/src/native/provider.ts":
        'import { acquire } from "resources/example/providers/native";\n',
    },
  });
}, 60_000);

test("native Elysia successor admits vendor glue without acquiring other runtime owners", async () => {
  await assertNativeRuntimeImportLaw({
    owner: "runtime-harnesses",
    version: 2,
    rule: "runtime_harnesses_v2_imports",
    allowed: {
      "owner/src/index.ts":
        'export type { RuntimeLaunchIdentity } from "../../definition/src/index";',
      "owner/elysia/index.ts":
        'export const mount = async () => { const { Elysia } = await import("elysia"); return new Elysia(); };',
      "owner/elysia/public-document.ts":
        'import { routesOverlap } from "rou3"; import { OpenAPIGenerator } from "@orpc/openapi";',
      "owner/test/fixture.test.ts": 'import { startApp } from "@habitat-ai/sdk/app";',
    },
    forbidden: {
      "owner/elysia/sdk.ts": 'import { startApp } from "@habitat-ai/sdk/app";',
      "owner/elysia/mounting.ts": 'export * from "../../mounting/src/index";',
      "owner/elysia/substrate.ts": 'void import("../../substrate/effect/src/index");',
      "owner/elysia/provider.ts": 'import { acquire } from "resources/telemetry/providers/native";',
    },
  });
}, 60_000);

test("native async successor admits Inngest glue without crossing lifecycle ownership", async () => {
  await assertNativeRuntimeImportLaw({
    owner: "runtime-harnesses",
    version: 3,
    rule: "runtime_harnesses_v3_imports",
    allowed: {
      "owner/src/index.ts":
        'export type { RuntimeLaunchIdentity } from "../../definition/src/index";',
      "owner/elysia/index.ts": 'export const mount = async () => import("elysia");',
      "owner/inngest/index.ts":
        'import type { Inngest } from "inngest"; import { readInngestFunctionBundle } from "../../process-runtime/src/index"; export const mount = async () => { await import("inngest/bun"); await import("inngest/connect"); };',
      "owner/test/fixture.test.ts": 'import { startApp } from "@habitat-ai/sdk/app";',
    },
    forbidden: {
      "owner/inngest/sdk.ts": 'import { startApp } from "@habitat-ai/sdk/app";',
      "owner/inngest/mounting.ts": 'export * from "../../mounting/src/index";',
      "owner/inngest/substrate.ts": 'void import("../../substrate/effect/src/index");',
      "owner/inngest/observation.ts": 'require("../../observation/src/index");',
      "owner/inngest/provider.ts":
        'import { acquire } from "resources/telemetry/providers/native";',
    },
  });
}, 60_000);

test("native web successor admits exact definition leaves and Bun glue without lifecycle owners", async () => {
  await assertNativeRuntimeImportLaw({
    owner: "runtime-harnesses",
    version: 4,
    rule: "runtime_harnesses_v4_imports",
    allowed: {
      "owner/src/index.ts":
        'export type { RuntimeLaunchIdentity } from "../../definition/src/app";',
      "owner/elysia/index.ts": 'export const mount = async () => import("elysia");',
      "owner/inngest/index.ts":
        'import type { Inngest } from "inngest"; export const mount = async () => import("inngest/connect");',
      "owner/web/index.ts":
        'import type { HTMLBundle } from "bun"; import type { WebHostPayload } from "../../process-runtime/src/adapters/web"; export const mount = async () => Bun.serve({ fetch: () => new Response() });',
      "owner/web/observation-port.ts":
        'import type { RuntimeObservationPort } from "../../definition/src/observation";',
      "owner/web/nested/observation-port.ts":
        'export type { RuntimeObservationPort } from "../../../definition/src/observation";',
      "owner/web/nested/observation-js.ts":
        "import type { RuntimeObservationPort } from '../../../definition/src/observation.js';",
      "owner/web/nested/observation-ts.ts":
        'export type { RuntimeObservationPort } from "../../../definition/src/observation.ts";',
      "owner/web/nested/observation-dynamic.ts":
        'void import("../../../definition/src/observation.js");',
      "owner/web/nested/observation-require.ts": 'require("../../../definition/src/observation");',
      "owner/web/native-options.ts":
        'const example = "../../mounting/src/index"; void import("native-web-host", { with: { note: "@habitat-ai/sdk" } });',
      "owner/test/fixture.test.ts": 'import { startApp } from "@habitat-ai/sdk/app";',
    },
    forbidden: {
      "owner/web/sdk.ts": 'import { startApp } from "@habitat-ai/sdk/app";',
      "owner/web/sdk-root.ts": 'require("@habitat-ai/sdk");',
      "owner/web/mounting.ts": 'export * from "../../mounting/src/index";',
      "owner/web/substrate.ts": 'void import("../../substrate/effect/src/index");',
      "owner/web/observation.ts":
        'import { createRuntimeObservation } from "../../observation/src/index";',
      "owner/web/observation-root.ts": 'void import("../../observation");',
      "owner/web/observation-require.ts": 'require("../../observation/src/collector");',
      "owner/web/nested/observation.ts":
        'export { createRuntimeObservation } from "../../../observation/src/collector";',
      "owner/web/observation-traversal.ts":
        'void import("../../definition/src/../../observation/src/collector");',
      "owner/web/provider.ts": 'import { acquire } from "resources/telemetry/providers/native";',
    },
  });
}, 60_000);
