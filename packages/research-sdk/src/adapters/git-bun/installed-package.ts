import { lstat, readdir, realpath } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { Effect } from "effect";
import { type Static, Type } from "typebox";
import { type DigestIdentity, decodeStructural } from "../../contracts/index.js";
import type {
  BunPackageSubstrateIdentity,
  PackedPackageDescriptor,
  RootedRuntimeGraph,
  RuntimeDependencyEdge,
  RuntimePackageNode,
} from "./contracts.js";
import {
  equalBytes,
  equalDigest,
  type GitBunError,
  identityMismatch,
  invalidInput,
  isAtOrBelow,
  isGitBunError,
  normalizePortablePath,
  operationFailed,
  sha256Digest,
  sha256Portable,
  stableJson,
} from "./internal.js";
import type { VerifyInstalledSdkPackageRequest } from "./package.js";

const PackageManifestSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    version: Type.String({ minLength: 1 }),
    dependencies: Type.Optional(
      Type.Record(Type.String({ minLength: 1 }), Type.String({ minLength: 1 }))
    ),
    optionalDependencies: Type.Optional(
      Type.Record(Type.String({ minLength: 1 }), Type.String({ minLength: 1 }))
    ),
    peerDependencies: Type.Optional(
      Type.Record(Type.String({ minLength: 1 }), Type.String({ minLength: 1 }))
    ),
    peerDependenciesMeta: Type.Optional(
      Type.Record(
        Type.String({ minLength: 1 }),
        Type.Object({ optional: Type.Optional(Type.Boolean()) }, { additionalProperties: true })
      )
    ),
  },
  { additionalProperties: true }
);

type PackageManifest = Static<typeof PackageManifestSchema>;
type DependencyKind =
  | "Dependency"
  | "OptionalDependency"
  | "PeerDependency"
  | "OptionalPeerDependency";
interface DependencyRequest {
  readonly name: string;
  readonly kind: DependencyKind;
  readonly requested: string;
}
interface LoadedLock {
  readonly packages: Readonly<Record<string, unknown>>;
  readonly patchedDependencies: Readonly<Record<string, unknown>>;
  readonly workspaces: Readonly<Record<string, unknown>>;
}
interface RegistryNode {
  readonly nodeId: string;
  readonly name: string;
  readonly version: string;
  readonly resolution: string;
  readonly integrity: string;
}
interface NodeDraft {
  readonly root: string;
  readonly node: Omit<RuntimePackageNode, "dependencies">;
  readonly dependencies: readonly DependencyRequest[];
  readonly edges: RuntimeDependencyEdge[];
}
export interface RuntimeGraphRequest {
  readonly workspaceRoot: string;
  readonly packageRoot: string;
}
export interface RuntimeGraphResult {
  readonly graph: RootedRuntimeGraph;
  readonly ownerLockDigest: DigestIdentity;
}
interface InstalledRuntimeExpectation {
  readonly descriptor: PackedPackageDescriptor;
  readonly artifactPath: string;
}
export type PackageContentEntry = {
  readonly path: string;
  readonly kind: "RegularFile";
  readonly mode: "Executable" | "NonExecutable";
  readonly byteLength: number;
  readonly digest: DigestIdentity;
};
export const researchSdkPackageName = "@rawr/research-sdk";
export const embeddedRuntimeManifestPath = "dist/research-sdk-runtime-graph.json";
export interface RuntimeManifestValue {
  readonly packageName: string;
  readonly packageVersion: string;
  readonly protocolVersion: string;
  readonly substrate: BunPackageSubstrateIdentity;
  readonly ownerLockDigest: DigestIdentity;
  readonly runtimeGraph: RootedRuntimeGraph;
}
export function deriveRuntimeGraph(
  request: RuntimeGraphRequest,
  expectedRoot?: InstalledRuntimeExpectation
): Effect.Effect<RuntimeGraphResult, GitBunError> {
  return uninterruptiblePackageFs("derive-runtime-graph", () =>
    deriveRuntimeGraphPromise(request, expectedRoot)
  );
}
function compareRuntimeGraphs(
  expected: RootedRuntimeGraph,
  actual: RootedRuntimeGraph
): Effect.Effect<void, GitBunError> {
  return stableJson(expected) === stableJson(actual)
    ? Effect.void
    : Effect.fail(
        identityMismatch(
          "compare-runtime-graph",
          "The installed SDK-rooted runtime closure does not match the packed manifest."
        )
      );
}
export function verifyInstalledSdkPackage(
  request: VerifyInstalledSdkPackageRequest
): Effect.Effect<void, GitBunError> {
  if (
    request.expected.packageName !== researchSdkPackageName ||
    request.expected.embeddedManifestPath !== embeddedRuntimeManifestPath
  ) {
    return Effect.fail(
      identityMismatch("verify-installed-package", "The expected artifact is not the research SDK.")
    );
  }
  return Effect.gen(function* () {
    yield* verifyInstalledManifest(request.packageRoot, request.expected);
    const { graph } = yield* deriveRuntimeGraph(request, {
      descriptor: request.expected,
      artifactPath: request.artifactPath,
    });
    yield* compareRuntimeGraphs(request.expected.runtimeGraph, graph);
  });
}
function verifyInstalledManifest(
  packageRoot: string,
  expected: PackedPackageDescriptor
): Effect.Effect<void, GitBunError> {
  return uninterruptiblePackageFs("verify-installed-package", async () => {
    const manifestPath = await embeddedManifestPath(packageRoot);
    const stat = await lstat(manifestPath);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      (await realpath(manifestPath)) !== manifestPath ||
      regularFileMode(stat.mode) !== "NonExecutable"
    ) {
      throw identityMismatch(
        "verify-installed-package",
        "The installed runtime graph manifest is not an ordinary package file."
      );
    }
    const expectedBytes = runtimeManifestBytes(expected);
    const expectedDigest = sha256Digest("research-sdk.runtime-graph-manifest.v1", expectedBytes);
    const installedBytes = await Bun.file(manifestPath).bytes();
    if (
      !equalDigest(expected.embeddedManifestDigest, expectedDigest) ||
      !equalBytes(installedBytes, expectedBytes)
    ) {
      throw identityMismatch(
        "verify-installed-package",
        "The installed runtime graph manifest differs from the immutable artifact."
      );
    }
  });
}
export function runtimeManifestBytes(value: RuntimeManifestValue): Uint8Array {
  return new TextEncoder().encode(
    `${stableJson({
      schemaVersion: "research-sdk.runtime-graph.v1",
      packageName: value.packageName,
      packageVersion: value.packageVersion,
      protocolVersion: value.protocolVersion,
      substrate: value.substrate,
      ownerLockDigest: value.ownerLockDigest,
      runtimeGraph: value.runtimeGraph,
    })}\n`
  );
}
async function deriveRuntimeGraphPromise(
  request: RuntimeGraphRequest,
  expectedRoot?: InstalledRuntimeExpectation
): Promise<RuntimeGraphResult> {
  const roots = await validateGraphRoots(request);
  const lockPath = join(roots.workspaceRoot, "bun.lock");
  const lockBytes = await Bun.file(lockPath).bytes();
  const ownerLockDigest = sha256Digest("research-sdk.bun-lock.v1", lockBytes);
  const lock = loadBunLock(lockBytes);
  const registry = registryAttestations(lock);
  const rootManifestPath = join(roots.packageRoot, "package.json");
  const rootManifest = await readPackageManifest(rootManifestPath);
  const rootManifestDigest = await digestFile(rootManifestPath);
  if (
    expectedRoot !== undefined &&
    (expectedRoot.descriptor.packageName !== rootManifest.name ||
      expectedRoot.descriptor.packageVersion !== rootManifest.version)
  ) {
    graphMismatch("The installed SDK root identity differs from the packed artifact.");
  }
  if (expectedRoot === undefined) {
    await bindWorkspaceRoot(lock, roots, rootManifest);
  } else {
    await bindInstalledRoot(lock, roots, rootManifest, expectedRoot);
  }
  const expectedRootNode = expectedRoot?.descriptor.runtimeGraph.nodes.find(
    ({ nodeId }) => nodeId === expectedRoot.descriptor.runtimeGraph.rootNodeId
  );
  if (
    expectedRoot !== undefined &&
    (expectedRootNode === undefined ||
      !equalDigest(expectedRootNode.packageManifestDigest, rootManifestDigest))
  ) {
    graphMismatch("The installed SDK manifest differs from the packed artifact.");
  }
  const rootNodeId =
    expectedRootNode?.nodeId ?? `package:${rootManifest.name}@${rootManifest.version}`;
  const rootContentDigest =
    expectedRoot === undefined
      ? deferredRootContentDigest(rootManifest)
      : await digestPackageContent(roots.packageRoot, expectedRoot.descriptor.embeddedManifestPath);
  const rootDraft: NodeDraft = {
    root: roots.packageRoot,
    node: {
      nodeId: rootNodeId,
      name: rootManifest.name,
      version: rootManifest.version,
      resolution: expectedRootNode?.resolution ?? rootNodeId,
      integrity: expectedRootNode?.integrity ?? `sha256-${rootManifestDigest.value}`,
      packageManifestDigest: rootManifestDigest,
      packageContentDigest: rootContentDigest,
    },
    dependencies: dependenciesFromManifest(rootManifest),
    edges: [],
  };
  const drafts = new Map<string, NodeDraft>([[rootNodeId, rootDraft]]);
  const queue = [rootDraft];

  while (queue.length > 0) {
    const parent = queue.shift();
    if (parent === undefined) {
      break;
    }
    for (const dependency of parent.dependencies) {
      const manifestPath = resolveInstalledManifest(dependency.name, parent.root);
      if (manifestPath === undefined) {
        if (isOptional(dependency)) {
          parent.edges.push(absentEdge(dependency));
          continue;
        }
        graphMismatch(`Required installed dependency ${dependency.name} is missing.`);
      }

      const canonicalManifest = await realpath(manifestPath);
      const packageRoot = dirname(canonicalManifest);
      if (!isAtOrBelow(packageRoot, roots.workspaceRoot)) {
        graphMismatch(`Installed dependency ${dependency.name} escapes the install root.`);
      }
      const manifest = await readPackageManifest(canonicalManifest);
      const target = registryNode(registry, dependency.name, manifest);
      const manifestDigest = await digestFile(canonicalManifest);
      const packageContentDigest = await digestPackageContent(packageRoot);
      const existing = drafts.get(target.nodeId);
      if (existing !== undefined) {
        if (existing.root !== packageRoot) {
          graphMismatch(
            `Installed package ${target.resolution} resolves from multiple physical roots.`
          );
        }
        if (
          !equalDigest(existing.node.packageManifestDigest, manifestDigest) ||
          !equalDigest(existing.node.packageContentDigest, packageContentDigest)
        ) {
          graphMismatch(`Installed package ${target.resolution} has divergent manifests.`);
        }
      } else {
        const draft: NodeDraft = {
          root: packageRoot,
          node: {
            nodeId: target.nodeId,
            name: target.name,
            version: target.version,
            resolution: target.resolution,
            integrity: target.integrity,
            packageManifestDigest: manifestDigest,
            packageContentDigest,
          },
          dependencies: dependenciesFromManifest(manifest),
          edges: [],
        };
        drafts.set(target.nodeId, draft);
        queue.push(draft);
      }
      parent.edges.push(installedEdge(dependency, target.nodeId));
    }
  }

  const nodes = [...drafts.values()]
    .map<RuntimePackageNode>((draft) => ({
      ...draft.node,
      dependencies: sortEdges(draft.edges),
    }))
    .sort((left, right) => compareText(left.nodeId, right.nodeId));
  const graphValue = {
    rootNodeId,
    platform: process.platform,
    architecture: process.arch,
    nodes,
  };
  return {
    ownerLockDigest,
    graph: {
      ...graphValue,
      graphDigest: sha256Portable("research-sdk.runtime-dependency-graph.v1", graphValue),
    },
  };
}
async function bindWorkspaceRoot(
  lock: LoadedLock,
  roots: { readonly workspaceRoot: string; readonly packageRoot: string },
  manifest: PackageManifest
): Promise<void> {
  const relativeKey = relative(roots.workspaceRoot, roots.packageRoot).split(sep).join("/");
  const key = relativeKey.length === 0 ? "" : normalizePortablePath(relativeKey);
  if (key === undefined || !Object.hasOwn(lock.workspaces, key)) {
    graphMismatch("The research SDK source is not bound by an exact workspace lock row.");
  }
  const expectedPackageRoot = await realpath(resolve(roots.workspaceRoot, key));
  const workspace = recordValue(lock.workspaces[key], `Workspace lock row ${key}`);
  const alias = lock.packages[manifest.name];
  const aliasMatches =
    key === ""
      ? alias === undefined
      : Array.isArray(alias) &&
        alias.length === 1 &&
        alias[0] === `${manifest.name}@workspace:${key}`;
  if (
    expectedPackageRoot !== roots.packageRoot ||
    workspace.name !== manifest.name ||
    workspace.version !== manifest.version ||
    !aliasMatches
  ) {
    graphMismatch("The selected workspace lock row does not exactly bind the package root.");
  }
}
async function bindInstalledRoot(
  lock: LoadedLock,
  roots: { readonly workspaceRoot: string; readonly packageRoot: string },
  manifest: PackageManifest,
  expectedRoot: InstalledRuntimeExpectation
): Promise<void> {
  const resolvedManifest = resolveInstalledManifest(manifest.name, roots.workspaceRoot);
  if (
    resolvedManifest === undefined ||
    (await realpath(resolvedManifest)) !== join(roots.packageRoot, "package.json")
  ) {
    graphMismatch("The installed-package lock row does not exactly bind the package root.");
  }
  if (expectedRoot.descriptor.packageName !== manifest.name) {
    graphMismatch("The installed package identity differs from the immutable SDK artifact.");
  }
  const artifactStat = await lstat(expectedRoot.artifactPath);
  if (
    !artifactStat.isFile() ||
    artifactStat.isSymbolicLink() ||
    (await realpath(expectedRoot.artifactPath)) !== expectedRoot.artifactPath
  ) {
    graphMismatch("The immutable SDK artifact path is not an ordinary canonical file.");
  }
  const artifactBytes = await Bun.file(expectedRoot.artifactPath).bytes();
  if (
    artifactBytes.byteLength !== expectedRoot.descriptor.byteLength ||
    !equalDigest(
      sha256Digest("research-sdk.package-tarball.v1", artifactBytes),
      expectedRoot.descriptor.contentDigest
    )
  ) {
    graphMismatch("The consumed SDK artifact bytes differ from the packed descriptor.");
  }
  const row = lock.packages[manifest.name];
  if (!Array.isArray(row) || row.length === 0) {
    graphMismatch("The installed SDK root has no exact lock row.");
  }
  const resolution = `${manifest.name}@${expectedRoot.artifactPath}`;
  const integrity = `sha512-${new Bun.CryptoHasher("sha512")
    .update(artifactBytes)
    .digest("base64")}`;
  if (
    row[0] !== resolution ||
    !row.includes(integrity) ||
    Object.hasOwn(lock.patchedDependencies, resolution)
  ) {
    unsupported("The installed SDK root lock row is patched or malformed.");
  }
}
interface RegistryAttestation {
  readonly integrities: ReadonlySet<string>;
  readonly patched: boolean;
}
interface ResolutionAttestations {
  readonly registry: ReadonlyMap<string, RegistryAttestation>;
  readonly nonRegistryNames: ReadonlySet<string>;
  readonly nonRegistryIdentities: ReadonlySet<string>;
}
function registryAttestations(lock: LoadedLock): ResolutionAttestations {
  const entries = new Map<string, { integrities: Set<string>; patched: boolean }>();
  const nonRegistryNames = new Set<string>();
  const nonRegistryIdentities = new Set<string>();
  for (const value of Object.values(lock.workspaces)) {
    if (!isRecordValue(value)) {
      continue;
    }
    const name = value.name;
    const version = value.version;
    if (typeof name === "string" && name.length > 0) {
      if (typeof version === "string" && version.length > 0) {
        nonRegistryIdentities.add(`${name}@${version}`);
      }
    }
  }
  for (const row of Object.values(lock.packages)) {
    if (!Array.isArray(row) || typeof row[0] !== "string") {
      continue;
    }
    const resolvedName = packageNameFromResolution(row[0]);
    const integrity = row.findLast(
      (entry): entry is string =>
        typeof entry === "string" && /^sha(?:256|384|512)-[A-Za-z0-9+/=]+$/u.test(entry)
    );
    if (row[1] !== "" || integrity === undefined) {
      if (resolvedName !== undefined) {
        nonRegistryNames.add(resolvedName);
      }
      continue;
    }
    const resolution = row[0];
    const existing = entries.get(resolution) ?? { integrities: new Set(), patched: false };
    existing.integrities.add(integrity);
    existing.patched ||= Object.hasOwn(lock.patchedDependencies, resolution);
    entries.set(resolution, existing);
  }
  return {
    registry: entries,
    nonRegistryNames,
    nonRegistryIdentities,
  };
}
function registryNode(
  attestations: ResolutionAttestations,
  name: string,
  manifest: PackageManifest
): RegistryNode {
  const resolution = `${name}@${manifest.version}`;
  const attestation = attestations.registry.get(resolution);
  if (
    manifest.name !== name ||
    attestation === undefined ||
    attestation.patched ||
    attestation.integrities.size !== 1 ||
    attestations.nonRegistryNames.has(name) ||
    attestations.nonRegistryIdentities.has(resolution)
  ) {
    unsupported(`Resolution ${resolution} is not one exact admitted registry package.`);
  }
  const integrity = [...attestation.integrities][0]!;
  const nodeId = sha256Portable("research-sdk.runtime-package-node.v1", {
    name,
    version: manifest.version,
    resolution,
    integrity,
  }).value;
  return {
    nodeId,
    name,
    version: manifest.version,
    resolution,
    integrity,
  };
}
function packageNameFromResolution(resolution: string): string | undefined {
  const delimiter = resolution.startsWith("@")
    ? resolution.indexOf("@", 1)
    : resolution.indexOf("@");
  if (delimiter <= 0 || delimiter === resolution.length - 1) {
    return undefined;
  }
  return resolution.slice(0, delimiter);
}
function dependenciesFromManifest(manifest: PackageManifest): DependencyRequest[] {
  const requests = new Map<string, DependencyRequest>();
  for (const [name, requested] of Object.entries(manifest.dependencies ?? {})) {
    requests.set(name, { name, requested, kind: "Dependency" });
  }
  for (const [name, requested] of Object.entries(manifest.optionalDependencies ?? {})) {
    requests.set(name, { name, requested, kind: "OptionalDependency" });
  }
  for (const [name, requested] of Object.entries(manifest.peerDependencies ?? {})) {
    requests.set(name, {
      name,
      requested,
      kind:
        manifest.peerDependenciesMeta?.[name]?.optional === true
          ? "OptionalPeerDependency"
          : "PeerDependency",
    });
  }
  return [...requests.values()].sort((left, right) => compareText(left.name, right.name));
}
async function validateGraphRoots(request: RuntimeGraphRequest): Promise<{
  readonly workspaceRoot: string;
  readonly packageRoot: string;
}> {
  const workspaceRoot = await realpath(request.workspaceRoot);
  const packageRoot = await realpath(request.packageRoot);
  if (
    workspaceRoot !== request.workspaceRoot ||
    packageRoot !== request.packageRoot ||
    !isAtOrBelow(packageRoot, workspaceRoot)
  ) {
    throw invalidInput("derive-runtime-graph", "The graph request is not canonical.");
  }
  return { workspaceRoot, packageRoot };
}
export async function embeddedManifestPath(packageRootInput: string): Promise<string> {
  const packageRoot = await realpath(packageRootInput);
  if (packageRoot !== packageRootInput) {
    throw invalidInput(
      "write-runtime-graph-manifest",
      "The package root must be a canonical realpath."
    );
  }
  const expectedDistributionRoot = resolve(packageRoot, "dist");
  await requireOrdinaryDistributionRoot(packageRoot, expectedDistributionRoot);
  return join(packageRoot, embeddedRuntimeManifestPath);
}
async function requireOrdinaryDistributionRoot(
  packageRoot: string,
  distributionRoot: string
): Promise<void> {
  if (distributionRoot !== resolve(packageRoot, "dist")) {
    throw invalidInput(
      "write-runtime-graph-manifest",
      "The package distribution root escapes the package."
    );
  }
  const distributionStat = await lstat(distributionRoot);
  if (!distributionStat.isDirectory() || distributionStat.isSymbolicLink()) {
    throw invalidInput(
      "write-runtime-graph-manifest",
      "The package distribution root must be an existing ordinary directory."
    );
  }
  const canonicalDistributionRoot = await realpath(distributionRoot);
  if (
    canonicalDistributionRoot !== distributionRoot ||
    !isAtOrBelow(canonicalDistributionRoot, packageRoot)
  ) {
    throw invalidInput(
      "write-runtime-graph-manifest",
      "The package distribution root escapes the package."
    );
  }
}
export function uninterruptiblePackageFs<Output>(
  operation: string,
  execute: () => Promise<Output>
): Effect.Effect<Output, GitBunError> {
  return Effect.uninterruptible(
    Effect.tryPromise({
      try: execute,
      catch: (error) => normalizePackageError(operation, error),
    })
  );
}
function deferredRootContentDigest(manifest: PackageManifest): DigestIdentity {
  return sha256Portable("research-sdk.package-root-content.deferred.v1", {
    name: manifest.name,
    version: manifest.version,
  });
}
export function finalizeRootContent(
  graph: RootedRuntimeGraph,
  packageContentDigest: DigestIdentity
): RootedRuntimeGraph {
  const nodes = graph.nodes.map((node) =>
    node.nodeId === graph.rootNodeId ? { ...node, packageContentDigest } : node
  );
  const value = {
    rootNodeId: graph.rootNodeId,
    platform: graph.platform,
    architecture: graph.architecture,
    nodes,
  };
  return {
    ...value,
    graphDigest: sha256Portable("research-sdk.runtime-dependency-graph.v1", value),
  };
}
async function digestPackageContent(root: string, excludedPath?: string): Promise<DigestIdentity> {
  const canonicalRoot = await realpath(root);
  const entries: PackageContentEntry[] = [];
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules") {
        continue;
      }
      const path = join(directory, entry.name);
      const portablePath = relative(canonicalRoot, path).split(sep).join("/");
      if (portablePath === excludedPath) {
        continue;
      }
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      const stat = await lstat(path);
      if (!stat.isFile()) {
        throw invalidInput(
          "derive-runtime-graph",
          "Installed package content contains a non-file entry."
        );
      }
      const bytes = await Bun.file(path).bytes();
      entries.push({
        path: portablePath,
        kind: "RegularFile",
        mode: regularFileMode(stat.mode),
        byteLength: bytes.byteLength,
        digest: sha256Digest("research-sdk.package-content-file.v1", bytes),
      });
    }
  };
  await walk(canonicalRoot);
  return packageContentDigest(entries);
}
function loadBunLock(bytes: Uint8Array): LoadedLock {
  let parsed: unknown;
  try {
    parsed = Bun.JSONC.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw invalidInput("derive-runtime-graph", "The frozen Bun lock is malformed.");
  }
  const value = recordValue(parsed, "Parsed bun.lock");
  return {
    packages: optionalRecord(value, "packages"),
    patchedDependencies: optionalRecord(value, "patchedDependencies"),
    workspaces: optionalRecord(value, "workspaces"),
  };
}
function resolveInstalledManifest(name: string, parentRoot: string): string | undefined {
  try {
    return Bun.resolveSync(`${name}/package.json`, parentRoot);
  } catch {
    return undefined;
  }
}
async function readPackageManifest(path: string): Promise<PackageManifest> {
  const decoded = decodeStructural(PackageManifestSchema, await Bun.file(path).json());
  if (decoded.kind === "Invalid") {
    throw invalidInput("read-package-manifest", "An installed package manifest is malformed.");
  }
  return decoded.value;
}
async function digestFile(path: string): Promise<DigestIdentity> {
  return sha256Digest("research-sdk.package-manifest.v1", await Bun.file(path).bytes());
}
function installedEdge(request: DependencyRequest, targetNodeId: string): RuntimeDependencyEdge {
  return {
    dependencyName: request.name,
    dependencyKind: request.kind,
    requested: request.requested,
    installed: true,
    targetNodeId,
  };
}
function absentEdge(request: DependencyRequest): RuntimeDependencyEdge {
  return {
    dependencyName: request.name,
    dependencyKind:
      request.kind === "OptionalPeerDependency" ? "OptionalPeerDependency" : "OptionalDependency",
    requested: request.requested,
    installed: false,
  };
}
function isOptional(request: DependencyRequest): boolean {
  return request.kind === "OptionalDependency" || request.kind === "OptionalPeerDependency";
}
function sortEdges(edges: readonly RuntimeDependencyEdge[]): RuntimeDependencyEdge[] {
  return [...edges].sort((left, right) =>
    compareText(
      `${left.dependencyName}\0${left.dependencyKind}\0${left.installed ? left.targetNodeId : ""}`,
      `${right.dependencyName}\0${right.dependencyKind}\0${right.installed ? right.targetNodeId : ""}`
    )
  );
}
export function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
export function packageContentDigest(entries: readonly PackageContentEntry[]): DigestIdentity {
  return sha256Portable(
    "research-sdk.package-content-tree.v2",
    [...entries].sort((left, right) => compareText(left.path, right.path))
  );
}

export function regularFileMode(mode: number): "Executable" | "NonExecutable" {
  return (mode & 0o111) === 0 ? "NonExecutable" : "Executable";
}
function optionalRecord(
  record: Readonly<Record<string, unknown>>,
  key: string
): Readonly<Record<string, unknown>> {
  return Object.hasOwn(record, key) ? recordValue(record[key], `Lock field ${key}`) : {};
}
function recordValue(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (!isRecordValue(value)) {
    throw invalidInput("derive-runtime-graph", `${label} is malformed.`);
  }
  return value;
}
function isRecordValue(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function graphMismatch(message: string): never {
  throw identityMismatch("derive-runtime-graph", message);
}
function unsupported(message: string): never {
  throw invalidInput("derive-runtime-graph", message);
}
function normalizePackageError(operation: string, error: unknown): GitBunError {
  return isGitBunError(error) ? error : operationFailed(operation, error);
}
