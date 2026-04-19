#!/usr/bin/env bun
import { assertCondition, pathExists, readFile } from "./_verify-utils.mjs";

const requiredPaths = [
  "apps/hq/legacy-cutover.ts",
  "apps/server/src/rawr.ts",
  "apps/server/src/testing-host.ts",
  "apps/server/src/host-composition.ts",
  "apps/server/src/host-seam.ts",
  "apps/server/src/host-realization.ts",
];

for (const relPath of requiredPaths) {
  assertCondition(await pathExists(relPath), `${relPath} must exist`);
}

const [legacyCutoverSource, rawrSource, testingHostSource] = await Promise.all([
  readFile("apps/hq/legacy-cutover.ts"),
  readFile("apps/server/src/rawr.ts"),
  readFile("apps/server/src/testing-host.ts"),
]);

assertCondition(
  legacyCutoverSource.includes("../server/src/bootstrap"),
  "legacy-cutover.ts must localize the sanctioned runtime bootstrap bridge",
);
assertCondition(
  legacyCutoverSource.includes("../server/src/host-composition"),
  "legacy-cutover.ts must be the only surviving importer of host-composition",
);
assertCondition(
  !legacyCutoverSource.includes("../server/src/host-seam") &&
    !legacyCutoverSource.includes("../server/src/host-realization"),
  "legacy-cutover.ts must not bypass host-composition by importing host-seam or host-realization directly",
);
assertCondition(
  !legacyCutoverSource.includes("registerStateApiPlugin") &&
    !legacyCutoverSource.includes("registerExampleTodoApiPlugin"),
  "legacy-cutover.ts must not own plugin declaration membership",
);

for (const [name, source] of [
  ["apps/server/src/rawr.ts", rawrSource],
  ["apps/server/src/testing-host.ts", testingHostSource],
]) {
  assertCondition(
    source.includes('@rawr/hq-app/legacy-cutover'),
    `${name} must consume the sanctioned HQ legacy cutover bridge`,
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

console.log("no legacy composition authority verified");
