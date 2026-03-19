#!/usr/bin/env bun
import { assertScriptEquals, mustExist, readPackageScripts } from "../phase-f/_verify-utils.mjs";

await mustExist("scripts/phase-2_5/verify-logging-boundary.mjs");

const scripts = await readPackageScripts();

assertScriptEquals(
  scripts,
  "phase-2_5:gate:logging",
  "bun scripts/phase-2_5/verify-logging-boundary.mjs && bunx vitest run --project server apps/server/test/logging-correlation.test.ts && rg -n \"from \\\"pino\\\"|from 'pino'\" services/example-todo services/support-example",
);

console.log("phase-2_5 logging gate scaffold verified");
