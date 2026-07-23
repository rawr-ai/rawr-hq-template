#!/usr/bin/env bun
import { assertCondition, pathExists, readFile } from "./_verify-utils.mjs";

const requiredDirs = [
  "plugins/server",
  "plugins/server/api",
  "plugins/async",
  "plugins/async/workflows",
  "plugins/async/schedules",
  "plugins/server/api/example-todo",
];

for (const relPath of requiredDirs) {
  assertCondition(await pathExists(relPath), `${relPath} must exist in the canonical topology`);
}

for (const removedRoot of ["plugins/api", "plugins/workflows"]) {
  assertCondition(
    !(await pathExists(removedRoot)),
    `${removedRoot} must be absent from the live tree`
  );
}

const [rootPackageSource, tsconfigSource, pluginAgentsSource] = await Promise.all([
  readFile("package.json"),
  readFile("tsconfig.base.json"),
  readFile("plugins/AGENTS.md"),
]);

for (const requiredSnippet of [
  '"plugins/server/api/*"',
  '"plugins/async/workflows/*"',
  '"plugins/async/schedules/*"',
]) {
  assertCondition(
    rootPackageSource.includes(requiredSnippet),
    `package.json workspaces must include ${requiredSnippet}`
  );
}

for (const forbiddenSnippet of ['"plugins/api/*"', '"plugins/workflows/*"']) {
  assertCondition(
    !rootPackageSource.includes(forbiddenSnippet),
    `package.json must not include ${forbiddenSnippet}`
  );
}

for (const forbiddenAlias of [
  "@rawr/plugin-api-example-todo",
  "@rawr/plugin-api-example-todo/server",
  "@rawr/plugin-api-state",
  "@rawr/plugin-api-state/server",
  "@rawr/plugin-server-api-state",
  "@rawr/plugin-server-api-state/server",
]) {
  assertCondition(
    !tsconfigSource.includes(`"${forbiddenAlias}"`),
    `tsconfig.base.json must not include ${forbiddenAlias}`
  );
}

for (const requiredRoot of [
  "plugins/server/api/*",
  "plugins/async/workflows/*",
  "plugins/async/schedules/*",
]) {
  assertCondition(
    pluginAgentsSource.includes(requiredRoot),
    `plugins/AGENTS.md must describe ${requiredRoot}`
  );
}

for (const forbiddenRoot of ["plugins/api/*", "plugins/workflows/*"]) {
  assertCondition(
    !pluginAgentsSource.includes(forbiddenRoot),
    `plugins/AGENTS.md must not describe ${forbiddenRoot}`
  );
}

console.log("canonical plugin roots verified");
