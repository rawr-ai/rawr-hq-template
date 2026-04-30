#!/usr/bin/env bun
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { finishVerification, listFilesUnder, parseAllowFindings, pathExists, readFile, readJson, root } from "./_verify-utils.mjs";

const allowFindings = parseAllowFindings();
const failures = [];
const SDK_EFFECT_VERSION = "4.0.0-beta.59";

async function findPackageJsonForResolvedModule(resolvedModulePath, packageName) {
  let current = path.dirname(resolvedModulePath);
  while (current !== path.dirname(current)) {
    const packageJsonPath = path.join(current, "package.json");
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
      if (packageJson.name === packageName) {
        return { path: packageJsonPath, version: packageJson.version };
      }
    } catch {
      // keep walking
    }
    current = path.dirname(current);
  }

  throw new Error(`could not find package.json for resolved ${packageName} module at ${resolvedModulePath}`);
}

async function resolveSdkEffectPackage() {
  const requireFromSdk = createRequire(path.join(root, "packages/core/sdk/package.json"));
  const resolvedEffect = requireFromSdk.resolve("effect");
  return await findPackageJsonForResolvedModule(resolvedEffect, "effect");
}

const sdkPackage = await readJson("packages/core/sdk/package.json");
if (sdkPackage.dependencies?.effect !== SDK_EFFECT_VERSION) {
  failures.push(`@rawr/sdk must pin the production runtime target to effect@${SDK_EFFECT_VERSION}.`);
}
if (sdkPackage.scripts?.negative !== "tsc -p tsconfig.negative.json --noEmit") {
  failures.push("@rawr/sdk must keep a negative type gate for public runtime law.");
}

try {
  const resolvedEffectPackage = await resolveSdkEffectPackage();
  if (resolvedEffectPackage.version !== SDK_EFFECT_VERSION) {
    failures.push(
      `@rawr/sdk must resolve effect@${SDK_EFFECT_VERSION}; resolved ${resolvedEffectPackage.version} at ${path.relative(root, resolvedEffectPackage.path)}.`,
    );
  }
} catch (error) {
  failures.push(`@rawr/sdk must resolve its Effect dependency from installed packages: ${error instanceof Error ? error.message : String(error)}.`);
}
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
  "./plugins/cli",
  "./plugins/cli/effect",
  "./plugins/cli/schema",
  "./plugins/web",
  "./plugins/web/effect",
  "./plugins/agent",
  "./plugins/agent/effect",
  "./plugins/agent/schema",
  "./plugins/desktop",
  "./plugins/desktop/effect",
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
  "packages/core/sdk/src/plugins/server/effect.ts",
  "packages/core/sdk/src/plugins/async/index.ts",
  "packages/core/sdk/src/plugins/async/effect.ts",
  "packages/core/sdk/src/plugins/cli/index.ts",
  "packages/core/sdk/src/plugins/cli/effect.ts",
  "packages/core/sdk/src/plugins/cli/schema.ts",
  "packages/core/sdk/src/plugins/web/index.ts",
  "packages/core/sdk/src/plugins/web/effect.ts",
  "packages/core/sdk/src/plugins/agent/index.ts",
  "packages/core/sdk/src/plugins/agent/effect.ts",
  "packages/core/sdk/src/plugins/agent/schema.ts",
  "packages/core/sdk/src/plugins/desktop/index.ts",
  "packages/core/sdk/src/plugins/desktop/effect.ts",
  "packages/core/sdk/src/runtime/resources/index.ts",
  "packages/core/sdk/src/runtime/providers/index.ts",
  "packages/core/sdk/src/runtime/providers/effect.ts",
  "packages/core/sdk/src/runtime/profiles/index.ts",
  "packages/core/sdk/src/runtime/schema/index.ts",
  "packages/core/sdk/tsconfig.negative.json",
  "packages/core/sdk/test/types/public-law-negative.ts",
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
  if (resolvedPath === "packages/core/sdk/src/effect/index.ts") continue;
  const source = await readFile(resolvedPath);
  if (source.includes('from "effect"') || source.includes("from 'effect'")) {
    failures.push(`${resolvedPath} must not import Effect directly from a public @rawr/sdk export.`);
  }
}

if (await pathExists("packages/core/sdk/src/effect/index.ts")) {
  const effectSource = await readFile("packages/core/sdk/src/effect/index.ts");
  for (const forbiddenPublicRuntimeExport of [
    "runPromise",
    "ManagedRuntime",
    "Layer.launch",
    "Context.Tag",
    "Queue.",
    "PubSub.",
    "Fiber.",
    "Stream.",
    "Schedule.",
    "Cache.",
  ]) {
    if (effectSource.includes(forbiddenPublicRuntimeExport)) {
      failures.push(`@rawr/sdk/effect must not expose ${forbiddenPublicRuntimeExport}.`);
    }
  }
}

finishVerification({
  allowFindings,
  failures,
  successMessage: "phase-2 runtime-public-seams verified",
  findingPrefix: "phase-2 runtime-public-seams",
});
