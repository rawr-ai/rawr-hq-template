#!/usr/bin/env bun
import fs from "node:fs/promises";
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "./_verify-utils.mjs";

await Promise.all([
  mustExist("apps/server/src/bootstrap.ts"),
  mustExist("apps/server/src/rawr.ts"),
  mustExist("apps/server/test/rawr.test.ts"),
  mustExist("scripts/architecture/verify-app-composition-authoring.mjs"),
]);

const retiredPaths = [
  "services/hq-ops/src/service/modules/repo-state/helpers/storage.ts",
  "apps/server/src/plugins.ts",
  "apps/server/test/repo-state-store.concurrent.test.ts",
  "apps/server/test/storage-lock-route-guard.test.ts",
];
for (const relPath of retiredPaths) {
  const present = await fs.access(relPath).then(
    () => true,
    () => false
  );
  assertCondition(!present, `${relPath} must remain retired`);
}

const [bootstrapSource, rawrSource, rawrTestSource, scripts] = await Promise.all([
  readFile("apps/server/src/bootstrap.ts"),
  readFile("apps/server/src/rawr.ts"),
  readFile("apps/server/test/rawr.test.ts"),
  readPackageScripts(),
]);

assertScriptEquals(scripts, "phase-f:gate:drift-core", "bun run phase-e:gate:drift-core");
assertScriptEquals(
  scripts,
  "phase-f:gate:f1-runtime-lifecycle-contract",
  "bun scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs"
);
assertScriptEquals(
  scripts,
  "phase-f:gate:f1-runtime-lifecycle-runtime",
  "bunx vitest run --project server apps/server/test/rawr.test.ts apps/server/test/route-boundary-matrix.test.ts && bun run phase-c:gate:c1-storage-lock-runtime"
);
assertScriptEquals(
  scripts,
  "phase-f:f1:quick",
  "bun run phase-f:gate:drift-core && bun run phase-f:gate:f1-runtime-lifecycle-contract && bun run phase-f:gate:f1-runtime-lifecycle-runtime"
);
assertScriptEquals(
  scripts,
  "phase-f:f1:full",
  "bun run phase-f:f1:quick && bun run phase-a:gate:no-legacy-composition-authority"
);

for (const token of [
  "loadWorkspaceServerPlugins",
  "mountServerPlugins",
  "loadRuntimeStateFromHost",
  "enabledPluginIds",
  "enabledPlugins",
  "repoState.",
]) {
  assertCondition(
    !bootstrapSource.includes(token),
    `bootstrap retains retired membership token ${token}`
  );
}
for (const token of ["/rawr/plugins/web/", "/rawr/composition", "enabledPluginIds"]) {
  assertCondition(
    !rawrSource.includes(token),
    `rawr route registration retains retired token ${token}`
  );
}

assertCondition(
  /function resolveAuthorityRepoRoot\(repoRoot: string\): string[\s\S]*fsSync\.realpathSync\(resolvedRoot\)[\s\S]*return resolvedRoot;/u.test(
    rawrSource
  ),
  "rawr route registration must keep canonical repo-root resolution for surviving runtime context"
);
assertCondition(
  rawrSource.includes('app.all(\n    "/api/inngest"') &&
    rawrSource.includes('app.all(\n    "/api/workflows/*"') &&
    rawrSource.includes("registerOrpcRoutes(app, {"),
  "surviving route families must remain explicit"
);
assertCondition(
  rawrTestSource.includes(
    "does not expose retired web modules or an interim composition endpoint"
  ) &&
    rawrTestSource.includes("ignores stale persisted enablement without migrating or deleting it"),
  "F1 runtime proof must cover route retirement and stale-state non-authority"
);

console.log("phase-f f1 retired membership lifecycle contract verified");
