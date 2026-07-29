#!/usr/bin/env bun
import { finishVerification, parseAllowFindings, readFile, readJson } from "./_verify-utils.mjs";

const allowFindings = parseAllowFindings();
const failures = [];

const [serverEntrypoint, serverHost, rawrSource, bootstrapSource, hqPackage, serverPackage] =
  await Promise.all([
    readFile("apps/hq/server.ts"),
    readFile("apps/server/src/host.ts"),
    readFile("apps/server/src/rawr.ts"),
    readFile("apps/server/src/bootstrap.ts"),
    readJson("apps/hq/package.json"),
    readJson("apps/server/package.json"),
  ]);

if (!serverEntrypoint.includes("@rawr/server/host")) {
  failures.push("apps/hq/server.ts must realize its selected role through @rawr/server/host.");
}
if (serverEntrypoint.includes("legacy-cutover")) {
  failures.push("apps/hq/server.ts must not import the retired legacy cutover.");
}
if (!/role:\s*["']server["']/u.test(serverEntrypoint)) {
  failures.push("apps/hq/server.ts must select the server role explicitly.");
}
if (!serverHost.includes("createRawrHostComposition")) {
  failures.push("apps/server/src/host.ts must realize app-selected declarations.");
}

for (const [relPath, source] of [
  ["apps/server/src/host.ts", serverHost],
  ["apps/server/src/rawr.ts", rawrSource],
  ["apps/server/src/bootstrap.ts", bootstrapSource],
]) {
  if (source.includes("@rawr/hq-app")) {
    failures.push(`${relPath} must not reach back into @rawr/hq-app.`);
  }
  if (source.includes("legacy-cutover")) {
    failures.push(`${relPath} must not retain the legacy cutover.`);
  }
}

if (hqPackage.dependencies?.["@rawr/server"] !== "workspace:*") {
  failures.push("apps/hq/package.json must declare the public server host dependency.");
}
if (serverPackage.dependencies?.["@rawr/hq-app"] !== undefined) {
  failures.push("apps/server/package.json must not depend on @rawr/hq-app.");
}

finishVerification({
  allowFindings,
  failures,
  successMessage: "phase-2 server-role-runtime-path verified",
  findingPrefix: "phase-2 server-role-runtime-path",
});
