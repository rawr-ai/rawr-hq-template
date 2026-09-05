import { test } from "bun:test";
import { assertNativeRuntimeImportLaw } from "./runtime-law-fixture";

test("native observation law admits definition contracts and refuses runtime authority imports", async () => {
  await assertNativeRuntimeImportLaw({
    owner: "runtime-observation",
    version: 1,
    rule: "runtime_observation_v1_imports",
    allowed: {
      "owner/src/observation.ts":
        'import type { RuntimeObservationPort } from "../../definition/src/index";\nimport { Type } from "typebox";\nimport type { Option } from "effect";\nconst example = "../../mounting/src/index";\nvoid import("ordinary-module", { with: { note: "@habitat-ai/sdk" } });\n',
      "owner/test/native.test.ts":
        'import { provisionProcess } from "../../substrate/effect/src/index";\n',
    },
    forbidden: {
      "owner/src/nested/sdk.ts": 'import type { HabitatClient } from "@habitat-ai/sdk";\n',
      "owner/src/nested/compiler.ts": 'export * from "../../../compiler/src/index";\n',
      "owner/src/nested/bootgraph.ts":
        'import { orderBootgraph } from "../../../bootgraph/src/index";\n',
      "owner/src/nested/substrate.ts": 'void import("../../../substrate/effect/src/index");\n',
      "owner/src/nested/process.ts": 'require("../../../process-runtime/src/index");\n',
      "owner/src/nested/harness.ts": 'export * from "../../../harnesses/src/index";\n',
      "owner/src/nested/mounting.ts": 'import { startApp } from "../../../mounting/src/index";\n',
      "owner/src/nested/provider.ts":
        'import { acquire } from "resources/example/providers/native";\n',
    },
  });
}, 60_000);
