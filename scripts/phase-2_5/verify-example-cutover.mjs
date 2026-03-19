#!/usr/bin/env bun
import { assertScriptEquals, mustExist, readPackageScripts } from "../phase-f/_verify-utils.mjs";

await mustExist("scripts/phase-2_5/verify-example-cutover.mjs");

const scripts = await readPackageScripts();

assertScriptEquals(
  scripts,
  "phase-2_5:gate:example-cutover",
  "bun scripts/phase-2_5/verify-example-cutover.mjs && bunx vitest run --project server apps/server/test/rawr.test.ts apps/server/test/api-plugin-example-surface.test.ts",
);

console.log("phase-2_5 example cutover gate scaffold verified");
