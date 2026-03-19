#!/usr/bin/env bun
import { assertScriptEquals, mustExist, readPackageScripts } from "../phase-f/_verify-utils.mjs";

await Promise.all([
  mustExist("scripts/phase-2_5/verify-telemetry-contract.mjs"),
  mustExist("scripts/phase-2_5/verify-host-metrics-contract.mjs"),
  mustExist("scripts/phase-2_5/verify-example-cutover.mjs"),
  mustExist("scripts/phase-2_5/verify-hq-runtime-cutover.mjs"),
  mustExist("scripts/phase-2_5/verify-logging-boundary.mjs"),
  mustExist("scripts/phase-2_5/verify-closure-allowlist.mjs"),
]);

const scripts = await readPackageScripts();

assertScriptEquals(
  scripts,
  "phase-2_5:gate:closure",
  "bun scripts/phase-2_5/verify-closure-allowlist.mjs && bun run test:vitest",
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

console.log("phase-2_5 closure gate scaffold verified");
