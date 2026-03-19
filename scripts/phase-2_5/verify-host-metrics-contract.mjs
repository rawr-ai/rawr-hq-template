#!/usr/bin/env bun
import { assertScriptEquals, mustExist, readPackageScripts } from "../phase-f/_verify-utils.mjs";

await mustExist("scripts/phase-2_5/verify-host-metrics-contract.mjs");

const scripts = await readPackageScripts();

assertScriptEquals(
  scripts,
  "phase-2_5:gate:host-metrics",
  "bun scripts/phase-2_5/verify-host-metrics-contract.mjs && bunx vitest run --project server apps/server/test/orpc-metrics.test.ts apps/server/test/telemetry-bootstrap.test.ts",
);

console.log("phase-2_5 host metrics gate scaffold verified");
