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
