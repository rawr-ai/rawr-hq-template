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
];

for (const relPath of requiredPaths) {
  assertCondition(await pathExists(relPath), `${relPath} must exist`);
}

assertCondition(!(await pathExists("apps/hq/legacy-cutover.ts")), "apps/hq/legacy-cutover.ts must stay deleted");

const [serverSource, asyncSource, devSource] = await Promise.all([
  readFile("apps/hq/server.ts"),
  readFile("apps/hq/async.ts"),
  readFile("apps/hq/dev.ts"),
]);

for (const [name, source] of [
  ["server.ts", serverSource],
  ["async.ts", asyncSource],
  ["dev.ts", devSource],
]) {
  assertCondition(source.includes('from "./rawr.hq"'), `${name} must import the canonical shell`);
  assertCondition(source.includes("@rawr/sdk/app"), `${name} must bind role selection through @rawr/sdk/app`);
  assertCondition(source.includes("startApp("), `${name} must start through startApp(...)`);
  assertCondition(source.includes("import.meta.main"), `${name} must remain a real executable entrypoint`);
  assertCondition(!source.includes("./legacy-cutover"), `${name} must not import the deleted legacy cutover seam`);
  assertCondition(!source.includes("../server/src/"), `${name} must not import server internals directly`);
  assertCondition(!source.includes("@rawr/server"), `${name} must not depend on the server app package`);
  assertCondition(!source.includes("../server/src/host-composition"), `${name} must not import host-composition directly`);
  assertCondition(!source.includes("../server/src/host-seam"), `${name} must not import host-seam directly`);
  assertCondition(!source.includes("../server/src/host-realization"), `${name} must not import host-realization directly`);
  assertCondition(!source.includes("registerStateApiPlugin"), `${name} must not register capability plugins directly`);
  assertCondition(!source.includes("registerExampleTodoApiPlugin"), `${name} must not register capability plugins directly`);
}

console.log("entrypoint thinness verified");
