import type {
  ArtifactEvidenceObservation,
  ArtifactObjectAddress,
  ArtifactPublicationResult as ResourcePublicationResult,
  ArtifactRepositoryAsyncPort,
  ArtifactRepositoryIssue,
  ArtifactRepositoryPublicationEvent,
} from "@rawr/resource-agent-plugin-artifact-repository";

import {
  MAX_MECHANICAL_EVIDENCE_BYTES,
  createMechanicalEvidenceHandle,
  mechanicalEvidenceDigest,
  parseMechanicalEvidenceHandle,
  type MechanicalEvidenceHandleV1,
  type MechanicalEvidenceIssue,
  type MechanicalEvidencePublicationResult,
  type MechanicalEvidenceReadResult,
  type MechanicalEvidenceReader,
  type MechanicalEvidenceStore,
  type MechanicalEvidenceStoreFailpointEvent,
} from "../shared/release";

const EVIDENCE_NAMESPACE = Object.freeze([
  "mechanical-evidence",
  "sha256",
] satisfies [string, string]);

export interface ResourceMechanicalEvidenceRepositoryOptions {
  readonly repositoryRoot: string;
  readonly repository: ArtifactRepositoryAsyncPort;
}

/** Projects generic immutable evidence storage into the lifecycle evidence protocol. */
export function createResourceMechanicalEvidenceStore(
  binding: ResourceMechanicalEvidenceRepositoryOptions,
): MechanicalEvidenceStore {
  const reader = createResourceMechanicalEvidenceReader(binding);
  return Object.freeze({
    read: reader.read,
    publish: (
      handle: MechanicalEvidenceHandleV1,
      bytes: Uint8Array,
      options?: Parameters<MechanicalEvidenceStore["publish"]>[2],
    ) => publishEvidence(binding, reader, handle, bytes, options),
  });
}

/** Read-only projection for retention and governed release checks. */
export function createResourceMechanicalEvidenceReader(
  binding: ResourceMechanicalEvidenceRepositoryOptions,
): MechanicalEvidenceReader {
  return Object.freeze({
    read: (handle: MechanicalEvidenceHandleV1) => readEvidence(binding, handle),
  });
}

async function readEvidence(
  binding: ResourceMechanicalEvidenceRepositoryOptions,
  handle: MechanicalEvidenceHandleV1,
): Promise<MechanicalEvidenceReadResult> {
  const parsed = parseMechanicalEvidenceHandle(handle);
  const stableHandle = parsed.ok
    ? parsed.value
    : createMechanicalEvidenceHandle(new Uint8Array());
  if (!parsed.ok) return mismatch(stableHandle, parsed.issue);

  const address = addressFor(binding.repositoryRoot, stableHandle);
  let observation: ArtifactEvidenceObservation;
  try {
    observation = await binding.repository.readEvidence({
      address,
      maxBytes: MAX_MECHANICAL_EVIDENCE_BYTES,
    });
  } catch (error) {
    return mismatch(stableHandle, issue("ReadFailure", errorDetail(error)));
  }
  if (observation.kind === "Missing") return Object.freeze({ kind: "Missing", handle: stableHandle });
  if (observation.kind === "Mismatch") {
    return mismatchFromRepository(stableHandle, observation.issues);
  }
  if (!sameAddress(observation.address, address)) {
    return mismatch(
      stableHandle,
      issue("InvalidEntryType", "Artifact repository returned another evidence address"),
    );
  }
  if (observation.bytes.byteLength > MAX_MECHANICAL_EVIDENCE_BYTES) {
    return mismatch(
      stableHandle,
      issue("EvidenceTooLarge", "Mechanical evidence exceeds its byte bound"),
    );
  }
  if (mechanicalEvidenceDigest(observation.bytes) !== stableHandle.digest) {
    return mismatch(
      stableHandle,
      issue("DigestMismatch", "Mechanical evidence bytes do not match their handle"),
    );
  }
  return Object.freeze({
    kind: "Verified",
    handle: stableHandle,
    bytes: new Uint8Array(observation.bytes),
  });
}

async function publishEvidence(
  binding: ResourceMechanicalEvidenceRepositoryOptions,
  reader: MechanicalEvidenceReader,
  handle: MechanicalEvidenceHandleV1,
  bytes: Uint8Array,
  options: Parameters<MechanicalEvidenceStore["publish"]>[2] = {},
): Promise<MechanicalEvidencePublicationResult> {
  const parsed = parseMechanicalEvidenceHandle(handle);
  const stableHandle = parsed.ok
    ? parsed.value
    : createMechanicalEvidenceHandle(new Uint8Array());
  if (!parsed.ok) {
    return Object.freeze({ kind: "Rejected", handle: stableHandle, failure: parsed.issue.detail });
  }
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_MECHANICAL_EVIDENCE_BYTES) {
    return Object.freeze({
      kind: "Rejected",
      handle: stableHandle,
      failure: "Mechanical evidence bytes exceed the bounded opaque payload contract",
    });
  }
  if (mechanicalEvidenceDigest(bytes) !== stableHandle.digest) {
    return Object.freeze({
      kind: "Rejected",
      handle: stableHandle,
      failure: "Mechanical evidence bytes do not match the requested digest",
    });
  }

  const prior = await reader.read(stableHandle);
  if (prior.kind === "Verified") {
    return Object.freeze({ kind: "ReadOnlyConverged", handle: stableHandle });
  }
  if (prior.kind === "Mismatch") {
    return Object.freeze({
      kind: "Rejected",
      handle: stableHandle,
      failure: prior.issues.map((entry) => entry.detail).join("; "),
    });
  }

  const address = addressFor(binding.repositoryRoot, stableHandle);
  let publication: ResourcePublicationResult;
  try {
    publication = await binding.repository.publishEvidence({
      address,
      bytes: new Uint8Array(bytes),
      maxBytes: MAX_MECHANICAL_EVIDENCE_BYTES,
      ...(options.failpoint === undefined
        ? {}
        : { control: Object.freeze({ onEvent: relayPublicationEvent(options.failpoint) }) }),
    });
  } catch (error) {
    return classifyPublicationFailure(reader, stableHandle, errorDetail(error));
  }

  if (!sameAddress(publication.address, address)) {
    return Object.freeze({
      kind: "Rejected",
      handle: stableHandle,
      failure: "Artifact repository returned another evidence publication address",
    });
  }
  return mapPublicationResult(reader, stableHandle, publication, options.failpoint);
}

function relayPublicationEvent(
  failpoint: (event: MechanicalEvidenceStoreFailpointEvent) => void | Promise<void>,
): (event: ArtifactRepositoryPublicationEvent) => Promise<void> {
  return async (event) => {
    const mapped: MechanicalEvidenceStoreFailpointEvent | undefined = event.kind === "AfterStagingWrite"
      ? Object.freeze({ kind: "AfterStagingWrite" })
      : event.kind === "BeforeNoReplacePublication"
        ? Object.freeze({ kind: "BeforeNoReplacePublication" })
        : event.kind === "AfterNoReplacePublication"
          ? Object.freeze({ kind: "AfterNoReplacePublication" })
          : undefined;
    if (mapped !== undefined) await failpoint(mapped);
  };
}

async function mapPublicationResult(
  reader: MechanicalEvidenceReader,
  handle: MechanicalEvidenceHandleV1,
  publication: ResourcePublicationResult,
  failpoint: ((event: MechanicalEvidenceStoreFailpointEvent) => void | Promise<void>) | undefined,
): Promise<MechanicalEvidencePublicationResult> {
  if (publication.kind === "Published" || publication.kind === "ReadOnlyConverged") {
    const observed = await reader.read(handle);
    if (observed.kind !== "Verified") {
      return Object.freeze({
        kind: "Unsettled",
        handle,
        failure: "Published evidence did not verify",
        observation: observed.kind,
      });
    }
    if (publication.kind === "ReadOnlyConverged") {
      return Object.freeze({ kind: "ReadOnlyConverged", handle });
    }
    try {
      await failpoint?.(Object.freeze({ kind: "AfterFinalVerification" }));
    } catch (error) {
      return Object.freeze({
        kind: "Unsettled",
        handle,
        failure: errorDetail(error),
        observation: "Verified",
      });
    }
    return Object.freeze({ kind: "Published", handle });
  }
  if (publication.kind === "Occupied" || publication.kind === "Rejected") {
    const failure = publication.kind === "Occupied"
      ? `Conflicting immutable evidence address is ${publication.observation.toLowerCase()}`
      : publication.failure;
    return Object.freeze({
      kind: "Rejected",
      handle,
      failure,
      ...(publication.cleanupFailure === undefined ? {} : { cleanupFailure: publication.cleanupFailure }),
    });
  }

  const observed = await reader.read(handle);
  return Object.freeze({
    kind: "Unsettled",
    handle,
    failure: publication.failure,
    observation: observed.kind,
    ...(publication.cleanupFailure === undefined ? {} : { cleanupFailure: publication.cleanupFailure }),
  });
}

async function classifyPublicationFailure(
  reader: MechanicalEvidenceReader,
  handle: MechanicalEvidenceHandleV1,
  failure: string,
): Promise<MechanicalEvidencePublicationResult> {
  const observed = await reader.read(handle);
  if (observed.kind === "Missing") return Object.freeze({ kind: "Rejected", handle, failure });
  return Object.freeze({
    kind: "Unsettled",
    handle,
    failure,
    observation: observed.kind,
  });
}

function addressFor(
  repositoryRoot: string,
  handle: MechanicalEvidenceHandleV1,
): ArtifactObjectAddress {
  return Object.freeze({
    repositoryRoot,
    namespace: EVIDENCE_NAMESPACE,
    objectId: handle.digest,
  });
}

function mismatchFromRepository(
  handle: MechanicalEvidenceHandleV1,
  repositoryIssues: readonly [ArtifactRepositoryIssue, ...ArtifactRepositoryIssue[]],
): MechanicalEvidenceReadResult {
  const mapped = repositoryIssues.map((entry) => issue(
    mapRepositoryIssueCode(entry.code),
    entry.detail,
  ));
  const first = mapped[0];
  if (first === undefined) {
    return mismatch(handle, issue("ReadFailure", "Artifact repository reported no issue detail"));
  }
  const issues: [MechanicalEvidenceIssue, ...MechanicalEvidenceIssue[]] = [first, ...mapped.slice(1)];
  return Object.freeze({
    kind: "Mismatch",
    handle,
    issues: Object.freeze(issues),
  });
}

function mapRepositoryIssueCode(code: ArtifactRepositoryIssue["code"]): MechanicalEvidenceIssue["code"] {
  switch (code) {
    case "UnexpectedEntry":
    case "ModeMismatch":
    case "ReadFailure":
      return code;
    case "InvalidEntryType":
    case "AliasedEntry":
    case "SharedInode":
      return "InvalidEntryType";
    case "LimitExceeded":
      return "EvidenceTooLarge";
    case "IdentityChanged":
      return "ReadFailure";
  }
}

function mismatch(
  handle: MechanicalEvidenceHandleV1,
  first: MechanicalEvidenceIssue,
): MechanicalEvidenceReadResult {
  const issues: [MechanicalEvidenceIssue] = [first];
  return Object.freeze({
    kind: "Mismatch",
    handle,
    issues: Object.freeze(issues),
  });
}

function issue(
  code: MechanicalEvidenceIssue["code"],
  detail: string,
): MechanicalEvidenceIssue {
  return Object.freeze({ code, detail });
}

function sameAddress(left: ArtifactObjectAddress, right: ArtifactObjectAddress): boolean {
  return left.repositoryRoot === right.repositoryRoot
    && left.objectId === right.objectId
    && left.namespace.length === right.namespace.length
    && left.namespace.every((segment, index) => segment === right.namespace[index]);
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "detail" in error && typeof error.detail === "string") {
    return error.detail;
  }
  return String(error);
}
