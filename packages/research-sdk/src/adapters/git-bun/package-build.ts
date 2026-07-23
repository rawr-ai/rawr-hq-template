import { constants } from "node:fs";
import { copyFile, cp, link, lstat, mkdir, mkdtemp, open, realpath, rm } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { Effect } from "effect";
import { Type } from "typebox";
import { type DigestIdentity, decodeStructural } from "../../contracts/index.js";
import type { CommandProcessShape } from "../../runtime/command.js";
import type {
  BunPackageCanonicalization,
  BunPackageSubstrateIdentity,
  PackedPackageDescriptor,
} from "./contracts.js";
import {
  deriveRuntimeGraph,
  embeddedManifestPath,
  embeddedRuntimeManifestPath,
  finalizeRootContent,
  type PackageContentEntry,
  packageContentDigest,
  type RuntimeGraphResult,
  regularFileMode,
  researchSdkPackageName,
  runtimeManifestBytes,
  uninterruptiblePackageFs,
} from "./installed-package.js";
import {
  equalBytes,
  equalDigest,
  type GitBunError,
  identityMismatch,
  invalidInput,
  isAtOrBelow,
  normalizePortablePath,
  runChecked,
  sha256Digest,
  sha256Portable,
  stableJson,
} from "./internal.js";
import type { PackSdkPackageRequest } from "./package.js";
import { collectInstallContainers, symlinksBelow } from "./package-materialization.js";

const PackedPackageJsonSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    version: Type.String({ minLength: 1 }),
  },
  { additionalProperties: true }
);
export const canonicalBunPackageCanonicalization: BunPackageCanonicalization =
  freezeBunPackageCanonicalization({
    environment: [
      { name: "BUN_OPTIONS", value: "--no-env-file --no-install" },
      { name: "HOME", value: "<adapter-owned-home>" },
      { name: "LANG", value: "C" },
      { name: "LC_ALL", value: "C" },
      { name: "PATH", value: "<admitted-tool-path>" },
      { name: "TMPDIR", value: "<adapter-owned-tmp>" },
      { name: "TZ", value: "UTC" },
    ],
    buildArguments: ["run", "build"],
    packArguments: ["pm", "pack", "--ignore-scripts", "--quiet", "--gzip-level", "9", "--filename"],
  });

function freezeBunPackageCanonicalization(
  value: BunPackageCanonicalization
): BunPackageCanonicalization {
  for (const setting of value.environment) {
    Object.freeze(setting);
  }
  Object.freeze(value.environment);
  Object.freeze(value.buildArguments);
  Object.freeze(value.packArguments);
  return Object.freeze(value);
}
interface PackageOperationInput {
  readonly request: PackSdkPackageRequest;
  readonly substrate: BunPackageSubstrateIdentity;
  readonly runner: CommandProcessShape;
  readonly controlRoot: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly terminationGraceMs: number;
  readonly publicationState: PackagePublicationState;
}
export interface PackagePublicationState {
  outputPublished: boolean;
}
interface StagedPackageView {
  readonly workspaceRoot: string;
  readonly packageRoot: string;
  readonly archiveRoot: string;
}
export function buildAndPackSdkPackage(
  input: PackageOperationInput
): Effect.Effect<PackedPackageDescriptor, GitBunError> {
  return Effect.gen(function* () {
    const request = yield* validatePackRequest(input.request);
    yield* requireIsolatedPackageControlRoot(input.controlRoot, request.workspaceRoot);
    yield* preflightBunPackage(input);
    const before = yield* deriveRuntimeGraph(request);
    const root = before.graph.nodes.find(({ nodeId }) => nodeId === before.graph.rootNodeId);
    if (root === undefined || root.name !== researchSdkPackageName) {
      return yield* Effect.fail(
        identityMismatch("pack-package", "The package root is not @rawr/research-sdk.")
      );
    }
    return yield* withPackagePublication(request.outputPath, (publicationRoot) =>
      withStagedPackageView(input, request, (view) =>
        Effect.gen(function* () {
          const stagedRequest: PackSdkPackageRequest = {
            ...request,
            workspaceRoot: view.workspaceRoot,
            packageRoot: view.packageRoot,
          };
          const stagedBefore = yield* deriveRuntimeGraph(stagedRequest);
          yield* requireRuntimeGraphIdentity(
            before,
            stagedBefore,
            "stage-package",
            "The staged package manifest, lock, or runtime closure differs from its owner."
          );
          yield* prepareDistributionRoot(view.packageRoot);
          yield* runChecked(
            input.runner,
            commandRequest(
              input,
              view.packageRoot,
              canonicalBunPackageCanonicalization.buildArguments
            ),
            "build-package"
          );
          const stagedAfter = yield* deriveRuntimeGraph(stagedRequest);
          yield* requireRuntimeGraphIdentity(
            stagedBefore,
            stagedAfter,
            "build-package",
            "The build mutated the frozen staged package manifest, lock, or runtime closure."
          );
          const callerAfter = yield* deriveRuntimeGraph(request);
          yield* requireRuntimeGraphIdentity(
            before,
            callerAfter,
            "build-package",
            "The caller-owned package manifest, lock, or runtime closure changed during the build."
          );
          const manifestOutput = yield* prepareEmbeddedManifestOutput(stagedRequest);
          const provisionalPath = join(view.archiveRoot, "provisional.tgz");
          yield* packTo(input, view.packageRoot, provisionalPath);
          const provisional = yield* inspectPackedPackage({
            archivePath: provisionalPath,
            packageRoot: view.packageRoot,
            embeddedManifestPath: embeddedRuntimeManifestPath,
          });
          const runtimeGraph = finalizeRootContent(
            stagedAfter.graph,
            provisional.packageContentDigest
          );
          const manifestBytes = runtimeManifestBytes({
            packageName: root.name,
            packageVersion: root.version,
            protocolVersion: request.protocolVersion,
            substrate: input.substrate,
            ownerLockDigest: stagedAfter.ownerLockDigest,
            runtimeGraph,
          });
          return yield* withExclusiveManifest(manifestOutput, manifestBytes, () =>
            Effect.gen(function* () {
              const finalPath = join(view.archiveRoot, "final.tgz");
              yield* packTo(input, view.packageRoot, finalPath);
              const packed = yield* inspectPackedPackage({
                archivePath: finalPath,
                packageRoot: view.packageRoot,
                embeddedManifestPath: embeddedRuntimeManifestPath,
                expectedManifestBytes: manifestBytes,
              });
              if (
                packed.packageName !== root.name ||
                packed.packageVersion !== root.version ||
                !equalDigest(packed.packageContentDigest, provisional.packageContentDigest)
              ) {
                return yield* Effect.fail(
                  identityMismatch(
                    "pack-package",
                    "The final package content differs from the admitted provisional package."
                  )
                );
              }
              const descriptor: PackedPackageDescriptor = {
                kind: "PackedPackage",
                packageName: researchSdkPackageName,
                packageVersion: packed.packageVersion,
                protocolVersion: request.protocolVersion,
                embeddedManifestPath: embeddedRuntimeManifestPath,
                substrate: input.substrate,
                contentDigest: sha256Digest("research-sdk.package-tarball.v1", packed.bytes),
                embeddedManifestDigest: sha256Digest(
                  "research-sdk.runtime-graph-manifest.v1",
                  manifestBytes
                ),
                byteLength: packed.bytes.byteLength,
                ownerLockDigest: stagedAfter.ownerLockDigest,
                runtimeGraph,
              };
              yield* publishPackage(
                finalPath,
                packed.bytes,
                request.outputPath,
                publicationRoot,
                () => {
                  input.publicationState.outputPublished = true;
                }
              );
              return descriptor;
            })
          );
        })
      )
    );
  });
}
function requireIsolatedPackageControlRoot(
  controlRoot: string,
  workspaceRoot: string
): Effect.Effect<void, GitBunError> {
  return uninterruptiblePackageFs("preflight-package", async () => {
    const canonicalControlRoot = await realpath(controlRoot);
    const canonicalWorkspaceRoot = await realpath(workspaceRoot);
    if (
      canonicalControlRoot !== controlRoot ||
      canonicalWorkspaceRoot !== workspaceRoot ||
      isAtOrBelow(canonicalControlRoot, canonicalWorkspaceRoot) ||
      isAtOrBelow(canonicalWorkspaceRoot, canonicalControlRoot)
    ) {
      throw invalidInput(
        "preflight-package",
        "The package control root must be isolated from the caller workspace."
      );
    }
    let ancestor = canonicalControlRoot;
    while (true) {
      try {
        await lstat(join(ancestor, "node_modules"));
        throw invalidInput(
          "preflight-package",
          "The package control root has an ambient dependency ancestor."
        );
      } catch (error) {
        if (!hasErrorCode(error, "ENOENT")) {
          throw error;
        }
      }
      const parent = dirname(ancestor);
      if (parent === ancestor) {
        break;
      }
      ancestor = parent;
    }
  });
}
function requireRuntimeGraphIdentity(
  expected: RuntimeGraphResult,
  actual: RuntimeGraphResult,
  operation: string,
  message: string
): Effect.Effect<void, GitBunError> {
  return equalDigest(expected.ownerLockDigest, actual.ownerLockDigest) &&
    equalDigest(expected.buildInputDigest, actual.buildInputDigest) &&
    stableJson(expected.graph) === stableJson(actual.graph)
    ? Effect.void
    : Effect.fail(identityMismatch(operation, message));
}
function withStagedPackageView<Output>(
  input: PackageOperationInput,
  request: PackSdkPackageRequest,
  use: (view: StagedPackageView) => Effect.Effect<Output, GitBunError>
): Effect.Effect<Output, GitBunError> {
  return Effect.acquireUseRelease(
    uninterruptiblePackageFs("acquire-package-view", async () => {
      return realpath(await mkdtemp(join(input.controlRoot, "package-view-")));
    }),
    (root) => Effect.flatMap(materializePackageView(request, root), use),
    (root) =>
      uninterruptiblePackageFs("release-package-view", () =>
        rm(root, { recursive: true, force: true })
      )
  );
}
function materializePackageView(
  request: PackSdkPackageRequest,
  root: string
): Effect.Effect<StagedPackageView, GitBunError> {
  return uninterruptiblePackageFs("materialize-package-view", async () => {
    const relativePackageRoot = relative(request.workspaceRoot, request.packageRoot);
    const portablePackageRoot =
      relativePackageRoot.length === 0
        ? ""
        : normalizePortablePath(relativePackageRoot.split(sep).join("/"));
    if (portablePackageRoot === undefined) {
      throw invalidInput(
        "materialize-package-view",
        "The package root must remain within its owner workspace."
      );
    }
    const workspaceRoot = join(root, "workspace");
    const packageRoot =
      portablePackageRoot.length === 0
        ? workspaceRoot
        : join(workspaceRoot, ...portablePackageRoot.split("/"));
    const archiveRoot = join(root, "archives");
    await Promise.all([mkdir(dirname(packageRoot), { recursive: true }), mkdir(archiveRoot)]);
    await copyPackageTree(request.packageRoot, packageRoot);
    if (request.workspaceRoot !== request.packageRoot) {
      await copyWorkspaceControls(request.workspaceRoot, workspaceRoot);
    }
    await copyPackageDependencies(request.workspaceRoot, request.packageRoot, workspaceRoot);
    const canonicalWorkspaceRoot = await realpath(workspaceRoot);
    const canonicalPackageRoot = await realpath(packageRoot);
    const canonicalArchiveRoot = await realpath(archiveRoot);
    if (
      canonicalWorkspaceRoot !== workspaceRoot ||
      canonicalPackageRoot !== packageRoot ||
      canonicalArchiveRoot !== archiveRoot ||
      !isAtOrBelow(canonicalPackageRoot, canonicalWorkspaceRoot)
    ) {
      throw invalidInput("materialize-package-view", "The staged package view is not canonical.");
    }
    await requireContainedSymlinks(canonicalWorkspaceRoot, [
      canonicalPackageRoot,
      join(canonicalWorkspaceRoot, "node_modules", ".bun"),
    ]);
    return {
      workspaceRoot: canonicalWorkspaceRoot,
      packageRoot: canonicalPackageRoot,
      archiveRoot: canonicalArchiveRoot,
    };
  });
}
async function copyPackageTree(source: string, destination: string): Promise<void> {
  await requireOptionalOrdinaryDirectory(join(source, "dist"), "distribution");
  await cp(source, destination, {
    recursive: true,
    dereference: false,
    errorOnExist: true,
    force: false,
    mode: constants.COPYFILE_FICLONE,
    preserveTimestamps: true,
    verbatimSymlinks: true,
    filter: (path) => {
      const pathRelativeToPackage = relative(source, path);
      if (pathRelativeToPackage.length === 0) {
        return true;
      }
      const [topLevel] = pathRelativeToPackage.split(sep);
      return (
        topLevel !== "node_modules" &&
        topLevel !== "dist" &&
        topLevel !== ".vite" &&
        topLevel !== ".vite-temp"
      );
    },
  });
}
async function requireOptionalOrdinaryDirectory(path: string, label: string): Promise<void> {
  let stat;
  try {
    stat = await lstat(path);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return;
    }
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink() || (await realpath(path)) !== path) {
    throw invalidInput(
      "materialize-package-view",
      `The caller-owned ${label} directory is not ordinary.`
    );
  }
}
async function copyWorkspaceControls(source: string, destination: string): Promise<void> {
  await Promise.all([
    copyOrdinaryFile(join(source, "package.json"), join(destination, "package.json"), false),
    copyOrdinaryFile(join(source, "bun.lock"), join(destination, "bun.lock"), false),
    copyOrdinaryFile(join(source, "bunfig.toml"), join(destination, "bunfig.toml"), true),
  ]);
}
async function copyOrdinaryFile(
  source: string,
  destination: string,
  optional: boolean
): Promise<void> {
  let stat;
  try {
    stat = await lstat(source);
  } catch (error) {
    if (optional && hasErrorCode(error, "ENOENT")) {
      return;
    }
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink() || (await realpath(source)) !== source) {
    throw invalidInput(
      "materialize-package-view",
      "A workspace package control is not an ordinary canonical file."
    );
  }
  await copyFile(source, destination, constants.COPYFILE_EXCL | constants.COPYFILE_FICLONE);
}
async function copyPackageDependencies(
  sourceWorkspaceRoot: string,
  sourcePackageRoot: string,
  stagedWorkspaceRoot: string
): Promise<void> {
  const sourceNodeModules = join(sourcePackageRoot, "node_modules");
  let nodeModulesStat;
  try {
    nodeModulesStat = await lstat(sourceNodeModules);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return;
    }
    throw error;
  }
  if (
    !nodeModulesStat.isDirectory() ||
    nodeModulesStat.isSymbolicLink() ||
    (await realpath(sourceNodeModules)) !== sourceNodeModules
  ) {
    throw invalidInput(
      "materialize-package-view",
      "The package dependency directory must be an ordinary canonical directory."
    );
  }
  const stagedNodeModules = join(
    stagedWorkspaceRoot,
    relative(sourceWorkspaceRoot, sourceNodeModules)
  );
  await mkdir(dirname(stagedNodeModules), { recursive: true });
  await cp(sourceNodeModules, stagedNodeModules, {
    recursive: true,
    dereference: false,
    errorOnExist: true,
    force: false,
    mode: constants.COPYFILE_FICLONE,
    preserveTimestamps: true,
    verbatimSymlinks: true,
    filter: (path) => {
      const pathRelativeToNodeModules = relative(sourceNodeModules, path);
      return pathRelativeToNodeModules.split(sep)[0] !== ".bun";
    },
  });
  const sourceStore = join(sourceWorkspaceRoot, "node_modules", ".bun");
  const containers = await collectInstallContainers(
    sourceNodeModules,
    sourceStore,
    "materialize-package-view"
  );
  await Promise.all(
    containers.map(async (container) => {
      const destination = join(stagedWorkspaceRoot, relative(sourceWorkspaceRoot, container));
      await mkdir(dirname(destination), { recursive: true });
      await cp(container, destination, {
        recursive: true,
        dereference: false,
        errorOnExist: true,
        force: false,
        mode: constants.COPYFILE_FICLONE,
        preserveTimestamps: true,
        verbatimSymlinks: true,
      });
    })
  );
}
async function requireContainedSymlinks(
  workspaceRoot: string,
  roots: readonly string[]
): Promise<void> {
  for (const root of roots) {
    let stat;
    try {
      stat = await lstat(root);
    } catch (error) {
      if (hasErrorCode(error, "ENOENT")) {
        continue;
      }
      throw error;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw invalidInput(
        "materialize-package-view",
        "A staged dependency root is not an ordinary directory."
      );
    }
    for (const linkPath of await symlinksBelow(root)) {
      if (!isAtOrBelow(await realpath(linkPath), workspaceRoot)) {
        throw invalidInput(
          "materialize-package-view",
          "A staged package dependency link escapes into caller-owned state."
        );
      }
    }
  }
}
function hasErrorCode(error: unknown, code: string): boolean {
  return error !== null && typeof error === "object" && Reflect.get(error, "code") === code;
}
function withPackagePublication<Output>(
  outputPath: string,
  use: (publicationRoot: string) => Effect.Effect<Output, GitBunError>
): Effect.Effect<Output, GitBunError> {
  return Effect.acquireUseRelease(
    uninterruptiblePackageFs("prepare-package-output", async () => {
      const parent = await realpath(dirname(outputPath));
      if (resolve(outputPath) !== outputPath || join(parent, basename(outputPath)) !== outputPath) {
        throw invalidInput(
          "pack-package",
          "The immutable package output path must use its canonical parent realpath."
        );
      }
      await requireAbsent(outputPath);
      return mkdtemp(join(parent, ".research-sdk-publish-"));
    }),
    use,
    (publicationRoot) =>
      uninterruptiblePackageFs("release-package-publication", () =>
        rm(publicationRoot, { recursive: true, force: true })
      )
  );
}
function publishPackage(
  stagedPath: string,
  expectedBytes: Uint8Array,
  outputPath: string,
  publicationRoot: string,
  markPublished: () => void
): Effect.Effect<void, GitBunError> {
  return uninterruptiblePackageFs("publish-package", async () => {
    const publicationPath = join(publicationRoot, "final.tgz");
    await copyFile(
      stagedPath,
      publicationPath,
      constants.COPYFILE_EXCL | constants.COPYFILE_FICLONE
    );
    const publishedBytes = await Bun.file(publicationPath).bytes();
    if (!equalBytes(publishedBytes, expectedBytes)) {
      throw identityMismatch(
        "publish-package",
        "The immutable package bytes changed while crossing into the publication filesystem."
      );
    }
    await link(publicationPath, outputPath);
    markPublished();
  });
}
export function rollbackPackagePublication(outputPath: string): Effect.Effect<void, GitBunError> {
  return uninterruptiblePackageFs("rollback-package-publication", () =>
    rm(outputPath, { force: true })
  );
}
function validatePackRequest(
  request: PackSdkPackageRequest
): Effect.Effect<PackSdkPackageRequest, GitBunError> {
  const output = resolve(request.outputPath);
  if (
    request.protocolVersion.length === 0 ||
    output !== request.outputPath ||
    isAtOrBelow(output, request.packageRoot)
  ) {
    return Effect.fail(
      invalidInput(
        "pack-package",
        "The protocol must be declared and the immutable tarball must be external."
      )
    );
  }
  return Effect.succeed(request);
}
function prepareEmbeddedManifestOutput(
  request: PackSdkPackageRequest
): Effect.Effect<string, GitBunError> {
  return uninterruptiblePackageFs("write-runtime-graph-manifest", async () => {
    const manifestPath = await embeddedManifestPath(request.packageRoot);
    await requireAbsent(manifestPath);
    return manifestPath;
  });
}
function prepareDistributionRoot(packageRoot: string): Effect.Effect<void, GitBunError> {
  return uninterruptiblePackageFs("prepare-package-distribution", async () => {
    const canonicalRoot = await realpath(packageRoot);
    if (canonicalRoot !== packageRoot) {
      throw invalidInput(
        "prepare-package-distribution",
        "The package root must be a canonical realpath."
      );
    }
    const distributionRoot = join(canonicalRoot, "dist");
    try {
      await mkdir(distributionRoot);
    } catch (error) {
      if (!hasErrorCode(error, "EEXIST")) {
        throw error;
      }
    }
    await embeddedManifestPath(canonicalRoot);
  });
}
function withExclusiveManifest<Output>(
  path: string,
  bytes: Uint8Array,
  use: () => Effect.Effect<Output, GitBunError>
): Effect.Effect<Output, GitBunError> {
  return Effect.acquireUseRelease(
    uninterruptiblePackageFs("write-runtime-graph-manifest", async () => {
      const handle = await open(
        path,
        constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW | constants.O_WRONLY,
        0o600
      );
      try {
        await handle.writeFile(bytes);
      } finally {
        await handle.close();
      }
      return path;
    }),
    use,
    (createdPath) =>
      uninterruptiblePackageFs("remove-runtime-graph-manifest", () =>
        rm(createdPath, { force: true })
      )
  );
}
function commandRequest(
  input: Omit<PackageOperationInput, "request" | "runner">,
  cwd: string,
  arguments_: readonly string[]
) {
  return {
    executable: input.substrate.bun.resolvedBinary,
    arguments: [...arguments_],
    cwd,
    environment: { ...input.environment },
    timeoutMs: input.timeoutMs,
    terminationGraceMs: input.terminationGraceMs,
  };
}
function packTo(
  input: PackageOperationInput,
  packageRoot: string,
  outputPath: string
): Effect.Effect<void, GitBunError> {
  return Effect.asVoid(
    runChecked(
      input.runner,
      commandRequest(input, packageRoot, [
        ...canonicalBunPackageCanonicalization.packArguments,
        outputPath,
      ]),
      "pack-package"
    )
  );
}
function preflightBunPackage(input: PackageOperationInput): Effect.Effect<void, GitBunError> {
  return Effect.gen(function* () {
    if (
      stableJson(input.substrate.canonicalization) !==
        stableJson(canonicalBunPackageCanonicalization) ||
      !equalDigest(
        input.substrate.environmentDigest,
        sha256Portable(
          "research-sdk.bun-package-environment.v1",
          canonicalBunPackageCanonicalization.environment
        )
      ) ||
      !equalDigest(
        input.substrate.configurationDigest,
        sha256Portable("research-sdk.bun-package-configuration.v1", {
          buildArguments: canonicalBunPackageCanonicalization.buildArguments,
          packArguments: canonicalBunPackageCanonicalization.packArguments,
        })
      )
    ) {
      return yield* Effect.fail(
        identityMismatch("preflight-package", "Bun package canonicalization differs.")
      );
    }
    const resolved = yield* uninterruptiblePackageFs("preflight-package", () =>
      realpath(input.substrate.bun.resolvedBinary)
    );
    if (resolved !== input.substrate.bun.resolvedBinary) {
      return yield* Effect.fail(
        identityMismatch("preflight-package", "The Bun binary path differs.")
      );
    }
    const version = yield* runChecked(
      input.runner,
      commandRequest(input, process.cwd(), ["--version"]),
      "preflight-bun-version"
    );
    const revision = yield* runChecked(
      input.runner,
      commandRequest(input, process.cwd(), ["-e", "process.stdout.write(Bun.revision)"]),
      "preflight-bun-revision"
    );
    if (
      new TextDecoder().decode(version.stdout).trim() !== input.substrate.bun.version ||
      new TextDecoder().decode(revision.stdout).trim() !== input.substrate.bun.revision
    ) {
      return yield* Effect.fail(
        identityMismatch("preflight-package", "The Bun runtime identity differs.")
      );
    }
  });
}
function inspectPackedPackage(input: {
  readonly archivePath: string;
  readonly packageRoot: string;
  readonly embeddedManifestPath: string;
  readonly expectedManifestBytes?: Uint8Array;
}): Effect.Effect<
  {
    readonly bytes: Uint8Array;
    readonly packageName: string;
    readonly packageVersion: string;
    readonly packageContentDigest: DigestIdentity;
  },
  GitBunError
> {
  return uninterruptiblePackageFs("inspect-package", async () => {
    const bytes = await Bun.file(input.archivePath).bytes();
    const files = await new Bun.Archive(bytes).files();
    const contentEntries: PackageContentEntry[] = [];
    for (const path of files.keys()) {
      const relativePath = path.startsWith("package/") ? path.slice("package/".length) : "";
      if (relativePath.length === 0 || normalizePortablePath(relativePath) !== relativePath) {
        throw invalidInput("inspect-package", "The package archive contains an unsafe entry.");
      }
      const sourcePath = resolve(input.packageRoot, relativePath);
      const sourceStat = await lstat(sourcePath);
      if (
        !sourceStat.isFile() ||
        sourceStat.isSymbolicLink() ||
        !isAtOrBelow(sourcePath, input.packageRoot) ||
        (await realpath(sourcePath)) !== sourcePath
      ) {
        throw invalidInput(
          "inspect-package",
          "The package archive entry does not map to an ordinary staged source file."
        );
      }
      const file = files.get(path)!;
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const sourceBytes = await Bun.file(sourcePath).bytes();
      if (!equalBytes(fileBytes, sourceBytes)) {
        throw identityMismatch(
          "inspect-package",
          "The package archive transformed a staged source file."
        );
      }
      if (relativePath !== input.embeddedManifestPath) {
        contentEntries.push({
          path: relativePath,
          kind: "RegularFile",
          mode: regularFileMode(sourceStat.mode),
          byteLength: fileBytes.byteLength,
          digest: sha256Digest("research-sdk.package-content-file.v1", fileBytes),
        });
      }
    }
    const packageFile = files.get("package/package.json");
    const manifestFile = files.get(`package/${input.embeddedManifestPath}`);
    if (packageFile === undefined) {
      throw identityMismatch("inspect-package", "The package archive omits package.json.");
    }
    if (input.expectedManifestBytes === undefined && manifestFile !== undefined) {
      throw identityMismatch(
        "inspect-package",
        "The provisional package contains a stale manifest."
      );
    }
    if (input.expectedManifestBytes !== undefined && manifestFile === undefined) {
      throw identityMismatch(
        "inspect-package",
        "The final package omits its runtime graph manifest."
      );
    }
    const packageJson = decodeStructural(PackedPackageJsonSchema, await packageFile.json());
    if (packageJson.kind === "Invalid") {
      throw invalidInput("inspect-package", "The packed package.json is malformed.");
    }
    const manifestBytes =
      manifestFile === undefined ? undefined : new Uint8Array(await manifestFile.arrayBuffer());
    if (
      input.expectedManifestBytes !== undefined &&
      (manifestBytes === undefined || !equalBytes(manifestBytes, input.expectedManifestBytes))
    ) {
      throw identityMismatch(
        "inspect-package",
        "The embedded runtime graph manifest bytes changed during packing."
      );
    }
    return {
      bytes,
      packageName: packageJson.value.name,
      packageVersion: packageJson.value.version,
      packageContentDigest: packageContentDigest(contentEntries),
    };
  });
}
async function requireAbsent(path: string): Promise<void> {
  try {
    await lstat(path);
  } catch (error) {
    if (error !== null && typeof error === "object" && Reflect.get(error, "code") === "ENOENT") {
      return;
    }
    throw error;
  }
  throw invalidInput("pack-package", "The immutable package output path already exists.");
}
