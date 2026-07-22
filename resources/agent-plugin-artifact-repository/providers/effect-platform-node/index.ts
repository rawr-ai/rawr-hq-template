import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { NodeContext } from "@effect/platform-node";
import type {
  ArtifactCommitDecision,
  ArtifactEvidenceObservation,
  ArtifactFileMode,
  ArtifactObjectAddress,
  ArtifactPublicationControl,
  ArtifactPublicationResult,
  ArtifactReadLimits,
  ArtifactRepositoryAsyncPort,
  ArtifactRepositoryFailure,
  ArtifactRepositoryIssue,
  ArtifactRepositoryPublicationEvent,
  ArtifactRepositoryResource,
  ArtifactTreeDirectoryEntry,
  ArtifactTreeEntry,
  ArtifactTreeLocation,
  ArtifactTreeLocationObservation,
  ArtifactTreeObservation,
  ArtifactTreeSnapshot,
} from "@rawr/resource-agent-plugin-artifact-repository";
import { Effect, Equal, Option } from "effect";

const STAGING_DIRECTORY = ".staging";
const STAGING_PREFIX = "rawr-agent-plugin-artifact-";
const STAGING_OBJECT = "object";
const EVIDENCE_FILE = "evidence.json";
const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const TREE_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/u;

type ProviderRequirements = FileSystem.FileSystem | Path.Path;

export type NodeArtifactRepositoryEvent = ArtifactRepositoryPublicationEvent;

export interface EffectPlatformNodeArtifactRepositoryOptions {
  readonly platform?: NodeJS.Platform;
  readonly onEvent?: (event: NodeArtifactRepositoryEvent) => void | Promise<void>;
}

interface ResolvedAddress {
  readonly address: ArtifactObjectAddress;
  readonly root: string;
  readonly namespace: string;
  readonly destination: string;
}

interface ReadBudget {
  entries: number;
  bytes: number;
  readonly limits: ArtifactReadLimits;
}

interface TreeInspection {
  readonly directories: readonly ArtifactTreeDirectoryEntry[];
  readonly entries: readonly ArtifactTreeEntry[];
  readonly issues: readonly ArtifactRepositoryIssue[];
}

interface CapturedDirectoryIdentity {
  readonly path: string;
  readonly dev: number;
  readonly ino: number;
}

interface OwnedPrivateDirectory {
  readonly parent: CapturedDirectoryIdentity;
  readonly allocation: CapturedDirectoryIdentity;
}

interface CreatedPrivateDirectory {
  readonly parent: CapturedDirectoryIdentity;
  readonly allocationPath: string;
}

type NoReplaceResult =
  | Readonly<{ kind: "Published" }>
  | Readonly<{ kind: "Occupied" }>
  | Readonly<{ kind: "Unsupported"; reason: string }>
  | Readonly<{ kind: "Unknown"; reason: string }>;

export function makeArtifactRepositoryResource(
  options: EffectPlatformNodeArtifactRepositoryOptions = {}
): ArtifactRepositoryResource<ProviderRequirements> {
  const locateTree = Effect.fn("artifactRepository.locateTree")(function* (
    input: Readonly<{ address: ArtifactObjectAddress; limits: ArtifactReadLimits }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const resolved = yield* checked("locate-tree", () =>
      resolveAddress(paths, input.address, "locate-tree")
    );
    yield* checked("locate-tree", () => validateLimits(input.limits, "locate-tree"));
    const observed = yield* readTreeAtAddress(fs, paths, resolved, input.limits, "locate-tree");
    return treeLocationObservation(observed, resolved.destination);
  });

  const readTree = Effect.fn("artifactRepository.readTree")(function* (
    input: Readonly<{ address: ArtifactObjectAddress; limits: ArtifactReadLimits }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const resolved = yield* checked("read-tree", () =>
      resolveAddress(paths, input.address, "read-tree")
    );
    yield* checked("read-tree", () => validateLimits(input.limits, "read-tree"));
    return yield* readTreeAtAddress(fs, paths, resolved, input.limits, "read-tree");
  });

  const publishTree = Effect.fn("artifactRepository.publishTree")(function* (
    input: Readonly<{
      address: ArtifactObjectAddress;
      entries: readonly ArtifactTreeEntry[];
      limits: ArtifactReadLimits;
      control?: Readonly<{ beforeCommit?: () => Promise<ArtifactCommitDecision> }>;
    }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const resolved = yield* checked("publish-tree", () =>
      resolveAddress(paths, input.address, "publish-tree")
    );
    const entries = yield* checked("publish-tree", () =>
      normalizeEntries(input.entries, input.limits, "publish-tree")
    );
    const prior = yield* readTreeAtAddress(fs, paths, resolved, input.limits, "publish-tree");
    if (prior.kind === "Present") {
      return equalTreeSnapshot(prior.snapshot, entries)
        ? publishedResult("ReadOnlyConverged", input.address)
        : occupied(input.address, "Present");
    }
    if (prior.kind === "Mismatch") return occupied(input.address, "Mismatch");
    yield* ensureRepositoryLayout(fs, paths, resolved, "publish-tree");
    return yield* publishStagedTree(
      fs,
      paths,
      resolved,
      entries,
      input.limits,
      input.control,
      options,
      "publish-tree"
    );
  });

  const readEvidence = Effect.fn("artifactRepository.readEvidence")(function* (
    input: Readonly<{ address: ArtifactObjectAddress; maxBytes: number }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const limits = Object.freeze({ maxEntries: 1, maxBytes: input.maxBytes });
    const resolved = yield* checked("read-evidence", () =>
      resolveAddress(paths, input.address, "read-evidence")
    );
    yield* checked("read-evidence", () => validateLimits(limits, "read-evidence"));
    const observed = yield* readTreeAtAddress(fs, paths, resolved, limits, "read-evidence");
    return evidenceObservation(input.address, observed);
  });

  const publishEvidence = Effect.fn("artifactRepository.publishEvidence")(function* (
    input: Readonly<{
      address: ArtifactObjectAddress;
      bytes: Uint8Array;
      maxBytes: number;
      control?: Readonly<{ beforeCommit?: () => Promise<ArtifactCommitDecision> }>;
    }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const limits = Object.freeze({ maxEntries: 1, maxBytes: input.maxBytes });
    const resolved = yield* checked("publish-evidence", () =>
      resolveAddress(paths, input.address, "publish-evidence")
    );
    const entries = yield* checked("publish-evidence", () =>
      normalizeEntries(
        [Object.freeze({ path: EVIDENCE_FILE, mode: 0o444, bytes: new Uint8Array(input.bytes) })],
        limits,
        "publish-evidence"
      )
    );
    const prior = yield* readTreeAtAddress(fs, paths, resolved, limits, "publish-evidence");
    if (prior.kind === "Present") {
      return equalTreeSnapshot(prior.snapshot, entries)
        ? publishedResult("ReadOnlyConverged", input.address)
        : occupied(input.address, "Present");
    }
    if (prior.kind === "Mismatch") return occupied(input.address, "Mismatch");
    yield* ensureRepositoryLayout(fs, paths, resolved, "publish-evidence");
    return yield* publishStagedTree(
      fs,
      paths,
      resolved,
      entries,
      limits,
      input.control,
      options,
      "publish-evidence"
    );
  });

  return Object.freeze({ locateTree, readTree, publishTree, readEvidence, publishEvidence });
}

export const artifactRepositoryResource = makeArtifactRepositoryResource();

export type NodeArtifactRepositoryResult<A> =
  | Readonly<{ ok: true; value: A }>
  | Readonly<{ ok: false; failure: ArtifactRepositoryFailure }>;

export function runNodeArtifactRepository<A>(
  effect: Effect.Effect<A, ArtifactRepositoryFailure, ProviderRequirements>
): Promise<NodeArtifactRepositoryResult<A>> {
  return Effect.runPromise(
    effect.pipe(
      Effect.match({
        onFailure: failedNodeResult<A>,
        onSuccess: successfulNodeResult,
      }),
      Effect.provide(NodeContext.layer)
    )
  );
}

export function makeNodeArtifactRepositoryAsyncPort(
  resource: ArtifactRepositoryResource<ProviderRequirements> = artifactRepositoryResource
): ArtifactRepositoryAsyncPort {
  return Object.freeze({
    locateTree: (input: Parameters<ArtifactRepositoryResource["locateTree"]>[0]) =>
      runOrThrow(resource.locateTree(input)),
    readTree: (input: Parameters<ArtifactRepositoryResource["readTree"]>[0]) =>
      runOrThrow(resource.readTree(input)),
    publishTree: (input: Parameters<ArtifactRepositoryResource["publishTree"]>[0]) =>
      runOrThrow(resource.publishTree(input)),
    readEvidence: (input: Parameters<ArtifactRepositoryResource["readEvidence"]>[0]) =>
      runOrThrow(resource.readEvidence(input)),
    publishEvidence: (input: Parameters<ArtifactRepositoryResource["publishEvidence"]>[0]) =>
      runOrThrow(resource.publishEvidence(input)),
  });
}

function publishStagedTree(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  resolved: ResolvedAddress,
  entries: readonly ArtifactTreeEntry[],
  limits: ArtifactReadLimits,
  control: ArtifactPublicationControl | undefined,
  options: EffectPlatformNodeArtifactRepositoryOptions,
  operation: "publish-tree" | "publish-evidence"
): Effect.Effect<ArtifactPublicationResult, ArtifactRepositoryFailure, never> {
  return Effect.gen(function* () {
    const stagingParent = paths.join(resolved.root, STAGING_DIRECTORY);
    const created = yield* createPrivateDirectory(fs, stagingParent, operation);
    const admission = yield* Effect.either(admitPrivateDirectory(fs, paths, created, operation));
    if (admission._tag === "Left") {
      const cleanup = yield* Effect.either(releaseCreatedPrivateDirectory(fs, paths, created));
      return yield* classifyFailedPublication(
        fs,
        paths,
        resolved,
        limits,
        admission.left,
        cleanup._tag === "Left" ? cleanup.left : undefined,
        operation
      );
    }
    const owned = admission.right;
    const staging = paths.join(owned.allocation.path, STAGING_OBJECT);
    const attempted = yield* Effect.either(
      Effect.gen(function* () {
        yield* fs.makeDirectory(staging, { mode: 0o700 }).pipe(mapPlatform(operation, staging));
        yield* writeTree(fs, paths, staging, entries, operation);
        yield* hit(
          options,
          control,
          { kind: "AfterStagingWrite", address: resolved.address },
          operation
        );
        const staged = yield* inspectTree(fs, paths, staging, limits, operation);
        if (staged.issues.length > 0 || !equalTreeInspection(staged, entries)) {
          return rejected(resolved.address, "Private staging did not verify before publication");
        }
        const stagingIdentity = yield* captureDirectoryIdentity(fs, staging, operation);
        yield* hit(
          options,
          control,
          { kind: "AfterStagingVerification", address: resolved.address },
          operation
        );
        const decision = yield* commitDecision(resolved.address, control);
        if (decision.kind === "Reject") return rejected(resolved.address, decision.failure);
        yield* hit(
          options,
          control,
          { kind: "BeforeNoReplacePublication", address: resolved.address },
          operation
        );
        yield* revalidatePrivateDirectory(fs, paths, owned, operation);
        yield* revalidateDirectoryIdentity(fs, stagingIdentity, operation);

        const moved = yield* noReplaceMove(
          fs,
          paths,
          staging,
          resolved.destination,
          options.platform,
          operation
        );
        if (moved.kind === "Occupied") {
          const winner = yield* readTreeAtAddress(fs, paths, resolved, limits, operation);
          return winner.kind === "Present" && equalTreeSnapshot(winner.snapshot, entries)
            ? publishedResult("ReadOnlyConverged", resolved.address)
            : occupied(resolved.address, winner.kind);
        }
        if (moved.kind === "Unsupported") return rejected(resolved.address, moved.reason);
        if (moved.kind === "Unknown") {
          return yield* unsettledAfterObservation(
            fs,
            paths,
            resolved,
            limits,
            moved.reason,
            operation
          );
        }

        const postEvent = yield* Effect.either(
          hit(
            options,
            control,
            {
              kind: "AfterNoReplacePublication",
              address: resolved.address,
            },
            operation
          )
        );
        if (postEvent._tag === "Left") {
          return yield* unsettledAfterObservation(
            fs,
            paths,
            resolved,
            limits,
            postEvent.left.detail,
            operation
          );
        }
        const synced = yield* Effect.either(
          Effect.all([
            syncDirectory(fs, paths.dirname(resolved.destination), operation),
            syncDirectory(fs, stagingParent, operation),
          ])
        );
        if (synced._tag === "Left") {
          return yield* unsettledAfterObservation(
            fs,
            paths,
            resolved,
            limits,
            synced.left.detail,
            operation
          );
        }
        const final = yield* readTreeAtAddress(fs, paths, resolved, limits, operation);
        return final.kind === "Present" && equalTreeSnapshot(final.snapshot, entries)
          ? publishedResult("Published", resolved.address)
          : unsettled(resolved.address, "Published tree did not verify", final.kind);
      })
    );
    const cleanup = yield* Effect.either(releasePrivateDirectory(fs, paths, owned));
    if (attempted._tag === "Left") {
      return yield* classifyFailedPublication(
        fs,
        paths,
        resolved,
        limits,
        attempted.left,
        cleanup._tag === "Left" ? cleanup.left : undefined,
        operation
      );
    }
    return cleanup._tag === "Left"
      ? withCleanupFailure(attempted.right, cleanup.left)
      : attempted.right;
  });
}

function readTreeAtAddress(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  resolved: ResolvedAddress,
  limits: ArtifactReadLimits,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<ArtifactTreeObservation, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    if (!(yield* fs.exists(resolved.root).pipe(mapPlatform(operation, resolved.root)))) {
      return missing(resolved.address);
    }
    yield* requireCanonicalDirectory(fs, resolved.root, operation);
    if (!(yield* fs.exists(resolved.namespace).pipe(mapPlatform(operation, resolved.namespace)))) {
      return missing(resolved.address);
    }
    yield* requireCanonicalDirectory(fs, resolved.namespace, operation);
    if (
      !(yield* fs.exists(resolved.destination).pipe(mapPlatform(operation, resolved.destination)))
    ) {
      return missing(resolved.address);
    }
    const inspection = yield* inspectTree(fs, paths, resolved.destination, limits, operation);
    if (inspection.issues.length > 0) {
      return mismatch(resolved.address, inspection.issues);
    }
    return Object.freeze({
      kind: "Present",
      snapshot: Object.freeze({
        address: resolved.address,
        directories: inspection.directories,
        entries: inspection.entries,
      }) satisfies ArtifactTreeSnapshot,
    });
  });
}

function inspectTree(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  root: string,
  limits: ArtifactReadLimits,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<TreeInspection, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    const canonical = yield* fs.realPath(root).pipe(mapPlatform(operation, root));
    const rootInfo = yield* fs.stat(root).pipe(mapPlatform(operation, root));
    if (canonical !== root || rootInfo.type !== "Directory") {
      return Object.freeze({
        directories: Object.freeze([]),
        entries: Object.freeze([]),
        issues: Object.freeze([
          issue("AliasedEntry", root, "Artifact object root is not a canonical directory"),
        ]),
      });
    }
    const directories: ArtifactTreeDirectoryEntry[] = [];
    const entries: ArtifactTreeEntry[] = [];
    const issues: ArtifactRepositoryIssue[] = [];
    const budget: ReadBudget = { entries: 0, bytes: 0, limits };
    yield* walkTree(fs, paths, root, root, directories, entries, issues, budget, operation);
    yield* revalidateInspectedDirectory(fs, root, rootInfo, undefined, issues, operation);
    directories.sort((left, right) => compareDirectoryPath(left.path, right.path));
    entries.sort((left, right) => compareText(left.path, right.path));
    return Object.freeze({
      directories: Object.freeze(directories),
      entries: Object.freeze(entries),
      issues: Object.freeze(issues),
    });
  });
}

function walkTree(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  root: string,
  directory: string,
  directories: ArtifactTreeDirectoryEntry[],
  entries: ArtifactTreeEntry[],
  issues: ArtifactRepositoryIssue[],
  budget: ReadBudget,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    const names = (yield* fs.readDirectory(directory).pipe(mapPlatform(operation, directory))).sort(
      compareText
    );
    for (const name of names) {
      const child = paths.join(directory, name);
      const relative = toRepositoryPath(paths.relative(root, child));
      budget.entries += 1;
      if (budget.entries > budget.limits.maxEntries) {
        issues.push(issue("LimitExceeded", relative, "Artifact tree exceeds maxEntries"));
        return;
      }
      const canonical = yield* Effect.either(
        fs.realPath(child).pipe(mapPlatform(operation, child))
      );
      if (canonical._tag === "Left" || canonical.right !== child) {
        issues.push(issue("AliasedEntry", relative, "Artifact entry is aliased or unreadable"));
        continue;
      }
      const before = yield* fs.stat(child).pipe(mapPlatform(operation, child));
      if (before.type === "Directory") {
        directories.push(Object.freeze({ path: relative, mode: before.mode & 0o777 }));
        yield* walkTree(fs, paths, root, child, directories, entries, issues, budget, operation);
        yield* revalidateInspectedDirectory(fs, child, before, relative, issues, operation);
        continue;
      }
      if (before.type !== "File") {
        issues.push(
          issue("InvalidEntryType", relative, `Unsupported artifact entry type: ${before.type}`)
        );
        continue;
      }
      const links = Option.getOrElse(before.nlink, () => 1);
      if (links !== 1) {
        issues.push(issue("SharedInode", relative, "Artifact file must have exactly one link"));
        continue;
      }
      const mode = before.mode & 0o777;
      if (!isArtifactFileMode(mode)) {
        issues.push(
          issue("ModeMismatch", relative, `Unsupported artifact file mode: ${mode.toString(8)}`)
        );
        continue;
      }
      const size = Number(before.size);
      budget.bytes += size;
      if (!Number.isSafeInteger(size) || size < 0 || budget.bytes > budget.limits.maxBytes) {
        issues.push(issue("LimitExceeded", relative, "Artifact tree exceeds maxBytes"));
        return;
      }
      const bytes = yield* fs.readFile(child).pipe(mapPlatform(operation, child));
      const after = yield* fs.stat(child).pipe(mapPlatform(operation, child));
      if (
        bytes.byteLength !== size ||
        before.dev !== after.dev ||
        !Equal.equals(before.ino, after.ino) ||
        before.size !== after.size
      ) {
        issues.push(issue("IdentityChanged", relative, "Artifact file changed while it was read"));
        continue;
      }
      entries.push(Object.freeze({ path: relative, mode, bytes: new Uint8Array(bytes) }));
    }
  });
}

function revalidateInspectedDirectory(
  fs: FileSystem.FileSystem,
  directory: string,
  before: FileSystem.File.Info,
  relative: string | undefined,
  issues: ArtifactRepositoryIssue[],
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    const canonical = yield* fs.realPath(directory).pipe(mapPlatform(operation, directory));
    const after = yield* fs.stat(directory).pipe(mapPlatform(operation, directory));
    if (
      canonical !== directory ||
      after.type !== "Directory" ||
      before.dev !== after.dev ||
      !Equal.equals(before.ino, after.ino)
    ) {
      issues.push(
        issue("IdentityChanged", relative, "Artifact directory changed while it was read")
      );
    }
  });
}

function writeTree(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  root: string,
  entries: readonly ArtifactTreeEntry[],
  operation: "publish-tree" | "publish-evidence"
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    const directories = directoryPaths(entries);
    for (const relative of directories) {
      const directory = paths.join(root, ...relative.split("/"));
      yield* fs.makeDirectory(directory, { mode: 0o700 }).pipe(mapPlatform(operation, directory));
    }
    for (const entry of entries) {
      const destination = paths.join(root, ...entry.path.split("/"));
      yield* Effect.scoped(
        Effect.gen(function* () {
          const file = yield* fs
            .open(destination, { flag: "wx", mode: entry.mode })
            .pipe(mapPlatform(operation, destination));
          if (entry.bytes.byteLength > 0) {
            yield* file
              .writeAll(new Uint8Array(entry.bytes))
              .pipe(mapPlatform(operation, destination));
          }
          yield* file.sync.pipe(mapPlatform(operation, destination));
        })
      );
      yield* fs.chmod(destination, entry.mode).pipe(mapPlatform(operation, destination));
    }
    for (const relative of [...directories].reverse()) {
      yield* syncDirectory(fs, paths.join(root, ...relative.split("/")), operation);
    }
    yield* syncDirectory(fs, root, operation);
  });
}

function ensureRepositoryLayout(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  resolved: ResolvedAddress,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    yield* ensureCanonicalDirectoryChain(fs, paths, resolved.root, operation);
    let parent = resolved.root;
    for (const segment of resolved.address.namespace) {
      const child = paths.join(parent, segment);
      yield* ensureDirectDirectory(fs, paths, parent, child, operation);
      parent = child;
    }
    yield* ensureDirectDirectory(
      fs,
      paths,
      resolved.root,
      paths.join(resolved.root, STAGING_DIRECTORY),
      operation
    );
  });
}

function ensureCanonicalDirectoryChain(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  candidate: string,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    if (yield* fs.exists(candidate).pipe(mapPlatform(operation, candidate))) {
      yield* requireCanonicalDirectory(fs, candidate, operation);
      return;
    }
    const parent = paths.dirname(candidate);
    if (parent === candidate)
      return yield* fail(
        operation,
        "InvalidInput",
        candidate,
        "Repository root cannot be a filesystem root"
      );
    yield* ensureCanonicalDirectoryChain(fs, paths, parent, operation);
    const created = yield* Effect.either(
      fs.makeDirectory(candidate, { mode: 0o700 }).pipe(mapPlatform(operation, candidate))
    );
    if (
      created._tag === "Left" &&
      !(yield* fs.exists(candidate).pipe(mapPlatform(operation, candidate)))
    ) {
      return yield* Effect.fail(created.left);
    }
    yield* requireDirectCanonicalDirectory(fs, paths, parent, candidate, operation);
  });
}

function ensureDirectDirectory(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  parent: string,
  child: string,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    if (!(yield* fs.exists(child).pipe(mapPlatform(operation, child)))) {
      const created = yield* Effect.either(
        fs.makeDirectory(child, { mode: 0o700 }).pipe(mapPlatform(operation, child))
      );
      if (
        created._tag === "Left" &&
        !(yield* fs.exists(child).pipe(mapPlatform(operation, child)))
      ) {
        return yield* Effect.fail(created.left);
      }
    }
    yield* requireDirectCanonicalDirectory(fs, paths, parent, child, operation);
  });
}

function requireCanonicalDirectory(
  fs: FileSystem.FileSystem,
  candidate: string,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    const canonical = yield* fs.realPath(candidate).pipe(mapPlatform(operation, candidate));
    const info = yield* fs.stat(candidate).pipe(mapPlatform(operation, candidate));
    if (canonical !== candidate || info.type !== "Directory") {
      return yield* fail(
        operation,
        "Aliased",
        candidate,
        "Directory must be canonical and non-aliased"
      );
    }
  });
}

function requireDirectCanonicalDirectory(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  parent: string,
  child: string,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    yield* requireCanonicalDirectory(fs, parent, operation);
    yield* requireCanonicalDirectory(fs, child, operation);
    if (paths.dirname(child) !== parent) {
      return yield* fail(
        operation,
        "Aliased",
        child,
        "Directory must be a direct repository child"
      );
    }
  });
}

function createPrivateDirectory(
  fs: FileSystem.FileSystem,
  parent: string,
  operation: "publish-tree" | "publish-evidence"
): Effect.Effect<CreatedPrivateDirectory, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    const parentIdentity = yield* captureDirectoryIdentity(fs, parent, operation);
    const allocationPath = yield* fs
      .makeTempDirectory({
        directory: parentIdentity.path,
        prefix: STAGING_PREFIX,
      })
      .pipe(mapPlatform(operation, parentIdentity.path));
    return Object.freeze({ parent: parentIdentity, allocationPath });
  });
}

function admitPrivateDirectory(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  created: CreatedPrivateDirectory,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<OwnedPrivateDirectory, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    if (
      paths.dirname(created.allocationPath) !== created.parent.path ||
      !paths.basename(created.allocationPath).startsWith(STAGING_PREFIX)
    ) {
      return yield* fail(
        operation,
        "InvalidInput",
        created.allocationPath,
        "Private staging allocation escaped its owner"
      );
    }
    const allocation = yield* captureDirectoryIdentity(fs, created.allocationPath, operation);
    if (allocation.dev !== created.parent.dev) {
      return yield* fail(
        operation,
        "IdentityChanged",
        allocation.path,
        "Private staging crossed its owner device"
      );
    }
    const owned = Object.freeze({ parent: created.parent, allocation });
    yield* revalidatePrivateDirectory(fs, paths, owned, operation);
    return owned;
  });
}

function releaseCreatedPrivateDirectory(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  created: CreatedPrivateDirectory
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return admitPrivateDirectory(fs, paths, created, "cleanup").pipe(
    Effect.flatMap((owned) => releasePrivateDirectory(fs, paths, owned))
  );
}

function captureDirectoryIdentity(
  fs: FileSystem.FileSystem,
  candidate: string,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<CapturedDirectoryIdentity, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    const canonical = yield* fs.realPath(candidate).pipe(mapPlatform(operation, candidate));
    const info = yield* fs.stat(candidate).pipe(mapPlatform(operation, candidate));
    const ino = Option.getOrUndefined(info.ino);
    if (canonical !== candidate || info.type !== "Directory" || ino === undefined) {
      return yield* fail(
        operation,
        "IdentityChanged",
        candidate,
        "Owned directory must be canonical with a stable directory identity"
      );
    }
    return Object.freeze({ path: candidate, dev: info.dev, ino });
  });
}

function revalidateDirectoryIdentity(
  fs: FileSystem.FileSystem,
  captured: CapturedDirectoryIdentity,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    const current = yield* captureDirectoryIdentity(fs, captured.path, operation);
    if (current.dev !== captured.dev || current.ino !== captured.ino) {
      return yield* fail(
        operation,
        "IdentityChanged",
        captured.path,
        "Owned directory identity changed"
      );
    }
  });
}

function revalidatePrivateDirectory(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  owned: OwnedPrivateDirectory,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    if (
      paths.dirname(owned.allocation.path) !== owned.parent.path ||
      !paths.basename(owned.allocation.path).startsWith(STAGING_PREFIX)
    ) {
      return yield* fail(
        operation,
        "InvalidInput",
        owned.allocation.path,
        "Private staging escaped its owner"
      );
    }
    yield* revalidateDirectoryIdentity(fs, owned.parent, operation);
    yield* revalidateDirectoryIdentity(fs, owned.allocation, operation);
    if (owned.allocation.dev !== owned.parent.dev) {
      return yield* fail(
        operation,
        "IdentityChanged",
        owned.allocation.path,
        "Private staging crossed its owner device"
      );
    }
  });
}

function releasePrivateDirectory(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  owned: OwnedPrivateDirectory
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.gen(function* () {
    yield* revalidatePrivateDirectory(fs, paths, owned, "cleanup");
    yield* fs
      .remove(owned.allocation.path, { recursive: true, force: false })
      .pipe(mapPlatform("cleanup", owned.allocation.path));
    if (
      yield* fs.exists(owned.allocation.path).pipe(mapPlatform("cleanup", owned.allocation.path))
    ) {
      return yield* fail(
        "cleanup",
        "FilesystemFailed",
        owned.allocation.path,
        "Private staging cleanup did not settle"
      );
    }
    yield* syncDirectory(fs, owned.parent.path, "cleanup");
  });
}

function noReplaceMove(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  source: string,
  destination: string,
  platform: NodeJS.Platform = process.platform,
  operation: "publish-tree" | "publish-evidence"
): Effect.Effect<NoReplaceResult, ArtifactRepositoryFailure> {
  return Effect.scoped(
    Effect.gen(function* () {
      if (platform !== "darwin" && platform !== "linux") {
        return Object.freeze({
          kind: "Unsupported",
          reason: `No no-replace adapter for ${platform}`,
        });
      }
      const sourceParent = paths.dirname(source);
      const destinationParent = paths.dirname(destination);
      yield* requireCanonicalDirectory(fs, source, operation);
      yield* requireCanonicalDirectory(fs, sourceParent, operation);
      yield* requireCanonicalDirectory(fs, destinationParent, operation);
      const sourceInfo = yield* fs.stat(source).pipe(mapPlatform(operation, source));
      const sourceParentFile = yield* fs
        .open(sourceParent, { flag: "r" })
        .pipe(mapPlatform(operation, sourceParent));
      const destinationParentFile = yield* fs
        .open(destinationParent, { flag: "r" })
        .pipe(mapPlatform(operation, destinationParent));
      const current = yield* fs.stat(source).pipe(mapPlatform(operation, source));
      if (
        sourceInfo.dev !== current.dev ||
        !Equal.equals(sourceInfo.ino, current.ino) ||
        current.type !== "Directory"
      ) {
        return Object.freeze({
          kind: "Unknown",
          reason: "Private staging changed before publication",
        });
      }
      return yield* Effect.tryPromise({
        try: () =>
          nativeNoReplaceRename(
            platform,
            Number(sourceParentFile.fd),
            paths.basename(source),
            Number(destinationParentFile.fd),
            paths.basename(destination)
          ),
        catch: (cause) =>
          failure(operation, "NoReplaceUnsupported", destination, errorMessage(cause)),
      });
    })
  );
}

async function nativeNoReplaceRename(
  platform: "darwin" | "linux",
  sourceParentFd: number,
  sourceName: string,
  destinationParentFd: number,
  destinationName: string
): Promise<NoReplaceResult> {
  if (!("Bun" in globalThis)) {
    return Object.freeze({ kind: "Unsupported", reason: "Bun FFI runtime is unavailable" });
  }
  return platform === "darwin"
    ? darwinNoReplaceRename(sourceParentFd, sourceName, destinationParentFd, destinationName)
    : linuxNoReplaceRename(sourceParentFd, sourceName, destinationParentFd, destinationName);
}

async function darwinNoReplaceRename(
  sourceParentFd: number,
  sourceName: string,
  destinationParentFd: number,
  destinationName: string
): Promise<NoReplaceResult> {
  const { dlopen, read } = await import("bun:ffi");
  const library = dlopen("/usr/lib/libSystem.B.dylib", {
    renameatx_np: { args: ["i32", "ptr", "i32", "ptr", "u32"], returns: "i32" },
    __error: { args: [], returns: "ptr" },
  });
  try {
    const code = library.symbols.renameatx_np(
      sourceParentFd,
      nulTerminated(sourceName),
      destinationParentFd,
      nulTerminated(destinationName),
      0x00000004 | 0x00000010
    );
    const pointer = library.symbols.__error();
    if (code === null)
      return Object.freeze({ kind: "Unknown", reason: "Native rename returned null" });
    const errno = code === -1 && pointer !== null ? read.i32(pointer) : 0;
    return classifyNativeRename(code, errno, new Set([18, 22, 45, 78]));
  } finally {
    library.close();
  }
}

async function linuxNoReplaceRename(
  sourceParentFd: number,
  sourceName: string,
  destinationParentFd: number,
  destinationName: string
): Promise<NoReplaceResult> {
  const { dlopen, read } = await import("bun:ffi");
  const library = dlopen("libc.so.6", {
    renameat2: { args: ["i32", "ptr", "i32", "ptr", "u32"], returns: "i32" },
    __errno_location: { args: [], returns: "ptr" },
  });
  try {
    const code = library.symbols.renameat2(
      sourceParentFd,
      nulTerminated(sourceName),
      destinationParentFd,
      nulTerminated(destinationName),
      0x00000001
    );
    const pointer = library.symbols.__errno_location();
    if (code === null)
      return Object.freeze({ kind: "Unknown", reason: "Native rename returned null" });
    const errno = code === -1 && pointer !== null ? read.i32(pointer) : 0;
    return classifyNativeRename(code, errno, new Set([18, 22, 38, 95]));
  } finally {
    library.close();
  }
}

function classifyNativeRename(
  code: number,
  errno: number,
  unsupported: ReadonlySet<number>
): NoReplaceResult {
  if (code === 0) return Object.freeze({ kind: "Published" });
  if (code !== -1)
    return Object.freeze({ kind: "Unknown", reason: `Unexpected native status ${code}` });
  if (errno === 17) return Object.freeze({ kind: "Occupied" });
  if (unsupported.has(errno)) {
    return Object.freeze({
      kind: "Unsupported",
      reason: `No-replace syscall is unsupported (errno ${errno})`,
    });
  }
  return Object.freeze({
    kind: "Unknown",
    reason: `No-replace outcome is unknown (errno ${errno})`,
  });
}

function resolveAddress(
  paths: Path.Path,
  address: ArtifactObjectAddress,
  operation: ArtifactRepositoryFailure["operation"]
): ResolvedAddress {
  const root = paths.resolve(address.repositoryRoot);
  if (root !== address.repositoryRoot || paths.dirname(root) === root) {
    throw failure(
      operation,
      "InvalidInput",
      address.repositoryRoot,
      "Repository root must be absolute, normalized, and non-root"
    );
  }
  if (address.namespace.length === 0) {
    throw failure(operation, "InvalidInput", undefined, "Artifact namespace cannot be empty");
  }
  for (const segment of [...address.namespace, address.objectId])
    validateSegment(segment, operation);
  if (address.namespace.includes(STAGING_DIRECTORY)) {
    throw failure(
      operation,
      "InvalidInput",
      undefined,
      "Artifact namespace cannot select private staging"
    );
  }
  const namespace = paths.join(root, ...address.namespace);
  const destination = paths.join(namespace, address.objectId);
  if (paths.dirname(destination) !== namespace) {
    throw failure(
      operation,
      "InvalidInput",
      destination,
      "Artifact address is not a direct namespace child"
    );
  }
  return Object.freeze({ address, root, namespace, destination });
}

function validateSegment(segment: string, operation: ArtifactRepositoryFailure["operation"]): void {
  if (!SEGMENT_PATTERN.test(segment) || segment === "." || segment === "..") {
    throw failure(
      operation,
      "InvalidInput",
      segment,
      "Artifact address segments must be canonical basenames"
    );
  }
}

function validateLimits(
  limits: ArtifactReadLimits,
  operation: ArtifactRepositoryFailure["operation"]
): void {
  if (!Number.isSafeInteger(limits.maxEntries) || limits.maxEntries < 1) {
    throw failure(
      operation,
      "InvalidInput",
      undefined,
      "maxEntries must be a positive safe integer"
    );
  }
  if (!Number.isSafeInteger(limits.maxBytes) || limits.maxBytes < 1) {
    throw failure(operation, "InvalidInput", undefined, "maxBytes must be a positive safe integer");
  }
}

function normalizeEntries(
  input: readonly ArtifactTreeEntry[],
  limits: ArtifactReadLimits,
  operation: "publish-tree" | "publish-evidence"
): readonly ArtifactTreeEntry[] {
  validateLimits(limits, operation);
  if (input.length === 0 || input.length > limits.maxEntries) {
    throw failure(
      operation,
      "LimitExceeded",
      undefined,
      "Artifact tree entry count is outside its bound"
    );
  }
  const seen = new Set<string>();
  let bytes = 0;
  const entries = input.map((entry) => {
    validateRelativeFilePath(entry.path, operation);
    if (seen.has(entry.path))
      throw failure(operation, "InvalidInput", entry.path, "Artifact path is duplicated");
    if ([...seen].some((candidate) => pathsOverlap(candidate, entry.path))) {
      throw failure(operation, "InvalidInput", entry.path, "Artifact file paths overlap");
    }
    if (!isArtifactFileMode(entry.mode)) {
      throw failure(operation, "UnsupportedEntry", entry.path, "Artifact file mode is unsupported");
    }
    seen.add(entry.path);
    bytes += entry.bytes.byteLength;
    if (bytes > limits.maxBytes) {
      throw failure(operation, "LimitExceeded", entry.path, "Artifact tree bytes exceed maxBytes");
    }
    return Object.freeze({
      path: entry.path,
      mode: entry.mode,
      bytes: new Uint8Array(entry.bytes),
    });
  });
  return Object.freeze(entries.sort((left, right) => compareText(left.path, right.path)));
}

function validateRelativeFilePath(
  candidate: string,
  operation: "publish-tree" | "publish-evidence"
): void {
  const parts = candidate.split("/");
  if (
    candidate.length === 0 ||
    candidate.includes("\\") ||
    candidate.includes("\0") ||
    parts.some((part) => !TREE_PATH_SEGMENT_PATTERN.test(part) || part === "." || part === "..")
  ) {
    throw failure(
      operation,
      "InvalidInput",
      candidate,
      "Artifact path must be canonical and repository-relative"
    );
  }
}

function directoryPaths(entries: readonly ArtifactTreeEntry[]): readonly string[] {
  const directories = new Set<string>();
  for (const entry of entries) {
    const parts = entry.path.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join("/"));
    }
  }
  return [...directories].sort(compareDirectoryPath);
}

function compareDirectoryPath(left: string, right: string): number {
  const depth = left.split("/").length - right.split("/").length;
  return depth !== 0 ? depth : compareText(left, right);
}

function evidenceObservation(
  address: ArtifactObjectAddress,
  observation: ArtifactTreeObservation
): ArtifactEvidenceObservation {
  if (observation.kind === "Missing") return Object.freeze({ kind: "Missing", address });
  if (observation.kind === "Mismatch") return observation;
  const entries = observation.snapshot.entries;
  if (
    observation.snapshot.directories.length !== 0 ||
    entries.length !== 1 ||
    entries[0]?.path !== EVIDENCE_FILE ||
    entries[0].mode !== 0o444
  ) {
    return mismatch(address, [
      issue(
        "UnexpectedEntry",
        undefined,
        "Mechanical evidence object must contain only immutable evidence.json"
      ),
    ]);
  }
  return Object.freeze({ kind: "Present", address, bytes: new Uint8Array(entries[0].bytes) });
}

function commitDecision(
  address: ArtifactObjectAddress,
  control: Readonly<{ beforeCommit?: () => Promise<ArtifactCommitDecision> }> | undefined
): Effect.Effect<ArtifactCommitDecision> {
  if (control?.beforeCommit === undefined)
    return Effect.succeed(Object.freeze({ kind: "Proceed" }));
  return Effect.tryPromise({
    try: control.beforeCommit,
    catch: (cause) => Object.freeze({ kind: "Reject", failure: errorMessage(cause) }),
  }).pipe(
    Effect.catchAll((decision) => Effect.succeed(decision)),
    Effect.map((decision) => {
      if (
        decision.kind === "Proceed" ||
        (decision.kind === "Reject" && decision.failure.length > 0)
      )
        return decision;
      return Object.freeze({
        kind: "Reject",
        failure: `Invalid publication decision for ${address.objectId}`,
      });
    })
  );
}

function hit(
  options: EffectPlatformNodeArtifactRepositoryOptions,
  control: ArtifactPublicationControl | undefined,
  event: NodeArtifactRepositoryEvent,
  operation: "publish-tree" | "publish-evidence"
): Effect.Effect<void, ArtifactRepositoryFailure> {
  if (control?.onEvent === undefined && options.onEvent === undefined) return Effect.void;
  return Effect.tryPromise({
    try: async () => {
      await control?.onEvent?.(event);
      await options.onEvent?.(event);
    },
    catch: (cause) => failure(operation, "FilesystemFailed", undefined, errorMessage(cause)),
  });
}

function unsettledAfterObservation(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  resolved: ResolvedAddress,
  limits: ArtifactReadLimits,
  detail: string,
  operation: "publish-tree" | "publish-evidence"
): Effect.Effect<ArtifactPublicationResult, ArtifactRepositoryFailure> {
  return readTreeAtAddress(fs, paths, resolved, limits, operation).pipe(
    Effect.map((observation) => unsettled(resolved.address, detail, observation.kind)),
    Effect.catchAll(() => Effect.succeed(unsettled(resolved.address, detail, "Unknown")))
  );
}

function classifyFailedPublication(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  resolved: ResolvedAddress,
  limits: ArtifactReadLimits,
  primaryFailure: ArtifactRepositoryFailure,
  cleanupFailure: ArtifactRepositoryFailure | undefined,
  operation: "publish-tree" | "publish-evidence"
): Effect.Effect<ArtifactPublicationResult, never> {
  return Effect.gen(function* () {
    const observation = yield* Effect.either(
      readTreeAtAddress(fs, paths, resolved, limits, operation)
    );
    const cleanup = cleanupFailure === undefined ? undefined : describeFailure(cleanupFailure);
    if (observation._tag === "Left") {
      return unsettled(resolved.address, primaryFailure.detail, "Unknown", cleanup);
    }
    return observation.right.kind === "Missing"
      ? rejected(resolved.address, primaryFailure.detail, cleanup)
      : unsettled(resolved.address, primaryFailure.detail, observation.right.kind, cleanup);
  });
}

function withCleanupFailure(
  result: ArtifactPublicationResult,
  cleanupFailure: ArtifactRepositoryFailure
): ArtifactPublicationResult {
  const cleanup = describeFailure(cleanupFailure);
  switch (result.kind) {
    case "Published":
    case "ReadOnlyConverged":
      return unsettled(
        result.address,
        "Artifact publication committed but private staging cleanup failed",
        "Present",
        cleanup
      );
    case "Occupied":
      return occupied(result.address, result.observation, cleanup);
    case "Rejected":
      return rejected(result.address, result.failure, cleanup);
    case "Unsettled":
      return unsettled(result.address, result.failure, result.observation, cleanup);
  }
}

function syncDirectory(
  fs: FileSystem.FileSystem,
  directory: string,
  operation: ArtifactRepositoryFailure["operation"]
): Effect.Effect<void, ArtifactRepositoryFailure> {
  return Effect.scoped(
    fs.open(directory, { flag: "r" }).pipe(
      mapPlatform(operation, directory),
      Effect.flatMap((handle) => handle.sync.pipe(mapPlatform(operation, directory)))
    )
  );
}

function equalTrees(
  left: readonly ArtifactTreeEntry[],
  right: readonly ArtifactTreeEntry[]
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => {
      const candidate = right[index];
      return (
        candidate !== undefined &&
        entry.path === candidate.path &&
        entry.mode === candidate.mode &&
        equalBytes(entry.bytes, candidate.bytes)
      );
    })
  );
}

function equalTreeSnapshot(
  snapshot: ArtifactTreeSnapshot,
  entries: readonly ArtifactTreeEntry[]
): boolean {
  return (
    equalDirectoryPaths(snapshot.directories, directoryPaths(entries)) &&
    equalTrees(snapshot.entries, entries)
  );
}

function equalTreeInspection(
  inspection: TreeInspection,
  entries: readonly ArtifactTreeEntry[]
): boolean {
  return (
    equalDirectoryPaths(inspection.directories, directoryPaths(entries)) &&
    equalTrees(inspection.entries, entries)
  );
}

function equalDirectoryPaths(
  observed: readonly ArtifactTreeDirectoryEntry[],
  expected: readonly string[]
): boolean {
  return (
    observed.length === expected.length &&
    observed.every((directory, index) => directory.path === expected[index])
  );
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

function isArtifactFileMode(mode: number): mode is ArtifactFileMode {
  return mode === 0o444 || mode === 0o644 || mode === 0o755;
}

function toRepositoryPath(path: string): string {
  return path.split("\\").join("/");
}

function pathsOverlap(left: string, right: string): boolean {
  return left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function nulTerminated(value: string): Uint8Array {
  return new TextEncoder().encode(`${value}\0`);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function missing(address: ArtifactObjectAddress): ArtifactTreeObservation {
  return Object.freeze({ kind: "Missing", address });
}

function treeLocationObservation(
  observed: ArtifactTreeObservation,
  canonicalLocation: string
): ArtifactTreeLocationObservation {
  if (observed.kind !== "Present") return observed;
  return Object.freeze({
    kind: "Present",
    address: observed.snapshot.address,
    location: canonicalLocation as ArtifactTreeLocation,
  });
}

function mismatch(
  address: ArtifactObjectAddress,
  values: readonly ArtifactRepositoryIssue[]
): Extract<ArtifactTreeObservation, { kind: "Mismatch" }> {
  const first =
    values[0] ?? issue("ReadFailure", undefined, "Artifact observation failed without an issue");
  const rest = values.slice(1);
  const issues: readonly [ArtifactRepositoryIssue, ...ArtifactRepositoryIssue[]] = [first, ...rest];
  return Object.freeze({ kind: "Mismatch", address, issues: Object.freeze(issues) });
}

function issue(
  code: ArtifactRepositoryIssue["code"],
  path: string | undefined,
  detail: string
): ArtifactRepositoryIssue {
  return Object.freeze({ code, ...(path === undefined ? {} : { path }), detail });
}

function publishedResult(
  kind: "Published" | "ReadOnlyConverged",
  address: ArtifactObjectAddress
): ArtifactPublicationResult {
  return Object.freeze({ kind, address });
}

function occupied(
  address: ArtifactObjectAddress,
  observation: "Present" | "Missing" | "Mismatch",
  cleanupFailure?: string
): ArtifactPublicationResult {
  return Object.freeze({
    kind: "Occupied",
    address,
    observation,
    ...(cleanupFailure === undefined ? {} : { cleanupFailure }),
  });
}

function rejected(
  address: ArtifactObjectAddress,
  detail: string,
  cleanupFailure?: string
): ArtifactPublicationResult {
  return Object.freeze({
    kind: "Rejected",
    address,
    failure: detail,
    ...(cleanupFailure === undefined ? {} : { cleanupFailure }),
  });
}

function unsettled(
  address: ArtifactObjectAddress,
  detail: string,
  observation: "Present" | "Missing" | "Mismatch" | "Unknown",
  cleanupFailure?: string
): ArtifactPublicationResult {
  return Object.freeze({
    kind: "Unsettled",
    address,
    failure: detail,
    observation,
    ...(cleanupFailure === undefined ? {} : { cleanupFailure }),
  });
}

function describeFailure(value: ArtifactRepositoryFailure): string {
  const location = value.path === undefined ? "" : ` at ${value.path}`;
  return `${value.reason}${location}: ${value.detail}`;
}

function mapPlatform(operation: ArtifactRepositoryFailure["operation"], candidate: string) {
  return <A, R>(effect: Effect.Effect<A, PlatformError, R>) =>
    effect.pipe(
      Effect.mapError((cause) => failure(operation, "FilesystemFailed", candidate, cause.message))
    );
}

function checked<A>(
  operation: ArtifactRepositoryFailure["operation"],
  evaluate: () => A
): Effect.Effect<A, ArtifactRepositoryFailure> {
  return Effect.try({
    try: evaluate,
    catch: (cause) =>
      isArtifactRepositoryFailure(cause)
        ? cause
        : failure(operation, "InvalidInput", undefined, errorMessage(cause)),
  });
}

function fail(
  operation: ArtifactRepositoryFailure["operation"],
  reason: ArtifactRepositoryFailure["reason"],
  path: string | undefined,
  detail: string
): Effect.Effect<never, ArtifactRepositoryFailure> {
  return Effect.fail(failure(operation, reason, path, detail));
}

function failure(
  operation: ArtifactRepositoryFailure["operation"],
  reason: ArtifactRepositoryFailure["reason"],
  path: string | undefined,
  detail: string
): ArtifactRepositoryFailure {
  return Object.freeze({
    _tag: "ArtifactRepositoryFailure",
    operation,
    reason,
    ...(path === undefined ? {} : { path }),
    detail,
  });
}

function isArtifactRepositoryFailure(input: unknown): input is ArtifactRepositoryFailure {
  return (
    typeof input === "object" &&
    input !== null &&
    "_tag" in input &&
    input._tag === "ArtifactRepositoryFailure"
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runOrThrow<A>(
  effect: Effect.Effect<A, ArtifactRepositoryFailure, ProviderRequirements>
): Promise<A> {
  const result = await runNodeArtifactRepository(effect);
  if (result.ok) return result.value;
  throw new Error(result.failure.detail);
}

function successfulNodeResult<A>(value: A): NodeArtifactRepositoryResult<A> {
  return Object.freeze({ ok: true, value });
}

function failedNodeResult<A>(failure: ArtifactRepositoryFailure): NodeArtifactRepositoryResult<A> {
  return Object.freeze({ ok: false, failure });
}
