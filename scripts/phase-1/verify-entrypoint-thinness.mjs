#!/usr/bin/env bun
import {
  assertCondition,
  pathExists,
  readFile,
} from "./_verify-utils.mjs";

const requiredPaths = [
  "apps/hq/server.ts",
  "apps/hq/async.ts",
  "apps/hq/dev.ts",
  "apps/hq/legacy-cutover.ts",
];

for (const relPath of requiredPaths) {
  assertCondition(await pathExists(relPath), `${relPath} must exist`);
}

const [serverSource, asyncSource, devSource, legacyCutoverSource] = await Promise.all([
  readFile("apps/hq/server.ts"),
  readFile("apps/hq/async.ts"),
  readFile("apps/hq/dev.ts"),
  readFile("apps/hq/legacy-cutover.ts"),
]);

for (const [name, source] of [
  ["server.ts", serverSource],
  ["async.ts", asyncSource],
  ["dev.ts", devSource],
]) {
  assertCondition(source.includes('from "./rawr.hq"'), `${name} must import the canonical shell`);
  assertCondition(source.includes('from "./legacy-cutover"'), `${name} must import the sanctioned legacy cutover seam`);
  assertCondition(source.includes("import.meta.main"), `${name} must remain a real executable entrypoint`);
  assertCondition(!source.includes("../server/src/host-composition"), `${name} must not import host-composition directly`);
  assertCondition(!source.includes("../server/src/host-seam"), `${name} must not import host-seam directly`);
  assertCondition(!source.includes("../server/src/host-realization"), `${name} must not import host-realization directly`);
  assertCondition(!source.includes("registerStateApiPlugin"), `${name} must not register capability plugins directly`);
  assertCondition(!source.includes("registerExampleTodoApiPlugin"), `${name} must not register capability plugins directly`);
}

assertCondition(legacyCutoverSource.includes("../server/src/bootstrap"), "legacy-cutover.ts must localize the one sanctioned runtime bridge");
assertCondition(legacyCutoverSource.includes("../server/src/host-composition"), "legacy-cutover.ts must localize the one sanctioned legacy host-composition bridge");
assertCondition(!legacyCutoverSource.includes("../server/src/host-seam"), "legacy-cutover.ts must not bypass through host-seam");
assertCondition(!legacyCutoverSource.includes("../server/src/host-realization"), "legacy-cutover.ts must not bypass through host-realization");
assertCondition(!legacyCutoverSource.includes("registerStateApiPlugin"), "legacy-cutover.ts must not own plugin declaration selection");
assertCondition(!legacyCutoverSource.includes("registerExampleTodoApiPlugin"), "legacy-cutover.ts must not own plugin declaration selection");

console.log("entrypoint thinness verified");
