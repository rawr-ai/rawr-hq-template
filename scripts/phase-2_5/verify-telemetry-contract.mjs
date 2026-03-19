#!/usr/bin/env bun
import { assertScriptEquals, mustExist, readPackageScripts } from "../phase-f/_verify-utils.mjs";

await Promise.all([
  mustExist("packages/core/src/orpc/telemetry.ts"),
  mustExist("packages/core/test/telemetry.test.ts"),
  mustExist("scripts/phase-2_5/verify-telemetry-contract.mjs"),
]);

const scripts = await readPackageScripts();

assertScriptEquals(
  scripts,
  "phase-2_5:gate:telemetry-core",
  "bun scripts/phase-2_5/verify-telemetry-contract.mjs && bunx vitest run --project core packages/core/test/telemetry.test.ts",
);
assertScriptEquals(
  scripts,
  "phase-2_5:gates:quick",
  "bun run phase-2_5:gate:telemetry-core && bun run phase-2_5:gate:host-metrics && bun run phase-2_5:gate:example-cutover && bun run phase-2_5:gate:hq-runtime",
);
assertScriptEquals(
  scripts,
  "phase-2_5:gates:exit",
  "bun run phase-2_5:gates:quick && bun run phase-2_5:gate:logging && bun run phase-2_5:gate:closure",
);

console.log("phase-2_5 telemetry gate scaffold verified");
