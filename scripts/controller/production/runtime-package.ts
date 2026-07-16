import {
  access,
  copyFile,
  lstat,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative } from "node:path";

import { CONTROLLER_PRODUCTION_APP_NAME } from "./constants.ts";

type JsonRecord = Record<string, unknown>;

export type StagedPackage = Readonly<{
  packageId: string;
  version: string;
  root: string;
}>;

export async function loadRuntimePackageVersion(
  sourceRoot: string,
  sourceRevision: string,
): Promise<string> {
  const source = JSON.parse(await readFile(join(sourceRoot, "package.json"), "utf8")) as JsonRecord;
  return typeof source.version === "string"
    ? source.version
    : `0.0.0-source.${sourceRevision.slice(0, 12)}`;
}

export async function writeProductionAppManifest(options: {
  appRoot: string;
  cliVersion: string;
}): Promise<JsonRecord> {
  const manifestPath = join(options.appRoot, "package.json");
  const installManifest = JSON.parse(await readFile(manifestPath, "utf8")) as JsonRecord;
  if (!isRecord(installManifest.dependencies)) {
    throw new Error("production dependency install manifest has no dependency closure");
  }
  const dependencies: Record<string, string> = {};
  for (const [name, version] of Object.entries(installManifest.dependencies)) {
    if (typeof version !== "string" || version.length === 0) {
      throw new Error(`production dependency install manifest has invalid dependency: ${name}`);
    }
    dependencies[name] = version;
  }
  dependencies["@rawr/cli"] = options.cliVersion;
  const manifest: JsonRecord = {
    name: CONTROLLER_PRODUCTION_APP_NAME,
    private: true,
    version: options.cliVersion,
    type: "module",
    dependencies,
    oclif: {
      bin: "rawr",
      topicSeparator: " ",
      plugins: ["@rawr/cli"],
    },
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
  return manifest;
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function mapBuiltPath(
  sourceRoot: string,
  sourcePath: string,
  expectedKind: "file" | "directory",
): Promise<string> {
  if (!sourcePath.startsWith("./")) {
    throw new Error(`runtime package path must be relative: ${sourcePath}`);
  }
  const input = sourcePath.slice(2);
  const emitted = input.endsWith(".ts") ? `${input.slice(0, -3)}.js` : input;
  const withoutSourcePrefix = emitted.startsWith("src/") ? emitted.slice(4) : emitted;
  const candidates = input.startsWith("dist/")
    ? [join(sourceRoot, input)]
    : [...new Set([
        join(sourceRoot, "dist", withoutSourcePrefix),
        join(sourceRoot, "dist", emitted),
      ])];
  const matches: string[] = [];
  for (const candidate of candidates) {
    try {
      const status = await lstat(candidate);
      if (
        (expectedKind === "file" && status.isFile())
        || (expectedKind === "directory" && status.isDirectory())
      ) {
        matches.push(candidate);
      }
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }
  if (matches.length !== 1) {
    throw new Error(
      `built runtime path must resolve exactly once (${expectedKind}): ${sourceRoot}:${sourcePath} -> ${matches.join(",")}`,
    );
  }
  return `./${relative(sourceRoot, matches[0]!).split("\\").join("/")}`;
}

async function mapBuiltPattern(sourceRoot: string, sourcePath: string): Promise<string> {
  if (!sourcePath.startsWith("./") || !sourcePath.includes("*")) {
    throw new Error(`runtime package import pattern is invalid: ${sourcePath}`);
  }
  const input = sourcePath.slice(2);
  const emitted = input.endsWith(".ts") ? `${input.slice(0, -3)}.js` : input;
  const withoutSourcePrefix = emitted.startsWith("src/") ? emitted.slice(4) : emitted;
  const candidates = [...new Set([
    `dist/${withoutSourcePrefix}`,
    `dist/${emitted}`,
  ])];
  const matches: string[] = [];
  for (const candidate of candidates) {
    const prefix = candidate.slice(0, candidate.indexOf("*"));
    try {
      const patternDirectory = prefix.endsWith("/") ? prefix.slice(0, -1) : dirname(prefix);
      const status = await lstat(join(sourceRoot, patternDirectory));
      if (status.isDirectory()) matches.push(candidate);
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }
  if (matches.length !== 1) {
    throw new Error(`built runtime import pattern must resolve exactly once: ${sourceRoot}:${sourcePath}`);
  }
  return `./${matches[0]}`;
}

async function rewriteExportTarget(sourceRoot: string, value: unknown): Promise<unknown> {
  if (typeof value === "string") {
    return value.includes("*")
      ? await mapBuiltPattern(sourceRoot, value)
      : await mapBuiltPath(sourceRoot, value, "file");
  }
  if (!isRecord(value)) throw new Error(`unsupported runtime export target in ${sourceRoot}`);
  if (typeof value.default === "string") return await rewriteExportTarget(sourceRoot, value.default);
  const rewritten: JsonRecord = {};
  for (const [condition, target] of Object.entries(value)) {
    if (condition === "types") continue;
    rewritten[condition] = await rewriteExportTarget(sourceRoot, target);
  }
  if (Object.keys(rewritten).length === 0) {
    throw new Error(`runtime export has no executable condition in ${sourceRoot}`);
  }
  return rewritten;
}

export async function createRuntimePackageManifest(options: {
  sourceRoot: string;
  sourceRevision: string;
  closurePackageVersions: ReadonlyMap<string, string>;
}): Promise<JsonRecord> {
  const source = JSON.parse(await readFile(join(options.sourceRoot, "package.json"), "utf8")) as JsonRecord;
  if (typeof source.name !== "string" || source.name.length === 0) {
    throw new Error(`runtime package has no name: ${options.sourceRoot}`);
  }
  const packageVersion = options.closurePackageVersions.get(source.name);
  if (packageVersion === undefined) {
    throw new Error(`runtime package is outside the versioned controller closure: ${source.name}`);
  }
  const runtime: JsonRecord = {
    name: source.name,
    version: packageVersion,
    type: source.type === "commonjs" ? "commonjs" : "module",
  };
  if (typeof source.main === "string") {
    runtime.main = await mapBuiltPath(options.sourceRoot, source.main, "file");
  }
  if (isRecord(source.exports)) {
    const exports: JsonRecord = {};
    for (const [name, target] of Object.entries(source.exports)) {
      exports[name] = await rewriteExportTarget(options.sourceRoot, target);
    }
    runtime.exports = exports;
  }
  if (isRecord(source.imports)) {
    const imports: JsonRecord = {};
    for (const [name, target] of Object.entries(source.imports)) {
      imports[name] = await rewriteExportTarget(options.sourceRoot, target);
    }
    runtime.imports = imports;
  }
  if (isRecord(source.dependencies)) {
    const dependencies: Record<string, string> = {};
    for (const [name, version] of Object.entries(source.dependencies)) {
      if (typeof version !== "string") throw new Error(`invalid dependency ${source.name}:${name}`);
      if (name === "inngest") continue;
      dependencies[name] = version.startsWith("workspace:")
        ? options.closurePackageVersions.has(name)
          ? options.closurePackageVersions.get(name)!
          : (() => { throw new Error(`runtime dependency outside controller closure: ${source.name}->${name}`); })()
        : version;
    }
    if (Object.keys(dependencies).length > 0) runtime.dependencies = dependencies;
  }
  if (isRecord(source.oclif)) {
    const oclif: JsonRecord = {};
    for (const key of ["aliases", "bin", "flexibleTaxonomy", "hooks", "plugins", "scope", "topicSeparator", "topics"]) {
      if (source.oclif[key] !== undefined) oclif[key] = source.oclif[key];
    }
    if (typeof source.oclif.commands === "string") {
      oclif.commands = await mapBuiltPath(options.sourceRoot, source.oclif.commands, "directory");
    } else if (source.oclif.commands !== undefined) {
      throw new Error(`controller package requires static directory command discovery: ${source.name}`);
    }
    runtime.oclif = oclif;
  }
  return runtime;
}

export async function stageWorkspaceRuntimePackage(options: {
  sourceRoot: string;
  destinationRoot: string;
  sourceRevision: string;
  closurePackageVersions: ReadonlyMap<string, string>;
}): Promise<StagedPackage> {
  const manifest = await createRuntimePackageManifest(options);
  const distRoot = join(options.sourceRoot, "dist");
  if (!(await pathExists(distRoot))) throw new Error(`built package output is missing: ${distRoot}`);
  await mkdir(options.destinationRoot, { recursive: true });
  await copyIndependentTree(distRoot, join(options.destinationRoot, "dist"));
  await writeFile(
    join(options.destinationRoot, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { mode: 0o644 },
  );
  return Object.freeze({
    packageId: manifest.name as string,
    version: manifest.version as string,
    root: options.destinationRoot,
  });
}

export async function sanitizeNativeManagerPackage(root: string): Promise<{
  packageId: string;
  version: string;
  hooks: readonly string[];
}> {
  const manifestPath = join(root, "package.json");
  const source = JSON.parse(await readFile(manifestPath, "utf8")) as JsonRecord;
  if (typeof source.name !== "string" || typeof source.version !== "string") {
    throw new Error("native external manager package identity is invalid");
  }
  const hooks = isRecord(source.oclif) && isRecord(source.oclif.hooks)
    ? Object.keys(source.oclif.hooks).sort()
    : [];
  source.oclif = hooks.length === 0
    ? undefined
    : { hooks: (source.oclif as JsonRecord).hooks };
  delete source.devDependencies;
  delete source.scripts;
  await writeFile(manifestPath, `${JSON.stringify(source, null, 2)}\n`, { mode: 0o644 });
  await rm(join(root, "oclif.manifest.json"), { force: true });
  await rm(join(root, ".oclif.manifest.json"), { force: true });
  return Object.freeze({
    packageId: source.name,
    version: source.version,
    hooks: Object.freeze(hooks),
  });
}

export async function copyIndependentTree(sourceRoot: string, destinationRoot: string): Promise<void> {
  const sourceStatus = await lstat(sourceRoot);
  if (!sourceStatus.isDirectory()) throw new Error(`tree source is not a directory: ${sourceRoot}`);
  await mkdir(destinationRoot, { recursive: true, mode: sourceStatus.mode & 0o777 });
  const children = await readdirSorted(sourceRoot);
  for (const child of children) {
    if (child === ".bin" && sourceRoot.endsWith("node_modules")) continue;
    const source = join(sourceRoot, child);
    const destination = join(destinationRoot, child);
    const status = await lstat(source);
    if (status.isDirectory()) {
      await copyIndependentTree(source, destination);
    } else if (status.isFile()) {
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(source, destination);
      await chmodFile(destination, status.mode & 0o777);
      const copied = await lstat(destination);
      if (copied.nlink !== 1) throw new Error(`copied production file has shared inode: ${destination}`);
    } else if (status.isSymbolicLink()) {
      const target = await readlinkValue(source);
      await symlink(target, destination);
    } else {
      throw new Error(`unsupported production dependency entry: ${source}`);
    }
  }
}

async function readdirSorted(path: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  return (await readdir(path)).sort();
}

async function chmodFile(path: string, mode: number): Promise<void> {
  const { chmod } = await import("node:fs/promises");
  await chmod(path, mode);
}

async function readlinkValue(path: string): Promise<string> {
  const { readlink } = await import("node:fs/promises");
  return await readlink(path);
}
