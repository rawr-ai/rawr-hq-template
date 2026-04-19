#!/usr/bin/env bun
import { assertCondition, pathExists, readFile } from "./_verify-utils.mjs";

const requiredDirs = [
  "plugins/server",
  "plugins/server/api",
  "plugins/async",
  "plugins/async/workflows",
  "plugins/async/schedules",
  "plugins/server/api/example-todo",
  "plugins/server/api/state",
];

for (const relPath of requiredDirs) {
  assertCondition(await pathExists(relPath), `${relPath} must exist in the canonical topology`);
}

for (const removedRoot of ["plugins/api", "plugins/workflows"]) {
  assertCondition(!(await pathExists(removedRoot)), `${removedRoot} must be absent from the live tree`);
}

const [rootPackageSource, tsconfigSource, pluginAgentsSource, manifestSource, hostSeamSource, webClientSource] = await Promise.all([
  readFile("package.json"),
  readFile("tsconfig.base.json"),
  readFile("plugins/AGENTS.md"),
  readFile("apps/hq/src/manifest.ts"),
  readFile("apps/server/src/host-seam.ts"),
  readFile("apps/web/src/ui/lib/orpc-client.ts"),
]);

for (const requiredSnippet of [
  "\"plugins/server/api/*\"",
  "\"plugins/async/workflows/*\"",
  "\"plugins/async/schedules/*\"",
]) {
  assertCondition(rootPackageSource.includes(requiredSnippet), `package.json workspaces must include ${requiredSnippet}`);
}

for (const forbiddenSnippet of ["\"plugins/api/*\"", "\"plugins/workflows/*\""]) {
  assertCondition(!rootPackageSource.includes(forbiddenSnippet), `package.json must not include ${forbiddenSnippet}`);
}

for (const requiredAlias of [
  "@rawr/plugin-server-api-example-todo",
  "@rawr/plugin-server-api-example-todo/server",
  "@rawr/plugin-server-api-state",
  "@rawr/plugin-server-api-state/server",
]) {
  assertCondition(tsconfigSource.includes(requiredAlias), `tsconfig.base.json must include ${requiredAlias}`);
}

for (const forbiddenAlias of [
  "@rawr/plugin-api-example-todo",
  "@rawr/plugin-api-example-todo/server",
  "@rawr/plugin-api-state",
  "@rawr/plugin-api-state/server",
]) {
  assertCondition(!tsconfigSource.includes(`"${forbiddenAlias}"`), `tsconfig.base.json must not include ${forbiddenAlias}`);
}

for (const requiredRoot of [
  "plugins/server/api/*",
  "plugins/async/workflows/*",
  "plugins/async/schedules/*",
]) {
  assertCondition(pluginAgentsSource.includes(requiredRoot), `plugins/AGENTS.md must describe ${requiredRoot}`);
}

for (const forbiddenRoot of ["plugins/api/*", "plugins/workflows/*"]) {
  assertCondition(!pluginAgentsSource.includes(forbiddenRoot), `plugins/AGENTS.md must not describe ${forbiddenRoot}`);
}

assertCondition(
  manifestSource.includes("@rawr/plugin-server-api-example-todo/server") &&
    manifestSource.includes("@rawr/plugin-server-api-state/server"),
  "apps/hq/src/manifest.ts must import the canonical role-first server plugin packages",
);

assertCondition(
  hostSeamSource.includes("@rawr/plugin-server-api-example-todo/server") &&
    hostSeamSource.includes("@rawr/plugin-server-api-state/server"),
  "apps/server/src/host-seam.ts must type against the canonical role-first server plugin packages",
);

assertCondition(
  webClientSource.includes("@rawr/plugin-server-api-state"),
  "apps/web/src/ui/lib/orpc-client.ts must consume the canonical role-first state plugin package",
);

console.log("canonical plugin topology verified");
