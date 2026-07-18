import { Buffer } from "node:buffer";

import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { NodeContext } from "@effect/platform-node";
import type {
  AgentPluginPackageOutputAsyncPort,
  AgentPluginPackageOutputResource,
  CoworkV1ArchiveEncodingRequest,
  PackageOutputFailure,
  PackageOutputPublicationEvent,
  PackageOutputPublicationPoint,
  PackageOutputPublicationRequest,
  PackageOutputPublicationResult,
} from "@rawr/resource-agent-plugin-package-output";
import { Effect, Option, Random } from "effect";
import yazl from "yazl";

const OUTPUT_MODE = 0o644;
const PRIVATE_TEMPORARY_PREFIX = ".rawr-agent-plugin-package-output-";

type ProviderRequirements = FileSystem.FileSystem | Path.Path;

export type PackageOutputProviderFailpoint = PackageOutputPublicationPoint;

export interface PackageOutputProviderFailpointContext {
  readonly outputPath: string;
  readonly temporaryPath?: string;
}

export interface PackageOutputProviderFailpoints {
  readonly hit: (
    point: PackageOutputProviderFailpoint,
    context: PackageOutputProviderFailpointContext,
  ) => Promise<void>;
}

export interface CoworkV1EffectPlatformNodeOptions {
  readonly failpoints?: PackageOutputProviderFailpoints;
}

interface CapturedDirectory {
  readonly path: string;
  readonly dev: number;
  readonly ino: number;
}

interface CapturedFile {
  readonly path: string;
  readonly dev: number;
  readonly ino: number;
  readonly mode: number;
  readonly size: number;
  readonly mtime: number;
  readonly bytes: Uint8Array;
}

interface OwnedTemporaryFile {
  readonly parent: CapturedDirectory;
  readonly path: string;
  readonly dev: number;
  readonly ino: number;
}

interface CreatedTemporaryFile {
  readonly parent: CapturedDirectory;
  readonly path: string;
}

type CapturedOutput =
  | Readonly<{ kind: "Absent" }>
  | Readonly<{ kind: "Present"; file: CapturedFile }>;

export function makeAgentPluginPackageOutputResource(
  options: CoworkV1EffectPlatformNodeOptions = {},
): AgentPluginPackageOutputResource<ProviderRequirements> {
  const publicationSemaphore = Effect.runSync(Effect.makeSemaphore(1));
  return {
    encodeCoworkV1: Effect.fn("agentPluginPackageOutput.encodeCoworkV1")(encodeCoworkV1),
    publish: (input) => publicationSemaphore.withPermits(1)(publishOutput(input, options)),
  };
}

export type NodePackageOutputResult<A> =
  | Readonly<{ ok: true; value: A }>
  | Readonly<{ ok: false; failure: PackageOutputFailure }>;

export function runNodePackageOutput<A>(
  operation: Effect.Effect<A, PackageOutputFailure, ProviderRequirements>,
): Promise<NodePackageOutputResult<A>> {
  return Effect.runPromise(
    operation.pipe(
      Effect.match({
        onFailure: (failure): NodePackageOutputResult<A> => Object.freeze({ ok: false, failure }),
        onSuccess: (value): NodePackageOutputResult<A> => Object.freeze({ ok: true, value }),
      }),
      Effect.provide(NodeContext.layer),
    ),
  );
}

export function makeNodePackageOutputAsyncPort(
  options: CoworkV1EffectPlatformNodeOptions = {},
): AgentPluginPackageOutputAsyncPort {
  const resource = makeAgentPluginPackageOutputResource(options);
  return {
    encodeCoworkV1: (input) => runNodePackageOutput(resource.encodeCoworkV1(input)).then(unwrapNodeResult),
    publish: (input) => runNodePackageOutput(resource.publish(input)).then(unwrapNodeResult),
  };
}

function encodeCoworkV1(
  request: CoworkV1ArchiveEncodingRequest,
): Effect.Effect<Uint8Array, PackageOutputFailure> {
  return Effect.tryPromise({
    try: () => encodeArchive(request),
    catch: (cause) => failure(
      "encode-archive",
      "ArchiveEncodingFailed",
      "archive-codec",
      undefined,
      errorMessage(cause),
    ),
  });
}

function encodeArchive(request: CoworkV1ArchiveEncodingRequest): Promise<Uint8Array> {
  const timestamp = new Date(request.fixedTimestamp);
  if (!Number.isFinite(timestamp.getTime())) {
    return Promise.reject(new Error("Archive fixed timestamp is invalid"));
  }

  const archive = new yazl.ZipFile();
  const chunks: Buffer[] = [];
  const output = new Promise<Uint8Array>((resolve, reject) => {
    archive.once("error", reject);
    archive.outputStream.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.from(chunk));
    });
    archive.outputStream.once("error", reject);
    archive.outputStream.once("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
  });

  for (const entry of request.entries) {
    archive.addBuffer(Buffer.from(entry.bytes), entry.path, {
      compress: request.compression !== "store",
      forceDosTimestamp: true,
      forceZip64Format: request.zip64,
      mode: 0o100000 | entry.mode,
      mtime: timestamp,
    });
  }
  archive.end({
    forceZip64Format: request.zip64,
    comment: request.comment,
  });
  return output;
}

function publishOutput(
  input: PackageOutputPublicationRequest,
  options: CoworkV1EffectPlatformNodeOptions,
): Effect.Effect<PackageOutputPublicationResult, never, ProviderRequirements> {
  const bytes = new Uint8Array(input.bytes);
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    let committed = false;
    let cleanupAttempted = false;
    let createdTemporary: CreatedTemporaryFile | undefined;
    let temporary: OwnedTemporaryFile | undefined;
    let temporaryLinks: 1 | 2 = 1;

    const attempted = yield* Effect.either(Effect.gen(function* () {
      yield* validatePublicationInput(input);
      const parent = yield* captureParent(fs, paths, input.outputPath);
      const prior = yield* captureOutput(fs, input.outputPath, parent, input.maxPriorOutputBytes);

      yield* hitFailpoint(input, options.failpoints, "AfterOutputObserved");
      if (
        prior.kind === "Present"
        && (prior.file.mode & 0o777) === OUTPUT_MODE
        && equalBytes(prior.file.bytes, bytes)
      ) {
        yield* verifyCapturedOutput(fs, prior.file, parent, input.maxPriorOutputBytes, "output-convergence");
        return Object.freeze({ kind: "ReadOnlyConverged" }) satisfies PackageOutputPublicationResult;
      }

      temporary = yield* allocateTemporaryFile(
        fs,
        paths,
        parent,
        bytes,
        (created) => {
          createdTemporary = created;
        },
        (owned) => {
          temporary = owned;
        },
      );
      yield* verifyTemporary(fs, paths, temporary, bytes);

      yield* hitFailpoint(input, options.failpoints, "BeforeCommit", temporary.path);
      yield* revalidateParent(fs, parent);
      yield* revalidatePrior(fs, input.outputPath, parent, prior, input.maxPriorOutputBytes);
      yield* revalidateOwnedTemporaryFile(fs, paths, temporary, 1, "publish-output");

      if (prior.kind === "Absent") {
        yield* fs.link(temporary.path, input.outputPath).pipe(
          mapPlatform("publish-output", "OutputCommitFailed", "output-no-replace", input.outputPath),
        );
        committed = true;
        temporaryLinks = 2;
        cleanupAttempted = true;
        const released = yield* Effect.either(releaseOwnedTemporaryFile(fs, paths, temporary, temporaryLinks));
        if (released._tag === "Left") {
          return Object.freeze({
            kind: "OutputUnsettled",
            primaryFailure: failure(
              "publish-output",
              "OutputVerifyFailed",
              "temporary-link-release",
              input.outputPath,
              "Output committed but the owned temporary link did not settle",
            ),
            cleanupFailure: released.left,
          }) satisfies PackageOutputPublicationResult;
        }
        temporary = undefined;
        createdTemporary = undefined;
      } else {
        yield* fs.rename(temporary.path, input.outputPath).pipe(
          mapPlatform("publish-output", "OutputCommitFailed", "output-atomic-replace", input.outputPath),
        );
        committed = true;
        temporary = undefined;
        createdTemporary = undefined;
      }

      yield* hitFailpoint(input, options.failpoints, "AfterCommit");
      yield* syncFile(fs, parent.path, "output-parent-flush", "OutputVerifyFailed");
      yield* hitFailpoint(input, options.failpoints, "BeforeFinalVerification");
      yield* verifyPublishedOutput(fs, input.outputPath, parent, bytes);

      return Object.freeze({
        kind: "OutputReplacedVerified",
        priorOutput: prior.kind === "Absent" ? "Absent" : "Replaced",
      }) satisfies PackageOutputPublicationResult;
    }));

    const cleanup = (temporary === undefined && createdTemporary === undefined) || cleanupAttempted
      ? undefined
      : yield* Effect.either(releaseTemporaryAllocation(
        fs,
        paths,
        createdTemporary,
        temporary,
        temporaryLinks,
      ));
    if (attempted._tag === "Left") {
      return Object.freeze({
        kind: committed ? "OutputUnsettled" : "RejectedBeforeOutputMutation",
        primaryFailure: attempted.left,
        ...(cleanup?._tag === "Left" ? { cleanupFailure: cleanup.left } : {}),
      }) satisfies PackageOutputPublicationResult;
    }
    if (cleanup?._tag === "Left") {
      return Object.freeze({
        kind: committed ? "OutputUnsettled" : "RejectedBeforeOutputMutation",
        primaryFailure: failure(
          "cleanup",
          "TemporaryFailed",
          "temporary-cleanup",
          temporary?.path ?? createdTemporary?.path,
          "Package output operation completed but its owned temporary did not settle",
        ),
        cleanupFailure: cleanup.left,
      }) satisfies PackageOutputPublicationResult;
    }
    return attempted.right;
  });
}

function validatePublicationInput(
  input: PackageOutputPublicationRequest,
): Effect.Effect<void, PackageOutputFailure> {
  return Effect.try({
    try: () => {
      if (!(input.bytes instanceof Uint8Array)) throw new Error("Output bytes must be a Uint8Array");
      if (!Number.isSafeInteger(input.maxPriorOutputBytes) || input.maxPriorOutputBytes < 0) {
        throw new Error("maxPriorOutputBytes must be a safe non-negative integer");
      }
    },
    catch: (cause) => failure(
      "publish-output",
      "InvalidInput",
      "request",
      input.outputPath,
      errorMessage(cause),
    ),
  });
}

const captureParent = Effect.fn("agentPluginPackageOutput.captureParent")(function* (
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  outputPath: string,
) {
  const parentPath = yield* Effect.try({
    try: () => {
      if (
        !paths.isAbsolute(outputPath)
        || paths.normalize(outputPath) !== outputPath
        || paths.resolve(outputPath) !== outputPath
      ) {
        throw new Error("Output path must be absolute and lexically canonical");
      }
      const parent = paths.dirname(outputPath);
      const name = paths.basename(outputPath);
      if (name.length === 0 || paths.join(parent, name) !== outputPath) {
        throw new Error("Output must name one direct child file");
      }
      return parent;
    },
    catch: (cause) => failure(
      "publish-output",
      "InvalidInput",
      "output-path",
      outputPath,
      errorMessage(cause),
    ),
  });
  const canonical = yield* fs.realPath(parentPath).pipe(
    mapPlatform("publish-output", "OutputParentUnsafe", "output-parent-realpath", parentPath),
  );
  if (canonical !== parentPath) {
    return yield* rejected(
      "publish-output",
      "OutputParentUnsafe",
      "output-parent-realpath",
      parentPath,
      "Output parent must be its exact canonical path",
    );
  }
  const info = yield* fs.stat(parentPath).pipe(
    mapPlatform("publish-output", "OutputParentUnsafe", "output-parent", parentPath),
  );
  if (info.type !== "Directory") {
    return yield* rejected(
      "publish-output",
      "OutputParentUnsafe",
      "output-parent",
      parentPath,
      "Output parent must be a directory",
    );
  }
  const ino = Option.getOrUndefined(info.ino);
  if (ino === undefined) {
    return yield* rejected(
      "publish-output",
      "OutputParentUnsafe",
      "output-parent",
      parentPath,
      "Output parent identity is unavailable",
    );
  }
  return Object.freeze({ path: parentPath, dev: info.dev, ino }) satisfies CapturedDirectory;
});

const revalidateParent = Effect.fn("agentPluginPackageOutput.revalidateParent")(function* (
  fs: FileSystem.FileSystem,
  parent: CapturedDirectory,
  operation: "publish-output" | "cleanup" = "publish-output",
) {
  const reason = operation === "cleanup" ? "TemporaryFailed" : "OutputParentUnsafe";
  const canonical = yield* fs.realPath(parent.path).pipe(
    mapPlatform(operation, reason, "output-parent-revalidation", parent.path),
  );
  const info = yield* fs.stat(parent.path).pipe(
    mapPlatform(operation, reason, "output-parent-revalidation", parent.path),
  );
  if (
    canonical !== parent.path
    || info.type !== "Directory"
    || info.dev !== parent.dev
    || Option.getOrUndefined(info.ino) !== parent.ino
  ) {
    return yield* rejected(
      operation,
      reason,
      "output-parent-revalidation",
      parent.path,
      "Output parent identity changed",
    );
  }
});

const captureOutput = Effect.fn("agentPluginPackageOutput.captureOutput")(function* (
  fs: FileSystem.FileSystem,
  outputPath: string,
  parent: CapturedDirectory,
  maxBytes: number,
) {
  const present = yield* fs.exists(outputPath).pipe(
    mapPlatform("publish-output", "FilesystemFailed", "output-exists", outputPath),
  );
  if (!present) return Object.freeze({ kind: "Absent" }) satisfies CapturedOutput;
  const file = yield* captureRegularFile(
    fs,
    outputPath,
    parent,
    maxBytes,
    "OutputUnsafe",
    "output-capture",
  );
  return Object.freeze({ kind: "Present", file }) satisfies CapturedOutput;
});

const captureRegularFile = Effect.fn("agentPluginPackageOutput.captureRegularFile")(function* (
  fs: FileSystem.FileSystem,
  filePath: string,
  parent: CapturedDirectory,
  maxBytes: number,
  reason: PackageOutputFailure["reason"],
  phase: string,
) {
  const canonical = yield* fs.realPath(filePath).pipe(
    mapPlatform("publish-output", reason, `${phase}-realpath`, filePath),
  );
  const info = yield* fs.stat(filePath).pipe(
    mapPlatform("publish-output", reason, phase, filePath),
  );
  const ino = Option.getOrUndefined(info.ino);
  const nlink = Option.getOrUndefined(info.nlink);
  const mtime = Option.getOrUndefined(info.mtime)?.getTime();
  const size = Number(info.size);
  if (
    canonical !== filePath
    || info.type !== "File"
    || info.dev !== parent.dev
    || ino === undefined
    || nlink !== 1
    || mtime === undefined
    || !Number.isSafeInteger(size)
    || size < 0
    || size > maxBytes
  ) {
    return yield* rejected(
      "publish-output",
      reason,
      phase,
      filePath,
      "Output must be one bounded canonical regular file in its captured parent",
    );
  }
  const bytes = yield* fs.readFile(filePath).pipe(
    mapPlatform("publish-output", reason, `${phase}-read`, filePath),
  );
  if (bytes.byteLength !== size) {
    return yield* rejected(
      "publish-output",
      reason,
      `${phase}-read`,
      filePath,
      "Output size changed while it was read",
    );
  }
  const after = yield* fs.stat(filePath).pipe(
    mapPlatform("publish-output", reason, `${phase}-revalidation`, filePath),
  );
  if (
    after.type !== "File"
    || after.dev !== info.dev
    || Option.getOrUndefined(after.ino) !== ino
    || after.mode !== info.mode
    || Number(after.size) !== size
    || Option.getOrUndefined(after.mtime)?.getTime() !== mtime
    || Option.getOrUndefined(after.nlink) !== 1
  ) {
    return yield* rejected(
      "publish-output",
      reason,
      `${phase}-revalidation`,
      filePath,
      "Output identity changed while it was read",
    );
  }
  return Object.freeze({
    path: filePath,
    dev: info.dev,
    ino,
    mode: info.mode,
    size,
    mtime,
    bytes: new Uint8Array(bytes),
  }) satisfies CapturedFile;
});

const allocateTemporaryFile = Effect.fn("agentPluginPackageOutput.allocateTemporaryFile")(function* (
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  parent: CapturedDirectory,
  bytes: Uint8Array,
  onCreated: (created: CreatedTemporaryFile) => void,
  onOwned: (owned: OwnedTemporaryFile) => void,
) {
  yield* revalidateParent(fs, parent);
  const random = yield* Effect.all([
    Random.nextInt,
    Random.nextInt,
    Random.nextInt,
    Random.nextInt,
  ]);
  const token = random.map((value) => (value >>> 0).toString(16).padStart(8, "0")).join("");
  const temporaryPath = paths.join(parent.path, `${PRIVATE_TEMPORARY_PREFIX}${token}`);
  if (
    paths.dirname(temporaryPath) !== parent.path
    || !paths.basename(temporaryPath).startsWith(PRIVATE_TEMPORARY_PREFIX)
  ) {
    return yield* rejected(
      "publish-output",
      "TemporaryFailed",
      "temporary-admission",
      temporaryPath,
      "Owned temporary must be one direct child of the exact output parent",
    );
  }
  const owned = yield* Effect.scoped(Effect.gen(function* () {
    const file = yield* fs.open(temporaryPath, { flag: "wx", mode: OUTPUT_MODE }).pipe(
      mapPlatform("publish-output", "TemporaryFailed", "temporary-create", temporaryPath),
    );
    const created = Object.freeze({ parent, path: temporaryPath });
    onCreated(created);
    const fileInfo = yield* file.stat.pipe(
      mapPlatform("publish-output", "TemporaryFailed", "temporary-identity", temporaryPath),
    );
    const ino = Option.getOrUndefined(fileInfo.ino);
    if (
      fileInfo.type !== "File"
      || fileInfo.dev !== parent.dev
      || ino === undefined
      || Option.getOrUndefined(fileInfo.nlink) !== 1
    ) {
      return yield* rejected(
        "publish-output",
        "TemporaryFailed",
        "temporary-identity",
        temporaryPath,
        "Created temporary file descriptor did not provide one stable regular-file identity",
      );
    }
    const captured = Object.freeze({ parent, path: temporaryPath, dev: fileInfo.dev, ino });
    onOwned(captured);
    yield* file.writeAll(bytes).pipe(
      mapPlatform("publish-output", "TemporaryFailed", "temporary-write", temporaryPath),
    );
    yield* file.sync.pipe(
      mapPlatform("publish-output", "TemporaryFailed", "temporary-flush", temporaryPath),
    );
    return captured;
  }));
  yield* fs.chmod(temporaryPath, OUTPUT_MODE).pipe(
    mapPlatform("publish-output", "TemporaryFailed", "temporary-mode", temporaryPath),
  );
  yield* revalidateParent(fs, parent);
  yield* revalidateOwnedTemporaryFile(fs, paths, owned, 1, "publish-output");
  return owned;
});

const verifyTemporary = Effect.fn("agentPluginPackageOutput.verifyTemporary")(function* (
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  owned: OwnedTemporaryFile,
  expectedBytes: Uint8Array,
) {
  yield* revalidateOwnedTemporaryFile(fs, paths, owned, 1, "publish-output");
  const captured = yield* captureRegularFile(
    fs,
    owned.path,
    owned.parent,
    expectedBytes.byteLength,
    "TemporaryFailed",
    "temporary-verification",
  );
  if (
    captured.dev !== owned.dev
    || captured.ino !== owned.ino
    || !equalBytes(captured.bytes, expectedBytes)
    || (captured.mode & 0o777) !== OUTPUT_MODE
  ) {
    return yield* rejected(
      "publish-output",
      "TemporaryFailed",
      "temporary-verification",
      owned.path,
      "Owned temporary identity, bytes, or mode differ from the publication request",
    );
  }
});

const revalidateOwnedTemporaryFile = Effect.fn(
  "agentPluginPackageOutput.revalidateOwnedTemporaryFile",
)(function* (
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  owned: OwnedTemporaryFile,
  expectedLinks: 1 | 2,
  operation: "publish-output" | "cleanup",
) {
  yield* revalidateParent(fs, owned.parent, operation);
  if (
    paths.dirname(owned.path) !== owned.parent.path
    || !paths.basename(owned.path).startsWith(PRIVATE_TEMPORARY_PREFIX)
  ) {
    return yield* rejected(
      operation,
      "TemporaryFailed",
      "temporary-revalidation",
      owned.path,
      "Owned temporary escaped its exact output parent",
    );
  }
  const [canonical, info] = yield* Effect.all([
    fs.realPath(owned.path).pipe(
      mapPlatform(operation, "TemporaryFailed", "temporary-revalidation", owned.path),
    ),
    fs.stat(owned.path).pipe(
      mapPlatform(operation, "TemporaryFailed", "temporary-revalidation", owned.path),
    ),
  ]);
  if (
    canonical !== owned.path
    || info.type !== "File"
    || info.dev !== owned.dev
    || Option.getOrUndefined(info.ino) !== owned.ino
    || Option.getOrUndefined(info.nlink) !== expectedLinks
  ) {
    return yield* rejected(
      operation,
      "TemporaryFailed",
      "temporary-revalidation",
      owned.path,
      "Owned temporary identity changed",
    );
  }
});

const admitCreatedTemporaryFile = Effect.fn(
  "agentPluginPackageOutput.admitCreatedTemporaryFile",
)(function* (
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  created: CreatedTemporaryFile,
) {
  yield* revalidateParent(fs, created.parent, "cleanup");
  if (
    paths.dirname(created.path) !== created.parent.path
    || !paths.basename(created.path).startsWith(PRIVATE_TEMPORARY_PREFIX)
  ) {
    return yield* rejected(
      "cleanup",
      "TemporaryFailed",
      "temporary-admission",
      created.path,
      "Created temporary escaped its exact output parent",
    );
  }
  const [canonical, info] = yield* Effect.all([
    fs.realPath(created.path).pipe(
      mapPlatform("cleanup", "TemporaryFailed", "temporary-admission", created.path),
    ),
    fs.stat(created.path).pipe(
      mapPlatform("cleanup", "TemporaryFailed", "temporary-admission", created.path),
    ),
  ]);
  const ino = Option.getOrUndefined(info.ino);
  if (
    canonical !== created.path
    || info.type !== "File"
    || info.dev !== created.parent.dev
    || ino === undefined
    || Option.getOrUndefined(info.nlink) !== 1
  ) {
    return yield* rejected(
      "cleanup",
      "TemporaryFailed",
      "temporary-admission",
      created.path,
      "Created temporary could not be admitted as one owned regular file",
    );
  }
  return Object.freeze({ parent: created.parent, path: created.path, dev: info.dev, ino });
});

function releaseTemporaryAllocation(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  created: CreatedTemporaryFile | undefined,
  owned: OwnedTemporaryFile | undefined,
  expectedLinks: 1 | 2,
): Effect.Effect<void, PackageOutputFailure> {
  if (owned !== undefined) return releaseOwnedTemporaryFile(fs, paths, owned, expectedLinks);
  if (created === undefined) return Effect.void;
  return admitCreatedTemporaryFile(fs, paths, created).pipe(
    Effect.flatMap((admitted) => releaseOwnedTemporaryFile(fs, paths, admitted, expectedLinks)),
  );
}

const releaseOwnedTemporaryFile = Effect.fn(
  "agentPluginPackageOutput.releaseOwnedTemporaryFile",
)(function* (
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  owned: OwnedTemporaryFile,
  expectedLinks: 1 | 2,
) {
  yield* revalidateOwnedTemporaryFile(fs, paths, owned, expectedLinks, "cleanup");
  yield* fs.remove(owned.path, { recursive: false, force: false }).pipe(
    mapPlatform("cleanup", "TemporaryFailed", "temporary-remove", owned.path),
  );
  if (yield* fs.exists(owned.path).pipe(
    mapPlatform("cleanup", "TemporaryFailed", "temporary-remove-verification", owned.path),
  )) {
    return yield* rejected(
      "cleanup",
      "TemporaryFailed",
      "temporary-remove-verification",
      owned.path,
      "Owned temporary cleanup did not settle",
    );
  }
  yield* Effect.scoped(Effect.gen(function* () {
    const directory = yield* fs.open(owned.parent.path, { flag: "r" }).pipe(
      mapPlatform("cleanup", "TemporaryFailed", "temporary-parent-flush", owned.parent.path),
    );
    yield* directory.sync.pipe(
      mapPlatform("cleanup", "TemporaryFailed", "temporary-parent-flush", owned.parent.path),
    );
  }));
});

const revalidatePrior = Effect.fn("agentPluginPackageOutput.revalidatePrior")(function* (
  fs: FileSystem.FileSystem,
  outputPath: string,
  parent: CapturedDirectory,
  prior: CapturedOutput,
  maxBytes: number,
) {
  const current = yield* captureOutput(fs, outputPath, parent, maxBytes).pipe(
    Effect.mapError((cause) => failure(
      cause.operation,
      "OutputChanged",
      cause.phase,
      cause.path,
      cause.detail,
    )),
  );
  if (prior.kind === "Absent") {
    if (current.kind !== "Absent") {
      return yield* rejected(
        "publish-output",
        "OutputChanged",
        "output-precommit",
        outputPath,
        "Absent output became occupied before no-replace publication",
      );
    }
    return;
  }
  if (
    current.kind !== "Present"
    || !sameFileIdentity(prior.file, current.file)
    || !equalBytes(prior.file.bytes, current.file.bytes)
  ) {
    return yield* rejected(
      "publish-output",
      "OutputChanged",
      "output-precommit",
      outputPath,
      "Captured output changed before atomic replacement",
    );
  }
});

const verifyCapturedOutput = Effect.fn("agentPluginPackageOutput.verifyCapturedOutput")(function* (
  fs: FileSystem.FileSystem,
  captured: CapturedFile,
  parent: CapturedDirectory,
  maxBytes: number,
  phase: string,
) {
  const current = yield* captureRegularFile(
    fs,
    captured.path,
    parent,
    maxBytes,
    "OutputChanged",
    phase,
  );
  if (!sameFileIdentity(captured, current) || !equalBytes(captured.bytes, current.bytes)) {
    return yield* rejected(
      "publish-output",
      "OutputChanged",
      phase,
      captured.path,
      "Captured output changed during convergence verification",
    );
  }
});

const verifyPublishedOutput = Effect.fn("agentPluginPackageOutput.verifyPublishedOutput")(function* (
  fs: FileSystem.FileSystem,
  outputPath: string,
  parent: CapturedDirectory,
  expectedBytes: Uint8Array,
) {
  yield* revalidateParent(fs, parent);
  const current = yield* captureRegularFile(
    fs,
    outputPath,
    parent,
    expectedBytes.byteLength,
    "OutputVerifyFailed",
    "output-final",
  );
  if (!equalBytes(current.bytes, expectedBytes) || (current.mode & 0o777) !== OUTPUT_MODE) {
    return yield* rejected(
      "publish-output",
      "OutputVerifyFailed",
      "output-final",
      outputPath,
      "Published output bytes or mode differ from the publication request",
    );
  }
});

function syncFile(
  fs: FileSystem.FileSystem,
  candidate: string,
  phase: string,
  reason: PackageOutputFailure["reason"],
): Effect.Effect<void, PackageOutputFailure> {
  return Effect.scoped(Effect.gen(function* () {
    const file = yield* fs.open(candidate, { flag: "r" }).pipe(
      mapPlatform("publish-output", reason, phase, candidate),
    );
    yield* file.sync.pipe(mapPlatform("publish-output", reason, phase, candidate));
  }));
}

function hitFailpoint(
  input: PackageOutputPublicationRequest,
  failpoints: PackageOutputProviderFailpoints | undefined,
  point: PackageOutputProviderFailpoint,
  temporaryPath?: string,
): Effect.Effect<void, PackageOutputFailure> {
  if (input.control?.onEvent === undefined && failpoints === undefined) return Effect.void;
  const event: PackageOutputPublicationEvent = Object.freeze({
    point,
    outputPath: input.outputPath,
    ...(temporaryPath === undefined ? {} : { temporaryPath }),
  });
  return Effect.tryPromise({
    try: async () => {
      await input.control?.onEvent?.(event);
      await failpoints?.hit(point, event);
    },
    catch: (cause) => failure(
      "publish-output",
      "FilesystemFailed",
      point,
      input.outputPath,
      `Provider failpoint failed: ${errorMessage(cause)}`,
    ),
  });
}

function mapPlatform(
  operation: PackageOutputFailure["operation"],
  reason: PackageOutputFailure["reason"],
  phase: string,
  candidate: string,
) {
  return <A, R>(effect: Effect.Effect<A, PlatformError, R>) => effect.pipe(
    Effect.mapError((cause) => failure(operation, reason, phase, candidate, cause.message)),
  );
}

function rejected(
  operation: PackageOutputFailure["operation"],
  reason: PackageOutputFailure["reason"],
  phase: string,
  candidate: string | undefined,
  detail: string,
): Effect.Effect<never, PackageOutputFailure> {
  return Effect.fail(failure(operation, reason, phase, candidate, detail));
}

function failure(
  operation: PackageOutputFailure["operation"],
  reason: PackageOutputFailure["reason"],
  phase: string,
  candidate: string | undefined,
  detail: string,
): PackageOutputFailure {
  return Object.freeze({
    _tag: "PackageOutputFailure",
    operation,
    reason,
    phase,
    ...(candidate === undefined ? {} : { path: candidate }),
    detail,
  });
}

function sameFileIdentity(left: CapturedFile, right: CapturedFile): boolean {
  return left.path === right.path
    && left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtime === right.mtime;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength
    && left.every((value, index) => value === right[index]);
}

function unwrapNodeResult<A>(result: NodePackageOutputResult<A>): A {
  if (result.ok) return result.value;
  throw new Error(`${result.failure.phase}: ${result.failure.detail}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
