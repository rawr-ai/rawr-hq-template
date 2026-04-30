#!/usr/bin/env bun
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import {
  collectImportSites,
  finishVerification,
  listSourceFiles,
  pathExists,
  readFile,
  readJson,
  root,
} from "../phase-2/_verify-utils.mjs";

const EFFECT4_VERSION = "4.0.0-beta.59";
const failures = [];

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
      // Keep walking toward the filesystem root.
    }
    current = path.dirname(current);
  }

  throw new Error(`could not find package.json for resolved ${packageName} module at ${resolvedModulePath}`);
}

async function resolveEffectFromPackage(relPackageJsonPath) {
  const requireFromPackage = createRequire(path.join(root, relPackageJsonPath));
  const resolvedEffect = requireFromPackage.resolve("effect");
  return findPackageJsonForResolvedModule(resolvedEffect, "effect");
}

async function assertEffect4Package(relPackageJsonPath, packageName) {
  const pkg = await readJson(relPackageJsonPath);
  if (pkg.name !== packageName) {
    failures.push(`${relPackageJsonPath} must be named ${packageName}.`);
  }
  if (pkg.dependencies?.effect !== EFFECT4_VERSION) {
    failures.push(`${packageName} must pin effect@${EFFECT4_VERSION}.`);
  }

  try {
    const resolved = await resolveEffectFromPackage(relPackageJsonPath);
    if (resolved.version !== EFFECT4_VERSION) {
      failures.push(
        `${packageName} must resolve effect@${EFFECT4_VERSION}; resolved ${resolved.version} at ${path.relative(root, resolved.path)}.`,
      );
    }
  } catch (error) {
    failures.push(`${packageName} must resolve Effect from installed packages: ${error instanceof Error ? error.message : String(error)}.`);
  }
}

await assertEffect4Package("packages/core/sdk/package.json", "@rawr/sdk");
await assertEffect4Package("packages/core/runtime/substrate/package.json", "@rawr/core-runtime-substrate");

const effectImportSites = await collectImportSites(["effect"]);
for (const site of effectImportSites) {
  const [relPath, specifier] = site.split("::");
  const allowed =
    relPath === "packages/core/sdk/src/effect/index.ts" ||
    relPath.startsWith("packages/core/runtime/") ||
    relPath.startsWith("tools/runtime-realization-type-env/");
  if (!allowed) {
    failures.push(`raw Effect import ${specifier} is outside approved runtime/lab quarantine at ${relPath}.`);
  }
}

const staleRuntimeSupportImports = await collectImportSites([
  "@rawr/bootgraph",
  "@rawr/runtime-context",
]);
for (const site of staleRuntimeSupportImports) {
  failures.push(`stale runtime support import survived: ${site}.`);
}

for (const relPath of [
  "packages/bootgraph/package.json",
  "packages/runtime-context/package.json",
  "apps/hq/legacy-cutover.ts",
  "apps/server/src/host-composition.ts",
]) {
  if (await pathExists(relPath)) {
    failures.push(`${relPath} must not remain as live production runtime authority.`);
  }
}

const rootPackage = await readJson("package.json");
for (const scriptName of ["build", "typecheck", "pretest:vitest"]) {
  const script = rootPackage.scripts?.[scriptName] ?? "";
  for (const retiredProject of ["@rawr/bootgraph", "@rawr/runtime-context"]) {
    if (script.includes(retiredProject)) {
      failures.push(`root script ${scriptName} must not include retired project ${retiredProject}.`);
    }
  }
}
if (rootPackage.dependencies?.["@rawr/runtime-context"]) {
  failures.push("root package dependencies must not retain @rawr/runtime-context.");
}

const executionSource = await readFile("packages/core/sdk/src/execution/index.ts");
for (const requiredExport of [
  "WorkflowRuntimeSupportSeam",
  "BoundaryMiddlewareSupportState",
  "HostRuntimeSupportContext",
  "BoundaryRequestSupportContext",
]) {
  if (!executionSource.includes(requiredExport)) {
    failures.push(`@rawr/sdk/execution must export ${requiredExport}.`);
  }
}

const sourceFiles = await listSourceFiles();
for (const relPath of sourceFiles) {
  if (
    relPath.startsWith("tools/runtime-realization-type-env/") ||
    relPath.includes("/test/") ||
    relPath.endsWith(".test.ts") ||
    relPath.endsWith(".test.tsx")
  ) {
    continue;
  }
  const source = await readFile(relPath);
  if (source.includes("legacy-cutover") || source.includes("host-composition")) {
    failures.push(`${relPath} must not reference retired legacy-cutover or host-composition authority.`);
  }
}

const labRuntimeSource = await readFile("tools/runtime-realization-type-env/src/vendor/effect/runtime.ts");
if (!labRuntimeSource.includes('effectVersionProof = "3.21.2"')) {
  failures.push("closed runtime-realization lab must keep its Effect 3 proof explicit instead of being counted as Effect 4 production proof.");
}

finishVerification({
  allowFindings: false,
  failures,
  successMessage: "runtime production Effect 4 and retired support package gates verified",
  findingPrefix: "runtime production Effect 4 gate",
});
