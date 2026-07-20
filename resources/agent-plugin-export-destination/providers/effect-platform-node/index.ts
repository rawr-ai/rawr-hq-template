import { randomUUID } from "node:crypto";
import { fstatSync } from "node:fs";
import { lstat, rmdir } from "node:fs/promises";

import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { NodeContext } from "@effect/platform-node";
import type {
  ExportDestinationApplyReceipt,
  ExportDestinationAsyncPort,
  ExportDestinationCapture,
  ExportDestinationDirectoryChild,
  ExportDestinationEntryIdentity,
  ExportDestinationEntryObservation,
  ExportDestinationFailure,
  ExportDestinationFailureReason,
  ExportDestinationMutation,
  ExportDestinationReleaseReceipt,
  ExportDestinationResource,
  ExportDestinationRestoreReceipt,
  ExportDestinationSettleReceipt,
  ExportDestinationSnapshot,
} from "@rawr/resource-agent-plugin-export-destination";
import { Effect, Option } from "effect";

type ProviderRequirements = FileSystem.FileSystem | Path.Path;
type Operation = ExportDestinationFailure["operation"];

export const EXPORT_DESTINATION_TEMP_PREFIX = ".rawr-export-destination-tmp-v1-";

type CaptureLifecycle = "Captured" | "Applying" | "Partial" | "Applied" | "Converged" | "Restoring" | "Restored";

interface DestinationRoot {
  readonly path: string;
  readonly identity: ExportDestinationEntryIdentity;
  readonly stat: Extract<ExportDestinationEntryObservation, { kind: "Directory" }>["stat"];
}

interface CaptureBudget {
  entries: number;
  bytes: number;
  readonly maxEntries: number;
  readonly maxBytes: number;
}

interface OwnedTemporaryIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

interface CaptureAuthority {
  readonly handle: string;
  readonly destination: DestinationRoot;
  readonly readToken: string;
  readonly paths: readonly string[];
  readonly preimages: ReadonlyMap<string, ExportDestinationEntryObservation>;
  readonly maxEntries: number;
  readonly maxBytes: number;
  readonly postimages: Map<string, ExportDestinationEntryObservation>;
  readonly mutatedPaths: string[];
  plannedMutations?: readonly ExportDestinationMutation[];
  lifecycle: CaptureLifecycle;
  planDigest?: string;
}

export function makeExportDestinationResource(): ExportDestinationResource<ProviderRequirements> {
  const captures = new Map<string, CaptureAuthority>();
  const consumedHandles = new Set<string>();
  const mutationGate = Effect.runSync(Effect.makeSemaphore(1));

  const inspect = Effect.fn("exportDestination.inspect")(function* (
    input: Readonly<{
      destination: string;
      readToken: string;
      paths: readonly string[];
      maxEntries: number;
      maxBytes: number;
    }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const destination = yield* requireCanonicalDestination(fs, path, input.destination, "inspect");
    yield* validateReadInput(path, input, "inspect");
    const entries = yield* observePaths(fs, path, destination, input.paths, input, "inspect");
    return Object.freeze({
      canonicalDestination: destination.path,
      destinationStat: destination.stat,
      readToken: input.readToken,
      entries,
    }) satisfies ExportDestinationSnapshot;
  });

  const capture = Effect.fn("exportDestination.capture")(function* (
    input: Readonly<{
      destination: string;
      readToken: string;
      paths: readonly string[];
      maxEntries: number;
      maxBytes: number;
    }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const destination = yield* requireCanonicalDestination(fs, path, input.destination, "capture");
    yield* validateReadInput(path, input, "capture");
    const entries = yield* observePaths(fs, path, destination, input.paths, input, "capture");
    const handle = randomUUID();
    const paths = Object.freeze(entries.map((entry) => entry.path));
    captures.set(handle, {
      handle,
      destination,
      readToken: input.readToken,
      paths,
      preimages: new Map(entries.map((entry) => [entry.path, entry])),
      maxEntries: input.maxEntries,
      maxBytes: input.maxBytes,
      postimages: new Map(),
      mutatedPaths: [],
      lifecycle: "Captured",
    });
    return Object.freeze({
      canonicalDestination: destination.path,
      destinationStat: destination.stat,
      readToken: input.readToken,
      handle,
      entries,
    }) satisfies ExportDestinationCapture;
  });

  const releaseUnsafe = Effect.fn("exportDestination.release")(function* (
    input: Readonly<{
      destination: string;
      readToken: string;
      captureHandle: string;
    }>,
  ) {
    yield* validateOpaque(input.readToken, "readToken", "release");
    yield* validateOpaque(input.captureHandle, "captureHandle", "release");
    if (consumedHandles.has(input.captureHandle)) {
      return yield* fail("release", "HandleConsumed", undefined, "Capture handle has already been consumed");
    }
    const authority = captures.get(input.captureHandle);
    if (authority === undefined) return yield* fail("release", "InvalidHandle", undefined, "Capture handle is unknown");
    if (authority.readToken !== input.readToken) {
      return yield* fail("release", "WrongToken", undefined, "Capture handle belongs to another read token");
    }
    if (authority.destination.path !== input.destination) {
      return yield* fail("release", "WrongDestination", input.destination, "Capture handle belongs to another destination");
    }
    if (authority.lifecycle !== "Captured") {
      return yield* fail(
        "release",
        "HandleState",
        undefined,
        `Capture handle cannot release from ${authority.lifecycle}; restore mutated authority instead`,
      );
    }
    captures.delete(input.captureHandle);
    consumedHandles.add(input.captureHandle);
    return Object.freeze({
      readToken: input.readToken,
      outcome: "Released",
      handle: input.captureHandle,
    }) satisfies ExportDestinationReleaseReceipt;
  });

  const release = (input: Parameters<typeof releaseUnsafe>[0]) => mutationGate.withPermits(1)(releaseUnsafe(input));

  const applyUnsafe = Effect.fn("exportDestination.apply")(function* (
    input: Readonly<{
      destination: string;
      planDigest: string;
      readToken: string;
      captureHandle: string;
      mutations: readonly ExportDestinationMutation[];
    }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    yield* validateOpaque(input.planDigest, "planDigest", "apply");
    yield* validateOpaque(input.readToken, "readToken", "apply");
    yield* validateOpaque(input.captureHandle, "captureHandle", "apply");
    const authority = yield* requireCaptureAuthority(
      fs,
      path,
      captures,
      consumedHandles,
      input,
      "apply",
    );
    yield* validateMutationSet(path, authority, input.mutations);
    authority.plannedMutations = Object.freeze([...input.mutations]);

    const current = yield* observeAuthority(fs, path, authority, "apply");
    if (authority.lifecycle === "Applied" || authority.lifecycle === "Converged") {
      if (!allMutationsConverged(current, input.mutations)) {
        return yield* fail("apply", "IdentityChanged", undefined, "Applied destination no longer matches the exact plan");
      }
      authority.lifecycle = authority.lifecycle === "Applied" ? "Applied" : "Converged";
      return applyReceipt(input, "Converged", [], current, authority.paths);
    }
    if (authority.lifecycle !== "Captured") {
      return yield* fail("apply", "HandleState", undefined, `Capture handle cannot apply from ${authority.lifecycle}`);
    }
    if (!sameObservationMap(current, authority.preimages, true)) {
      return yield* fail("apply", "IdentityChanged", undefined, "Destination entries changed after capture");
    }
    if (allMutationsConverged(current, input.mutations)) {
      authority.planDigest = input.planDigest;
      authority.lifecycle = "Converged";
      replaceMap(authority.postimages, current);
      return applyReceipt(input, "Converged", [], current, authority.paths);
    }

    authority.planDigest = input.planDigest;
    authority.lifecycle = "Applying";
    const changedPaths: string[] = [];
    for (const mutation of input.mutations) {
      const before = yield* observeOne(fs, path, authority.destination, mutation.path, makeBudget(authority), "apply");
      if (mutationConverged(before, mutation)) continue;
      authority.mutatedPaths.push(mutation.path);
      const result = yield* Effect.either(applyMutation(fs, path, authority.destination, mutation, authority));
      if (result._tag === "Left") {
        authority.lifecycle = "Partial";
        const partial = yield* Effect.either(observeAuthority(fs, path, authority, "apply"));
        if (partial._tag === "Right") replaceMap(authority.postimages, partial.right);
        return yield* Effect.fail(result.left);
      }
      changedPaths.push(mutation.path);
    }

    const observedPostimages = yield* Effect.either(observeAuthority(fs, path, authority, "apply"));
    if (observedPostimages._tag === "Left") {
      authority.lifecycle = "Partial";
      return yield* Effect.fail(observedPostimages.left);
    }
    const postimages = observedPostimages.right;
    if (!allMutationsConverged(postimages, input.mutations)) {
      authority.lifecycle = "Partial";
      return yield* fail("apply", "IdentityChanged", undefined, "Applied destination does not match the exact plan");
    }
    replaceMap(authority.postimages, postimages);
    authority.lifecycle = "Applied";
    return applyReceipt(input, "Applied", changedPaths, postimages, authority.paths);
  });

  const apply = (input: Parameters<typeof applyUnsafe>[0]) => mutationGate.withPermits(1)(applyUnsafe(input));

  const restoreUnsafe = Effect.fn("exportDestination.restore")(function* (
    input: Readonly<{
      destination: string;
      planDigest: string;
      readToken: string;
      captureHandle: string;
    }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    yield* validateOpaque(input.planDigest, "planDigest", "restore");
    yield* validateOpaque(input.readToken, "readToken", "restore");
    yield* validateOpaque(input.captureHandle, "captureHandle", "restore");
    const authority = yield* requireCaptureAuthority(
      fs,
      path,
      captures,
      consumedHandles,
      input,
      "restore",
    );
    if (authority.lifecycle === "Converged") {
      authority.lifecycle = "Restored";
      return restoreReceipt(input, [], authority.preimages, authority.paths);
    }
    if (authority.lifecycle !== "Applied" && authority.lifecycle !== "Partial") {
      return yield* fail(
        "restore",
        authority.lifecycle === "Restored" ? "HandleConsumed" : "HandleState",
        undefined,
        `Capture handle cannot restore from ${authority.lifecycle}`,
      );
    }
    const current = yield* observeAuthority(fs, path, authority, "restore");
    if (
      authority.lifecycle === "Applied"
        ? !sameObservationMap(current, authority.postimages, true)
        : !recoverablePartial(current, authority)
    ) {
      return yield* fail("restore", "IdentityChanged", undefined, "Destination changed after apply; restore refused");
    }

    authority.lifecycle = "Restoring";
    const restoredPaths: string[] = [];
    for (const relative of [...authority.mutatedPaths].reverse()) {
      const preimage = authority.preimages.get(relative);
      if (preimage === undefined) {
        authority.lifecycle = "Partial";
        return yield* fail("restore", "HandleState", relative, "Captured preimage is unavailable");
      }
      const observed = current.get(relative);
      if (observed !== undefined && sameObservation(observed, preimage, true)) continue;
      const restored = yield* Effect.either(restoreObservation(fs, path, authority.destination, preimage, authority));
      if (restored._tag === "Left") {
        authority.lifecycle = "Partial";
        return yield* Effect.fail(restored.left);
      }
      restoredPaths.push(relative);
    }
    const verified = yield* observeAuthority(fs, path, authority, "restore");
    if (!sameObservationMap(verified, authority.preimages, false)) {
      authority.lifecycle = "Partial";
      return yield* fail("restore", "IdentityChanged", undefined, "Restored destination does not match captured preimages");
    }
    replaceMap(authority.postimages, verified);
    authority.lifecycle = "Restored";
    return restoreReceipt(input, restoredPaths, verified, authority.paths);
  });

  const restore = (input: Parameters<typeof restoreUnsafe>[0]) => mutationGate.withPermits(1)(restoreUnsafe(input));

  const settleUnsafe = Effect.fn("exportDestination.settle")(function* (
    input: Readonly<{
      destination: string;
      planDigest: string;
      readToken: string;
      captureHandle: string;
    }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    yield* validateOpaque(input.planDigest, "planDigest", "settle");
    yield* validateOpaque(input.readToken, "readToken", "settle");
    yield* validateOpaque(input.captureHandle, "captureHandle", "settle");
    const authority = yield* requireCaptureAuthority(
      fs,
      path,
      captures,
      consumedHandles,
      input,
      "settle",
    );
    if (
      authority.lifecycle !== "Applied"
      && authority.lifecycle !== "Converged"
      && authority.lifecycle !== "Restored"
    ) {
      return yield* fail("settle", "HandleState", undefined, `Capture handle cannot settle from ${authority.lifecycle}`);
    }
    const current = yield* observeAuthority(fs, path, authority, "settle");
    const expected = authority.postimages;
    const includeIdentity = authority.lifecycle !== "Restored";
    if (!sameObservationMap(current, expected, includeIdentity)) {
      return yield* fail("settle", "IdentityChanged", undefined, "Destination does not match its verified settlement image");
    }
    captures.delete(input.captureHandle);
    consumedHandles.add(input.captureHandle);
    return Object.freeze({
      planDigest: input.planDigest,
      readToken: input.readToken,
      outcome: "Settled",
      handle: input.captureHandle,
    }) satisfies ExportDestinationSettleReceipt;
  });

  const settle = (input: Parameters<typeof settleUnsafe>[0]) => mutationGate.withPermits(1)(settleUnsafe(input));

  return Object.freeze({ inspect, capture, release, apply, restore, settle });
}

export type NodeExportDestinationResult<A> =
  | Readonly<{ ok: true; value: A }>
  | Readonly<{ ok: false; failure: ExportDestinationFailure }>;

export function runNodeExportDestination<A>(
  operation: Effect.Effect<A, ExportDestinationFailure, ProviderRequirements>,
): Promise<NodeExportDestinationResult<A>> {
  return Effect.runPromise(operation.pipe(
    Effect.map((value): NodeExportDestinationResult<A> => Object.freeze({ ok: true, value })),
    Effect.catchAll((failure) => Effect.succeed<NodeExportDestinationResult<A>>(Object.freeze({ ok: false, failure }))),
    Effect.provide(NodeContext.layer),
  ));
}

export function makeNodeExportDestinationPort(): ExportDestinationAsyncPort {
  const resource = makeExportDestinationResource();
  return Object.freeze({
    inspect: (input: Parameters<typeof resource.inspect>[0]) => runNodeOrReject(resource.inspect(input)),
    capture: (input: Parameters<typeof resource.capture>[0]) => runNodeOrReject(resource.capture(input)),
    release: (input: Parameters<typeof resource.release>[0]) => runNodeOrReject(resource.release(input)),
    apply: (input: Parameters<typeof resource.apply>[0]) => runNodeOrReject(resource.apply(input)),
    restore: (input: Parameters<typeof resource.restore>[0]) => runNodeOrReject(resource.restore(input)),
    settle: (input: Parameters<typeof resource.settle>[0]) => runNodeOrReject(resource.settle(input)),
  });
}

function runNodeOrReject<A>(
  operation: Effect.Effect<A, ExportDestinationFailure, ProviderRequirements>,
): Promise<A> {
  return runNodeExportDestination(operation).then((result) => result.ok
    ? result.value
    : Promise.reject(result.failure));
}

function applyReceipt(
  input: Readonly<{ planDigest: string; readToken: string }>,
  outcome: ExportDestinationApplyReceipt["outcome"],
  changedPaths: readonly string[],
  entries: ReadonlyMap<string, ExportDestinationEntryObservation>,
  order: readonly string[],
): ExportDestinationApplyReceipt {
  return Object.freeze({
    planDigest: input.planDigest,
    readToken: input.readToken,
    outcome,
    changedPaths: Object.freeze([...changedPaths]),
    entries: orderedEntries(entries, order),
  });
}

function restoreReceipt(
  input: Readonly<{ planDigest: string; readToken: string }>,
  changedPaths: readonly string[],
  entries: ReadonlyMap<string, ExportDestinationEntryObservation>,
  order: readonly string[],
): ExportDestinationRestoreReceipt {
  return Object.freeze({
    planDigest: input.planDigest,
    readToken: input.readToken,
    outcome: "Restored",
    changedPaths: Object.freeze([...changedPaths]),
    entries: orderedEntries(entries, order),
  });
}

function orderedEntries(
  entries: ReadonlyMap<string, ExportDestinationEntryObservation>,
  order: readonly string[],
): readonly ExportDestinationEntryObservation[] {
  return Object.freeze(order.map((relative) => {
    const entry = entries.get(relative);
    if (entry === undefined) throw new Error(`Missing provider observation for ${relative}`);
    return entry;
  }));
}

function validateReadInput(
  path: Path.Path,
  input: Readonly<{
    readToken: string;
    paths: readonly string[];
    maxEntries: number;
    maxBytes: number;
  }>,
  operation: "inspect" | "capture",
) {
  return Effect.gen(function* () {
    yield* validateOpaque(input.readToken, "readToken", operation);
    if (!Number.isSafeInteger(input.maxEntries) || input.maxEntries < 1 || input.maxEntries > 1_000_000) {
      return yield* fail(operation, "InvalidInput", undefined, "maxEntries must be a positive bounded safe integer");
    }
    if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes < 0 || input.maxBytes > 1024 * 1024 * 1024) {
      return yield* fail(operation, "InvalidInput", undefined, "maxBytes must be a bounded non-negative safe integer");
    }
    if (input.paths.length === 0 || input.paths.length > input.maxEntries) {
      return yield* fail(operation, "LimitExceeded", undefined, "Requested path count exceeds its declared entry bound");
    }
    const seen = new Set<string>();
    for (const relative of input.paths) {
      yield* validateRelativePath(path, relative, operation);
      if (seen.has(relative)) return yield* fail(operation, "InvalidInput", relative, "Requested paths must be distinct");
      seen.add(relative);
    }
  });
}

function validateMutationSet(
  path: Path.Path,
  authority: CaptureAuthority,
  mutations: readonly ExportDestinationMutation[],
) {
  return Effect.gen(function* () {
    if (mutations.length > authority.maxEntries) {
      return yield* fail("apply", "LimitExceeded", undefined, "Mutation count exceeds captured entry bounds");
    }
    const seen = new Set<string>();
    let totalBytes = 0;
    for (const mutation of mutations) {
      yield* validateRelativePath(path, mutation.path, "apply");
      if (seen.has(mutation.path)) {
        return yield* fail("apply", "InvalidInput", mutation.path, "Mutation paths must be distinct");
      }
      if (!authority.preimages.has(mutation.path)) {
        return yield* fail("apply", "InvalidInput", mutation.path, "Mutation path has no captured preimage");
      }
      seen.add(mutation.path);
      if (mutation.kind === "WriteFile" || mutation.kind === "EnsureDirectory") {
        yield* validateMode(mutation.mode, mutation.path, "apply");
      }
      if (mutation.kind === "WriteFile") {
        totalBytes += mutation.bytes.byteLength;
        if (totalBytes > authority.maxBytes) {
          return yield* fail("apply", "LimitExceeded", mutation.path, "Mutation bytes exceed captured byte bounds");
        }
      }
    }
  });
}

function validateOpaque(
  value: string,
  name: string,
  operation: Operation,
): Effect.Effect<void, ExportDestinationFailure> {
  return value.length >= 1 && value.length <= 256 && !value.includes("\0")
    ? Effect.void
    : fail(operation, "InvalidInput", undefined, `${name} must be a non-empty bounded opaque value`);
}

function validateMode(
  mode: number,
  relative: string,
  operation: Operation,
): Effect.Effect<void, ExportDestinationFailure> {
  return Number.isSafeInteger(mode) && mode >= 0 && mode <= 0o777
    ? Effect.void
    : fail(operation, "InvalidInput", relative, "File mode must contain only visible permission bits");
}

function validateRelativePath(
  path: Path.Path,
  relative: string,
  operation: Operation,
): Effect.Effect<void, ExportDestinationFailure> {
  if (
    relative.length === 0
    || relative.length > 4096
    || relative.includes("\0")
    || relative.includes("\\")
    || path.isAbsolute(relative)
  ) {
    return fail(operation, "InvalidInput", relative, "Destination entry path must be a bounded relative POSIX path");
  }
  const segments = relative.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return fail(operation, "InvalidInput", relative, "Destination entry path contains an unsafe segment");
  }
  if (path.normalize(relative) !== relative) {
    return fail(operation, "InvalidInput", relative, "Destination entry path must be canonical");
  }
  return Effect.void;
}

function requireCanonicalDestination(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  input: string,
  operation: Operation,
): Effect.Effect<DestinationRoot, ExportDestinationFailure> {
  return Effect.gen(function* () {
    if (!path.isAbsolute(input) || path.resolve(input) !== input || path.parse(input).root === input) {
      return yield* fail(operation, "InvalidInput", input, "Destination must be a canonical absolute non-root path");
    }
    const canonical = yield* fs.realPath(input).pipe(mapPlatform(operation, input));
    if (canonical !== input) return yield* fail(operation, "Aliased", input, "Destination resolves through an alias");
    const info = yield* fs.stat(input).pipe(mapPlatform(operation, input));
    if (info.type !== "Directory") {
      return yield* fail(operation, "UnsupportedEntry", input, "Destination must be a directory");
    }
    const stat = yield* exactDirectoryStat(input, operation);
    if (!sameExactIdentity(stat, info)) {
      return yield* fail(operation, "IdentityChanged", input, "Destination identity changed while reading raw stat metadata");
    }
    return Object.freeze({ path: input, identity: entryIdentity(info), stat });
  });
}

function revalidateDestination(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  expected: DestinationRoot,
  operation: Operation,
): Effect.Effect<DestinationRoot, ExportDestinationFailure> {
  return requireCanonicalDestination(fs, path, expected.path, operation).pipe(
    Effect.flatMap((current) => sameIdentity(current.identity, expected.identity)
      ? Effect.succeed(current)
      : fail(operation, "IdentityChanged", expected.path, "Destination identity changed")),
  );
}

function resolveContained(
  path: Path.Path,
  destination: string,
  relative: string,
  operation: Operation,
): Effect.Effect<string, ExportDestinationFailure> {
  return validateRelativePath(path, relative, operation).pipe(
    Effect.flatMap(() => {
      const candidate = path.resolve(destination, ...relative.split("/"));
      const fromRoot = path.relative(destination, candidate);
      return fromRoot === relative && fromRoot !== "" && !fromRoot.startsWith(`..${path.sep}`) && fromRoot !== ".."
        ? Effect.succeed(candidate)
        : fail(operation, "InvalidInput", relative, "Destination entry escapes its canonical destination");
    }),
  );
}

function observePaths(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  destination: DestinationRoot,
  paths: readonly string[],
  limits: Readonly<{ maxEntries: number; maxBytes: number }>,
  operation: "inspect" | "capture",
): Effect.Effect<readonly ExportDestinationEntryObservation[], ExportDestinationFailure> {
  const budget: CaptureBudget = { entries: 0, bytes: 0, ...limits };
  return Effect.forEach(paths, (relative) => observeOne(fs, path, destination, relative, budget, operation)).pipe(
    Effect.map((entries) => Object.freeze(entries)),
  );
}

function observeAuthority(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  authority: CaptureAuthority,
  operation: "apply" | "restore" | "settle",
): Effect.Effect<ReadonlyMap<string, ExportDestinationEntryObservation>, ExportDestinationFailure> {
  return Effect.gen(function* () {
    yield* revalidateDestination(fs, path, authority.destination, operation);
    const budget = makeBudget(authority);
    const observations = yield* Effect.forEach(
      authority.paths,
      (relative) => observeOne(fs, path, authority.destination, relative, budget, operation),
    );
    return new Map(observations.map((entry) => [entry.path, entry]));
  });
}

function observeOne(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  destination: DestinationRoot,
  relative: string,
  budget: CaptureBudget,
  operation: Operation,
): Effect.Effect<ExportDestinationEntryObservation, ExportDestinationFailure> {
  return Effect.gen(function* () {
    const candidate = yield* resolveContained(path, destination.path, relative, operation);
    const parentPresent = yield* requireCanonicalParentChain(fs, path, destination, candidate, operation);
    yield* consumeEntry(budget, relative, operation);
    if (!parentPresent) return Object.freeze({ kind: "Absent", path: relative });
    yield* rejectSymbolicLink(fs, candidate, operation);
    const info = yield* statIfPresent(fs, candidate, operation);
    if (info === undefined) return Object.freeze({ kind: "Absent", path: relative });
    const canonical = yield* fs.realPath(candidate).pipe(mapPlatform(operation, candidate));
    if (canonical !== candidate) return yield* fail(operation, "Aliased", relative, "Destination entry resolves through an alias");
    if (info.type === "File") {
      const size = Number(info.size);
      if (!Number.isSafeInteger(size) || size < 0 || budget.bytes + size > budget.maxBytes) {
        return yield* fail(operation, "LimitExceeded", relative, "Destination file bytes exceed the declared bound");
      }
      const bytes = yield* fs.readFile(candidate).pipe(mapPlatform(operation, candidate));
      if (bytes.byteLength !== size) {
        return yield* fail(operation, "IdentityChanged", relative, "Destination file size changed while reading");
      }
      const verified = yield* fs.stat(candidate).pipe(mapPlatform(operation, candidate));
      if (verified.type !== "File" || !sameFileInfo(info, verified)) {
        return yield* fail(operation, "IdentityChanged", relative, "Destination file changed while reading");
      }
      const stat = yield* exactFileStat(candidate, operation);
      if (stat.nlink !== "1") {
        return yield* fail(operation, "UnsupportedEntry", relative, "Destination regular files must have one filesystem link");
      }
      if (!sameExactIdentity(stat, verified)) {
        return yield* fail(operation, "IdentityChanged", relative, "Destination file identity changed while reading raw stat metadata");
      }
      budget.bytes += bytes.byteLength;
      return Object.freeze({
        kind: "File",
        path: relative,
        identity: entryIdentity(verified),
        stat,
        mode: visibleMode(verified.mode),
        bytes: Uint8Array.from(bytes),
      });
    }
    if (info.type !== "Directory") {
      return yield* fail(operation, "UnsupportedEntry", relative, `Unsupported destination entry type: ${info.type}`);
    }
    const children = yield* observeDirectoryChildren(fs, path, destination, candidate, budget, operation);
    const verified = yield* fs.stat(candidate).pipe(mapPlatform(operation, candidate));
    if (verified.type !== "Directory" || !sameIdentity(entryIdentity(info), entryIdentity(verified))) {
      return yield* fail(operation, "IdentityChanged", relative, "Destination directory changed while reading");
    }
    const stat = yield* exactDirectoryStat(candidate, operation);
    if (!sameExactIdentity(stat, verified)) {
      return yield* fail(operation, "IdentityChanged", relative, "Destination directory identity changed while reading raw stat metadata");
    }
    return Object.freeze({
      kind: "Directory",
      path: relative,
      identity: entryIdentity(verified),
      stat,
      mode: visibleMode(verified.mode),
      children,
    });
  });
}

function observeDirectoryChildren(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  destination: DestinationRoot,
  directory: string,
  budget: CaptureBudget,
  operation: Operation,
): Effect.Effect<readonly ExportDestinationDirectoryChild[], ExportDestinationFailure> {
  return Effect.gen(function* () {
    const names = yield* fs.readDirectory(directory).pipe(mapPlatform(operation, directory));
    const distinct = new Set(names);
    if (distinct.size !== names.length) {
      return yield* fail(operation, "IdentityChanged", directory, "Destination directory returned duplicate entries");
    }
    const sorted = [...names].sort(compareText);
    const children: ExportDestinationDirectoryChild[] = [];
    for (const name of sorted) {
      if (name.length === 0 || name === "." || name === ".." || path.basename(name) !== name) {
        return yield* fail(operation, "UnsupportedEntry", directory, "Destination directory contains an unsafe child name");
      }
      yield* consumeEntry(budget, path.join(directory, name), operation);
      const child = path.join(directory, name);
      if (!isContained(path, destination.path, child)) {
        return yield* fail(operation, "InvalidInput", child, "Destination child escapes its canonical destination");
      }
      yield* rejectSymbolicLink(fs, child, operation);
      const info = yield* fs.stat(child).pipe(mapPlatform(operation, child));
      const canonical = yield* fs.realPath(child).pipe(mapPlatform(operation, child));
      if (canonical !== child) return yield* fail(operation, "Aliased", child, "Destination child resolves through an alias");
      if (info.type !== "File" && info.type !== "Directory") {
        return yield* fail(operation, "UnsupportedEntry", child, `Unsupported destination child type: ${info.type}`);
      }
      children.push(Object.freeze({
        name,
        kind: info.type,
        mode: visibleMode(info.mode),
        ...entryIdentity(info),
      }));
    }
    return Object.freeze(children);
  });
}

function requireCanonicalParentChain(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  destination: DestinationRoot,
  candidate: string,
  operation: Operation,
): Effect.Effect<boolean, ExportDestinationFailure> {
  return Effect.gen(function* () {
    const parent = path.dirname(candidate);
    if (parent === destination.path) return true;
    const relative = path.relative(destination.path, parent);
    if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`)) {
      return yield* fail(operation, "InvalidInput", candidate, "Destination entry parent escapes its destination");
    }
    let current = destination.path;
    for (const segment of relative.split(path.sep)) {
      current = path.join(current, segment);
      yield* rejectSymbolicLink(fs, current, operation);
      const info = yield* statIfPresent(fs, current, operation);
      if (info === undefined) return false;
      if (info.type !== "Directory") {
        return yield* fail(operation, "UnsupportedEntry", current, "Destination entry parent is not a directory");
      }
      const canonical = yield* fs.realPath(current).pipe(mapPlatform(operation, current));
      if (canonical !== current) return yield* fail(operation, "Aliased", current, "Destination entry parent resolves through an alias");
    }
    return true;
  });
}

function requireCanonicalExistingDirectory(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  destination: DestinationRoot,
  candidate: string,
  operation: Operation,
) {
  return Effect.gen(function* () {
    if (!isContained(path, destination.path, candidate) && candidate !== destination.path) {
      return yield* fail(operation, "InvalidInput", candidate, "Directory escapes its canonical destination");
    }
    yield* rejectSymbolicLink(fs, candidate, operation);
    const info = yield* fs.stat(candidate).pipe(mapPlatform(operation, candidate));
    const canonical = yield* fs.realPath(candidate).pipe(mapPlatform(operation, candidate));
    if (canonical !== candidate) return yield* fail(operation, "Aliased", candidate, "Directory resolves through an alias");
    if (info.type !== "Directory") return yield* fail(operation, "UnsupportedEntry", candidate, "Expected a directory");
    return info;
  });
}

function rejectSymbolicLink(
  fs: FileSystem.FileSystem,
  candidate: string,
  operation: Operation,
): Effect.Effect<void, ExportDestinationFailure> {
  return Effect.either(fs.readLink(candidate)).pipe(
    Effect.flatMap((result) => result._tag === "Right"
      ? fail(operation, "Aliased", candidate, "Symbolic links are not supported in an export destination")
      : Effect.void),
  );
}

function statIfPresent(
  fs: FileSystem.FileSystem,
  candidate: string,
  operation: Operation,
): Effect.Effect<FileSystem.File.Info | undefined, ExportDestinationFailure> {
  return fs.stat(candidate).pipe(
    Effect.map((info): FileSystem.File.Info | undefined => info),
    Effect.catchTag("SystemError", (error) => error.reason === "NotFound"
      ? Effect.succeed(undefined)
      : Effect.fail(toFailure(operation, candidate, error))),
    Effect.catchTag("BadArgument", (error) => Effect.fail(toFailure(operation, candidate, error))),
  );
}

function exactFileStat(
  candidate: string,
  operation: Operation,
): Effect.Effect<Extract<ExportDestinationEntryObservation, { kind: "File" }>["stat"], ExportDestinationFailure> {
  return exactStat(candidate, operation).pipe(Effect.flatMap((info) => info.isFile()
    ? Effect.succeed(Object.freeze({
      dev: info.dev.toString(10),
      ino: info.ino.toString(10),
      nlink: info.nlink.toString(10),
      size: info.size.toString(10),
      mtimeNs: info.mtimeNs.toString(10),
      ctimeNs: info.ctimeNs.toString(10),
    }))
    : fail(operation, "IdentityChanged", candidate, "Raw stat no longer identifies a regular file")));
}

function exactDirectoryStat(
  candidate: string,
  operation: Operation,
): Effect.Effect<Extract<ExportDestinationEntryObservation, { kind: "Directory" }>["stat"], ExportDestinationFailure> {
  return exactStat(candidate, operation).pipe(Effect.flatMap((info) => info.isDirectory()
    ? Effect.succeed(Object.freeze({
      dev: info.dev.toString(10),
      ino: info.ino.toString(10),
      birthtimeNs: info.birthtimeNs.toString(10),
      mtimeNs: info.mtimeNs.toString(10),
      ctimeNs: info.ctimeNs.toString(10),
    }))
    : fail(operation, "IdentityChanged", candidate, "Raw stat no longer identifies a directory")));
}

function exactStat(
  candidate: string,
  operation: Operation,
) {
  return Effect.tryPromise({
    try: () => lstat(candidate, { bigint: true }),
    catch: (error): ExportDestinationFailure => Object.freeze({
      _tag: "ExportDestinationFailure",
      operation,
      reason: nativeErrorCode(error) === "ENOENT" ? "Missing" : "FilesystemFailed",
      path: candidate,
      detail: error instanceof Error ? error.message : String(error),
    }),
  });
}

function sameExactIdentity(
  exact: Readonly<{ dev: string; ino: string }>,
  info: FileSystem.File.Info,
): boolean {
  return exact.dev === String(info.dev)
    && exact.ino === String(Option.getOrNull(info.ino));
}

function consumeEntry(
  budget: CaptureBudget,
  entry: string,
  operation: Operation,
): Effect.Effect<void, ExportDestinationFailure> {
  if (budget.entries >= budget.maxEntries) {
    return fail(operation, "LimitExceeded", entry, "Destination entry count exceeds the declared bound");
  }
  budget.entries += 1;
  return Effect.void;
}

function makeBudget(authority: CaptureAuthority): CaptureBudget {
  return {
    entries: 0,
    bytes: 0,
    maxEntries: authority.maxEntries,
    maxBytes: authority.maxBytes,
  };
}

function isContained(path: Path.Path, destination: string, candidate: string): boolean {
  const relative = path.relative(destination, candidate);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function entryIdentity(info: FileSystem.File.Info): ExportDestinationEntryIdentity {
  return Object.freeze({
    dev: info.dev,
    ino: Option.getOrNull(info.ino),
  });
}

function visibleMode(mode: number): number {
  return mode & 0o777;
}

function sameFileInfo(left: FileSystem.File.Info, right: FileSystem.File.Info): boolean {
  return sameIdentity(entryIdentity(left), entryIdentity(right))
    && left.mode === right.mode
    && left.size === right.size;
}

function sameIdentity(left: ExportDestinationEntryIdentity, right: ExportDestinationEntryIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function requireCaptureAuthority(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  captures: ReadonlyMap<string, CaptureAuthority>,
  consumedHandles: ReadonlySet<string>,
  input: Readonly<{
    destination: string;
    readToken: string;
    captureHandle: string;
    planDigest: string;
  }>,
  operation: "apply" | "restore" | "settle",
): Effect.Effect<CaptureAuthority, ExportDestinationFailure> {
  return Effect.gen(function* () {
    if (consumedHandles.has(input.captureHandle)) {
      return yield* fail(operation, "HandleConsumed", undefined, "Capture handle has already been consumed");
    }
    const authority = captures.get(input.captureHandle);
    if (authority === undefined) return yield* fail(operation, "InvalidHandle", undefined, "Capture handle is unknown");
    if (authority.readToken !== input.readToken) {
      return yield* fail(operation, "WrongToken", undefined, "Capture handle belongs to another read token");
    }
    if (authority.destination.path !== input.destination) {
      return yield* fail(operation, "WrongDestination", input.destination, "Capture handle belongs to another destination");
    }
    yield* revalidateDestination(fs, path, authority.destination, operation);
    if (authority.planDigest !== undefined && authority.planDigest !== input.planDigest) {
      return yield* fail(operation, "WrongPlan", undefined, "Capture handle belongs to another semantic plan");
    }
    return authority;
  });
}

function allMutationsConverged(
  observations: ReadonlyMap<string, ExportDestinationEntryObservation>,
  mutations: readonly ExportDestinationMutation[],
): boolean {
  return mutations.every((mutation) => {
    const observation = observations.get(mutation.path);
    return observation !== undefined && mutationConverged(observation, mutation);
  });
}

function mutationConverged(
  observation: ExportDestinationEntryObservation,
  mutation: ExportDestinationMutation,
): boolean {
  switch (mutation.kind) {
    case "EnsureDirectory":
      return observation.kind === "Directory" && observation.mode === mutation.mode;
    case "WriteFile":
      return observation.kind === "File"
        && observation.mode === mutation.mode
        && equalBytes(observation.bytes, mutation.bytes);
    case "RemoveFile":
    case "RemoveEmptyDirectory":
      return observation.kind === "Absent";
  }
}

function sameObservationMap(
  observed: ReadonlyMap<string, ExportDestinationEntryObservation>,
  expected: ReadonlyMap<string, ExportDestinationEntryObservation>,
  includeIdentity: boolean,
): boolean {
  if (observed.size !== expected.size) return false;
  for (const [relative, expectedEntry] of expected) {
    const observedEntry = observed.get(relative);
    if (observedEntry === undefined || !sameObservation(observedEntry, expectedEntry, includeIdentity)) return false;
  }
  return true;
}

function sameObservation(
  left: ExportDestinationEntryObservation,
  right: ExportDestinationEntryObservation,
  includeIdentity: boolean,
): boolean {
  if (left.kind !== right.kind || left.path !== right.path) return false;
  if (left.kind === "Absent" || right.kind === "Absent") return left.kind === "Absent" && right.kind === "Absent";
  if (left.mode !== right.mode) return false;
  if (includeIdentity && !sameIdentity(left.identity, right.identity)) return false;
  if (left.kind === "File" || right.kind === "File") {
    return left.kind === "File"
      && right.kind === "File"
      && (!includeIdentity || sameFileStat(left.stat, right.stat))
      && equalBytes(left.bytes, right.bytes);
  }
  if (includeIdentity && !sameDirectoryStat(left.stat, right.stat)) return false;
  if (left.children.length !== right.children.length) return false;
  return left.children.every((child, index) => {
    const peer = right.children[index];
    return peer !== undefined
      && child.name === peer.name
      && child.kind === peer.kind
      && child.mode === peer.mode
      && (!includeIdentity || sameIdentity(child, peer));
  });
}

function recoverablePartial(
  observed: ReadonlyMap<string, ExportDestinationEntryObservation>,
  authority: CaptureAuthority,
): boolean {
  const mutations = new Map((authority.plannedMutations ?? []).map((mutation) => [mutation.path, mutation]));
  if (observed.size !== authority.preimages.size) return false;
  for (const [relative, preimage] of authority.preimages) {
    const current = observed.get(relative);
    if (current === undefined) return false;
    if (sameObservation(current, preimage, true)) continue;
    const mutation = mutations.get(relative);
    if (mutation === undefined || !mutationConverged(current, mutation)) return false;
  }
  return true;
}

function sameFileStat(
  left: Extract<ExportDestinationEntryObservation, { kind: "File" }>["stat"],
  right: Extract<ExportDestinationEntryObservation, { kind: "File" }>["stat"],
): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function sameDirectoryStat(
  left: Extract<ExportDestinationEntryObservation, { kind: "Directory" }>["stat"],
  right: Extract<ExportDestinationEntryObservation, { kind: "Directory" }>["stat"],
): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function replaceMap(
  target: Map<string, ExportDestinationEntryObservation>,
  source: ReadonlyMap<string, ExportDestinationEntryObservation>,
): void {
  target.clear();
  for (const [key, value] of source) target.set(key, value);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function applyMutation(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  destination: DestinationRoot,
  mutation: ExportDestinationMutation,
  authority: CaptureAuthority,
): Effect.Effect<void, ExportDestinationFailure> {
  return Effect.gen(function* () {
    yield* revalidateDestination(fs, path, destination, "apply");
    const candidate = yield* resolveContained(path, destination.path, mutation.path, "apply");
    const parent = path.dirname(candidate);
    yield* requireCanonicalExistingDirectory(fs, path, destination, parent, "apply");
    yield* rejectSymbolicLink(fs, candidate, "apply");
    const current = yield* statIfPresent(fs, candidate, "apply");

    switch (mutation.kind) {
      case "EnsureDirectory": {
        if (current !== undefined) {
          if (current.type !== "Directory" || visibleMode(current.mode) !== mutation.mode) {
            return yield* fail("apply", "IdentityChanged", mutation.path, "Directory creation target is occupied by another exact state");
          }
          return;
        }
        yield* fs.makeDirectory(candidate, { recursive: false, mode: mutation.mode }).pipe(mapPlatform("apply", candidate));
        yield* fs.chmod(candidate, mutation.mode).pipe(mapPlatform("apply", candidate));
        const created = yield* requireCanonicalExistingDirectory(fs, path, destination, candidate, "apply");
        if (visibleMode(created.mode) !== mutation.mode) {
          return yield* fail("apply", "IdentityChanged", mutation.path, "Created directory mode does not match the exact plan");
        }
        return;
      }
      case "WriteFile": {
        if (current?.type === "Directory") {
          return yield* fail("apply", "UnsupportedEntry", mutation.path, "File write target is a directory");
        }
        yield* writeAtomic(fs, path, destination, candidate, mutation.bytes, mutation.mode, authority, "apply");
        return;
      }
      case "RemoveFile": {
        if (current === undefined) return;
        if (current.type !== "File") {
          return yield* fail("apply", "UnsupportedEntry", mutation.path, "File removal target is not a file");
        }
        yield* fs.remove(candidate, { recursive: false, force: false }).pipe(mapPlatform("apply", candidate));
        if ((yield* statIfPresent(fs, candidate, "apply")) !== undefined) {
          return yield* fail("apply", "IdentityChanged", mutation.path, "Removed file remains present");
        }
        return;
      }
      case "RemoveEmptyDirectory": {
        if (current === undefined) return;
        if (current.type !== "Directory") {
          return yield* fail("apply", "UnsupportedEntry", mutation.path, "Directory removal target is not a directory");
        }
        const entries = yield* fs.readDirectory(candidate).pipe(mapPlatform("apply", candidate));
        if (entries.length !== 0) {
          return yield* fail("apply", "IdentityChanged", mutation.path, "Directory removal is bounded to an empty captured directory");
        }
        yield* removeEmptyDirectory(candidate, "apply");
        if ((yield* statIfPresent(fs, candidate, "apply")) !== undefined) {
          return yield* fail("apply", "IdentityChanged", mutation.path, "Removed directory remains present");
        }
      }
    }
  });
}

function restoreObservation(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  destination: DestinationRoot,
  preimage: ExportDestinationEntryObservation,
  authority: CaptureAuthority,
): Effect.Effect<void, ExportDestinationFailure> {
  return Effect.gen(function* () {
    yield* revalidateDestination(fs, path, destination, "restore");
    const candidate = yield* resolveContained(path, destination.path, preimage.path, "restore");
    const parent = path.dirname(candidate);
    yield* requireCanonicalExistingDirectory(fs, path, destination, parent, "restore");
    yield* rejectSymbolicLink(fs, candidate, "restore");
    const current = yield* statIfPresent(fs, candidate, "restore");

    if (preimage.kind === "Absent") {
      if (current === undefined) return;
      if (current.type === "Directory") {
        const entries = yield* fs.readDirectory(candidate).pipe(mapPlatform("restore", candidate));
        if (entries.length !== 0) {
          return yield* fail("restore", "IdentityChanged", preimage.path, "Provider-created directory is no longer empty");
        }
      } else if (current.type !== "File") {
        return yield* fail("restore", "UnsupportedEntry", preimage.path, "Restore target is not a supported provider-created entry");
      }
      if (current.type === "Directory") yield* removeEmptyDirectory(candidate, "restore");
      else yield* fs.remove(candidate, { recursive: false, force: false }).pipe(mapPlatform("restore", candidate));
      return;
    }

    if (preimage.kind === "File") {
      if (current?.type === "Directory") {
        return yield* fail("restore", "UnsupportedEntry", preimage.path, "File preimage is occupied by a directory");
      }
      yield* writeAtomic(fs, path, destination, candidate, preimage.bytes, preimage.mode, authority, "restore");
      return;
    }

    if (current === undefined) {
      yield* fs.makeDirectory(candidate, { recursive: false, mode: preimage.mode }).pipe(mapPlatform("restore", candidate));
    } else if (current.type !== "Directory") {
      return yield* fail("restore", "UnsupportedEntry", preimage.path, "Directory preimage is occupied by another entry type");
    }
    yield* fs.chmod(candidate, preimage.mode).pipe(mapPlatform("restore", candidate));
  });
}

function writeAtomic(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  destination: DestinationRoot,
  target: string,
  bytes: Uint8Array,
  mode: number,
  authority: CaptureAuthority,
  operation: "apply" | "restore",
): Effect.Effect<void, ExportDestinationFailure> {
  return Effect.gen(function* () {
    const parent = path.dirname(target);
    yield* requireCanonicalExistingDirectory(fs, path, destination, parent, operation);
    const temporary = path.join(parent, `${EXPORT_DESTINATION_TEMP_PREFIX}${authority.handle}-${randomUUID()}`);
    if (
      path.dirname(temporary) !== parent
      || !path.basename(temporary).startsWith(EXPORT_DESTINATION_TEMP_PREFIX)
      || !isContained(path, destination.path, temporary)
    ) {
      return yield* fail(operation, "InvalidInput", temporary, "Provider temporary path failed its direct-child containment guard");
    }

    let temporaryOpened = false;
    let temporaryIdentity: OwnedTemporaryIdentity | undefined;
    const attempted = yield* Effect.either(Effect.scoped(Effect.gen(function* () {
      const file = yield* fs.open(temporary, { flag: "wx", mode: 0o600 }).pipe(mapPlatform(operation, temporary));
      temporaryOpened = true;
      temporaryIdentity = yield* openedTemporaryIdentity(file.fd, temporary, operation);
      if (bytes.byteLength > 0) {
        yield* file.writeAll(bytes).pipe(mapPlatform(operation, temporary));
      }
      yield* file.sync.pipe(mapPlatform(operation, temporary));
    }).pipe(
      Effect.andThen(fs.chmod(temporary, mode).pipe(mapPlatform(operation, temporary))),
      Effect.andThen(fs.rename(temporary, target).pipe(mapPlatform(operation, target))),
    )));
    if (attempted._tag === "Right") return;
    if (!temporaryOpened) return yield* Effect.fail(attempted.left);
    if (temporaryIdentity === undefined) {
      return yield* fail(
        operation,
        "CleanupFailed",
        temporary,
        `${attempted.left.detail}; temporary cleanup refused because exact ownership identity was unavailable`,
      );
    }

    const cleanup = yield* Effect.either(cleanupOwnedTemporary(
      fs,
      path,
      destination,
      temporary,
      temporaryIdentity,
    ));
    if (cleanup._tag === "Left") {
      return yield* fail(
        operation,
        "CleanupFailed",
        temporary,
        `${attempted.left.detail}; temporary cleanup also failed: ${cleanup.left.detail}`,
      );
    }
    return yield* Effect.fail(attempted.left);
  });
}

function cleanupOwnedTemporary(
  fs: FileSystem.FileSystem,
  path: Path.Path,
  destination: DestinationRoot,
  temporary: string,
  ownedIdentity: OwnedTemporaryIdentity,
): Effect.Effect<void, ExportDestinationFailure> {
  return Effect.gen(function* () {
    const parent = path.dirname(temporary);
    if (
      !path.basename(temporary).startsWith(EXPORT_DESTINATION_TEMP_PREFIX)
      || !isContained(path, destination.path, temporary)
      || parent === destination.path
      || !isContained(path, destination.path, parent)
    ) {
      return yield* fail("cleanup", "CleanupFailed", temporary, "Temporary cleanup authority failed containment and prefix guards");
    }
    yield* requireCanonicalExistingDirectory(fs, path, destination, parent, "cleanup");
    const currentIdentity = yield* exactTemporaryIdentityIfPresent(temporary);
    if (currentIdentity === undefined) return;
    if (currentIdentity.dev !== ownedIdentity.dev || currentIdentity.ino !== ownedIdentity.ino) {
      return yield* fail(
        "cleanup",
        "CleanupFailed",
        temporary,
        "Temporary cleanup refused a same-path entry with another exact filesystem identity",
      );
    }
    yield* fs.remove(temporary, { recursive: false, force: false }).pipe(mapPlatform("cleanup", temporary));
  });
}

function openedTemporaryIdentity(
  descriptor: FileSystem.File.Descriptor,
  temporary: string,
  operation: "apply" | "restore",
): Effect.Effect<OwnedTemporaryIdentity, ExportDestinationFailure> {
  // Effect's portable File.Info uses numeric identity; cleanup authority retains exact bigint fd identity.
  return Effect.try({
    try: () => {
      const info = fstatSync(Number(descriptor), { bigint: true });
      if (!info.isFile() || info.isSymbolicLink()) throw new TypeError("Opened temporary is not a regular file");
      return Object.freeze({ dev: info.dev, ino: info.ino });
    },
    catch: (error): ExportDestinationFailure => Object.freeze({
      _tag: "ExportDestinationFailure",
      operation,
      reason: "FilesystemFailed",
      path: temporary,
      detail: error instanceof Error ? error.message : String(error),
    }),
  });
}

function exactTemporaryIdentityIfPresent(
  temporary: string,
): Effect.Effect<OwnedTemporaryIdentity | undefined, ExportDestinationFailure> {
  return Effect.tryPromise({
    try: async () => {
      try {
        return await lstat(temporary, { bigint: true });
      } catch (error) {
        if (nativeErrorCode(error) === "ENOENT") return undefined;
        throw error;
      }
    },
    catch: (error): ExportDestinationFailure => Object.freeze({
      _tag: "ExportDestinationFailure",
      operation: "cleanup",
      reason: "FilesystemFailed",
      path: temporary,
      detail: error instanceof Error ? error.message : String(error),
    }),
  }).pipe(Effect.flatMap((info) => {
    if (info === undefined) return Effect.succeed(undefined);
    if (!info.isFile() || info.isSymbolicLink()) {
      return fail("cleanup", "CleanupFailed", temporary, "Temporary cleanup is bounded to one provider-owned regular file");
    }
    return Effect.succeed(Object.freeze({ dev: info.dev, ino: info.ino }));
  }));
}

/** Effect Platform `remove` lowers to `rm`; this narrow gap preserves rmdir's nonrecursive refusal. */
function removeEmptyDirectory(
  candidate: string,
  operation: "apply" | "restore",
): Effect.Effect<void, ExportDestinationFailure> {
  return Effect.tryPromise({
    try: () => rmdir(candidate),
    catch: (error) => {
      const code = nativeErrorCode(error);
      const reason: ExportDestinationFailureReason = code === "ENOENT"
        ? "Missing"
        : code === "ENOTEMPTY" || code === "EEXIST"
          ? "IdentityChanged"
          : "FilesystemFailed";
      return Object.freeze({
        _tag: "ExportDestinationFailure",
        operation,
        reason,
        path: candidate,
        detail: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

function nativeErrorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

function mapPlatform(operation: Operation, path?: string) {
  return <A, R>(effect: Effect.Effect<A, PlatformError, R>): Effect.Effect<A, ExportDestinationFailure, R> =>
    effect.pipe(Effect.mapError((error) => toFailure(operation, path, error)));
}

function toFailure(operation: Operation, path: string | undefined, error: PlatformError): ExportDestinationFailure {
  const reason: ExportDestinationFailureReason = error._tag === "SystemError" && error.reason === "NotFound"
    ? "Missing"
    : "FilesystemFailed";
  return Object.freeze({
    _tag: "ExportDestinationFailure",
    operation,
    reason,
    ...(path === undefined ? {} : { path }),
    detail: error.message,
  });
}

function fail(
  operation: Operation,
  reason: ExportDestinationFailureReason,
  path: string | undefined,
  detail: string,
): Effect.Effect<never, ExportDestinationFailure> {
  return Effect.fail(Object.freeze({
    _tag: "ExportDestinationFailure",
    operation,
    reason,
    ...(path === undefined ? {} : { path }),
    detail,
  }));
}
