#!/usr/bin/env bun
import { assertCondition, readFile, readJson, runCommand } from "./_verify-utils.mjs";

const rootPackage = await readJson("package.json");
const nxConfig = await readJson("nx.json");
const hqSdkPackage = await readJson("packages/hq-sdk/package.json");
const rootScripts = rootPackage.scripts ?? {};
const includedScripts = new Set(rootPackage.nx?.includedScripts ?? []);

const expectedRootScripts = {
  "phase-2:gate:u00:no-legacy-cutover": "bun scripts/phase-2/verify-no-legacy-cutover.mjs",
  "phase-2:gate:u00:server-role-runtime-path": "bun scripts/phase-2/verify-server-role-runtime-path.mjs",
  "phase-2:gate:u00:runtime-public-seams": "bun scripts/phase-2/verify-runtime-public-seams.mjs",
  "phase-2:gate:u00:contract":
    "bun run phase-2:gate:u00:no-legacy-cutover && bun run phase-2:gate:u00:server-role-runtime-path && bun run phase-2:gate:u00:runtime-public-seams",
  "phase-2:gate:u00:scaffold":
    "bun scripts/phase-2/verify-gate-scaffold.mjs && bunx nx run @rawr/hq-app:structural -- --suite=phase-2-u00-scaffold && bunx nx run @rawr/server:structural -- --suite=phase-2-u00-scaffold && bunx nx run @rawr/hq-sdk:structural -- --suite=phase-2-u00-scaffold",
};

for (const [scriptName, command] of Object.entries(expectedRootScripts)) {
  assertCondition(rootScripts[scriptName] === command, `package.json must define ${scriptName}.`);
}

assertCondition(
  includedScripts.has("phase-2:gate:u00:scaffold"),
  "package.json nx.includedScripts must expose phase-2:gate:u00:scaffold.",
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
  '"phase-2-u00-scaffold": ["bun run phase-2:gate:u00:no-legacy-cutover -- --allow-findings"]',
  '"phase-2-u00-scaffold": ["bun run phase-2:gate:u00:server-role-runtime-path -- --allow-findings"]',
  '"phase-2-u00-scaffold": ["bun run phase-2:gate:u00:runtime-public-seams -- --allow-findings"]',
]) {
  assertCondition(structuralRunnerSource.includes(requiredSnippet), "scripts/phase-03/run-structural-suite.mjs must wire the Phase 2 scaffold suites.");
}

await runCommand("bun run phase-2:gate:u00:no-legacy-cutover -- --allow-findings", "phase-2 no-legacy-cutover scaffold");
await runCommand("bun run phase-2:gate:u00:server-role-runtime-path -- --allow-findings", "phase-2 server-role-runtime-path scaffold");
await runCommand("bun run phase-2:gate:u00:runtime-public-seams -- --allow-findings", "phase-2 runtime-public-seams scaffold");

console.log("phase-2 gate scaffold verified");
