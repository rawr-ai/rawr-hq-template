#!/usr/bin/env bun

import { assertCondition, mustExist, readFile, readPackageScripts } from "./_verify-utils.mjs";

const requiredPaths = [
  "scripts/controller/stable-launcher.sh",
  "scripts/controller/activate.ts",
  "scripts/controller/production/builder.ts",
  "scripts/dev/install-global-rawr.sh",
  "scripts/dev/activate-global-rawr.sh",
  "apps/cli/src/lib/controller/global-diagnostics.ts",
  "apps/cli/test/doctor-global.test.ts",
  "scripts/architecture/verify-no-official-relink-authority.mjs",
];
await Promise.all(requiredPaths.map((path) => mustExist(path)));

const [installSource, activateSource, doctorSource, scripts] = await Promise.all([
  readFile("scripts/dev/install-global-rawr.sh"),
  readFile("scripts/dev/activate-global-rawr.sh"),
  readFile("apps/cli/src/lib/controller/global-diagnostics.ts"),
  readPackageScripts(),
]);

for (const [name, source, operation] of [
  ["install", installSource, "install"],
  ["activate", activateSource, "activate"],
]) {
  assertCondition(
    source.includes("scripts/controller/cli-build-production.ts"),
    `${name}-global script must delegate to the production controller builder`
  );
  assertCondition(
    source.includes(operation),
    `${name}-global script must select the ${operation} operation`
  );
  for (const forbidden of [
    "global-rawr-owner-path",
    "apps/cli/bin/run.js",
    "ln -s",
    "ownerWorkspacePath",
  ]) {
    assertCondition(
      !source.includes(forbidden),
      `${name}-global script retains legacy authority: ${forbidden}`
    );
  }
}

for (const field of [
  "controllerDigest",
  "selectorMatchesInvocation",
  "sourceRevision",
  "dependencyLock",
  "officialMembers",
  "externalExtensions",
  "globalResolution",
]) {
  assertCondition(
    doctorSource.includes(field),
    `doctor global must report controller provenance field: ${field}`
  );
}

assertCondition(
  scripts["phase-c:gate:c3-distribution-contract"] ===
    "bun scripts/phase-c/verify-distribution-instance-lifecycle.mjs",
  "package.json must retain the C3 distribution contract gate"
);
assertCondition(
  scripts["phase-c:gate:c3-distribution-runtime"] ===
    "bun test scripts/controller/test/activation.test.ts scripts/controller/test/stable-launcher.test.ts && bunx vitest run --project cli apps/cli/test/doctor-global.test.ts",
  "phase-c C3 runtime gate must prove selection, stable launch, and read-only diagnostics"
);
assertCondition(
  scripts["phase-c:c3:quick"] ===
    "bun run phase-c:gate:drift-core && bun run phase-c:gate:c3-distribution-contract && bun run phase-c:gate:c3-distribution-runtime",
  "phase-c:c3:quick must run drift-core plus the controller contract/runtime gates"
);
assertCondition(
  scripts["phase-c:c3:full"] ===
    "bun run phase-c:c3:quick && bun run phase-a:gate:legacy-metadata-hard-delete-static-guard",
  "phase-c:c3:full must retain the legacy metadata hard-delete guard"
);

console.log("phase-c controller distribution authority verified");
