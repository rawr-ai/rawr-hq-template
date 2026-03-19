#!/usr/bin/env bun
import { assertScriptEquals, mustExist, readPackageScripts } from "../phase-f/_verify-utils.mjs";

await mustExist("scripts/phase-2_5/verify-hq-runtime-cutover.mjs");

const scripts = await readPackageScripts();

assertScriptEquals(
  scripts,
  "phase-2_5:gate:hq-runtime",
  "bun scripts/phase-2_5/verify-hq-runtime-cutover.mjs && bunx vitest run --project cli apps/cli/test/hq.test.ts apps/cli/test/hq-legacy-surface.test.ts",
);

console.log("phase-2_5 hq runtime gate scaffold verified");
