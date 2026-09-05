import { test } from "bun:test";
import { assertNativeRuntimeImportLaw } from "./runtime-law-fixture";

test("native adapter law checks acquired literal sources without banning deferred execution", async () => {
  await assertNativeRuntimeImportLaw({
    owner: "runtime-process-runtime",
    version: 2,
    rule: "runtime_process_runtime_v2_adapter_imports",
    allowed: {
      "owner/src/surface-adapter.ts":
        'import type { WithEffectContext } from "@orpc/experimental-effect";\n',
      "owner/src/adapters/nested/lower.ts":
        'export const lower = (runtime, boundary) => ({ invoke: invocation => runtime.execute({ boundary, invocation }) });\nconst example = "effect/Effect";\nvoid import("other-package", { with: { note: "effect" } });\n',
      "owner/src/execution-runtime.ts": 'import { Effect } from "effect";\n',
      "owner/test/native.test.ts": 'import { ManagedRuntime } from "effect";\n',
    },
    forbidden: {
      "owner/src/surface-adapter.ts": 'import type { Effect } from "effect";\n',
      "owner/src/adapters/static.ts": 'import { Effect } from "effect";\n',
      "owner/src/adapters/reexport.ts": 'export * from "effect/Effect";\n',
      "owner/src/adapters/dynamic.ts":
        'void import("effect/ManagedRuntime", { with: { type: "json" } });\n',
      "owner/src/adapters/require.ts": 'require("effect/Layer");\n',
    },
  });
}, 60_000);
