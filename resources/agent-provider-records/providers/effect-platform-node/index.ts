import { randomUUID } from "node:crypto";

import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { NodeContext } from "@effect/platform-node";
import type {
  AgentProviderRecordsAsyncPort,
  AgentProviderRecordsFailure,
  AgentProviderRecordsFailureReason,
  AgentProviderRecordsResource,
  ProviderProjectionRecordAddress,
  ProviderRecordAddress,
  ProviderRecordIdentity,
  ProviderRecordObservation,
  ProviderRecordPublicationReceipt,
  ProviderTargetRecordAddress,
  ProviderTargetRecordCapture,
  ProviderTargetRecordKind,
  ProviderTargetRecordMutation,
  ProviderTargetRecordReleaseReceipt,
  ProviderTargetRecordRestoreReceipt,
  ProviderTargetRecordSettleReceipt,
  ProviderTargetRecordWriteReceipt,
} from "@rawr/resource-agent-provider-records";
import { Effect, Option } from "effect";

const RECORD_MODE = 0o600;
const RECORD_SUFFIX = ".json";
const RECORD_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/u;
const PRIVATE_FILE_PREFIX = ".rawr-agent-provider-record-";
const PRIVATE_REMOVAL_PREFIX = ".rawr-agent-provider-record-remove-";
const MAX_RECORD_BYTES = 64 * 1024 * 1024;

type ProviderRequirements = FileSystem.FileSystem | Path.Path;
type Operation = AgentProviderRecordsFailure["operation"];

export interface EffectPlatformNodeAgentProviderRecordsOptions {
  readonly controllerDataRoot: string;
  readonly projectionRoot: string;
  readonly targetRecordsRoot: string;
  readonly onEvent?: (event: AgentProviderRecordsEvent) => void | Promise<void>;
}

export type AgentProviderRecordsEvent =
  | Readonly<{ kind: "AfterTemporaryWrite"; address: ProviderRecordAddress }>
  | Readonly<{ kind: "BeforeAtomicCommit"; address: ProviderRecordAddress }>
  | Readonly<{ kind: "AfterAtomicCommit"; address: ProviderRecordAddress }>;

interface ResolvedRoots {
  readonly controller: string;
  readonly projection: string;
  readonly targets: string;
}

interface ResolvedRecord<A extends ProviderRecordAddress> {
  readonly address: A;
  readonly root: string;
  readonly directory: string;
  readonly path: string;
}

type CaptureLifecycle =
  | "Captured"
  | "Writing"
  | "Partial"
  | "Applied"
  | "Converged"
  | "Restoring"
  | "Restored";

interface CaptureAuthority {
  readonly handle: string;
  readonly address: ProviderTargetRecordAddress;
  readonly readToken: string;
  readonly maxBytes: number;
  readonly preimage: ProviderRecordObservation<ProviderTargetRecordAddress>;
  lifecycle: CaptureLifecycle;
  mutation?: ProviderTargetRecordMutation;
  planDigest?: string;
  postimage?: ProviderRecordObservation<ProviderTargetRecordAddress>;
}

export function makeAgentProviderRecordsResource(
  options: EffectPlatformNodeAgentProviderRecordsOptions
): AgentProviderRecordsResource<ProviderRequirements> {
  const captures = new Map<string, CaptureAuthority>();
  const consumedHandles = new Set<string>();
  const targetMutationFence = Effect.unsafeMakeSemaphore(1);

  const readProjection = Effect.fn("agentProviderRecords.readProjection")(function* (
    input: Readonly<{ address: ProviderProjectionRecordAddress; maxBytes: number }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const roots = yield* resolveRoots(paths, options, "read-projection");
    yield* validateLimit(input.maxBytes, "read-projection");
    const resolved = yield* resolveProjectionRecord(paths, roots, input.address, "read-projection");
    return yield* readRecord(fs, paths, roots, resolved, input.maxBytes, "read-projection");
  });

  const publishProjection = Effect.fn("agentProviderRecords.publishProjection")(function* (
    input: Readonly<{
      address: ProviderProjectionRecordAddress;
      bytes: Uint8Array;
      maxBytes: number;
    }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const roots = yield* resolveRoots(paths, options, "publish-projection");
    yield* validateBytes(input.bytes, input.maxBytes, "publish-projection");
    const resolved = yield* resolveProjectionRecord(
      paths,
      roots,
      input.address,
      "publish-projection"
    );
    const prior = yield* readRecord(
      fs,
      paths,
      roots,
      resolved,
      input.maxBytes,
      "publish-projection"
    );
    if (prior.kind === "Present") {
      if (recordMatches(input.bytes, prior, RECORD_MODE)) {
        return publication("ReadOnlyConverged", input.address);
      }
      return yield* rejected(
        "publish-projection",
        "Occupied",
        "projection-observation",
        resolved.path,
        "Immutable projection record already exists with different bytes"
      );
    }

    yield* ensureDirectoryChain(
      fs,
      paths,
      roots.controller,
      resolved.directory,
      "publish-projection"
    );
    return yield* publishProjectionRecord(
      fs,
      paths,
      roots,
      resolved,
      input.bytes,
      input.maxBytes,
      options
    );
  });

  const readTarget = Effect.fn("agentProviderRecords.readTarget")(function* (
    input: Readonly<{ address: ProviderTargetRecordAddress; maxBytes: number }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const roots = yield* resolveRoots(paths, options, "read-target");
    yield* validateLimit(input.maxBytes, "read-target");
    const resolved = yield* resolveTargetRecord(paths, roots, input.address, "read-target");
    return yield* readRecord(fs, paths, roots, resolved, input.maxBytes, "read-target");
  });

  const captureTarget = Effect.fn("agentProviderRecords.captureTarget")(function* (
    input: Readonly<{
      address: ProviderTargetRecordAddress;
      readToken: string;
      maxBytes: number;
    }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const roots = yield* resolveRoots(paths, options, "capture-target");
    yield* validateOpaque(input.readToken, "readToken", "capture-target");
    yield* validateLimit(input.maxBytes, "capture-target");
    const resolved = yield* resolveTargetRecord(paths, roots, input.address, "capture-target");
    const preimage = yield* readRecord(
      fs,
      paths,
      roots,
      resolved,
      input.maxBytes,
      "capture-target"
    );
    const handle = randomUUID();
    captures.set(handle, {
      handle,
      address: input.address,
      readToken: input.readToken,
      maxBytes: input.maxBytes,
      preimage,
      lifecycle: "Captured",
    });
    return Object.freeze({
      handle,
      readToken: input.readToken,
      observation: copyObservation(preimage),
    }) satisfies ProviderTargetRecordCapture;
  });

  const releaseTargetOperation = Effect.fn("agentProviderRecords.releaseTarget")(function* (
    input: Readonly<{
      address: ProviderTargetRecordAddress;
      readToken: string;
      captureHandle: string;
    }>
  ) {
    const paths = yield* Path.Path;
    const roots = yield* resolveRoots(paths, options, "release-target");
    yield* validateOpaque(input.readToken, "readToken", "release-target");
    yield* validateOpaque(input.captureHandle, "captureHandle", "release-target");
    const resolved = yield* resolveTargetRecord(paths, roots, input.address, "release-target");
    const authority = yield* requireCaptureAuthority(
      captures,
      consumedHandles,
      input,
      "release-target",
      true
    );
    if (authority.lifecycle !== "Captured") {
      return yield* rejected(
        "release-target",
        "HandleState",
        "capture-lifecycle",
        resolved.path,
        `Capture handle cannot release from ${authority.lifecycle}; restore mutated authority instead`
      );
    }
    captures.delete(input.captureHandle);
    consumedHandles.add(input.captureHandle);
    return Object.freeze({
      readToken: input.readToken,
      outcome: "Released",
      handle: input.captureHandle,
    }) satisfies ProviderTargetRecordReleaseReceipt;
  });

  const writeTargetOperation = Effect.fn("agentProviderRecords.writeTarget")(function* (
    input: Readonly<{
      address: ProviderTargetRecordAddress;
      planDigest: string;
      readToken: string;
      captureHandle: string;
      mutation: ProviderTargetRecordMutation;
    }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const roots = yield* resolveRoots(paths, options, "write-target");
    yield* validateOpaque(input.planDigest, "planDigest", "write-target");
    yield* validateOpaque(input.readToken, "readToken", "write-target");
    yield* validateOpaque(input.captureHandle, "captureHandle", "write-target");
    if (input.mutation.kind === "Put") {
      yield* validateBytes(input.mutation.bytes, MAX_RECORD_BYTES, "write-target");
    }
    const resolved = yield* resolveTargetRecord(paths, roots, input.address, "write-target");
    const authority = yield* requireCaptureAuthority(
      captures,
      consumedHandles,
      input,
      "write-target"
    );
    if (input.mutation.kind === "Put") {
      yield* validateBytes(input.mutation.bytes, authority.maxBytes, "write-target");
    }
    yield* bindPlanAndMutation(authority, input.planDigest, input.mutation);
    const current = yield* readRecord(
      fs,
      paths,
      roots,
      resolved,
      authority.maxBytes,
      "write-target"
    );

    if (authority.lifecycle === "Applied" || authority.lifecycle === "Converged") {
      if (
        authority.postimage === undefined ||
        !sameObservationExact(current, authority.postimage) ||
        !mutationMatches(input.mutation, current)
      ) {
        return yield* rejected(
          "write-target",
          "IdentityChanged",
          "repeat-observation",
          resolved.path,
          "Applied target record changed before the converged repeat"
        );
      }
      return writeReceipt(input, "ReadOnlyConverged");
    }
    if (authority.lifecycle !== "Captured") {
      return yield* rejected(
        "write-target",
        "HandleState",
        "capture-lifecycle",
        resolved.path,
        `Capture handle cannot write from ${authority.lifecycle}`
      );
    }
    if (!sameObservationExact(current, authority.preimage)) {
      return yield* rejected(
        "write-target",
        "IdentityChanged",
        "preimage-revalidation",
        resolved.path,
        "Target record changed after capture"
      );
    }
    if (mutationMatches(input.mutation, current)) {
      authority.lifecycle = "Converged";
      authority.postimage = current;
      return writeReceipt(input, "ReadOnlyConverged");
    }

    authority.lifecycle = "Writing";
    const attempted = yield* Effect.either(
      commitTargetMutation(
        fs,
        paths,
        roots,
        resolved,
        current,
        input.mutation,
        RECORD_MODE,
        authority.maxBytes,
        options,
        "write-target"
      )
    );
    if (attempted._tag === "Left") {
      authority.lifecycle = "Partial";
      return yield* Effect.fail(attempted.left);
    }
    const observedPostimage = yield* Effect.either(
      readRecord(fs, paths, roots, resolved, authority.maxBytes, "write-target")
    );
    if (observedPostimage._tag === "Left") {
      authority.lifecycle = "Partial";
      return yield* Effect.fail(observedPostimage.left);
    }
    const postimage = observedPostimage.right;
    if (!mutationMatches(input.mutation, postimage)) {
      authority.lifecycle = "Partial";
      return yield* rejected(
        "write-target",
        "IdentityChanged",
        "postimage-verification",
        resolved.path,
        "Atomic target record publication did not produce the exact requested bytes"
      );
    }
    authority.postimage = postimage;
    authority.lifecycle = "Applied";
    return writeReceipt(input, "Applied");
  });

  const restoreTargetOperation = Effect.fn("agentProviderRecords.restoreTarget")(function* (
    input: Readonly<{
      address: ProviderTargetRecordAddress;
      planDigest: string;
      readToken: string;
      captureHandle: string;
    }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const roots = yield* resolveRoots(paths, options, "restore-target");
    yield* validateOpaque(input.planDigest, "planDigest", "restore-target");
    yield* validateOpaque(input.readToken, "readToken", "restore-target");
    yield* validateOpaque(input.captureHandle, "captureHandle", "restore-target");
    const resolved = yield* resolveTargetRecord(paths, roots, input.address, "restore-target");
    const authority = yield* requireCaptureAuthority(
      captures,
      consumedHandles,
      input,
      "restore-target",
      true
    );
    if (authority.planDigest !== input.planDigest || authority.mutation === undefined) {
      return yield* rejected(
        "restore-target",
        "WrongPlan",
        "restore-binding",
        resolved.path,
        "Restore plan does not match the captured write"
      );
    }
    if (authority.lifecycle === "Restored") {
      return restoreReceipt(input, false);
    }
    if (
      authority.lifecycle !== "Applied" &&
      authority.lifecycle !== "Converged" &&
      authority.lifecycle !== "Partial"
    ) {
      return yield* rejected(
        "restore-target",
        "HandleState",
        "capture-lifecycle",
        resolved.path,
        `Capture handle cannot restore from ${authority.lifecycle}`
      );
    }

    const current = yield* readRecord(
      fs,
      paths,
      roots,
      resolved,
      authority.maxBytes,
      "restore-target"
    );
    if (sameObservationValue(current, authority.preimage)) {
      authority.lifecycle = "Restored";
      authority.postimage = current;
      return restoreReceipt(input, false);
    }
    if (
      authority.lifecycle !== "Partial" &&
      (authority.postimage === undefined || !sameObservationExact(current, authority.postimage))
    ) {
      return yield* rejected(
        "restore-target",
        "IdentityChanged",
        "restore-observation",
        resolved.path,
        "Target record changed after the captured write"
      );
    }
    if (authority.lifecycle === "Partial" && !mutationMatches(authority.mutation, current)) {
      return yield* rejected(
        "restore-target",
        "IdentityChanged",
        "partial-observation",
        resolved.path,
        "Partial target write matches neither captured prior nor requested postimage"
      );
    }

    authority.lifecycle = "Restoring";
    const priorMutation = observationMutation(authority.preimage);
    const priorMode =
      authority.preimage.kind === "Present"
        ? authority.preimage.identity.mode & 0o777
        : RECORD_MODE;
    const attempted = yield* Effect.either(
      commitTargetMutation(
        fs,
        paths,
        roots,
        resolved,
        current,
        priorMutation,
        priorMode,
        authority.maxBytes,
        options,
        "restore-target"
      )
    );
    if (attempted._tag === "Left") {
      authority.lifecycle = "Partial";
      return yield* Effect.fail(attempted.left);
    }
    const restored = yield* readRecord(
      fs,
      paths,
      roots,
      resolved,
      authority.maxBytes,
      "restore-target"
    );
    if (!sameObservationValue(restored, authority.preimage)) {
      authority.lifecycle = "Partial";
      return yield* rejected(
        "restore-target",
        "IdentityChanged",
        "restore-verification",
        resolved.path,
        "Restored target record bytes differ from the captured preimage"
      );
    }
    authority.lifecycle = "Restored";
    authority.postimage = restored;
    return restoreReceipt(input, true);
  });

  const settleTargetOperation = Effect.fn("agentProviderRecords.settleTarget")(function* (
    input: Readonly<{
      address: ProviderTargetRecordAddress;
      planDigest: string;
      readToken: string;
      captureHandle: string;
    }>
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const roots = yield* resolveRoots(paths, options, "settle-target");
    yield* validateOpaque(input.planDigest, "planDigest", "settle-target");
    yield* validateOpaque(input.readToken, "readToken", "settle-target");
    yield* validateOpaque(input.captureHandle, "captureHandle", "settle-target");
    const resolved = yield* resolveTargetRecord(paths, roots, input.address, "settle-target");
    const authority = yield* requireCaptureAuthority(
      captures,
      consumedHandles,
      input,
      "settle-target",
      true
    );
    if (
      authority.lifecycle !== "Applied" &&
      authority.lifecycle !== "Converged" &&
      authority.lifecycle !== "Restored"
    ) {
      return yield* rejected(
        "settle-target",
        "HandleState",
        "capture-lifecycle",
        resolved.path,
        `Capture handle cannot settle from ${authority.lifecycle}`
      );
    }
    if (authority.planDigest !== input.planDigest) {
      return yield* rejected(
        "settle-target",
        "WrongPlan",
        "settle-binding",
        resolved.path,
        "Settlement plan does not match the captured write"
      );
    }
    const current = yield* readRecord(
      fs,
      paths,
      roots,
      resolved,
      authority.maxBytes,
      "settle-target"
    );
    const expected = authority.postimage;
    const verified =
      authority.lifecycle === "Restored"
        ? sameObservationValue(current, authority.preimage)
        : expected !== undefined && sameObservationExact(current, expected);
    if (!verified) {
      return yield* rejected(
        "settle-target",
        "IdentityChanged",
        "settle-verification",
        resolved.path,
        "Target record does not match its verified settlement image"
      );
    }
    captures.delete(input.captureHandle);
    consumedHandles.add(input.captureHandle);
    return Object.freeze({
      planDigest: input.planDigest,
      readToken: input.readToken,
      outcome: "Settled",
      handle: input.captureHandle,
    }) satisfies ProviderTargetRecordSettleReceipt;
  });

  return Object.freeze({
    readProjection,
    publishProjection,
    readTarget,
    captureTarget,
    releaseTarget: (input: Parameters<typeof releaseTargetOperation>[0]) =>
      targetMutationFence.withPermits(1)(releaseTargetOperation(input)),
    writeTarget: (input: Parameters<typeof writeTargetOperation>[0]) =>
      targetMutationFence.withPermits(1)(writeTargetOperation(input)),
    restoreTarget: (input: Parameters<typeof restoreTargetOperation>[0]) =>
      targetMutationFence.withPermits(1)(restoreTargetOperation(input)),
    settleTarget: (input: Parameters<typeof settleTargetOperation>[0]) =>
      targetMutationFence.withPermits(1)(settleTargetOperation(input)),
  });
}

export type NodeAgentProviderRecordsResult<A> =
  | Readonly<{ ok: true; value: A }>
  | Readonly<{ ok: false; failure: AgentProviderRecordsFailure }>;

export function runNodeAgentProviderRecords<A>(
  operation: Effect.Effect<A, AgentProviderRecordsFailure, ProviderRequirements>
): Promise<NodeAgentProviderRecordsResult<A>> {
  return Effect.runPromise(
    operation.pipe(
      Effect.map((value): NodeAgentProviderRecordsResult<A> => Object.freeze({ ok: true, value })),
      Effect.catchAll((failure) =>
        Effect.succeed<NodeAgentProviderRecordsResult<A>>(Object.freeze({ ok: false, failure }))
      ),
      Effect.provide(NodeContext.layer)
    )
  );
}

export function makeNodeAgentProviderRecordsAsyncPort(
  options: EffectPlatformNodeAgentProviderRecordsOptions
): AgentProviderRecordsAsyncPort {
  const resource = makeAgentProviderRecordsResource(options);
  return Object.freeze({
    readProjection: (input: Parameters<typeof resource.readProjection>[0]) =>
      runOrReject(resource.readProjection(input)),
    publishProjection: (input: Parameters<typeof resource.publishProjection>[0]) =>
      runOrReject(resource.publishProjection(input)),
    readTarget: (input: Parameters<typeof resource.readTarget>[0]) =>
      runOrReject(resource.readTarget(input)),
    captureTarget: (input: Parameters<typeof resource.captureTarget>[0]) =>
      runOrReject(resource.captureTarget(input)),
    releaseTarget: (input: Parameters<typeof resource.releaseTarget>[0]) =>
      runOrReject(resource.releaseTarget(input)),
    writeTarget: (input: Parameters<typeof resource.writeTarget>[0]) =>
      runOrReject(resource.writeTarget(input)),
    restoreTarget: (input: Parameters<typeof resource.restoreTarget>[0]) =>
      runOrReject(resource.restoreTarget(input)),
    settleTarget: (input: Parameters<typeof resource.settleTarget>[0]) =>
      runOrReject(resource.settleTarget(input)),
  });
}

function publishProjectionRecord(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  roots: ResolvedRoots,
  resolved: ResolvedRecord<ProviderProjectionRecordAddress>,
  bytes: Uint8Array,
  maxBytes: number,
  options: EffectPlatformNodeAgentProviderRecordsOptions
): Effect.Effect<ProviderRecordPublicationReceipt, AgentProviderRecordsFailure> {
  return Effect.scoped(
    Effect.gen(function* () {
      const temporary = yield* fs
        .makeTempFileScoped({
          directory: resolved.directory,
          prefix: PRIVATE_FILE_PREFIX,
        })
        .pipe(mapPlatform("publish-projection", "temporary-allocation", resolved.directory));
      yield* admitPrivateFile(fs, paths, resolved.directory, temporary, "publish-projection");
      yield* writeTemporary(fs, temporary, bytes, RECORD_MODE, "publish-projection");
      yield* hit(
        options,
        { kind: "AfterTemporaryWrite", address: resolved.address },
        "publish-projection",
        resolved.path
      );
      const prior = yield* readRecord(fs, paths, roots, resolved, maxBytes, "publish-projection");
      if (prior.kind === "Present") {
        return recordMatches(bytes, prior, RECORD_MODE)
          ? publication("ReadOnlyConverged", resolved.address)
          : yield* rejected(
              "publish-projection",
              "Occupied",
              "projection-revalidation",
              resolved.path,
              "Immutable projection record was occupied before publication"
            );
      }
      yield* hit(
        options,
        { kind: "BeforeAtomicCommit", address: resolved.address },
        "publish-projection",
        resolved.path
      );
      const linked = yield* Effect.either(fs.link(temporary, resolved.path));
      if (linked._tag === "Left") {
        if (linked.left._tag !== "SystemError" || linked.left.reason !== "AlreadyExists") {
          return yield* Effect.fail(
            platformFailure("publish-projection", "projection-link", resolved.path, linked.left)
          );
        }
        const winner = yield* readRecord(
          fs,
          paths,
          roots,
          resolved,
          maxBytes,
          "publish-projection"
        );
        if (winner.kind === "Present" && recordMatches(bytes, winner, RECORD_MODE)) {
          return publication("ReadOnlyConverged", resolved.address);
        }
        return yield* rejected(
          "publish-projection",
          "Occupied",
          "projection-race",
          resolved.path,
          "Concurrent projection publication used different bytes"
        );
      }
      yield* fs
        .remove(temporary)
        .pipe(mapPlatform("cleanup", "projection-temporary-release", temporary, "CleanupFailed"));
      yield* hit(
        options,
        { kind: "AfterAtomicCommit", address: resolved.address },
        "publish-projection",
        resolved.path
      );
      yield* syncPath(fs, resolved.directory, "publish-projection", "projection-parent-sync");
      const published = yield* readRecord(
        fs,
        paths,
        roots,
        resolved,
        maxBytes,
        "publish-projection"
      );
      if (published.kind !== "Present" || !recordMatches(bytes, published, RECORD_MODE)) {
        return yield* rejected(
          "publish-projection",
          "IdentityChanged",
          "projection-verification",
          resolved.path,
          "Published projection record does not contain the exact requested bytes"
        );
      }
      return publication("Published", resolved.address);
    })
  );
}

function commitTargetMutation(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  roots: ResolvedRoots,
  resolved: ResolvedRecord<ProviderTargetRecordAddress>,
  expected: ProviderRecordObservation<ProviderTargetRecordAddress>,
  mutation: ProviderTargetRecordMutation,
  mode: number,
  maxBytes: number,
  options: EffectPlatformNodeAgentProviderRecordsOptions,
  operation: "write-target" | "restore-target"
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return Effect.scoped(
    Effect.gen(function* () {
      yield* ensureDirectoryChain(fs, paths, roots.controller, resolved.directory, operation);
      if (mutation.kind === "Put") {
        const temporary = yield* fs
          .makeTempFileScoped({
            directory: resolved.directory,
            prefix: PRIVATE_FILE_PREFIX,
          })
          .pipe(mapPlatform(operation, "temporary-allocation", resolved.directory));
        yield* admitPrivateFile(fs, paths, resolved.directory, temporary, operation);
        yield* writeTemporary(fs, temporary, mutation.bytes, mode, operation);
        yield* hit(
          options,
          { kind: "AfterTemporaryWrite", address: resolved.address },
          operation,
          resolved.path
        );
        const current = yield* readRecord(fs, paths, roots, resolved, maxBytes, operation);
        if (!sameObservationExact(current, expected)) {
          return yield* rejected(
            operation,
            "IdentityChanged",
            "precommit-revalidation",
            resolved.path,
            "Target record changed immediately before atomic publication"
          );
        }
        yield* hit(
          options,
          { kind: "BeforeAtomicCommit", address: resolved.address },
          operation,
          resolved.path
        );
        yield* fs
          .rename(temporary, resolved.path)
          .pipe(mapPlatform(operation, "atomic-replace", resolved.path));
      } else {
        const allocation = yield* fs
          .makeTempDirectoryScoped({
            directory: resolved.directory,
            prefix: PRIVATE_REMOVAL_PREFIX,
          })
          .pipe(mapPlatform(operation, "removal-allocation", resolved.directory));
        yield* admitPrivateDirectory(fs, paths, resolved.directory, allocation, operation);
        const tombstone = paths.join(allocation, "record");
        const current = yield* readRecord(fs, paths, roots, resolved, maxBytes, operation);
        if (!sameObservationExact(current, expected) || current.kind !== "Present") {
          return yield* rejected(
            operation,
            "IdentityChanged",
            "precommit-revalidation",
            resolved.path,
            "Target record changed immediately before atomic removal"
          );
        }
        yield* hit(
          options,
          { kind: "BeforeAtomicCommit", address: resolved.address },
          operation,
          resolved.path
        );
        yield* fs
          .rename(resolved.path, tombstone)
          .pipe(mapPlatform(operation, "atomic-remove", resolved.path));
      }
      yield* hit(
        options,
        { kind: "AfterAtomicCommit", address: resolved.address },
        operation,
        resolved.path
      );
      yield* syncPath(fs, resolved.directory, operation, "target-parent-sync");
    })
  );
}

function readRecord<A extends ProviderRecordAddress>(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  roots: ResolvedRoots,
  resolved: ResolvedRecord<A>,
  maxBytes: number,
  operation: Operation
): Effect.Effect<ProviderRecordObservation<A>, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    const present = yield* requireExistingDirectoryChain(
      fs,
      paths,
      roots.controller,
      resolved.directory,
      operation
    );
    if (!present) return absent(resolved.address);
    const exists = yield* fs
      .exists(resolved.path)
      .pipe(mapPlatform(operation, "record-exists", resolved.path));
    if (!exists) return absent(resolved.address);
    return yield* readPresentRecord(fs, resolved, maxBytes, operation);
  });
}

function readPresentRecord<A extends ProviderRecordAddress>(
  fs: FileSystem.FileSystem,
  resolved: ResolvedRecord<A>,
  maxBytes: number,
  operation: Operation
): Effect.Effect<ProviderRecordObservation<A>, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    const canonical = yield* fs
      .realPath(resolved.path)
      .pipe(mapPlatform(operation, "record-realpath", resolved.path));
    const before = yield* fs
      .stat(resolved.path)
      .pipe(mapPlatform(operation, "record-stat", resolved.path));
    const size = Number(before.size);
    const nlink = Option.getOrUndefined(before.nlink);
    if (
      canonical !== resolved.path ||
      before.type !== "File" ||
      nlink !== 1 ||
      !Number.isSafeInteger(size) ||
      size < 0
    ) {
      return yield* rejected(
        operation,
        "Aliased",
        "record-admission",
        resolved.path,
        "Provider record must be one canonical unaliased regular file"
      );
    }
    if (size > maxBytes) {
      return yield* rejected(
        operation,
        "LimitExceeded",
        "record-size",
        resolved.path,
        "Provider record exceeds maxBytes"
      );
    }
    const bytes = yield* fs
      .readFile(resolved.path)
      .pipe(mapPlatform(operation, "record-read", resolved.path));
    const after = yield* fs
      .stat(resolved.path)
      .pipe(mapPlatform(operation, "record-revalidation", resolved.path));
    if (bytes.byteLength !== size || !sameFileInfo(before, after)) {
      return yield* rejected(
        operation,
        "IdentityChanged",
        "record-revalidation",
        resolved.path,
        "Provider record identity changed while its bytes were read"
      );
    }
    return Object.freeze({
      kind: "Present",
      address: resolved.address,
      identity: recordIdentity(before),
      bytes: new Uint8Array(bytes),
    });
  });
}

function resolveRoots(
  paths: Path.Path,
  options: EffectPlatformNodeAgentProviderRecordsOptions,
  operation: Operation
): Effect.Effect<ResolvedRoots, AgentProviderRecordsFailure> {
  return checked(operation, "root-config", undefined, () => {
    const controller = requireCanonicalLexicalRoot(
      paths,
      options.controllerDataRoot,
      "controllerDataRoot"
    );
    const projection = requireCanonicalLexicalRoot(paths, options.projectionRoot, "projectionRoot");
    const targets = requireCanonicalLexicalRoot(
      paths,
      options.targetRecordsRoot,
      "targetRecordsRoot"
    );
    if (!isContained(paths, controller, projection) || !isContained(paths, controller, targets)) {
      throw new Error("Projection and target record roots must be contained by controllerDataRoot");
    }
    if (
      projection === targets ||
      isContained(paths, projection, targets) ||
      isContained(paths, targets, projection)
    ) {
      throw new Error("Projection and target record roots must be disjoint");
    }
    return Object.freeze({ controller, projection, targets });
  });
}

function resolveProjectionRecord(
  paths: Path.Path,
  roots: ResolvedRoots,
  address: ProviderProjectionRecordAddress,
  operation: Operation
): Effect.Effect<ResolvedRecord<ProviderProjectionRecordAddress>, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    yield* checked(operation, "projection-address", undefined, () => {
      if (
        address.scope !== "Projection" ||
        (address.kind !== "Manifest" && address.kind !== "Member")
      ) {
        throw new Error("Projection address must use one admitted projection record kind");
      }
    });
    yield* validateRecordKey(address.key, operation);
    const directory =
      address.kind === "Manifest"
        ? paths.join(roots.projection, "manifests")
        : paths.join(roots.projection, "members");
    return Object.freeze({
      address,
      root: roots.projection,
      directory,
      path: paths.join(directory, `${address.key}${RECORD_SUFFIX}`),
    });
  });
}

function resolveTargetRecord(
  paths: Path.Path,
  roots: ResolvedRoots,
  address: ProviderTargetRecordAddress,
  operation: Operation
): Effect.Effect<ResolvedRecord<ProviderTargetRecordAddress>, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    yield* checked(operation, "target-address", undefined, () => {
      if (
        address.scope !== "Target" ||
        (address.kind !== "Identity" && address.kind !== "Receipt")
      ) {
        throw new Error("Target address must use one admitted target record kind");
      }
    });
    yield* validateRecordKey(address.targetKey, operation);
    const directory = targetDirectory(paths, roots, address.kind);
    return Object.freeze({
      address,
      root: roots.targets,
      directory,
      path: paths.join(directory, `${address.targetKey}${RECORD_SUFFIX}`),
    });
  });
}

function targetDirectory(
  paths: Path.Path,
  roots: ResolvedRoots,
  kind: ProviderTargetRecordKind
): string {
  return kind === "Identity"
    ? paths.join(roots.targets, "identities")
    : paths.join(roots.targets, "receipts");
}

function ensureDirectoryChain(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  controller: string,
  directory: string,
  operation: Operation
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    yield* requireControllerRoot(fs, controller, operation);
    const relative = paths.relative(controller, directory);
    let current = controller;
    for (const segment of relative.split(paths.sep).filter((entry) => entry.length > 0)) {
      current = paths.join(current, segment);
      const exists = yield* fs
        .exists(current)
        .pipe(mapPlatform(operation, "directory-exists", current));
      if (!exists) {
        const made = yield* Effect.either(fs.makeDirectory(current, { mode: 0o700 }));
        if (
          made._tag === "Left" &&
          (made.left._tag !== "SystemError" || made.left.reason !== "AlreadyExists")
        ) {
          return yield* Effect.fail(
            platformFailure(operation, "directory-create", current, made.left)
          );
        }
      }
      yield* requireCanonicalDirectory(fs, current, operation);
    }
  });
}

function requireExistingDirectoryChain(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  controller: string,
  directory: string,
  operation: Operation
): Effect.Effect<boolean, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    yield* requireControllerRoot(fs, controller, operation);
    const relative = paths.relative(controller, directory);
    let current = controller;
    for (const segment of relative.split(paths.sep).filter((entry) => entry.length > 0)) {
      current = paths.join(current, segment);
      const exists = yield* fs
        .exists(current)
        .pipe(mapPlatform(operation, "directory-exists", current));
      if (!exists) return false;
      yield* requireCanonicalDirectory(fs, current, operation);
    }
    return true;
  });
}

function requireControllerRoot(
  fs: FileSystem.FileSystem,
  controller: string,
  operation: Operation
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    const exists = yield* fs
      .exists(controller)
      .pipe(mapPlatform(operation, "controller-root-exists", controller));
    if (!exists) {
      return yield* rejected(
        operation,
        "MissingControllerRoot",
        "controller-root",
        controller,
        "Explicit controller data root does not exist"
      );
    }
    yield* requireCanonicalDirectory(fs, controller, operation);
  });
}

function requireCanonicalDirectory(
  fs: FileSystem.FileSystem,
  candidate: string,
  operation: Operation
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    const canonical = yield* fs
      .realPath(candidate)
      .pipe(mapPlatform(operation, "directory-realpath", candidate));
    const info = yield* fs
      .stat(candidate)
      .pipe(mapPlatform(operation, "directory-stat", candidate));
    if (canonical !== candidate || info.type !== "Directory") {
      return yield* rejected(
        operation,
        "Aliased",
        "directory-admission",
        candidate,
        "Provider record directory must be canonical and non-aliased"
      );
    }
  });
}

function admitPrivateFile(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  parent: string,
  temporary: string,
  operation: Operation
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    const allocation = paths.dirname(temporary);
    if (
      paths.dirname(allocation) !== parent ||
      !paths.basename(allocation).startsWith(PRIVATE_FILE_PREFIX)
    ) {
      return yield* rejected(
        "cleanup",
        "CleanupFailed",
        "temporary-containment",
        temporary,
        "Scoped temporary file escaped its exact record directory"
      );
    }
    yield* requireCanonicalDirectory(fs, parent, operation);
    yield* requireCanonicalDirectory(fs, allocation, operation);
    const canonical = yield* fs
      .realPath(temporary)
      .pipe(mapPlatform(operation, "temporary-realpath", temporary));
    const info = yield* fs
      .stat(temporary)
      .pipe(mapPlatform(operation, "temporary-stat", temporary));
    if (canonical !== temporary || info.type !== "File") {
      return yield* rejected(
        "cleanup",
        "CleanupFailed",
        "temporary-admission",
        temporary,
        "Scoped temporary must be a canonical regular file"
      );
    }
  });
}

function admitPrivateDirectory(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  parent: string,
  allocation: string,
  operation: Operation
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    if (
      paths.dirname(allocation) !== parent ||
      !paths.basename(allocation).startsWith(PRIVATE_REMOVAL_PREFIX)
    ) {
      return yield* rejected(
        "cleanup",
        "CleanupFailed",
        "removal-containment",
        allocation,
        "Scoped removal directory escaped its exact record directory"
      );
    }
    yield* requireCanonicalDirectory(fs, parent, operation);
    yield* requireCanonicalDirectory(fs, allocation, operation);
  });
}

function writeTemporary(
  fs: FileSystem.FileSystem,
  temporary: string,
  bytes: Uint8Array,
  mode: number,
  operation: Operation
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    yield* fs
      .writeFile(temporary, bytes, { flag: "w", mode })
      .pipe(mapPlatform(operation, "temporary-write", temporary));
    yield* fs.chmod(temporary, mode).pipe(mapPlatform(operation, "temporary-mode", temporary));
    yield* syncPath(fs, temporary, operation, "temporary-sync");
    const observed = yield* fs
      .readFile(temporary)
      .pipe(mapPlatform(operation, "temporary-read", temporary));
    if (!equalBytes(observed, bytes)) {
      return yield* rejected(
        operation,
        "IdentityChanged",
        "temporary-verification",
        temporary,
        "Scoped temporary bytes differ from the write request"
      );
    }
  });
}

function syncPath(
  fs: FileSystem.FileSystem,
  candidate: string,
  operation: Operation,
  phase: string
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return Effect.scoped(
    Effect.gen(function* () {
      const file = yield* fs
        .open(candidate, { flag: "r" })
        .pipe(mapPlatform(operation, phase, candidate));
      yield* file.sync.pipe(mapPlatform(operation, phase, candidate));
    })
  );
}

function requireCaptureAuthority(
  captures: ReadonlyMap<string, CaptureAuthority>,
  consumedHandles: ReadonlySet<string>,
  input: Readonly<{
    address: ProviderTargetRecordAddress;
    readToken: string;
    captureHandle: string;
  }>,
  operation: "release-target" | "write-target" | "restore-target" | "settle-target",
  allowRestored = false
): Effect.Effect<CaptureAuthority, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    if (consumedHandles.has(input.captureHandle)) {
      return yield* rejected(
        operation,
        "HandleConsumed",
        "capture-handle",
        undefined,
        "Capture handle has already been consumed"
      );
    }
    const authority = captures.get(input.captureHandle);
    if (authority === undefined) {
      return yield* rejected(
        operation,
        "InvalidHandle",
        "capture-handle",
        undefined,
        "Capture handle is not owned by this provider instance"
      );
    }
    if (!sameAddress(authority.address, input.address)) {
      return yield* rejected(
        operation,
        "WrongAddress",
        "capture-address",
        undefined,
        "Capture handle belongs to another provider target record"
      );
    }
    if (authority.readToken !== input.readToken) {
      return yield* rejected(
        operation,
        "WrongToken",
        "capture-token",
        undefined,
        "Capture handle read token does not match"
      );
    }
    if (!allowRestored && authority.lifecycle === "Restored") {
      return yield* rejected(
        operation,
        "HandleConsumed",
        "capture-lifecycle",
        undefined,
        "Restored capture handle cannot be written again"
      );
    }
    return authority;
  });
}

function bindPlanAndMutation(
  authority: CaptureAuthority,
  planDigest: string,
  mutation: ProviderTargetRecordMutation
): Effect.Effect<void, AgentProviderRecordsFailure> {
  if (authority.planDigest !== undefined && authority.planDigest !== planDigest) {
    return rejected(
      "write-target",
      "WrongPlan",
      "write-binding",
      undefined,
      "Capture handle is already bound to another plan"
    );
  }
  if (authority.mutation !== undefined && !sameMutation(authority.mutation, mutation)) {
    return rejected(
      "write-target",
      "WrongPlan",
      "write-binding",
      undefined,
      "Capture handle is already bound to another mutation"
    );
  }
  authority.planDigest = planDigest;
  authority.mutation = copyMutation(mutation);
  return Effect.void;
}

function validateRecordKey(
  key: string,
  operation: Operation
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return checked(operation, "record-key", undefined, () => {
    if (!RECORD_KEY_PATTERN.test(key))
      throw new Error("Record key must be one bounded path-free segment");
  });
}

function validateLimit(
  maxBytes: number,
  operation: Operation
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return checked(operation, "max-bytes", undefined, () => {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > MAX_RECORD_BYTES) {
      throw new Error(`maxBytes must be a safe integer between zero and ${MAX_RECORD_BYTES}`);
    }
  });
}

function validateBytes(
  bytes: Uint8Array,
  maxBytes: number,
  operation: Operation
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return Effect.gen(function* () {
    yield* validateLimit(maxBytes, operation);
    if (!(bytes instanceof Uint8Array) || bytes.byteLength > maxBytes) {
      return yield* rejected(
        operation,
        "LimitExceeded",
        "record-bytes",
        undefined,
        "Record bytes exceed their declared bound"
      );
    }
  });
}

function validateOpaque(
  value: string,
  label: string,
  operation: Operation
): Effect.Effect<void, AgentProviderRecordsFailure> {
  return checked(operation, label, undefined, () => {
    if (value.length < 1 || value.length > 512 || /[\u0000-\u001f\u007f]/u.test(value)) {
      throw new Error(`${label} must be one bounded non-control string`);
    }
  });
}

function requireCanonicalLexicalRoot(paths: Path.Path, root: string, label: string): string {
  if (!paths.isAbsolute(root) || paths.normalize(root) !== root || paths.resolve(root) !== root) {
    throw new Error(`${label} must be an absolute lexically canonical path`);
  }
  return root;
}

function isContained(paths: Path.Path, root: string, candidate: string): boolean {
  const relative = paths.relative(root, candidate);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${paths.sep}`) &&
    !paths.isAbsolute(relative)
  );
}

function recordIdentity(info: FileSystem.File.Info): ProviderRecordIdentity {
  return Object.freeze({
    dev: info.dev,
    ino: Option.getOrUndefined(info.ino) ?? null,
    mode: info.mode,
    size: Number(info.size),
    mtimeMillis: Option.getOrUndefined(info.mtime)?.getTime() ?? null,
  });
}

function sameFileInfo(left: FileSystem.File.Info, right: FileSystem.File.Info): boolean {
  return (
    left.type === right.type &&
    left.dev === right.dev &&
    Option.getOrUndefined(left.ino) === Option.getOrUndefined(right.ino) &&
    left.mode === right.mode &&
    Number(left.size) === Number(right.size) &&
    Option.getOrUndefined(left.mtime)?.getTime() ===
      Option.getOrUndefined(right.mtime)?.getTime() &&
    Option.getOrUndefined(left.nlink) === Option.getOrUndefined(right.nlink)
  );
}

function sameObservationExact<A extends ProviderRecordAddress>(
  left: ProviderRecordObservation<A>,
  right: ProviderRecordObservation<A>
): boolean {
  if (!sameAddress(left.address, right.address) || left.kind !== right.kind) return false;
  if (left.kind === "Absent" || right.kind === "Absent") return true;
  return sameIdentity(left.identity, right.identity) && equalBytes(left.bytes, right.bytes);
}

function sameObservationValue<A extends ProviderRecordAddress>(
  left: ProviderRecordObservation<A>,
  right: ProviderRecordObservation<A>
): boolean {
  if (!sameAddress(left.address, right.address) || left.kind !== right.kind) return false;
  return left.kind === "Absent" || right.kind === "Absent"
    ? true
    : equalBytes(left.bytes, right.bytes);
}

function sameIdentity(left: ProviderRecordIdentity, right: ProviderRecordIdentity): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeMillis === right.mtimeMillis
  );
}

function sameAddress(left: ProviderRecordAddress, right: ProviderRecordAddress): boolean {
  if (left.scope !== right.scope || left.kind !== right.kind) return false;
  return left.scope === "Projection" && right.scope === "Projection"
    ? left.key === right.key
    : left.scope === "Target" && right.scope === "Target" && left.targetKey === right.targetKey;
}

function sameMutation(
  left: ProviderTargetRecordMutation,
  right: ProviderTargetRecordMutation
): boolean {
  return (
    left.kind === right.kind &&
    (left.kind === "Remove" || (right.kind === "Put" && equalBytes(left.bytes, right.bytes)))
  );
}

function mutationMatches(
  mutation: ProviderTargetRecordMutation,
  observation: ProviderRecordObservation<ProviderTargetRecordAddress>
): boolean {
  return mutation.kind === "Remove"
    ? observation.kind === "Absent"
    : observation.kind === "Present" && recordMatches(mutation.bytes, observation, RECORD_MODE);
}

function recordMatches<A extends ProviderRecordAddress>(
  bytes: Uint8Array,
  observation: Extract<ProviderRecordObservation<A>, { readonly kind: "Present" }>,
  mode: number
): boolean {
  return equalBytes(bytes, observation.bytes) && (observation.identity.mode & 0o777) === mode;
}

function observationMutation(
  observation: ProviderRecordObservation<ProviderTargetRecordAddress>
): ProviderTargetRecordMutation {
  return observation.kind === "Absent"
    ? Object.freeze({ kind: "Remove" })
    : Object.freeze({ kind: "Put", bytes: new Uint8Array(observation.bytes) });
}

function copyMutation(mutation: ProviderTargetRecordMutation): ProviderTargetRecordMutation {
  return mutation.kind === "Remove"
    ? Object.freeze({ kind: "Remove" })
    : Object.freeze({ kind: "Put", bytes: new Uint8Array(mutation.bytes) });
}

function copyObservation<A extends ProviderRecordAddress>(
  observation: ProviderRecordObservation<A>
): ProviderRecordObservation<A> {
  return observation.kind === "Absent"
    ? Object.freeze({ kind: "Absent", address: observation.address })
    : Object.freeze({
        kind: "Present",
        address: observation.address,
        identity: observation.identity,
        bytes: new Uint8Array(observation.bytes),
      });
}

function absent<A extends ProviderRecordAddress>(address: A): ProviderRecordObservation<A> {
  return Object.freeze({ kind: "Absent", address });
}

function publication(
  outcome: ProviderRecordPublicationReceipt["outcome"],
  address: ProviderProjectionRecordAddress
): ProviderRecordPublicationReceipt {
  return Object.freeze({ outcome, address });
}

function writeReceipt(
  input: Readonly<{
    address: ProviderTargetRecordAddress;
    planDigest: string;
    readToken: string;
  }>,
  outcome: ProviderTargetRecordWriteReceipt["outcome"]
): ProviderTargetRecordWriteReceipt {
  return Object.freeze({
    planDigest: input.planDigest,
    readToken: input.readToken,
    outcome,
    address: input.address,
  });
}

function restoreReceipt(
  input: Readonly<{
    address: ProviderTargetRecordAddress;
    planDigest: string;
    readToken: string;
  }>,
  changed: boolean
): ProviderTargetRecordRestoreReceipt {
  return Object.freeze({
    planDigest: input.planDigest,
    readToken: input.readToken,
    outcome: "Restored",
    address: input.address,
    changed,
  });
}

function hit(
  options: EffectPlatformNodeAgentProviderRecordsOptions,
  event: AgentProviderRecordsEvent,
  operation: Operation,
  path: string
): Effect.Effect<void, AgentProviderRecordsFailure> {
  const onEvent = options.onEvent;
  if (onEvent === undefined) return Effect.void;
  return Effect.tryPromise({
    try: async () => {
      await onEvent(event);
    },
    catch: (cause) =>
      failure(
        operation,
        "FilesystemFailed",
        `event:${event.kind}`,
        path,
        `Provider event failed: ${errorMessage(cause)}`
      ),
  });
}

function checked<A>(
  operation: Operation,
  phase: string,
  path: string | undefined,
  evaluate: () => A
): Effect.Effect<A, AgentProviderRecordsFailure> {
  return Effect.try({
    try: evaluate,
    catch: (cause) => failure(operation, "InvalidInput", phase, path, errorMessage(cause)),
  });
}

function mapPlatform(
  operation: Operation,
  phase: string,
  path: string,
  reason: AgentProviderRecordsFailureReason = "FilesystemFailed"
) {
  return <A, R>(effect: Effect.Effect<A, PlatformError, R>) =>
    effect.pipe(Effect.mapError((cause) => failure(operation, reason, phase, path, cause.message)));
}

function platformFailure(
  operation: Operation,
  phase: string,
  path: string,
  cause: PlatformError
): AgentProviderRecordsFailure {
  return failure(operation, "FilesystemFailed", phase, path, cause.message);
}

function rejected(
  operation: Operation,
  reason: AgentProviderRecordsFailureReason,
  phase: string,
  path: string | undefined,
  detail: string
): Effect.Effect<never, AgentProviderRecordsFailure> {
  return Effect.fail(failure(operation, reason, phase, path, detail));
}

function failure(
  operation: Operation,
  reason: AgentProviderRecordsFailureReason,
  phase: string,
  path: string | undefined,
  detail: string
): AgentProviderRecordsFailure {
  return Object.freeze({
    _tag: "AgentProviderRecordsFailure",
    operation,
    reason,
    phase,
    ...(path === undefined ? {} : { path }),
    detail,
  });
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

function errorMessage(error: unknown): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "detail" in error &&
    typeof error.detail === "string"
  ) {
    return error.detail;
  }
  return error instanceof Error ? error.message : String(error);
}

function runOrReject<A>(
  operation: Effect.Effect<A, AgentProviderRecordsFailure, ProviderRequirements>
): Promise<A> {
  return runNodeAgentProviderRecords(operation).then((result) =>
    result.ok ? result.value : Promise.reject(result.failure)
  );
}
