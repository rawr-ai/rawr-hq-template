import { readFileSync, realpathSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUILTINS = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
const DENIED_NAMESPACE = "rawr-native-manager-denied";
const DENIED_PATH = "outside-controller";
const DENIED_SPECIFIER = `${DENIED_NAMESPACE}:${DENIED_PATH}`;

export type NativeImportResolution =
  | Readonly<{ kind: "builtin"; specifier: string }>
  | Readonly<{ kind: "file"; path: string }>;

export type NativeImportSandboxInput = Readonly<{
  specifier: string;
  importer: string;
  resolveDir: string;
  releaseRoot: string;
  resolveSync(specifier: string, from: string): string;
  canonicalize(path: string): string;
}>;

export function resolveNativeManagerImport(
  input: NativeImportSandboxInput
): NativeImportResolution {
  if (isBuiltin(input.specifier)) return { kind: "builtin", specifier: input.specifier };

  const canonicalRoot = input.canonicalize(input.releaseRoot);
  validateNativeManagerImportRequest({
    specifier: input.specifier,
    importer: input.importer,
    resolveDir: input.resolveDir,
    releaseRoot: canonicalRoot,
    canonicalize: input.canonicalize,
  });

  let resolved: string;
  try {
    resolved = input.resolveSync(input.specifier, input.resolveDir || canonicalRoot);
  } catch {
    throw new Error(`NATIVE_MANAGER_IMPORT_UNRESOLVED:${input.specifier}`);
  }
  if (isBuiltin(resolved)) return { kind: "builtin", specifier: resolved };
  const resolvedPath = filePath(resolved);
  requireContainedPath(canonicalRoot, resolvedPath, "resolved module", input.canonicalize);
  return { kind: "file", path: resolvedPath };
}

export function validateNativeManagerImportRequest(
  input: Omit<NativeImportSandboxInput, "resolveSync">
): void {
  if (isBuiltin(input.specifier)) return;
  const canonicalRoot = input.canonicalize(input.releaseRoot);
  requireContainedReference(canonicalRoot, input.importer, "importer", input.canonicalize);
  if (input.resolveDir)
    requireContainedPath(canonicalRoot, input.resolveDir, "resolve directory", input.canonicalize);

  const lexicalRequest = lexicalFileRequest(input.specifier, input.resolveDir);
  if (lexicalRequest !== undefined) {
    requireLexicallyContainedPath(canonicalRoot, lexicalRequest, "requested module");
  } else if (hasScheme(input.specifier)) {
    throw new Error(`NATIVE_MANAGER_IMPORT_SCHEME_REJECTED:${input.specifier}`);
  }
}

export function assertNativeManagerLoadedPath(releaseRoot: string, loadedPath: string): void {
  const canonicalRoot = realpathSync(releaseRoot);
  requireContainedPath(canonicalRoot, filePath(loadedPath), "loaded module", realpathSync);
}

export function installNativeManagerImportSandbox(releaseRoot: string): void {
  const canonicalRoot = realpathSync(releaseRoot);
  Bun.plugin({
    name: "rawr-controller-native-manager-import-sandbox",
    setup(builder) {
      builder.onResolve({ filter: /.*/ }, (args) => {
        if (args.path === DENIED_SPECIFIER || args.namespace === DENIED_NAMESPACE) {
          return { path: DENIED_PATH, namespace: DENIED_NAMESPACE };
        }
        try {
          const resolveDir = runtimeResolveDirectory(args.resolveDir, args.importer, canonicalRoot);
          validateNativeManagerImportRequest({
            specifier: args.path,
            importer: args.importer,
            resolveDir,
            releaseRoot: canonicalRoot,
            canonicalize: realpathSync,
          });
          const resolved = resolveControllerFilesystemImport({
            specifier: args.path,
            resolveDir,
            releaseRoot: canonicalRoot,
            kind: args.kind,
          });
          if (resolved !== null) {
            requireContainedPath(canonicalRoot, resolved, "resolved module", realpathSync);
          }
          return undefined;
        } catch (error) {
          if (process.env.RAWR_NATIVE_MANAGER_SANDBOX_DIAGNOSTICS === "1") {
            process.stderr.write(
              `native-manager sandbox denied: ${errorMessage(error)} ${JSON.stringify({
                importer: args.importer,
                namespace: args.namespace,
                path: args.path,
                resolveDir: args.resolveDir,
              })}\n`
            );
          }
          return { path: DENIED_PATH, namespace: DENIED_NAMESPACE };
        }
      });
      builder.onLoad({ filter: /.*/, namespace: DENIED_NAMESPACE }, () => ({
        contents: 'throw new Error("NATIVE_MANAGER_IMPORT_OUTSIDE_CONTROLLER");',
        loader: "js",
      }));
    },
  });
}

function requireContainedReference(
  root: string,
  reference: string,
  label: string,
  canonicalize: (path: string) => string
): void {
  if (reference === "" || isBuiltin(reference)) return;
  const pathValue = lexicalFileRequest(reference, root);
  if (pathValue === undefined)
    throw new Error(`NATIVE_MANAGER_IMPORT_${label.toUpperCase()}_INVALID`);
  requireContainedPath(root, pathValue, label, canonicalize);
}

function requireContainedPath(
  root: string,
  requestedPath: string,
  label: string,
  canonicalize: (path: string) => string
): void {
  const normalized = path.resolve(requestedPath);
  if (!isContained(root, normalized)) {
    throw new Error(`NATIVE_MANAGER_IMPORT_OUTSIDE_CONTROLLER:${label}`);
  }
  let canonical: string;
  try {
    canonical = canonicalize(normalized);
  } catch {
    throw new Error(`NATIVE_MANAGER_IMPORT_UNREADABLE:${label}`);
  }
  if (!isContained(root, canonical)) {
    throw new Error(`NATIVE_MANAGER_IMPORT_ALIAS_OUTSIDE_CONTROLLER:${label}`);
  }
}

function requireLexicallyContainedPath(root: string, requestedPath: string, label: string): void {
  if (!isContained(root, path.resolve(requestedPath))) {
    throw new Error(`NATIVE_MANAGER_IMPORT_OUTSIDE_CONTROLLER:${label}`);
  }
}

function lexicalFileRequest(specifier: string, resolveDir: string): string | undefined {
  if (specifier.startsWith("file:")) {
    try {
      return fileURLToPath(specifier);
    } catch {
      throw new Error(`NATIVE_MANAGER_IMPORT_FILE_URL_INVALID:${specifier}`);
    }
  }
  if (path.isAbsolute(specifier)) return path.normalize(specifier);
  if (
    specifier === "." ||
    specifier === ".." ||
    specifier.startsWith("./") ||
    specifier.startsWith("../")
  ) {
    return path.resolve(resolveDir, specifier);
  }
  return undefined;
}

function filePath(value: string): string {
  if (value.startsWith("file:")) {
    try {
      return fileURLToPath(value);
    } catch {
      throw new Error(`NATIVE_MANAGER_IMPORT_FILE_URL_INVALID:${value}`);
    }
  }
  if (!path.isAbsolute(value)) throw new Error(`NATIVE_MANAGER_IMPORT_RESOLUTION_INVALID:${value}`);
  return path.normalize(value);
}

function isBuiltin(specifier: string): boolean {
  return BUILTINS.has(specifier) || specifier.startsWith("bun:");
}

function hasScheme(specifier: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/iu.test(specifier);
}

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolveControllerFilesystemImport(input: {
  specifier: string;
  resolveDir: string;
  releaseRoot: string;
  kind: string;
}): string | null {
  if (isBuiltin(input.specifier)) return null;
  const lexical = lexicalFileRequest(input.specifier, input.resolveDir);
  if (lexical !== undefined) return resolveFileOrDirectory(lexical, input.kind, input.releaseRoot);
  if (input.specifier.startsWith("#")) {
    return resolvePackageImport(input.specifier, input.resolveDir, input.kind, input.releaseRoot);
  }
  const parsed = parsePackageSpecifier(input.specifier);
  const packageRoot = findPackageRoot(parsed.packageId, input.resolveDir, input.releaseRoot);
  const manifest = readPackageManifest(packageRoot);
  const subpath = parsed.subpath.length === 0 ? "." : `./${parsed.subpath}`;
  const exported = resolvePackageMap(manifest.exports, subpath, input.kind);
  if (exported !== null) {
    return resolvePackageTarget(packageRoot, exported, input.kind, input.releaseRoot);
  }
  if (parsed.subpath.length > 0) {
    return resolveFileOrDirectory(
      path.join(packageRoot, ...parsed.subpath.split("/")),
      input.kind,
      input.releaseRoot
    );
  }
  for (const field of importKind(input.kind) === "require" ? ["main"] : ["module", "main"]) {
    const target = manifest[field];
    if (typeof target === "string" && target.length > 0) {
      try {
        return resolveFileOrDirectory(
          path.resolve(packageRoot, target),
          input.kind,
          input.releaseRoot
        );
      } catch {
        // Try the package index fallback.
      }
    }
  }
  return resolveFileOrDirectory(path.join(packageRoot, "index"), input.kind, input.releaseRoot);
}

function resolvePackageImport(
  specifier: string,
  resolveDir: string,
  kind: string,
  releaseRoot: string
): string {
  const packageRoot = findNearestPackageRoot(resolveDir, releaseRoot);
  const manifest = readPackageManifest(packageRoot);
  const target = resolvePackageMap(manifest.imports, specifier, kind);
  if (target === null) throw new Error(`NATIVE_MANAGER_IMPORT_UNRESOLVED:${specifier}`);
  return resolvePackageTarget(packageRoot, target, kind, releaseRoot);
}

function resolvePackageTarget(
  packageRoot: string,
  target: string,
  kind: string,
  releaseRoot: string
): string {
  if (!target.startsWith("./")) throw new Error("NATIVE_MANAGER_IMPORT_PACKAGE_TARGET_REJECTED");
  const lexical = path.resolve(packageRoot, target);
  if (!isContained(packageRoot, lexical)) {
    throw new Error("NATIVE_MANAGER_IMPORT_PACKAGE_TARGET_REJECTED");
  }
  return resolveFileOrDirectory(lexical, kind, releaseRoot);
}

function resolvePackageMap(value: unknown, key: string, kind: string): string | null {
  if (typeof value === "string") return key === "." ? value : null;
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const resolved = resolvePackageMap(candidate, key, kind);
      if (resolved !== null) return resolved;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.some((entry) => entry.startsWith(".") || entry.startsWith("#"))) {
    if (key in value) return resolveConditionalTarget(value[key], kind);
    for (const pattern of keys.filter((entry) => entry.includes("*"))) {
      const [prefix, suffix = ""] = pattern.split("*");
      if (!key.startsWith(prefix) || !key.endsWith(suffix)) continue;
      const match = key.slice(prefix.length, key.length - suffix.length);
      const target = resolveConditionalTarget(value[pattern], kind);
      return target === null ? null : target.replaceAll("*", match);
    }
    return null;
  }
  return resolveConditionalTarget(value, kind);
}

function resolveConditionalTarget(value: unknown, kind: string): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const resolved = resolveConditionalTarget(candidate, kind);
      if (resolved !== null) return resolved;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  const conditions = new Set(["bun", "node", importKind(kind), "default"]);
  for (const [condition, target] of Object.entries(value)) {
    if (!conditions.has(condition)) continue;
    const resolved = resolveConditionalTarget(target, kind);
    if (resolved !== null) return resolved;
  }
  return null;
}

function findPackageRoot(packageId: string, resolveDir: string, releaseRoot: string): string {
  let current = path.resolve(resolveDir);
  while (isContained(releaseRoot, current)) {
    const candidate = path.join(current, "node_modules", ...packageId.split("/"));
    if (directoryExists(candidate)) return candidate;
    if (current === releaseRoot) break;
    current = path.dirname(current);
  }
  throw new Error(`NATIVE_MANAGER_IMPORT_UNRESOLVED:${packageId}`);
}

function findNearestPackageRoot(resolveDir: string, releaseRoot: string): string {
  let current = path.resolve(resolveDir);
  while (isContained(releaseRoot, current)) {
    if (fileExists(path.join(current, "package.json"))) return current;
    if (current === releaseRoot) break;
    current = path.dirname(current);
  }
  throw new Error("NATIVE_MANAGER_IMPORT_PACKAGE_CONTEXT_REQUIRED");
}

function resolveFileOrDirectory(candidate: string, kind: string, releaseRoot: string): string {
  if (!isContained(releaseRoot, path.resolve(candidate))) {
    throw new Error("NATIVE_MANAGER_IMPORT_OUTSIDE_CONTROLLER:resolved module");
  }
  for (const file of [
    candidate,
    `${candidate}.js`,
    `${candidate}.mjs`,
    `${candidate}.cjs`,
    `${candidate}.json`,
    `${candidate}.node`,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.jsx`,
  ]) {
    if (fileExists(file)) return file;
  }
  if (directoryExists(candidate)) {
    const packagePath = path.join(candidate, "package.json");
    if (fileExists(packagePath)) {
      const manifest = readPackageManifest(candidate);
      for (const field of importKind(kind) === "require" ? ["main"] : ["module", "main"]) {
        const target = manifest[field];
        if (typeof target === "string" && target.length > 0) {
          try {
            return resolveFileOrDirectory(path.resolve(candidate, target), kind, releaseRoot);
          } catch {
            // Try the index fallback.
          }
        }
      }
    }
    return resolveFileOrDirectory(path.join(candidate, "index"), kind, releaseRoot);
  }
  throw new Error(`NATIVE_MANAGER_IMPORT_UNRESOLVED:${candidate}`);
}

function parsePackageSpecifier(specifier: string): { packageId: string; subpath: string } {
  const segments = specifier.split("/");
  const packageSegments = specifier.startsWith("@") ? segments.slice(0, 2) : segments.slice(0, 1);
  if (
    packageSegments.some((segment) => segment.length === 0) ||
    (specifier.startsWith("@") && packageSegments.length !== 2)
  ) {
    throw new Error(`NATIVE_MANAGER_IMPORT_PACKAGE_INVALID:${specifier}`);
  }
  return {
    packageId: packageSegments.join("/"),
    subpath: segments.slice(packageSegments.length).join("/"),
  };
}

function readPackageManifest(packageRoot: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    if (!isRecord(value)) throw new Error("not-object");
    return value;
  } catch {
    throw new Error(`NATIVE_MANAGER_IMPORT_PACKAGE_MANIFEST_INVALID:${packageRoot}`);
  }
}

function importKind(kind: string): "import" | "require" {
  return kind.includes("require") ? "require" : "import";
}

function fileExists(candidate: string): boolean {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function directoryExists(candidate: string): boolean {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runtimeResolveDirectory(
  resolveDir: string | undefined,
  importer: string,
  releaseRoot: string
): string {
  if (resolveDir) return resolveDir;
  if (importer && !isBuiltin(importer)) {
    const importerPath = lexicalFileRequest(importer, releaseRoot);
    if (importerPath !== undefined) return path.dirname(importerPath);
  }
  return releaseRoot;
}

if (process.env.RAWR_NATIVE_MANAGER_SANDBOX === "1") {
  const releaseRoot = process.env.RAWR_CONTROLLER_RELEASE_ROOT;
  if (!releaseRoot) throw new Error("NATIVE_MANAGER_SANDBOX_RELEASE_ROOT_REQUIRED");
  installNativeManagerImportSandbox(releaseRoot);
}
