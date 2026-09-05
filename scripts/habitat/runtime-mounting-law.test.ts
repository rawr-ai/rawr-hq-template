import { test } from "bun:test";
import { assertNativeRuntimeImportLaw } from "./runtime-law-fixture";

test("native mounting law admits its handoff owners and refuses upstream or observation control imports", async () => {
  await assertNativeRuntimeImportLaw({
    owner: "runtime-mounting",
    version: 1,
    rule: "runtime_mounting_v1_imports",
    allowed: {
      "owner/src/mount.ts":
        'import type { RuntimeObservationPort } from "../../definition/src/index";\nimport { readMountReadyProcessHandoff } from "../../process-runtime/src/index";\nimport type { HarnessDescriptor } from "../../harnesses/src/index";\nimport type { Option } from "effect";\n',
    },
    forbidden: {
      "owner/src/nested/sdk.ts": 'import { startApp } from "@habitat-ai/sdk/app";\n',
      "owner/src/nested/compiler.ts": 'export * from "../../../compiler/src/index";\n',
      "owner/src/nested/bootgraph.ts":
        'import { orderBootgraph } from "../../../bootgraph/src/index";\n',
      "owner/src/nested/substrate.ts": 'void import("../../../substrate/effect/src/index");\n',
      "owner/src/nested/derivation.ts": 'require("../../../derivation/src/index");\n',
      "owner/src/nested/observation.ts":
        'import { createRuntimeObservation } from "../../../observation/src/index";\n',
    },
  });
}, 60_000);
