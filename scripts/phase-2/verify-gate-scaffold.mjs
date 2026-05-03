#!/usr/bin/env bun
import { assertCondition, readFile, readJson, runCommand } from "./_verify-utils.mjs";

const rootPackage = await readJson("package.json");
const nxConfig = await readJson("nx.json");
const hqSdkPackage = await readJson("packages/hq-sdk/package.json");
const rootScripts = rootPackage.scripts ?? {};
const includedScripts = new Set(rootPackage.nx?.includedScripts ?? []);
const retiredU00ScaffoldScript = ["phase-2:gate:u00", "scaffold"].join(":");

const expectedRootScripts = {
  "phase-2:gate:u00:no-legacy-cutover": "bun scripts/phase-2/verify-no-legacy-cutover.mjs",
  "phase-2:gate:u00:server-role-runtime-path": "bun scripts/phase-2/verify-server-role-runtime-path.mjs",
  "phase-2:gate:u00:runtime-public-seams": "bun scripts/phase-2/verify-runtime-public-seams.mjs",
  "phase-2:gate:u00:contract":
    "bun run phase-2:gate:u00:no-legacy-cutover && bun run phase-2:gate:u00:server-role-runtime-path && bun run phase-2:gate:u00:runtime-public-seams",
  "phase-2:gate:u00:current-findings":
    "bun scripts/phase-2/verify-gate-scaffold.mjs && bunx nx run @rawr/hq-app:structural -- --suite=m2-u00-current-findings && bunx nx run @rawr/server:structural -- --suite=m2-u00-current-findings && bunx nx run @rawr/hq-sdk:structural -- --suite=m2-u00-current-findings",
};

for (const [scriptName, command] of Object.entries(expectedRootScripts)) {
  assertCondition(rootScripts[scriptName] === command, `package.json must define ${scriptName}.`);
}

assertCondition(
  !includedScripts.has(retiredU00ScaffoldScript),
  "package.json nx.includedScripts must not expose the retired Phase 2 U00 scaffold helper.",
);
assertCondition(
  !includedScripts.has("phase-2:gate:u00:contract"),
  "package.json nx.includedScripts must not expose the red Phase 2 U00 contract before U00 closes.",
);
assertCondition(
  !includedScripts.has("phase-2:gate:u00:current-findings"),
  "package.json nx.includedScripts must not expose M2 U00 current-findings diagnostics as active validation.",
);
assertCondition(
  (nxConfig.namedInputs?.architectureGlobals ?? []).includes("{workspaceRoot}/scripts/phase-2/**/*.mjs"),
  "nx.json architectureGlobals must include scripts/phase-2/**/*.mjs.",
);

assertCondition(
  hqSdkPackage.scripts?.sync === "bun run --cwd ../.. sync:check --project @rawr/hq-sdk",
  "packages/hq-sdk/package.json must define sync.",
);
assertCondition(
  hqSdkPackage.scripts?.structural === "bun ../../scripts/phase-03/run-structural-suite.mjs --project @rawr/hq-sdk",
  "packages/hq-sdk/package.json must define structural.",
);

const structuralRunnerSource = await readFile("scripts/phase-03/run-structural-suite.mjs");
for (const requiredSnippet of [
  '"m2-u00-current-findings": ["bun run phase-2:gate:u00:no-legacy-cutover -- --allow-findings"]',
  '"m2-u00-current-findings": ["bun run phase-2:gate:u00:server-role-runtime-path -- --allow-findings"]',
  '"m2-u00-current-findings": ["bun run phase-2:gate:u00:runtime-public-seams -- --allow-findings"]',
]) {
  assertCondition(structuralRunnerSource.includes(requiredSnippet), "scripts/phase-03/run-structural-suite.mjs must wire the M2 U00 current-findings suites.");
}

await runCommand("bun run phase-2:gate:u00:no-legacy-cutover -- --allow-findings", "phase-2 no-legacy-cutover scaffold");
await runCommand("bun run phase-2:gate:u00:server-role-runtime-path -- --allow-findings", "phase-2 server-role-runtime-path scaffold");
await runCommand("bun run phase-2:gate:u00:runtime-public-seams -- --allow-findings", "phase-2 runtime-public-seams scaffold");

console.log("phase-2 U00 current-findings wiring verified");
