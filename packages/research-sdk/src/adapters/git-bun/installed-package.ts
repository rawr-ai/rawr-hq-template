import { lstat, readdir, realpath } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
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
import { digestPackageMaterializationSurface } from "./package-materialization.js";

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
    devDependencies: Type.Optional(
      Type.Record(Type.String({ minLength: 1 }), Type.String({ minLength: 1 }))
    ),
    bin: Type.Optional(
      Type.Union([
        Type.String({ minLength: 1 }),
        Type.Record(Type.String({ minLength: 1 }), Type.String({ minLength: 1 })),
      ])
    ),
    os: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    cpu: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    peerDependenciesMeta: Type.Optional(
      Type.Record(
        Type.String({ minLength: 1 }),
        Type.Object({ optional: Type.Optional(Type.Boolean()) }, { additionalProperties: true })
      )
    ),
  },
  { additionalProperties: true }
);

const WorkspaceManifestSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    version: Type.Optional(Type.String({ minLength: 1 })),
    dependencies: Type.Optional(
      Type.Record(Type.String({ minLength: 1 }), Type.String({ minLength: 1 }))
    ),
    optionalDependencies: Type.Optional(
      Type.Record(Type.String({ minLength: 1 }), Type.String({ minLength: 1 }))
    ),
    peerDependencies: Type.Optional(
      Type.Record(Type.String({ minLength: 1 }), Type.String({ minLength: 1 }))
    ),
    devDependencies: Type.Optional(
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
type WorkspaceManifest = Static<typeof WorkspaceManifestSchema>;
interface DependencyManifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependenciesMeta?: Readonly<Record<string, { readonly optional?: boolean }>>;
}
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
interface BuildDependencyRequest {
  readonly name: string;
  readonly requested: string;
}
interface PackageExecutable {
  readonly command: string;
  readonly target: string;
}
interface RegistryPackageBehavior {
  readonly os?: string;
  readonly cpu?: string;
  readonly bin: readonly PackageExecutable[];
}
interface WorkspaceLockRow {
  readonly name: string;
  readonly version?: string;
  readonly dependencies: readonly DependencyRequest[];
  readonly developmentDependencies: readonly BuildDependencyRequest[];
}
interface RegistryPackageLockRow {
  readonly kind: "Registry";
  readonly name: string;
  readonly resolution: string;
  readonly integrity: string;
  readonly dependencies: readonly DependencyRequest[];
  readonly behavior: RegistryPackageBehavior;
}
interface WorkspacePackageLockRow {
  readonly kind: "Workspace";
  readonly name: string;
  readonly resolution: string;
}
interface ArtifactPackageLockRow {
  readonly kind: "Artifact";
  readonly name: string;
  readonly resolution: string;
  readonly integrity: string;
  readonly dependencies: readonly DependencyRequest[];
  readonly behavior: RegistryPackageBehavior;
}
type PackageLockRow = RegistryPackageLockRow | WorkspacePackageLockRow | ArtifactPackageLockRow;
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
  readonly dependencies: readonly DependencyRequest[];
  readonly contextPath: readonly string[];
  readonly behavior: RegistryPackageBehavior;
}
interface NodeDraft {
  readonly root: string;
  readonly node: Omit<RuntimePackageNode, "dependencies">;
  readonly dependencies: readonly DependencyRequest[];
  readonly contextPath: readonly string[];
  readonly edges: RuntimeDependencyEdge[];
}
export interface RuntimeGraphRequest {
  readonly workspaceRoot: string;
  readonly packageRoot: string;
}
export interface RuntimeGraphResult {
  readonly graph: RootedRuntimeGraph;
  readonly ownerLockDigest: DigestIdentity;
  readonly buildInputDigest: DigestIdentity;
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
  const registry = createResolutionAttestations();
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
  const rootBinding =
    expectedRoot === undefined
      ? await bindWorkspaceRoot(lock, registry, roots, rootManifest)
      : await bindInstalledRoot(lock, roots, rootManifest, expectedRoot);
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
    dependencies: rootBinding.runtimeDependencies,
    contextPath: [rootManifest.name],
    edges: [],
  };
  const drafts = new Map<string, NodeDraft>([[rootNodeId, rootDraft]]);
  await populateRegistryClosure(lock, registry, roots.workspaceRoot, drafts, [rootDraft]);

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
    buildInputDigest: rootBinding.buildInputDigest,
    graph: {
      ...graphValue,
      graphDigest: sha256Portable("research-sdk.runtime-dependency-graph.v1", graphValue),
    },
  };
}
async function bindWorkspaceRoot(
  lock: LoadedLock,
  registry: ResolutionAttestations,
  roots: { readonly workspaceRoot: string; readonly packageRoot: string },
  manifest: PackageManifest
): Promise<{
  readonly runtimeDependencies: readonly DependencyRequest[];
  readonly buildInputDigest: DigestIdentity;
}> {
  const relativeKey = relative(roots.workspaceRoot, roots.packageRoot).split(sep).join("/");
  const key = relativeKey.length === 0 ? "" : normalizePortablePath(relativeKey);
  if (key === undefined || !Object.hasOwn(lock.workspaces, key)) {
    graphMismatch("The research SDK source is not bound by an exact workspace lock row.");
  }
  const expectedPackageRoot = await realpath(resolve(roots.workspaceRoot, key));
  const workspace = workspaceLockRow(lock, key);
  if (workspace === undefined) {
    graphMismatch("The research SDK source has no exact workspace lock row.");
  }
  const alias = packageLockRow(lock, manifest.name);
  const aliasMatches =
    key === ""
      ? alias === undefined
      : alias?.kind === "Workspace" &&
        alias.name === manifest.name &&
        alias.resolution === `${manifest.name}@workspace:${key}`;
  if (
    expectedPackageRoot !== roots.packageRoot ||
    workspace.name !== manifest.name ||
    workspace.version !== manifest.version ||
    !aliasMatches
  ) {
    graphMismatch("The selected workspace lock row does not exactly bind the package root.");
  }
  requireDependencyAgreement(
    workspace.dependencies,
    dependenciesFromManifest(manifest),
    "The selected workspace lock dependency edges differ from its package manifest."
  );
  requireBuildDependencyAgreement(
    workspace.developmentDependencies,
    buildDependenciesFromManifest(manifest),
    "The selected workspace lock build inputs differ from its package manifest."
  );
  return {
    runtimeDependencies: workspace.dependencies,
    buildInputDigest: await deriveBuildInputDigest(lock, registry, roots, manifest, workspace),
  };
}
async function deriveBuildInputDigest(
  lock: LoadedLock,
  registry: ResolutionAttestations,
  roots: { readonly workspaceRoot: string; readonly packageRoot: string },
  manifest: PackageManifest,
  workspace: WorkspaceLockRow
): Promise<DigestIdentity> {
  const rootNodeId = "research-sdk.build-input-root";
  const rootDraft: NodeDraft = {
    root: roots.packageRoot,
    node: {
      nodeId: rootNodeId,
      name: manifest.name,
      version: manifest.version,
      resolution: rootNodeId,
      integrity: rootNodeId,
      packageManifestDigest: sha256Portable("research-sdk.build-input-root.v1", {
        name: manifest.name,
        version: manifest.version,
      }),
      packageContentDigest: sha256Portable("research-sdk.build-input-root-content.v1", {}),
    },
    dependencies: workspace.developmentDependencies.map((request) => ({
      ...request,
      kind: "Dependency" as const,
    })),
    contextPath: [manifest.name],
    edges: [],
  };
  const drafts = new Map<string, NodeDraft>([[rootNodeId, rootDraft]]);
  await populateRegistryClosure(lock, registry, roots.workspaceRoot, drafts, [rootDraft]);
  await validatePackageBuildAccess(
    roots,
    workspace.dependencies,
    workspace.developmentDependencies
  );
  const nodes = [...drafts.values()]
    .filter(({ node }) => node.nodeId !== rootNodeId)
    .map(({ node, edges }) => ({ ...node, dependencies: sortEdges(edges) }))
    .sort((left, right) => compareText(left.nodeId, right.nodeId));
  const materializationDigest = await digestPackageMaterializationSurface(
    roots.workspaceRoot,
    roots.packageRoot
  );
  return sha256Portable("research-sdk.build-input-closure.v1", {
    dependencies: sortEdges(rootDraft.edges),
    nodes,
    materializationDigest,
  });
}
async function validatePackageBuildAccess(
  roots: { readonly workspaceRoot: string; readonly packageRoot: string },
  runtimeDependencies: readonly DependencyRequest[],
  buildDependencies: readonly BuildDependencyRequest[]
): Promise<void> {
  const dependencies = new Map<string, DependencyRequest>();
  for (const dependency of runtimeDependencies) {
    dependencies.set(dependency.name, dependency);
  }
  for (const dependency of buildDependencies) {
    if (dependencies.has(dependency.name)) {
      unsupported(`Package input ${dependency.name} belongs to overlapping dependency groups.`);
    }
    dependencies.set(dependency.name, { ...dependency, kind: "Dependency" });
  }
  const nodeModulesRoot = join(roots.packageRoot, "node_modules");
  const allowedLinks = new Map<string, string>();
  const allowedDirectories = new Set<string>([nodeModulesRoot, join(nodeModulesRoot, ".bin")]);
  for (const dependency of dependencies.values()) {
    const manifestPath = await resolveInstalledManifest(
      dependency.name,
      roots.packageRoot,
      roots.workspaceRoot
    );
    if (manifestPath === undefined) {
      if (isOptional(dependency)) {
        continue;
      }
      graphMismatch(`Required package build input ${dependency.name} is missing.`);
    }
    const packageRoot = dirname(manifestPath);
    const segments = packageNameSegments(dependency.name);
    if (segments === undefined) {
      unsupported(`Package input ${dependency.name} has an unsupported package name.`);
    }
    const packageLink = join(nodeModulesRoot, ...segments);
    if (segments.length === 2) {
      allowedDirectories.add(join(nodeModulesRoot, segments[0]!));
    }
    await requireExactPackageLink(packageLink, packageRoot, dependency.name);
    allowedLinks.set(packageLink, packageRoot);
    const manifest = await readPackageManifest(manifestPath);
    for (const { command, target } of normalizedPackageBinEntries(manifest)) {
      const expectedTarget = resolve(packageRoot, ...target.split("/"));
      const commandLink = join(nodeModulesRoot, ".bin", command);
      const priorTarget = allowedLinks.get(commandLink);
      if (priorTarget !== undefined && priorTarget !== expectedTarget) {
        unsupported(`Package build command ${command} has multiple declared owners.`);
      }
      let expectedStat;
      let commandStat;
      try {
        [expectedStat, commandStat] = await Promise.all([
          lstat(expectedTarget),
          lstat(commandLink),
        ]);
      } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
          graphMismatch(`Build input ${dependency.name} has a missing executable link.`);
        }
        throw error;
      }
      if (
        !isAtOrBelow(expectedTarget, packageRoot) ||
        expectedTarget === packageRoot ||
        !expectedStat.isFile() ||
        expectedStat.isSymbolicLink() ||
        regularFileMode(expectedStat.mode) !== "Executable" ||
        !commandStat.isSymbolicLink() ||
        (await realpath(commandLink)) !== expectedTarget
      ) {
        graphMismatch(`Build input ${dependency.name} has a mismatched executable link.`);
      }
      allowedLinks.set(commandLink, expectedTarget);
    }
  }
  await requireExactPackageNodeModules(nodeModulesRoot, allowedDirectories, allowedLinks);
}
async function requireExactPackageLink(
  linkPath: string,
  expectedTarget: string,
  name: string
): Promise<void> {
  let stat;
  try {
    stat = await lstat(linkPath);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      graphMismatch(`Package input ${name} has no package-local dependency link.`);
    }
    throw error;
  }
  if (!stat.isSymbolicLink() || (await realpath(linkPath)) !== expectedTarget) {
    graphMismatch(`Package input ${name} has a mismatched package-local dependency link.`);
  }
}
async function requireExactPackageNodeModules(
  nodeModulesRoot: string,
  allowedDirectories: ReadonlySet<string>,
  allowedLinks: ReadonlyMap<string, string>
): Promise<void> {
  const rootStat = await lstat(nodeModulesRoot);
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    (await realpath(nodeModulesRoot)) !== nodeModulesRoot
  ) {
    graphMismatch("The package-local dependency root is not an ordinary canonical directory.");
  }
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        const expectedTarget = allowedLinks.get(path);
        if (expectedTarget === undefined || (await realpath(path)) !== expectedTarget) {
          graphMismatch("The package-local dependency root contains an undeclared link.");
        }
        continue;
      }
      if (entry.isDirectory() && allowedDirectories.has(path)) {
        await walk(path);
        continue;
      }
      graphMismatch("The package-local dependency root contains undeclared content.");
    }
  };
  await walk(nodeModulesRoot);
}
function normalizedPackageBinEntries(manifest: PackageManifest): readonly PackageExecutable[] {
  if (manifest.bin === undefined) {
    return [];
  }
  let entries: readonly (readonly [string, string])[];
  if (typeof manifest.bin === "string") {
    const segments = manifest.name.split("/");
    entries = [[segments.at(-1) ?? manifest.name, manifest.bin]];
  } else {
    entries = Object.entries(manifest.bin);
  }
  return normalizePackageBinEntries(entries, `Installed package ${manifest.name}`);
}
function registryBehaviorFromLockMetadata(
  metadata: Readonly<Record<string, unknown>>,
  label: string
): RegistryPackageBehavior {
  const allowedFields = new Set([
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
    "optionalPeers",
    "os",
    "cpu",
    "bin",
  ]);
  for (const key of Object.keys(metadata)) {
    if (key === "devDependencies" || key === "binDir" || key === "bundled") {
      unsupported(`${label} contains unsupported registry package behavior ${key}.`);
    }
    if (!allowedFields.has(key)) {
      unsupported(`${label} contains unknown registry package behavior ${key}.`);
    }
  }
  let bin: readonly PackageExecutable[] = [];
  if (Object.hasOwn(metadata, "bin")) {
    const record = recordValue(metadata.bin, `${label} bin`);
    const entries: Array<readonly [string, string]> = [];
    for (const [command, target] of Object.entries(record)) {
      if (typeof target !== "string" || target.length === 0) {
        unsupported(`${label} bin is malformed.`);
      }
      entries.push([command, target]);
    }
    bin = normalizePackageBinEntries(entries, label);
  }
  const os = positiveRegistryConstraint(metadata, "os", label);
  const cpu = positiveRegistryConstraint(metadata, "cpu", label);
  return {
    ...(os === undefined ? {} : { os }),
    ...(cpu === undefined ? {} : { cpu }),
    bin,
  };
}
function positiveRegistryConstraint(
  metadata: Readonly<Record<string, unknown>>,
  key: "os" | "cpu",
  label: string
): string | undefined {
  if (!Object.hasOwn(metadata, key)) {
    return undefined;
  }
  const value = metadata[key];
  if (typeof value !== "string" || !isPositivePackageConstraint(value)) {
    unsupported(`${label} ${key} must be one positive scalar.`);
  }
  return value;
}
function normalizePackageBinEntries(
  entries: readonly (readonly [string, string])[],
  label: string
): readonly PackageExecutable[] {
  const commands = new Set<string>();
  const normalized: PackageExecutable[] = [];
  for (const [command, declaredTarget] of entries) {
    const target = normalizePortablePath(declaredTarget.replace(/^\.\//u, ""));
    if (
      !isSafePackageCommand(command) ||
      commands.has(command) ||
      target === undefined ||
      target === "."
    ) {
      unsupported(`${label} has an unsupported executable declaration.`);
    }
    commands.add(command);
    normalized.push({ command, target });
  }
  return normalized.sort((left, right) => compareText(left.command, right.command));
}
function isSafePackageCommand(command: string): boolean {
  return (
    command.length > 0 &&
    command !== "." &&
    command !== ".." &&
    !command.includes("/") &&
    !command.includes("\\") &&
    !command.includes("\0")
  );
}
function isPositivePackageConstraint(value: string): boolean {
  return value.length > 0 && !value.startsWith("!") && /^[A-Za-z0-9._-]+$/u.test(value);
}
function registryBehaviorSignature(behavior: RegistryPackageBehavior): string {
  return stableJson({
    ...(behavior.os === undefined ? {} : { os: behavior.os }),
    ...(behavior.cpu === undefined ? {} : { cpu: behavior.cpu }),
    bin: behavior.bin.map(({ command, target }) => ({ command, target })),
  });
}
async function requirePackageBehavior(
  behavior: RegistryPackageBehavior,
  manifest: PackageManifest,
  packageRoot: string
): Promise<void> {
  const manifestOs = singletonManifestConstraint(manifest.os, "os", manifest.name);
  const manifestCpu = singletonManifestConstraint(manifest.cpu, "cpu", manifest.name);
  if (
    behavior.os !== manifestOs ||
    behavior.cpu !== manifestCpu ||
    (manifestOs !== undefined && manifestOs !== process.platform) ||
    (manifestCpu !== undefined && manifestCpu !== process.arch)
  ) {
    graphMismatch(`Installed package ${manifest.name} has mismatched platform behavior.`);
  }
  const manifestBin = normalizedPackageBinEntries(manifest);
  if (
    stableJson(manifestBin.map(({ command, target }) => ({ command, target }))) !==
    stableJson(behavior.bin.map(({ command, target }) => ({ command, target })))
  ) {
    graphMismatch(`Installed package ${manifest.name} has mismatched executable behavior.`);
  }
  for (const executable of behavior.bin) {
    const target = resolve(packageRoot, ...executable.target.split("/"));
    let stat;
    try {
      stat = await lstat(target);
    } catch (error) {
      if (hasErrorCode(error, "ENOENT")) {
        graphMismatch(`Installed package ${manifest.name} has a missing executable.`);
      }
      throw error;
    }
    if (
      target === packageRoot ||
      !isAtOrBelow(target, packageRoot) ||
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      (await realpath(target)) !== target ||
      regularFileMode(stat.mode) !== "Executable"
    ) {
      graphMismatch(`Installed package ${manifest.name} has a nonordinary executable.`);
    }
  }
}
function singletonManifestConstraint(
  values: readonly string[] | undefined,
  key: "os" | "cpu",
  packageName: string
): string | undefined {
  if (values === undefined) {
    return undefined;
  }
  if (values.length !== 1 || !isPositivePackageConstraint(values[0]!)) {
    unsupported(`Installed package ${packageName} has an unsupported ${key} constraint.`);
  }
  return values[0]!;
}
async function populateRegistryClosure(
  lock: LoadedLock,
  registry: ResolutionAttestations,
  workspaceRoot: string,
  drafts: Map<string, NodeDraft>,
  queue: NodeDraft[]
): Promise<void> {
  while (queue.length > 0) {
    const parent = queue.shift();
    if (parent === undefined) {
      break;
    }
    for (const dependency of parent.dependencies) {
      const manifestPath = await resolveInstalledManifest(
        dependency.name,
        parent.root,
        workspaceRoot
      );
      if (manifestPath === undefined) {
        if (isOptional(dependency)) {
          parent.edges.push(absentEdge(dependency));
          continue;
        }
        graphMismatch(`Required installed dependency ${dependency.name} is missing.`);
      }

      const canonicalManifest = await realpath(manifestPath);
      const packageRoot = dirname(canonicalManifest);
      if (!isAtOrBelow(packageRoot, workspaceRoot)) {
        graphMismatch(`Installed dependency ${dependency.name} escapes the install root.`);
      }
      const manifest = await readPackageManifest(canonicalManifest);
      const target = registryNode(lock, registry, parent.contextPath, dependency, manifest);
      await requirePackageBehavior(target.behavior, manifest, packageRoot);
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
        if (stableJson(existing.contextPath) !== stableJson(target.contextPath)) {
          unsupported(
            `Installed package ${target.resolution} is reached through multiple contextual lock rows.`
          );
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
          dependencies: target.dependencies,
          contextPath: target.contextPath,
          edges: [],
        };
        drafts.set(target.nodeId, draft);
        queue.push(draft);
      }
      parent.edges.push(installedEdge(dependency, target.nodeId));
    }
  }
}
async function bindInstalledRoot(
  lock: LoadedLock,
  roots: { readonly workspaceRoot: string; readonly packageRoot: string },
  manifest: PackageManifest,
  expectedRoot: InstalledRuntimeExpectation
): Promise<{
  readonly runtimeDependencies: readonly DependencyRequest[];
  readonly buildInputDigest: DigestIdentity;
}> {
  const resolvedManifest = await resolveInstalledManifest(
    manifest.name,
    roots.workspaceRoot,
    roots.workspaceRoot
  );
  if (
    resolvedManifest === undefined ||
    resolvedManifest !== join(roots.packageRoot, "package.json")
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
  const row = packageLockRow(lock, manifest.name);
  if (row === undefined) {
    graphMismatch("The installed SDK root has no exact lock row.");
  }
  const resolution = `${manifest.name}@${expectedRoot.artifactPath}`;
  const integrity = `sha512-${new Bun.CryptoHasher("sha512")
    .update(artifactBytes)
    .digest("base64")}`;
  if (
    row.kind !== "Artifact" ||
    row.name !== manifest.name ||
    row.resolution !== resolution ||
    row.integrity !== integrity ||
    Object.hasOwn(lock.patchedDependencies, resolution)
  ) {
    unsupported("The installed SDK root lock row is patched or malformed.");
  }
  const consumer = workspaceLockRow(lock, "");
  if (consumer === undefined) {
    graphMismatch("The consumer workspace lock edge does not exactly bind the SDK artifact.");
  }
  const consumerManifest = await readWorkspaceManifest(join(roots.workspaceRoot, "package.json"));
  requireConsumerWorkspaceBinding(
    consumer,
    consumerManifest,
    manifest.name,
    expectedRoot.artifactPath
  );
  requireDependencyAgreement(
    row.dependencies,
    dependenciesFromManifest(manifest),
    "The installed SDK lock dependency edges differ from its package manifest."
  );
  await requirePackageBehavior(row.behavior, manifest, roots.packageRoot);
  return {
    runtimeDependencies: row.dependencies,
    buildInputDigest: sha256Portable("research-sdk.build-input-closure.v1", {
      dependencies: [],
      nodes: [],
    }),
  };
}
function requireConsumerWorkspaceBinding(
  lockRow: WorkspaceLockRow,
  manifest: WorkspaceManifest,
  packageName: string,
  artifactPath: string
): void {
  const manifestDependencies = dependenciesFromManifest(manifest, "Consumer package manifest");
  const manifestDevelopmentDependencies = buildDependenciesFromManifest(manifest);
  if (
    lockRow.name !== manifest.name ||
    (lockRow.version !== undefined && lockRow.version !== manifest.version)
  ) {
    graphMismatch("The consumer package manifest identity differs from its workspace lock row.");
  }
  requireDependencyAgreement(
    lockRow.dependencies,
    manifestDependencies,
    "The consumer package manifest dependency edges differ from its workspace lock row."
  );
  requireBuildDependencyAgreement(
    lockRow.developmentDependencies,
    manifestDevelopmentDependencies,
    "The consumer package manifest development edges differ from its workspace lock row."
  );
  const expectedRequest = `file:${artifactPath}`;
  const lockRequest = lockRow.dependencies.find(({ name }) => name === packageName);
  const manifestRequest = manifestDependencies.find(({ name }) => name === packageName);
  if (
    lockRequest?.kind !== "Dependency" ||
    lockRequest.requested !== expectedRequest ||
    manifestRequest?.kind !== "Dependency" ||
    manifestRequest.requested !== expectedRequest ||
    lockRow.developmentDependencies.some(({ name }) => name === packageName) ||
    manifestDevelopmentDependencies.some(({ name }) => name === packageName)
  ) {
    graphMismatch("The consumer package manifest does not exactly bind the SDK artifact.");
  }
}
interface RegistryAttestation {
  readonly integrities: ReadonlySet<string>;
  readonly dependencyMaps: ReadonlyMap<string, readonly DependencyRequest[]>;
  readonly behaviors: ReadonlyMap<string, RegistryPackageBehavior>;
  readonly patched: boolean;
  readonly conflictingNonRegistryIdentity: boolean;
}
interface ResolutionAttestations {
  readonly registry: Map<string, RegistryAttestation>;
}
function createResolutionAttestations(): ResolutionAttestations {
  return { registry: new Map() };
}
function registryNode(
  lock: LoadedLock,
  attestations: ResolutionAttestations,
  parentContextPath: readonly string[],
  request: DependencyRequest,
  manifest: PackageManifest
): RegistryNode {
  const { name } = request;
  const resolution = `${name}@${manifest.version}`;
  const contextual = contextualRegistryRow(lock, parentContextPath, name);
  const attestation =
    attestations.registry.get(resolution) ??
    attestRegistryResolution(lock, name, manifest.version, resolution);
  attestations.registry.set(resolution, attestation);
  requireRegistryRequest(request, manifest.version);
  if (
    manifest.name !== name ||
    contextual.row.resolution !== resolution ||
    attestation.patched ||
    attestation.integrities.size !== 1 ||
    attestation.dependencyMaps.size !== 1 ||
    attestation.behaviors.size !== 1 ||
    attestation.conflictingNonRegistryIdentity
  ) {
    unsupported(`Resolution ${resolution} is not one exact admitted registry package.`);
  }
  const integrity = [...attestation.integrities][0]!;
  const dependencies = [...attestation.dependencyMaps.values()][0]!;
  const behavior = [...attestation.behaviors.values()][0]!;
  if (registryBehaviorSignature(contextual.row.behavior) !== registryBehaviorSignature(behavior)) {
    unsupported(`Resolution ${resolution} has divergent contextual package behavior.`);
  }
  requireDependencyAgreement(
    dependencies,
    dependenciesFromManifest(manifest),
    `Installed package ${resolution} has lock dependency edges that differ from its manifest.`
  );
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
    dependencies,
    contextPath: contextual.contextPath,
    behavior,
  };
}
function attestRegistryResolution(
  lock: LoadedLock,
  name: string,
  version: string,
  resolution: string
): RegistryAttestation {
  const integrities = new Set<string>();
  const dependencyMaps = new Map<string, readonly DependencyRequest[]>();
  const behaviors = new Map<string, RegistryPackageBehavior>();
  let conflictingNonRegistryIdentity = false;
  for (const [key, rawRow] of Object.entries(lock.packages)) {
    const candidateResolution = packageResolutionHint(rawRow);
    if (candidateResolution === undefined) {
      continue;
    }
    if (packageNameFromResolution(candidateResolution) !== name) {
      continue;
    }
    if (
      candidateResolution !== resolution &&
      Array.isArray(rawRow) &&
      rawRow.length === 4 &&
      rawRow[1] === ""
    ) {
      continue;
    }
    const row = parsePackageLockRow(rawRow, `Package lock row ${key}`);
    if (row.kind === "Registry") {
      if (row.resolution === resolution) {
        integrities.add(row.integrity);
        dependencyMaps.set(dependencySignature(row.dependencies), row.dependencies);
        behaviors.set(registryBehaviorSignature(row.behavior), row.behavior);
      }
      continue;
    }
    if (row.kind === "Artifact") {
      conflictingNonRegistryIdentity = true;
      continue;
    }
    const workspaceKey = workspaceKeyFromResolution(row.resolution);
    const workspace = workspaceKey === undefined ? undefined : workspaceLockRow(lock, workspaceKey);
    if (workspace === undefined) {
      unsupported(`Workspace resolution ${row.resolution} has no exact workspace lock row.`);
    }
    if (workspace.name === name && workspace.version === version) {
      conflictingNonRegistryIdentity = true;
    }
  }
  for (const [key, rawWorkspace] of Object.entries(lock.workspaces)) {
    const identity = workspaceIdentityHint(rawWorkspace);
    if (identity?.name !== name || identity.version !== version) {
      continue;
    }
    const workspace = parseWorkspaceLockRow(rawWorkspace, `Workspace lock row ${key}`);
    if (workspace.name === name && workspace.version === version) {
      conflictingNonRegistryIdentity = true;
    }
  }
  return {
    integrities,
    dependencyMaps,
    behaviors,
    patched: Object.hasOwn(lock.patchedDependencies, resolution),
    conflictingNonRegistryIdentity,
  };
}
function requireRegistryRequest(request: DependencyRequest, installedVersion: string): void {
  if (
    !/[0-9*]/u.test(request.requested) ||
    !/^[0-9A-Za-z.*+<>=~^| -]+$/u.test(request.requested) ||
    /^(?:file|git|github|http|https|link|npm|portal|workspace):/iu.test(request.requested)
  ) {
    unsupported(`Dependency ${request.name} uses an unsupported registry request.`);
  }
  if (!Bun.semver.satisfies(installedVersion, request.requested)) {
    graphMismatch(
      `Dependency ${request.name} does not resolve to the version required by its frozen edge.`
    );
  }
}
function contextualRegistryRow(
  lock: LoadedLock,
  parentContextPath: readonly string[],
  dependencyName: string
): {
  readonly row: RegistryPackageLockRow;
  readonly contextPath: readonly string[];
} {
  for (let depth = parentContextPath.length; depth >= 0; depth -= 1) {
    const contextPath = [...parentContextPath.slice(0, depth), dependencyName];
    const key = contextPath.join("/");
    const row = packageLockRow(lock, key);
    if (row === undefined) {
      continue;
    }
    if (row.kind !== "Registry" || row.name !== dependencyName) {
      unsupported(`Contextual lock row ${key} is not one admitted registry package.`);
    }
    return { row, contextPath };
  }
  unsupported(`Dependency ${dependencyName} has no contextual registry lock row.`);
}
function packageResolutionHint(value: unknown): string | undefined {
  return Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0
    ? value[0]
    : undefined;
}
function workspaceIdentityHint(
  value: unknown
): { readonly name?: string; readonly version?: string } | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Readonly<Record<string, unknown>>;
  return {
    ...(typeof record.name === "string" ? { name: record.name } : {}),
    ...(typeof record.version === "string" ? { version: record.version } : {}),
  };
}
function workspaceKeyFromResolution(resolution: string): string | undefined {
  const marker = "@workspace:";
  const markerIndex = resolution.indexOf(marker);
  if (markerIndex <= 0) {
    return undefined;
  }
  const key = resolution.slice(markerIndex + marker.length);
  return key.length > 0 ? key : undefined;
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
function dependenciesFromManifest(
  manifest: DependencyManifest,
  label = "Package manifest"
): DependencyRequest[] {
  requireDisjointDependencyGroups(
    [
      ["dependencies", manifest.dependencies ?? {}],
      ["optionalDependencies", manifest.optionalDependencies ?? {}],
      ["peerDependencies", manifest.peerDependencies ?? {}],
    ],
    label
  );
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
function buildDependenciesFromManifest(manifest: DependencyManifest): BuildDependencyRequest[] {
  return Object.entries(manifest.devDependencies ?? {})
    .map(([name, requested]) => ({ name, requested }))
    .sort((left, right) => compareText(left.name, right.name));
}
function dependenciesFromLockMetadata(
  metadata: Readonly<Record<string, unknown>>,
  label: string
): readonly DependencyRequest[] {
  const dependencies = dependencyRecord(metadata, "dependencies", label);
  const optionalDependencies = dependencyRecord(metadata, "optionalDependencies", label);
  const peerDependencies = dependencyRecord(metadata, "peerDependencies", label);
  requireDisjointDependencyGroups(
    [
      ["dependencies", dependencies],
      ["optionalDependencies", optionalDependencies],
      ["peerDependencies", peerDependencies],
    ],
    label
  );
  const optionalPeers = optionalPeerNames(metadata, peerDependencies, label);
  const requests = new Map<string, DependencyRequest>();
  for (const [name, requested] of Object.entries(dependencies)) {
    requests.set(name, { name, requested, kind: "Dependency" });
  }
  for (const [name, requested] of Object.entries(optionalDependencies)) {
    requests.set(name, { name, requested, kind: "OptionalDependency" });
  }
  for (const [name, requested] of Object.entries(peerDependencies)) {
    requests.set(name, {
      name,
      requested,
      kind: optionalPeers.has(name) ? "OptionalPeerDependency" : "PeerDependency",
    });
  }
  return [...requests.values()].sort((left, right) => compareText(left.name, right.name));
}
function requireDisjointDependencyGroups(
  groups: readonly (readonly [string, Readonly<Record<string, string>>])[],
  label: string
): void {
  const owners = new Map<string, string>();
  for (const [group, dependencies] of groups) {
    for (const name of Object.keys(dependencies)) {
      const owner = owners.get(name);
      if (owner !== undefined) {
        unsupported(`${label} dependency ${name} overlaps ${owner} and ${group}.`);
      }
      owners.set(name, group);
    }
  }
}
function dependencyRecord(
  metadata: Readonly<Record<string, unknown>>,
  key: "dependencies" | "devDependencies" | "optionalDependencies" | "peerDependencies",
  label: string
): Readonly<Record<string, string>> {
  if (!Object.hasOwn(metadata, key)) {
    return {};
  }
  const value = recordValue(metadata[key], `${label} ${key}`);
  const decoded: Record<string, string> = {};
  for (const [name, requested] of Object.entries(value)) {
    if (name.length === 0 || typeof requested !== "string" || requested.length === 0) {
      unsupported(`${label} ${key} is malformed.`);
    }
    decoded[name] = requested;
  }
  return decoded;
}
function optionalPeerNames(
  metadata: Readonly<Record<string, unknown>>,
  peerDependencies: Readonly<Record<string, string>>,
  label: string
): ReadonlySet<string> {
  if (!Object.hasOwn(metadata, "optionalPeers")) {
    return new Set();
  }
  const value = metadata.optionalPeers;
  if (!Array.isArray(value)) {
    unsupported(`${label} optionalPeers is malformed.`);
  }
  const names = new Set<string>();
  for (const name of value) {
    if (
      typeof name !== "string" ||
      name.length === 0 ||
      names.has(name) ||
      !Object.hasOwn(peerDependencies, name)
    ) {
      unsupported(`${label} optionalPeers is malformed.`);
    }
    names.add(name);
  }
  return names;
}
function requireDependencyAgreement(
  lockDependencies: readonly DependencyRequest[],
  manifestDependencies: readonly DependencyRequest[],
  message: string
): void {
  if (dependencySignature(lockDependencies) !== dependencySignature(manifestDependencies)) {
    graphMismatch(message);
  }
}
function requireBuildDependencyAgreement(
  lockDependencies: readonly BuildDependencyRequest[],
  manifestDependencies: readonly BuildDependencyRequest[],
  message: string
): void {
  const signature = (dependencies: readonly BuildDependencyRequest[]) =>
    stableJson(dependencies.map(({ name, requested }) => ({ name, requested })));
  if (signature(lockDependencies) !== signature(manifestDependencies)) {
    graphMismatch(message);
  }
}
function dependencySignature(dependencies: readonly DependencyRequest[]): string {
  return stableJson(dependencies.map(({ name, kind, requested }) => ({ name, kind, requested })));
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
  if (value.lockfileVersion !== 1 || value.configVersion !== 1) {
    unsupported("The frozen Bun lock version is unsupported.");
  }
  const packageRows = optionalRecord(value, "packages");
  const workspaceRows = optionalRecord(value, "workspaces");
  return {
    packages: packageRows,
    patchedDependencies: optionalRecord(value, "patchedDependencies"),
    workspaces: workspaceRows,
  };
}
function packageLockRow(lock: LoadedLock, key: string): PackageLockRow | undefined {
  if (!Object.hasOwn(lock.packages, key)) {
    return undefined;
  }
  return parsePackageLockRow(lock.packages[key], `Package lock row ${key}`);
}
function workspaceLockRow(lock: LoadedLock, key: string): WorkspaceLockRow | undefined {
  if (!Object.hasOwn(lock.workspaces, key)) {
    return undefined;
  }
  return parseWorkspaceLockRow(lock.workspaces[key], `Workspace lock row ${key}`);
}
function parsePackageLockRow(value: unknown, label: string): PackageLockRow {
  if (!Array.isArray(value) || typeof value[0] !== "string" || value[0].length === 0) {
    unsupported(`${label} is malformed.`);
  }
  const resolution = value[0];
  const name = packageNameFromResolution(resolution);
  if (name === undefined) {
    unsupported(`${label} has an unsupported resolution.`);
  }
  if (value.length === 1) {
    const target = resolution.slice(name.length + 1);
    if (!target.startsWith("workspace:") || target.length === "workspace:".length) {
      unsupported(`${label} has an unsupported one-field resolution.`);
    }
    return { kind: "Workspace", name, resolution };
  }
  if (value.length === 4 && value[1] === "") {
    const metadata = recordValue(value[2], `${label} dependency metadata`);
    const integrity = integrityValue(value[3], label);
    return {
      kind: "Registry",
      name,
      resolution,
      integrity,
      dependencies: dependenciesFromLockMetadata(metadata, label),
      behavior: registryBehaviorFromLockMetadata(metadata, label),
    };
  }
  if (value.length === 3) {
    const metadata = recordValue(value[1], `${label} dependency metadata`);
    const integrity = integrityValue(value[2], label);
    return {
      kind: "Artifact",
      name,
      resolution,
      integrity,
      dependencies: dependenciesFromLockMetadata(metadata, label),
      behavior: registryBehaviorFromLockMetadata(metadata, label),
    };
  }
  unsupported(`${label} has an unsupported shape.`);
}
function parseWorkspaceLockRow(value: unknown, label: string): WorkspaceLockRow {
  const row = recordValue(value, label);
  if (
    typeof row.name !== "string" ||
    row.name.length === 0 ||
    (row.version !== undefined && (typeof row.version !== "string" || row.version.length === 0))
  ) {
    unsupported(`${label} has a malformed package identity.`);
  }
  return {
    name: row.name,
    ...(row.version === undefined ? {} : { version: row.version }),
    dependencies: dependenciesFromLockMetadata(row, label),
    developmentDependencies: Object.entries(dependencyRecord(row, "devDependencies", label))
      .map(([name, requested]) => ({ name, requested }))
      .sort((left, right) => compareText(left.name, right.name)),
  };
}
function integrityValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^sha(?:256|384|512)-[A-Za-z0-9+/=]+$/u.test(value)) {
    unsupported(`${label} has malformed integrity metadata.`);
  }
  return value;
}
async function resolveInstalledManifest(
  name: string,
  parentRoot: string,
  workspaceRoot: string
): Promise<string | undefined> {
  const segments = packageNameSegments(name);
  if (segments === undefined) {
    unsupported(`Installed dependency ${name} has an unsupported package name.`);
  }
  let directory = parentRoot;
  while (isAtOrBelow(directory, workspaceRoot)) {
    if (basename(directory) !== "node_modules") {
      const candidate = join(directory, "node_modules", ...segments, "package.json");
      try {
        const stat = await lstat(candidate);
        if (!stat.isFile() || stat.isSymbolicLink()) {
          graphMismatch(`Installed dependency ${name} has a nonordinary package manifest.`);
        }
        const canonical = await realpath(candidate);
        if (!isAtOrBelow(canonical, workspaceRoot)) {
          graphMismatch(`Installed dependency ${name} escapes the install root.`);
        }
        return canonical;
      } catch (error) {
        if (!hasErrorCode(error, "ENOENT")) {
          throw error;
        }
      }
    }
    const parent = dirname(directory);
    if (parent === directory) {
      break;
    }
    directory = parent;
  }
  return undefined;
}
function packageNameSegments(name: string): readonly string[] | undefined {
  const segments = name.split("/");
  const safeSegments = segments.every(
    (segment) =>
      segment.length > 0 &&
      segment !== "." &&
      segment !== ".." &&
      !segment.includes("\\") &&
      !segment.includes("\0")
  );
  if (
    safeSegments &&
    ((segments.length === 1 && !segments[0]!.startsWith("@")) ||
      (segments.length === 2 &&
        segments[0]!.startsWith("@") &&
        segments[0]!.length > 1 &&
        segments[1]!.length > 0))
  ) {
    return segments;
  }
  return undefined;
}
async function readPackageManifest(path: string): Promise<PackageManifest> {
  const decoded = decodeStructural(PackageManifestSchema, await Bun.file(path).json());
  if (decoded.kind === "Invalid") {
    throw invalidInput("read-package-manifest", "An installed package manifest is malformed.");
  }
  return decoded.value;
}
async function readWorkspaceManifest(path: string): Promise<WorkspaceManifest> {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || (await realpath(path)) !== path) {
    graphMismatch("The consumer package manifest is not an ordinary canonical file.");
  }
  const decoded = decodeStructural(WorkspaceManifestSchema, await Bun.file(path).json());
  if (decoded.kind === "Invalid") {
    throw invalidInput("read-package-manifest", "The consumer package manifest is malformed.");
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
function hasErrorCode(error: unknown, code: string): boolean {
  return error !== null && typeof error === "object" && Reflect.get(error, "code") === code;
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
