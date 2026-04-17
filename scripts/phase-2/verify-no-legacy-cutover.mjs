#!/usr/bin/env bun
import { collectImportSites, finishVerification, parseAllowFindings, pathExists, readFile, readJson } from "./_verify-utils.mjs";

const allowFindings = parseAllowFindings();
const failures = [];

if (await pathExists("apps/hq/legacy-cutover.ts")) {
  failures.push("apps/hq/legacy-cutover.ts must be deleted.");
}

const hqPackage = await readJson("apps/hq/package.json");
if (hqPackage.exports?.["./legacy-cutover"] !== undefined) {
  failures.push("apps/hq/package.json must stop exporting ./legacy-cutover.");
}

for (const relPath of ["apps/hq/server.ts", "apps/hq/async.ts", "apps/hq/dev.ts", "apps/hq/src/index.ts"]) {
  if (!(await pathExists(relPath))) continue;
  const source = await readFile(relPath);
  if (source.includes("./legacy-cutover") || source.includes("../legacy-cutover")) {
    failures.push(`${relPath} must stop importing or re-exporting ./legacy-cutover.`);
  }
}

const legacyImportSites = await collectImportSites(["@rawr/hq-app/legacy-cutover"]);
for (const site of legacyImportSites) {
  failures.push(`legacy bridge import still live: ${site}`);
}

finishVerification({
  allowFindings,
  failures,
  successMessage: "phase-2 no-legacy-cutover verified",
  findingPrefix: "phase-2 no-legacy-cutover",
});
