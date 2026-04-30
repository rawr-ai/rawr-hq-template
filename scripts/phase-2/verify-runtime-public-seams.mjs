#!/usr/bin/env bun
import { finishVerification, listFilesUnder, parseAllowFindings, pathExists, readFile, readJson } from "./_verify-utils.mjs";

const allowFindings = parseAllowFindings();
const failures = [];

const sdkPackage = await readJson("packages/core/sdk/package.json");
for (const exportName of [
  "./app",
  "./effect",
  "./execution",
  "./service",
  "./service/schema",
  "./plugins/server",
  "./plugins/server/effect",
  "./plugins/async",
  "./plugins/async/effect",
  "./runtime/resources",
  "./runtime/providers",
  "./runtime/providers/effect",
  "./runtime/profiles",
  "./runtime/schema",
]) {
  if (sdkPackage.exports?.[exportName] === undefined) {
    failures.push(`packages/core/sdk/package.json must export ${exportName}.`);
  }
}

for (const relPath of [
  "packages/core/sdk/src/app/index.ts",
  "packages/core/sdk/src/effect/index.ts",
  "packages/core/sdk/src/execution/index.ts",
  "packages/core/sdk/src/service/index.ts",
  "packages/core/sdk/src/plugins/server/index.ts",
  "packages/core/sdk/src/plugins/async/index.ts",
  "packages/core/sdk/src/runtime/resources/index.ts",
  "packages/core/sdk/src/runtime/providers/index.ts",
  "packages/core/sdk/src/runtime/profiles/index.ts",
  "packages/core/sdk/src/runtime/schema/index.ts",
]) {
  if (!(await pathExists(relPath))) {
    failures.push(`${relPath} must exist as part of the public runtime SDK seam.`);
  }
}

if (await pathExists("packages/core/sdk/src/app/index.ts")) {
  const appSource = await readFile("packages/core/sdk/src/app/index.ts");
  if (!/export\s+function\s+defineApp/u.test(appSource)) {
    failures.push("packages/core/sdk/src/app/index.ts must export defineApp().");
  }
  if (!/export\s+(async\s+)?function\s+startApp/u.test(appSource)) {
    failures.push("packages/core/sdk/src/app/index.ts must export startApp().");
  }
  if (appSource.includes('from "effect"') || appSource.includes("from 'effect'")) {
    failures.push("packages/core/sdk/src/app/index.ts must not import Effect directly.");
  }
}

if (!(await pathExists("packages/core/runtime/bootgraph/package.json"))) {
  failures.push("packages/core/runtime/bootgraph/package.json must exist.");
} else {
  const bootgraphPackage = await readJson("packages/core/runtime/bootgraph/package.json");
  for (const forbiddenExport of ["./app", "./app-runtime"]) {
    if (bootgraphPackage.exports?.[forbiddenExport] !== undefined) {
      failures.push(`packages/core/runtime/bootgraph must not export ${forbiddenExport}; that public seam belongs in @rawr/sdk.`);
    }
  }
}

if (await pathExists("packages/core/runtime/bootgraph/src")) {
  const bootgraphFiles = await listFilesUnder("packages/core/runtime/bootgraph/src");
  for (const relPath of bootgraphFiles) {
    const source = await readFile(relPath);
    if (/defineApp\s*\(/u.test(source) || /startApp\s*\(/u.test(source)) {
      failures.push(`${relPath} must not implement public app authoring/runtime APIs.`);
    }
  }
}

for (const exportPath of Object.values(sdkPackage.exports ?? {})) {
  const relPath = typeof exportPath === "string"
    ? exportPath
    : typeof exportPath === "object" && exportPath !== null && typeof exportPath.default === "string"
      ? exportPath.default
      : null;
  if (!relPath || !relPath.startsWith("./")) continue;

  const resolvedPath = `packages/core/sdk/${relPath.slice(2)}`;
  if (!(await pathExists(resolvedPath))) continue;
  const source = await readFile(resolvedPath);
  if (source.includes('from "effect"') || source.includes("from 'effect'")) {
    failures.push(`${resolvedPath} must not import Effect directly from a public @rawr/sdk export.`);
  }
}

finishVerification({
  allowFindings,
  failures,
  successMessage: "phase-2 runtime-public-seams verified",
  findingPrefix: "phase-2 runtime-public-seams",
});
