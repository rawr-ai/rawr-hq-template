import type {
  ArtifactRepositoryAsyncPort,
  ArtifactTreeEntry,
} from "@rawr/resource-agent-plugin-artifact-repository";
import type {
  AgentProviderRecordsAsyncPort,
  AgentProviderRecordsFailure,
  ProviderProjectionRecordAddress,
  ProviderRecordAddress,
  ProviderRecordObservation,
  ProviderTargetRecordAddress,
} from "@rawr/resource-agent-provider-records";

import { MAX_RELEASE_SET_PAYLOAD_BYTES, parseReleaseRelativePath } from "../../../shared/release";
import { type DeploymentResult, failure, issue, success } from "../model/errors/deployment-result";
import type {
  FlatProjectionRecordCollection,
  ImmutableProviderTreeCollection,
  ImmutableProviderTreeFile,
  ImmutableProviderTreeKey,
  ImmutableProviderTreeObservation,
  ImmutableProviderTreePublication,
  ProjectionRecordKey,
  ProjectionRecordObservation,
  ProjectionRecordPublication,
} from "../model/repositories/projection-storage";
import type {
  PathlessTargetRecordCollection,
  TargetRecordCapture,
  TargetRecordCaptureHandle,
  TargetRecordKey,
  TargetRecordMutation,
  TargetRecordObservation,
  TargetRecordPlanInput,
  TargetRecordReadToken,
  TargetRecordRestoreObservation,
  TargetRecordWriteObservation,
} from "../model/repositories/target-record-storage";
import {
  createPathlessProjectionStorage,
  type PathlessProjectionStorage,
} from "./projection-storage";
import { providerTreeAddress, sameProviderTreeAddress } from "./resource-tree-address";
import { createPathlessTargetState, type PathlessTargetState } from "./target-records";

const MAX_RECORD_BYTES = MAX_RELEASE_SET_PAYLOAD_BYTES;
const PROVIDER_TREE_LIMITS = Object.freeze({
  maxEntries: 200_000,
  maxBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
});

export interface ResourceProviderRecordStateOptions {
  readonly records: AgentProviderRecordsAsyncPort;
  readonly trees: ArtifactRepositoryAsyncPort;
  readonly projectionRepositoryRoot: string;
}

export interface ProviderRecordState {
  readonly projections: PathlessProjectionStorage;
  readonly targets: PathlessTargetState;
}

// oRPC provider middleware runs per procedure; key the semantic state to its
// stable raw resources so retained transaction authority survives that call.
const statesByRecords = new WeakMap<
  AgentProviderRecordsAsyncPort,
  WeakMap<ArtifactRepositoryAsyncPort, Map<string, ProviderRecordState>>
>();

/**
 * Binds mechanical resource ports once, then exposes only service-owned
 * projection and target-state semantics to lifecycle applications.
 */
export function createResourceProviderRecordState(
  options: ResourceProviderRecordStateOptions
): ProviderRecordState {
  let statesByTrees = statesByRecords.get(options.records);
  if (statesByTrees === undefined) {
    statesByTrees = new WeakMap();
    statesByRecords.set(options.records, statesByTrees);
  }
  let statesByRoot = statesByTrees.get(options.trees);
  if (statesByRoot === undefined) {
    statesByRoot = new Map();
    statesByTrees.set(options.trees, statesByRoot);
  }
  const existing = statesByRoot.get(options.projectionRepositoryRoot);
  if (existing !== undefined) return existing;

  const projections = createPathlessProjectionStorage({
    records: createProjectionRecordCollection(options.records),
    trees: createProviderTreeCollection(options.trees, options.projectionRepositoryRoot),
  });
  const targets = createPathlessTargetState(createTargetRecordCollection(options.records));
  const state = Object.freeze({ projections, targets });
  statesByRoot.set(options.projectionRepositoryRoot, state);
  return state;
}

function createProjectionRecordCollection(
  port: AgentProviderRecordsAsyncPort
): FlatProjectionRecordCollection {
  return Object.freeze({
    async read(key: ProjectionRecordKey): Promise<DeploymentResult<ProjectionRecordObservation>> {
      const address = projectionAddress(key);
      try {
        const observed = await port.readProjection({ address, maxBytes: MAX_RECORD_BYTES });
        if (!sameAddress(observed.address, address)) {
          return recordFailure(
            "projection.read",
            "Provider record resource returned a foreign address"
          );
        }
        return success(observationFromResource(observed));
      } catch (error) {
        return recordFailure("projection.read", resourceFailureDetail(error));
      }
    },
    async publish(
      key: ProjectionRecordKey,
      bytes: Uint8Array
    ): Promise<DeploymentResult<ProjectionRecordPublication>> {
      const address = projectionAddress(key);
      try {
        const published = await port.publishProjection({
          address,
          bytes: new Uint8Array(bytes),
          maxBytes: MAX_RECORD_BYTES,
        });
        if (!sameAddress(published.address, address)) {
          return recordFailure(
            "projection.publish",
            "Provider record resource published a foreign address"
          );
        }
        return success(
          Object.freeze({
            kind: published.outcome === "Published" ? "published" : "existing",
          })
        );
      } catch (error) {
        return recordFailure("projection.publish", resourceFailureDetail(error));
      }
    },
  });
}

function createTargetRecordCollection(
  port: AgentProviderRecordsAsyncPort
): PathlessTargetRecordCollection {
  let readSequence = 0;
  const retainedCaptures: TargetRecordCapture[] = [];
  const retainedPlans: TargetRecordPlanInput[] = [];

  const collection: PathlessTargetRecordCollection = {
    async read(key: TargetRecordKey): Promise<DeploymentResult<TargetRecordObservation>> {
      const address = targetAddress(key);
      try {
        const observed = await port.readTarget({ address, maxBytes: MAX_RECORD_BYTES });
        if (!sameAddress(observed.address, address)) {
          return recordFailure(
            "target.read",
            "Provider record resource returned a foreign address"
          );
        }
        return success(observationFromResource(observed));
      } catch (error) {
        return recordFailure("target.read", resourceFailureDetail(error));
      }
    },
    async capture(key: TargetRecordKey): Promise<DeploymentResult<TargetRecordCapture>> {
      const address = targetAddress(key);
      const readToken = `target-record-read-${++readSequence}`;
      try {
        const captured = await port.captureTarget({
          address,
          readToken,
          maxBytes: MAX_RECORD_BYTES,
        });
        if (
          captured.readToken !== readToken ||
          !sameAddress(captured.observation.address, address)
        ) {
          return recordFailure(
            "target.capture",
            "Provider record capture returned foreign authority"
          );
        }
        return success(
          Object.freeze({
            captureHandle: captured.handle as TargetRecordCaptureHandle,
            readToken: captured.readToken as TargetRecordReadToken,
            key,
            observation: observationFromResource(captured.observation),
          })
        );
      } catch (error) {
        return recordFailure("target.capture", resourceFailureDetail(error));
      }
    },
    async release(capture: TargetRecordCapture): Promise<DeploymentResult<null>> {
      try {
        const released = await port.releaseTarget({
          address: targetAddress(capture.key),
          readToken: capture.readToken,
          captureHandle: capture.captureHandle,
        });
        return released.readToken === capture.readToken && released.handle === capture.captureHandle
          ? success(null)
          : recordFailure("target.release", "Provider record release returned foreign authority");
      } catch (error) {
        return recordFailure("target.release", resourceFailureDetail(error));
      }
    },
    async write(
      input: TargetRecordPlanInput & Readonly<{ mutation: TargetRecordMutation }>
    ): Promise<DeploymentResult<TargetRecordWriteObservation>> {
      try {
        const written = await port.writeTarget({
          address: targetAddress(input.capture.key),
          planDigest: input.planDigest,
          readToken: input.capture.readToken,
          captureHandle: input.capture.captureHandle,
          mutation:
            input.mutation.kind === "remove"
              ? Object.freeze({ kind: "Remove" as const })
              : Object.freeze({
                  kind: "Put" as const,
                  bytes: new Uint8Array(input.mutation.bytes),
                }),
        });
        if (
          written.planDigest !== input.planDigest ||
          written.readToken !== input.capture.readToken ||
          !sameAddress(written.address, targetAddress(input.capture.key))
        ) {
          return recordFailure("target.write", "Provider record write returned foreign authority");
        }
        return success(
          Object.freeze({
            kind: written.outcome === "Applied" ? "applied" : "read-only-converged",
          })
        );
      } catch (error) {
        return recordFailure("target.write", resourceFailureDetail(error));
      }
    },
    async restore(
      input: TargetRecordPlanInput
    ): Promise<DeploymentResult<TargetRecordRestoreObservation>> {
      try {
        const restored = await port.restoreTarget({
          address: targetAddress(input.capture.key),
          planDigest: input.planDigest,
          readToken: input.capture.readToken,
          captureHandle: input.capture.captureHandle,
        });
        if (
          restored.planDigest !== input.planDigest ||
          restored.readToken !== input.capture.readToken ||
          !sameAddress(restored.address, targetAddress(input.capture.key))
        ) {
          return recordFailure(
            "target.restore",
            "Provider record restore returned foreign authority"
          );
        }
        return success(Object.freeze({ kind: "restored", changed: restored.changed }));
      } catch (error) {
        return recordFailure("target.restore", resourceFailureDetail(error));
      }
    },
    async settle(input: TargetRecordPlanInput): Promise<DeploymentResult<null>> {
      try {
        const settled = await port.settleTarget({
          address: targetAddress(input.capture.key),
          planDigest: input.planDigest,
          readToken: input.capture.readToken,
          captureHandle: input.capture.captureHandle,
        });
        return settled.planDigest === input.planDigest &&
          settled.readToken === input.capture.readToken &&
          settled.handle === input.capture.captureHandle
          ? success(null)
          : recordFailure("target.settle", "Provider record settlement returned foreign authority");
      } catch (error) {
        return recordFailure("target.settle", resourceFailureDetail(error));
      }
    },
    retainUnreleased(capture: TargetRecordCapture): void {
      retainedCaptures.push(capture);
    },
    retainUnsettled(input: TargetRecordPlanInput): void {
      retainedPlans.push(input);
    },
  };
  return Object.freeze(collection);
}

function createProviderTreeCollection(
  port: ArtifactRepositoryAsyncPort,
  repositoryRoot: string
): ImmutableProviderTreeCollection {
  return Object.freeze({
    async read(
      key: ImmutableProviderTreeKey
    ): Promise<DeploymentResult<ImmutableProviderTreeObservation>> {
      const address = providerTreeAddress(repositoryRoot, key);
      try {
        const observed = await port.readTree({ address, limits: PROVIDER_TREE_LIMITS });
        if (observed.kind === "Missing") return success(Object.freeze({ kind: "absent" as const }));
        if (observed.kind === "Mismatch") {
          return recordFailure(
            "projection.tree",
            observed.issues.map((entry) => entry.detail).join("; ")
          );
        }
        if (!sameProviderTreeAddress(observed.snapshot.address, address)) {
          return recordFailure(
            "projection.tree",
            "Artifact repository returned a foreign tree address"
          );
        }
        return success(
          Object.freeze({
            kind: "present" as const,
            files: Object.freeze(observed.snapshot.entries.map(treeFileFromResource)),
          })
        );
      } catch (error) {
        return recordFailure("projection.tree", resourceFailureDetail(error));
      }
    },
    async publish(
      key: ImmutableProviderTreeKey,
      files: readonly ImmutableProviderTreeFile[]
    ): Promise<DeploymentResult<ImmutableProviderTreePublication>> {
      const address = providerTreeAddress(repositoryRoot, key);
      try {
        const published = await port.publishTree({
          address,
          entries: Object.freeze(files.map(treeEntryForResource)),
          limits: PROVIDER_TREE_LIMITS,
        });
        if (published.kind === "Published" || published.kind === "ReadOnlyConverged") {
          return success(
            Object.freeze({
              kind: published.kind === "Published" ? ("published" as const) : ("existing" as const),
            })
          );
        }
        const detail =
          published.kind === "Occupied"
            ? `Immutable provider tree is occupied by ${published.observation}`
            : published.failure;
        return recordFailure("projection.tree", detail);
      } catch (error) {
        return recordFailure("projection.tree", resourceFailureDetail(error));
      }
    },
  });
}

function projectionAddress(key: ProjectionRecordKey): ProviderProjectionRecordAddress {
  return key.kind === "manifest"
    ? Object.freeze({ scope: "Projection", kind: "Manifest", key: key.projectionDigest })
    : Object.freeze({ scope: "Projection", kind: "Member", key: key.memberFingerprint });
}

function targetAddress(key: TargetRecordKey): ProviderTargetRecordAddress {
  return Object.freeze({
    scope: "Target",
    kind: key.kind === "identity" ? "Identity" : "Receipt",
    targetKey: key.targetDigest,
  });
}

function observationFromResource(
  observation: ProviderRecordObservation
): TargetRecordObservation | ProjectionRecordObservation {
  return observation.kind === "Absent"
    ? Object.freeze({ kind: "absent" })
    : Object.freeze({ kind: "present", bytes: new Uint8Array(observation.bytes) });
}

function treeEntryForResource(file: ImmutableProviderTreeFile): ArtifactTreeEntry {
  return Object.freeze({ path: file.path, mode: file.mode, bytes: new Uint8Array(file.bytes) });
}

function treeFileFromResource(entry: ArtifactTreeEntry): ImmutableProviderTreeFile {
  const parsed = parseReleaseRelativePath(entry.path, "projection.tree.path");
  if (!parsed.ok) {
    throw new Error(parsed.issues.map((entry) => entry.message).join("; "));
  }
  if (entry.mode !== 0o644 && entry.mode !== 0o755) {
    throw new Error(`Provider projection tree uses unsupported mode ${entry.mode.toString(8)}`);
  }
  return Object.freeze({
    path: parsed.value,
    mode: entry.mode,
    bytes: new Uint8Array(entry.bytes),
  });
}

function sameAddress(left: ProviderRecordAddress, right: ProviderRecordAddress): boolean {
  if (left.scope !== right.scope || left.kind !== right.kind) return false;
  return left.scope === "Projection" && right.scope === "Projection"
    ? left.key === right.key
    : left.scope === "Target" && right.scope === "Target" && left.targetKey === right.targetKey;
}

function recordFailure<T>(path: string, message: string): DeploymentResult<T> {
  return failure([issue("MUTATION_FAILED", `provider.records.${path}`, message)]);
}

function resourceFailureDetail(error: unknown): string {
  if (isProviderRecordsFailure(error)) {
    return `${error.operation}:${error.phase}:${error.reason}: ${error.detail}`;
  }
  if (error instanceof Error) return error.message;
  if (
    error !== null &&
    typeof error === "object" &&
    "detail" in error &&
    typeof error.detail === "string"
  )
    return error.detail;
  return String(error);
}

function isProviderRecordsFailure(error: unknown): error is AgentProviderRecordsFailure {
  return (
    error !== null &&
    typeof error === "object" &&
    "_tag" in error &&
    error._tag === "AgentProviderRecordsFailure"
  );
}
