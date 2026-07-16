import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import type { ControllerNxProject } from "../nx-closure.ts";
import {
  PRODUCTION_DEPENDENCY_LOCK_PATH,
  PRODUCTION_DEPENDENCY_MANIFEST_PATH,
  PROTECTED_CONTROLLER_SOURCE_PATTERNS,
  PROTECTED_RUNTIME_DEPENDENCIES,
} from "./constants.ts";

type PackageManifest = Readonly<{
  name?: unknown;
  dependencies?: unknown;
}>;

export type ProductionDependencySet = Readonly<Record<string, string>>;

function asDependencySet(value: unknown, label: string): ProductionDependencySet {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} dependencies must be an object`);
  }
  const result: Record<string, string> = {};
  for (const [name, version] of Object.entries(value)) {
    if (typeof version !== "string" || version.length === 0) {
      throw new Error(`${label} dependency ${name} has no version`);
    }
    result[name] = version;
  }
  return Object.freeze(result);
}

async function readPackageManifest(path: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(path, "utf8")) as PackageManifest;
}

function parseBunLockPackages(lockText: string): Readonly<Record<string, unknown>> {
  const BunRuntime = (globalThis as typeof globalThis & {
    Bun?: { JSONC?: { parse(text: string): unknown } };
  }).Bun;
  if (BunRuntime?.JSONC === undefined) {
    throw new Error("production controller builder requires Bun.JSONC for lock parsing");
  }
  const lock = BunRuntime.JSONC.parse(lockText);
  if (lock === null || typeof lock !== "object" || !("packages" in lock)) {
    throw new Error("workspace Bun lock has no packages table");
  }
  const packages = lock.packages;
  if (packages === null || typeof packages !== "object" || Array.isArray(packages)) {
    throw new Error("workspace Bun lock packages table is invalid");
  }
  return packages as Readonly<Record<string, unknown>>;
}

function rootLockVersion(packages: Readonly<Record<string, unknown>>, packageId: string): string | null {
  const row = packages[packageId];
  if (!Array.isArray(row) || typeof row[0] !== "string") return null;
  const prefix = `${packageId}@`;
  return row[0].startsWith(prefix) ? row[0].slice(prefix.length) : null;
}

export async function loadProductionDependencies(): Promise<ProductionDependencySet> {
  const manifest = JSON.parse(
    await readFile(PRODUCTION_DEPENDENCY_MANIFEST_PATH, "utf8"),
  ) as { packageManager?: unknown; dependencies?: unknown };
  if (manifest.packageManager !== "bun@1.3.14") {
    throw new Error("production dependency manifest must pin bun@1.3.14");
  }
  const productionLockPackages = parseBunLockPackages(
    await readFile(PRODUCTION_DEPENDENCY_LOCK_PATH, "utf8"),
  );
  for (const [key, row] of Object.entries(productionLockPackages)) {
    const identity = Array.isArray(row) && typeof row[0] === "string" ? row[0] : "";
    for (const protectedName of PROTECTED_RUNTIME_DEPENDENCIES) {
      if (
        key === protectedName
        || key.endsWith(`/${protectedName}`)
        || identity.startsWith(`${protectedName}@`)
      ) {
        throw new Error(`protected runtime dependency entered the production lock: ${key}`);
      }
    }
  }
  return asDependencySet(manifest.dependencies, "production");
}

export async function assertProductionDependencyClosure(options: {
  workspaceRoot: string;
  projects: readonly ControllerNxProject[];
}): Promise<void> {
  const production = await loadProductionDependencies();
  const rootLock = await readFile(join(options.workspaceRoot, "bun.lock"), "utf8");
  const rootLockPackages = parseBunLockPackages(rootLock);
  const projectNames = new Set(options.projects.map((project) => project.name));
  const requiredExternal = new Set<string>();

  for (const project of options.projects) {
    const root = project.root.split("\\").join("/");
    if (PROTECTED_CONTROLLER_SOURCE_PATTERNS.some((pattern) => pattern.test(root))) {
      throw new Error(`protected project entered production controller closure: ${project.name}:${root}`);
    }
    const manifest = await readPackageManifest(join(options.workspaceRoot, root, "package.json"));
    if (manifest.name !== project.name) {
      throw new Error(`Nx/package identity mismatch for ${project.name}:${root}`);
    }
    const dependencies = asDependencySet(manifest.dependencies ?? {}, project.name);
    for (const [name, version] of Object.entries(dependencies)) {
      if (version.startsWith("workspace:")) {
        if (!projectNames.has(name)) {
          throw new Error(`workspace runtime dependency is outside the Nx closure: ${project.name}->${name}`);
        }
      } else if (!PROTECTED_RUNTIME_DEPENDENCIES.has(name)) {
        requiredExternal.add(name);
      }
    }
  }

  const productionNames = Object.keys(production).sort();
  const requiredNames = [...requiredExternal].sort();
  if (JSON.stringify(productionNames) !== JSON.stringify(requiredNames)) {
    throw new Error(
      `production dependency manifest differs from the Nx runtime closure: expected ${requiredNames.join(",")}; received ${productionNames.join(",")}`,
    );
  }
  for (const [name, version] of Object.entries(production)) {
    const workspaceVersion = rootLockVersion(rootLockPackages, name);
    if (workspaceVersion === null) {
      throw new Error(`production dependency is absent from the workspace lock: ${name}`);
    }
    if (version !== workspaceVersion) {
      throw new Error(
        `production dependency must match the workspace lock: ${name} expected ${workspaceVersion}, received ${version}`,
      );
    }
  }
}

export async function assertNoProtectedRuntimeImports(options: {
  workspaceRoot: string;
  projects: readonly ControllerNxProject[];
}): Promise<void> {
  const importPattern = /(?:\bfrom\s*["']inngest(?:\/|["'])|\bimport\s*\(\s*["']inngest(?:\/|["'])|\brequire\s*\(\s*["']inngest(?:\/|["']))/u;
  for (const project of options.projects) {
    const distRoot = join(options.workspaceRoot, project.root, "dist");
    const pending = [distRoot];
    while (pending.length > 0) {
      const directory = pending.pop()!;
      let children;
      try {
        children = await readdir(directory, { withFileTypes: true });
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
          throw new Error(`built output is missing for ${project.name}: ${distRoot}`);
        }
        throw error;
      }
      for (const child of children) {
        const path = join(directory, child.name);
        if (child.isDirectory()) pending.push(path);
        else if (child.isFile() && child.name.endsWith(".js")) {
          if (importPattern.test(await readFile(path, "utf8"))) {
            throw new Error(`protected runtime import emitted by ${project.name}: ${path}`);
          }
        }
      }
    }
  }
}
