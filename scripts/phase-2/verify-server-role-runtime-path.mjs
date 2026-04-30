#!/usr/bin/env bun
import { finishVerification, parseAllowFindings, pathExists, readFile, readJson } from "./_verify-utils.mjs";

const allowFindings = parseAllowFindings();
const failures = [];

const rootPackage = await readJson("package.json");
const workspaceGlobs = new Set(rootPackage.workspaces ?? []);
for (const requiredWorkspace of [
  "packages/core/sdk",
  "packages/core/runtime/*",
  "packages/core/runtime/harnesses/*",
  "resources/*",
]) {
  if (!workspaceGlobs.has(requiredWorkspace)) {
    failures.push(`package.json workspaces must include ${requiredWorkspace}.`);
  }
}
for (const workspace of workspaceGlobs) {
  if (workspace === "packages/runtime" || workspace.startsWith("packages/runtime/")) {
    failures.push(`package.json workspaces must not include stale runtime workspace ${workspace}.`);
  }
}

const serverEntrypoint = await readFile("apps/hq/server.ts");
if (!serverEntrypoint.includes("@rawr/sdk/app")) {
  failures.push("apps/hq/server.ts must boot through @rawr/sdk/app.");
}
if (!/startApp\s*\(/u.test(serverEntrypoint)) {
  failures.push("apps/hq/server.ts must start through startApp(...).");
}
if (serverEntrypoint.includes("./legacy-cutover")) {
  failures.push("apps/hq/server.ts must not import ./legacy-cutover.");
}
if (
  serverEntrypoint.includes("@rawr/runtime/") ||
  serverEntrypoint.includes("@rawr/core-runtime-") ||
  serverEntrypoint.includes("../server/src/bootstrap") ||
  serverEntrypoint.includes("../server/src/") ||
  serverEntrypoint.includes("@rawr/server")
) {
  failures.push("apps/hq/server.ts must not reach into runtime internals, server internals, or the server app package directly.");
}
if (!/role:\s*["']server["']/u.test(serverEntrypoint) && !/roles:\s*\[[^\]]*["']server["']/u.test(serverEntrypoint)) {
  failures.push("apps/hq/server.ts must select the server role explicitly.");
}

for (const requiredPath of [
  "packages/core/sdk/package.json",
  "packages/core/runtime/substrate/package.json",
  "packages/core/runtime/bootgraph/package.json",
  "packages/core/runtime/process-runtime/package.json",
  "packages/core/runtime/harnesses/elysia/package.json",
]) {
  if (!(await pathExists(requiredPath))) {
    failures.push(`${requiredPath} must exist for the canonical server runtime path.`);
  }
}

for (const relPath of ["apps/server/src/rawr.ts", "apps/server/src/bootstrap.ts", "apps/server/src/runtime-authority.ts"]) {
  if (!(await pathExists(relPath))) continue;
  const source = await readFile(relPath);
  if (source.includes("@rawr/hq-app/legacy-cutover")) {
    failures.push(`${relPath} must not import @rawr/hq-app/legacy-cutover.`);
  }
  if (source.includes("./host-composition") || source.includes("../server/src/host-composition")) {
    failures.push(`${relPath} must not depend on host-composition as live runtime authority.`);
  }
}

const hqAppHost = await readFile("apps/server/src/hq-app-host.ts");
if (!hqAppHost.includes("@rawr/sdk/app") || !/startApp\s*\(/u.test(hqAppHost)) {
  failures.push("apps/server/src/hq-app-host.ts must mount the production host through startApp(...).");
}
if (!hqAppHost.includes('from "./bootstrap"')) {
  failures.push("apps/server/src/hq-app-host.ts must own the concrete server bootstrap binding.");
}
if (await pathExists("apps/server/src/host-composition.ts")) {
  failures.push("apps/server/src/host-composition.ts must be removed from the live server runtime path.");
}

finishVerification({
  allowFindings,
  failures,
  successMessage: "phase-2 server-role-runtime-path verified",
  findingPrefix: "phase-2 server-role-runtime-path",
});
