import { constants } from "node:fs";
import { link, lstat, mkdir, mkdtemp, open, realpath, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
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
      { name: "HOME", value: "<adapter-owned-home>" },
      { name: "LANG", value: "C" },
      { name: "LC_ALL", value: "C" },
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
  readonly environment: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly terminationGraceMs: number;
}
export function buildAndPackSdkPackage(
  input: PackageOperationInput
): Effect.Effect<PackedPackageDescriptor, GitBunError> {
  return Effect.gen(function* () {
    const request = yield* validatePackRequest(input.request);
    yield* preflightBunPackage(input);
    const before = yield* deriveRuntimeGraph(request);
    const root = before.graph.nodes.find(({ nodeId }) => nodeId === before.graph.rootNodeId);
    if (root === undefined || root.name !== researchSdkPackageName) {
      return yield* Effect.fail(
        identityMismatch("pack-package", "The package root is not @rawr/research-sdk.")
      );
    }
    yield* prepareDistributionRoot(request.packageRoot);
    yield* runChecked(
      input.runner,
      commandRequest(
        input,
        request.packageRoot,
        canonicalBunPackageCanonicalization.buildArguments
      ),
      "build-package"
    );

    const after = yield* deriveRuntimeGraph(request);
    if (
      !equalDigest(before.ownerLockDigest, after.ownerLockDigest) ||
      stableJson(before.graph) !== stableJson(after.graph)
    ) {
      return yield* Effect.fail(
        identityMismatch(
          "build-package",
          "The build mutated the frozen package manifest, lock, or runtime closure."
        )
      );
    }
    const manifestOutput = yield* prepareEmbeddedManifestOutput(request);
    return yield* withPackageStage(request.outputPath, (stageRoot) =>
      Effect.gen(function* () {
        const provisionalPath = join(stageRoot, "provisional.tgz");
        yield* packTo(input, request.packageRoot, provisionalPath);
        const provisional = yield* inspectPackedPackage({
          archivePath: provisionalPath,
          packageRoot: request.packageRoot,
          embeddedManifestPath: embeddedRuntimeManifestPath,
        });
        const runtimeGraph = finalizeRootContent(after.graph, provisional.packageContentDigest);
        const manifestBytes = runtimeManifestBytes({
          packageName: root.name,
          packageVersion: root.version,
          protocolVersion: request.protocolVersion,
          substrate: input.substrate,
          ownerLockDigest: after.ownerLockDigest,
          runtimeGraph,
        });
        return yield* withExclusiveManifest(manifestOutput, manifestBytes, () =>
          Effect.gen(function* () {
            const finalPath = join(stageRoot, "final.tgz");
            yield* packTo(input, request.packageRoot, finalPath);
            const packed = yield* inspectPackedPackage({
              archivePath: finalPath,
              packageRoot: request.packageRoot,
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
              ownerLockDigest: after.ownerLockDigest,
              runtimeGraph,
            };
            yield* publishPackage(finalPath, request.outputPath);
            return descriptor;
          })
        );
      })
    );
  });
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
function withPackageStage<Output>(
  outputPath: string,
  use: (stageRoot: string) => Effect.Effect<Output, GitBunError>
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
      return mkdtemp(join(parent, ".research-sdk-pack-"));
    }),
    use,
    (stageRoot) =>
      uninterruptiblePackageFs("release-package-stage", () =>
        rm(stageRoot, { recursive: true, force: true })
      )
  );
}
function publishPackage(stagedPath: string, outputPath: string): Effect.Effect<void, GitBunError> {
  return uninterruptiblePackageFs("publish-package", () => link(stagedPath, outputPath));
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
      if (Reflect.get(error as object, "code") !== "EEXIST") {
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
