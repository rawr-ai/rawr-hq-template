#!/usr/bin/env bun
import { assertCondition, pathExists, readFile } from "./_verify-utils.mjs";

const requiredPaths = [
  "apps/server/src/rawr.ts",
  "apps/server/src/testing-host.ts",
  "apps/server/src/runtime-authority.ts",
  "apps/server/src/hq-app-host.ts",
  "apps/server/src/host-seam.ts",
  "apps/server/src/host-realization.ts",
];

for (const relPath of requiredPaths) {
  assertCondition(await pathExists(relPath), `${relPath} must exist`);
}

assertCondition(!(await pathExists("apps/hq/legacy-cutover.ts")), "apps/hq/legacy-cutover.ts must stay deleted");
assertCondition(!(await pathExists("apps/server/src/host-composition.ts")), "apps/server/src/host-composition.ts must stay deleted");

const [rawrSource, testingHostSource, runtimeAuthoritySource, hqAppHostSource] = await Promise.all([
  readFile("apps/server/src/rawr.ts"),
  readFile("apps/server/src/testing-host.ts"),
  readFile("apps/server/src/runtime-authority.ts"),
  readFile("apps/server/src/hq-app-host.ts"),
]);

assertCondition(
  runtimeAuthoritySource.includes("createRawrHqManifest") &&
    runtimeAuthoritySource.includes("createRawrHostSatisfiers") &&
    runtimeAuthoritySource.includes("createRawrHostBoundRolePlan") &&
    runtimeAuthoritySource.includes("materializeRawrHostBoundRolePlan"),
  "runtime-authority.ts must directly own manifest intake, satisfier construction, binding, and realization",
);
assertCondition(
  !runtimeAuthoritySource.includes("./host-composition"),
  "runtime-authority.ts must not wrap the deleted host-composition bridge",
);
assertCondition(
  hqAppHostSource.includes("@rawr/sdk/app") &&
    hqAppHostSource.includes("startApp(") &&
    hqAppHostSource.includes('from "./bootstrap"'),
  "hq-app-host.ts must own the server bootstrap binding behind startApp(...)",
);

for (const [name, source] of [
  ["apps/server/src/rawr.ts", rawrSource],
  ["apps/server/src/testing-host.ts", testingHostSource],
]) {
  assertCondition(
    source.includes('./runtime-authority') || source.includes('from "./runtime-authority"'),
    `${name} must consume the server-owned HQ runtime authority`,
  );
  assertCondition(
    !source.includes("./host-composition") &&
      !source.includes("./host-seam") &&
      !source.includes("./host-realization"),
    `${name} must not import legacy host authority directly`,
  );
  assertCondition(
    !source.includes("createRawrHostComposition"),
    `${name} must not create host composition directly`,
  );
}

const indexSource = await readFile("apps/hq/src/index.ts");
assertCondition(
  !indexSource.includes("legacy-cutover"),
  "apps/hq/src/index.ts must not re-export legacy-cutover symbols from the barrel export",
);

console.log("no legacy composition authority verified");
