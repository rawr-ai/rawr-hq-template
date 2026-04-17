#!/usr/bin/env bun
import { finishVerification, listFilesUnder, parseAllowFindings, pathExists, readFile, readJson } from "./_verify-utils.mjs";

const allowFindings = parseAllowFindings();
const failures = [];

const hqSdkPackage = await readJson("packages/hq-sdk/package.json");
for (const exportName of ["./app", "./app-runtime"]) {
  if (hqSdkPackage.exports?.[exportName] === undefined) {
    failures.push(`packages/hq-sdk/package.json must export ${exportName}.`);
  }
}

for (const relPath of [
  "packages/hq-sdk/src/app.ts",
  "packages/hq-sdk/src/app-runtime.ts",
]) {
  if (!(await pathExists(relPath))) {
    failures.push(`${relPath} must exist as part of the public app/runtime seam.`);
  }
}

if (await pathExists("packages/hq-sdk/src/app.ts")) {
  const appSource = await readFile("packages/hq-sdk/src/app.ts");
  if (!/export\s+function\s+defineApp/u.test(appSource)) {
    failures.push("packages/hq-sdk/src/app.ts must export defineApp().");
  }
  if (appSource.includes('from "effect"') || appSource.includes("from 'effect'")) {
    failures.push("packages/hq-sdk/src/app.ts must not import Effect directly.");
  }
}

if (await pathExists("packages/hq-sdk/src/app-runtime.ts")) {
  const runtimeSource = await readFile("packages/hq-sdk/src/app-runtime.ts");
  if (!/export\s+(async\s+)?function\s+startAppRole/u.test(runtimeSource)) {
    failures.push("packages/hq-sdk/src/app-runtime.ts must export startAppRole().");
  }
  if (runtimeSource.includes('from "effect"') || runtimeSource.includes("from 'effect'")) {
    failures.push("packages/hq-sdk/src/app-runtime.ts must not import Effect directly.");
  }
}

if (!(await pathExists("packages/runtime/bootgraph/package.json"))) {
  failures.push("packages/runtime/bootgraph/package.json must exist.");
} else {
  const bootgraphPackage = await readJson("packages/runtime/bootgraph/package.json");
  for (const forbiddenExport of ["./app", "./app-runtime"]) {
    if (bootgraphPackage.exports?.[forbiddenExport] !== undefined) {
      failures.push(`packages/runtime/bootgraph must not export ${forbiddenExport}; that public seam belongs in hq-sdk.`);
    }
  }
}

if (await pathExists("packages/runtime/bootgraph/src")) {
  const bootgraphFiles = await listFilesUnder("packages/runtime/bootgraph/src");
  for (const relPath of bootgraphFiles) {
    const source = await readFile(relPath);
    if (/defineApp\s*\(/u.test(source) || /startAppRole\s*\(/u.test(source)) {
      failures.push(`${relPath} must not implement public app authoring/runtime APIs.`);
    }
  }
}

for (const exportPath of Object.values(hqSdkPackage.exports ?? {})) {
  const relPath = typeof exportPath === "string"
    ? exportPath
    : typeof exportPath === "object" && exportPath !== null && typeof exportPath.default === "string"
      ? exportPath.default
      : null;
  if (!relPath || !relPath.startsWith("./")) continue;

  const resolvedPath = `packages/hq-sdk/${relPath.slice(2)}`;
  if (!(await pathExists(resolvedPath))) continue;
  const source = await readFile(resolvedPath);
  if (source.includes('from "effect"') || source.includes("from 'effect'")) {
    failures.push(`${resolvedPath} must not import Effect directly from a public hq-sdk export.`);
  }
}

finishVerification({
  allowFindings,
  failures,
  successMessage: "phase-2 runtime-public-seams verified",
  findingPrefix: "phase-2 runtime-public-seams",
});
