import {
  MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES,
  MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  addReleaseSetPayloadBytes,
  canonicalSerializeAgentPluginRelease,
  canonicalSerializeAgentPluginReleaseSet,
  contentDigest,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  decodeAgentPluginRelease,
  decodeAgentPluginReleaseSet,
  payloadEntryBytes,
  verifyCompleteReleaseSetGraph,
  type AgentPluginRelease,
  type AgentPluginReleaseSet,
  type ArtifactRef,
  type ReleaseArtifactRef,
  type VerifiedArtifactSnapshotV1,
  type VerifiedPayloadFileV1,
  type VerifiedReleaseArtifactV1,
} from "../../service/shared/release";
import type {
  ArtifactPublicationOptions,
  ArtifactPublicationResult,
  ArtifactReadIssue,
  ArtifactReadResult,
  ArtifactReader,
  ArtifactStore,
  ArtifactStoreFailpoint,
  ArtifactStoreFailpointEvent,
} from "../../service/modules/releases/ports";
import type {
  ArtifactObjectAddress,
  ArtifactPublicationResult as ResourcePublicationResult,
  ArtifactRepositoryAsyncPort,
  ArtifactRepositoryIssue,
  ArtifactRepositoryPublicationEvent,
  ArtifactTreeEntry,
  ArtifactTreeObservation,
  ArtifactTreeSnapshot,
} from "@rawr/resource-agent-plugin-artifact-repository";

const RELEASE_ENVELOPE_FILE = "release.json";
const RELEASE_SET_ENVELOPE_FILE = "release-set.json";
const PAYLOAD_DIRECTORY = "payload";
const MAX_ARTIFACT_TREE_ENTRIES = 200_000;
const MAX_RELEASE_ARTIFACT_BYTES = MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES
  + MAX_RELEASE_SET_PAYLOAD_BYTES;

const RELEASE_LIMITS = Object.freeze({
  maxEntries: MAX_ARTIFACT_TREE_ENTRIES,
  maxBytes: MAX_RELEASE_ARTIFACT_BYTES,
});
const RELEASE_SET_LIMITS = Object.freeze({
  maxEntries: MAX_ARTIFACT_TREE_ENTRIES,
  maxBytes: MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES,
});

export interface ResourceArtifactRepositoryOptions {
  readonly repositoryRoot: string;
  readonly repository: ArtifactRepositoryAsyncPort;
}

/** Projects the generic immutable repository into the lifecycle service's release artifact port. */
export function createResourceArtifactStore(binding: ResourceArtifactRepositoryOptions): ArtifactStore {
  const reader = createResourceArtifactReader(binding);
  return Object.freeze({
    read: reader.read,
    publishRelease: (
      release: Parameters<ArtifactStore["publishRelease"]>[0],
      publicationOptions?: Parameters<ArtifactStore["publishRelease"]>[1],
    ) => publishRelease(binding.repository, binding.repositoryRoot, release, publicationOptions),
    publishReleaseSet: (
      releaseSet: Parameters<ArtifactStore["publishReleaseSet"]>[0],
      publicationOptions?: Parameters<ArtifactStore["publishReleaseSet"]>[1],
    ) => publishReleaseSet(binding.repository, binding.repositoryRoot, releaseSet, publicationOptions),
  });
}

/** Read-only projection used by packaging, export, provider, and retention applications. */
export function createResourceArtifactReader(binding: ResourceArtifactRepositoryOptions): ArtifactReader {
  return Object.freeze({
    read: (ref: ArtifactRef) => readArtifact(binding.repository, binding.repositoryRoot, ref),
  });
}

async function readArtifact(
  repository: ArtifactRepositoryAsyncPort,
  artifactStoreRoot: string,
  ref: ArtifactRef,
): Promise<ArtifactReadResult> {
  const address = addressFor(artifactStoreRoot, ref);
  let observation: ArtifactTreeObservation;
  try {
    observation = await repository.readTree({
      address,
      limits: ref.kind === "release" ? RELEASE_LIMITS : RELEASE_SET_LIMITS,
    });
  } catch (error) {
    return mismatch(ref, "InvalidStoreRoot", errorDetail(error));
  }
  if (observation.kind === "Missing") return Object.freeze({ kind: "Missing", ref });
  if (observation.kind === "Mismatch") {
    return mismatchFromRepository(ref, observation.issues);
  }
  if (!sameAddress(observation.snapshot.address, address)) {
    return mismatch(ref, "ReferenceMismatch", "Artifact repository returned another object address");
  }
  return ref.kind === "release"
    ? verifyReleaseSnapshot(ref, observation.snapshot)
    : await verifyCompleteSetSnapshot(repository, artifactStoreRoot, ref, observation.snapshot);
}

function verifyReleaseSnapshot(
  ref: ReleaseArtifactRef,
  snapshot: ArtifactTreeSnapshot,
): ArtifactReadResult {
  const envelope = snapshot.entries.find((entry) => entry.path === RELEASE_ENVELOPE_FILE);
  if (envelope === undefined) return mismatch(ref, "MissingEntry", `Missing ${RELEASE_ENVELOPE_FILE}`);
  if (envelope.mode !== 0o444) return mismatch(ref, "ModeMismatch", `${RELEASE_ENVELOPE_FILE} mode differs`);

  const decoded = decodeAgentPluginRelease(envelope.bytes);
  if (!decoded.ok) {
    return mismatch(ref, "MalformedEnvelope", decoded.issues.map((issue) => issue.code).join(","));
  }
  const release = decoded.value;
  if (release.releaseDigest !== ref.releaseDigest || release.artifactDigest !== ref.artifactDigest) {
    return mismatch(ref, "ReferenceMismatch", "Release envelope does not match the requested reference");
  }
  if (!bytesEqual(envelope.bytes, canonicalSerializeAgentPluginRelease(release))) {
    return mismatch(ref, "MalformedEnvelope", "Release envelope is not canonical");
  }

  const expectedFiles = new Set<string>([RELEASE_ENVELOPE_FILE]);
  const expectedDirectories = new Set<string>([PAYLOAD_DIRECTORY]);
  const files: VerifiedPayloadFileV1[] = [];
  for (const payload of release.artifactBody.payloadEntries) {
    const path = `${PAYLOAD_DIRECTORY}/${payload.path}`;
    expectedFiles.add(path);
    addParentDirectories(path, expectedDirectories);
    const entry = snapshot.entries.find((candidate) => candidate.path === path);
    if (entry === undefined) return mismatch(ref, "MissingEntry", `Missing artifact file ${path}`);
    if (entry.mode !== payload.mode) return mismatch(ref, "ModeMismatch", `Artifact mode differs at ${path}`);
    const expectedBytes = payloadEntryBytes(payload);
    if (!bytesEqual(entry.bytes, expectedBytes) || contentDigest(entry.bytes) !== payload.contentDigest) {
      return mismatch(ref, "DigestMismatch", `Artifact payload differs at ${payload.path}`);
    }
    files.push(Object.freeze({
      path: payload.path,
      mode: payload.mode,
      contentDigest: payload.contentDigest,
      bytes: new Uint8Array(entry.bytes),
    }));
  }
  const shapeIssue = exactTreeIssue(snapshot, expectedFiles, expectedDirectories);
  if (shapeIssue !== undefined) return mismatch(ref, shapeIssue.code, shapeIssue.detail);

  return Object.freeze({
    kind: "Verified",
    snapshot: Object.freeze({
      kind: "release",
      ref,
      release,
      files: Object.freeze(files),
    }) satisfies VerifiedReleaseArtifactV1,
  });
}

async function verifyCompleteSetSnapshot(
  repository: ArtifactRepositoryAsyncPort,
  artifactStoreRoot: string,
  ref: Extract<ArtifactRef, { readonly kind: "complete-set" }>,
  snapshot: ArtifactTreeSnapshot,
): Promise<ArtifactReadResult> {
  const shapeIssue = exactTreeIssue(
    snapshot,
    new Set([RELEASE_SET_ENVELOPE_FILE]),
    new Set(),
  );
  if (shapeIssue !== undefined) return mismatch(ref, shapeIssue.code, shapeIssue.detail);
  const envelope = snapshot.entries[0];
  if (envelope === undefined) return mismatch(ref, "MissingEntry", `Missing ${RELEASE_SET_ENVELOPE_FILE}`);
  if (envelope.mode !== 0o444) return mismatch(ref, "ModeMismatch", `${RELEASE_SET_ENVELOPE_FILE} mode differs`);
  const decoded = decodeAgentPluginReleaseSet(envelope.bytes);
  if (!decoded.ok) {
    return mismatch(ref, "MalformedEnvelope", decoded.issues.map((issue) => issue.code).join(","));
  }
  const releaseSet = decoded.value;
  if (releaseSet.releaseSetDigest !== ref.releaseSetDigest) {
    return mismatch(ref, "ReferenceMismatch", "Release-set envelope does not match the requested reference");
  }
  if (!bytesEqual(envelope.bytes, canonicalSerializeAgentPluginReleaseSet(releaseSet))) {
    return mismatch(ref, "MalformedEnvelope", "Release-set envelope is not canonical");
  }

  let aggregateBytes = 0;
  const members: VerifiedReleaseArtifactV1[] = [];
  for (const member of releaseSet.body.members) {
    const memberRef = createReleaseArtifactRef(member.releaseDigest, member.artifactDigest);
    const result = await readArtifact(repository, artifactStoreRoot, memberRef);
    if (result.kind !== "Verified" || result.snapshot.kind !== "release") {
      return mismatch(ref, "ReferenceMismatch", `Release-set member is not verified: ${member.pluginId}`);
    }
    for (const file of result.snapshot.files) {
      const next = addReleaseSetPayloadBytes(aggregateBytes, file.bytes.byteLength);
      if (!next.ok) {
        return mismatch(
          ref,
          "ReferenceMismatch",
          `Release-set payloads exceed ${MAX_RELEASE_SET_PAYLOAD_BYTES} decoded bytes`,
        );
      }
      aggregateBytes = next.value;
    }
    members.push(copyReleaseSnapshot(result.snapshot));
  }
  const graph = verifyCompleteReleaseSetGraph(
    releaseSet,
    members.map((member) => member.release),
  );
  if (!graph.ok) {
    return mismatch(ref, "ReferenceMismatch", graph.issues.map((issue) => issue.code).join(","));
  }
  return Object.freeze({
    kind: "Verified",
    snapshot: Object.freeze({
      kind: "complete-set",
      ref,
      releaseSet,
      members: Object.freeze(members),
    }) satisfies VerifiedArtifactSnapshotV1,
  });
}

async function publishRelease(
  repository: ArtifactRepositoryAsyncPort,
  artifactStoreRoot: string,
  release: AgentPluginRelease,
  options: ArtifactPublicationOptions = {},
): Promise<ArtifactPublicationResult> {
  const ref = createReleaseArtifactRef(release.releaseDigest, release.artifactDigest);
  const entries = Object.freeze([
    Object.freeze({
      path: RELEASE_ENVELOPE_FILE,
      mode: 0o444 as const,
      bytes: canonicalSerializeAgentPluginRelease(release),
    }),
    ...release.artifactBody.payloadEntries.map((payload) => Object.freeze({
      path: `${PAYLOAD_DIRECTORY}/${payload.path}`,
      mode: payload.mode,
      bytes: payloadEntryBytes(payload),
    })),
  ]);
  return publishTree(repository, artifactStoreRoot, ref, entries, RELEASE_LIMITS, options);
}

async function publishReleaseSet(
  repository: ArtifactRepositoryAsyncPort,
  artifactStoreRoot: string,
  releaseSet: AgentPluginReleaseSet,
  options: ArtifactPublicationOptions = {},
): Promise<ArtifactPublicationResult> {
  const ref = createCompleteSetArtifactRef(releaseSet.releaseSetDigest);
  const entries = Object.freeze([Object.freeze({
    path: RELEASE_SET_ENVELOPE_FILE,
    mode: 0o444 as const,
    bytes: canonicalSerializeAgentPluginReleaseSet(releaseSet),
  })]);
  return publishTree(repository, artifactStoreRoot, ref, entries, RELEASE_SET_LIMITS, options);
}

async function publishTree(
  repository: ArtifactRepositoryAsyncPort,
  artifactStoreRoot: string,
  ref: ArtifactRef,
  entries: readonly ArtifactTreeEntry[],
  limits: Readonly<{ maxEntries: number; maxBytes: number }>,
  options: ArtifactPublicationOptions,
): Promise<ArtifactPublicationResult> {
  const address = addressFor(artifactStoreRoot, ref);
  const control = options.beforePublication !== undefined || options.failpoint !== undefined
    ? Object.freeze({
      ...(options.beforePublication === undefined
        ? {}
        : {
          beforeCommit: async () => {
            const decision = await options.beforePublication?.();
            return decision?.kind === "Rejected"
              ? Object.freeze({ kind: "Reject" as const, failure: decision.failure })
              : Object.freeze({ kind: "Proceed" as const });
          },
        }),
      ...(options.failpoint === undefined
        ? {}
        : {
          onEvent: async (event: ArtifactRepositoryPublicationEvent) =>
            relayPublicationEvent(options.failpoint!, event, entries),
        }),
    })
    : undefined;
  let result: ResourcePublicationResult;
  try {
    result = await repository.publishTree({
      address,
      entries,
      limits,
      ...(control === undefined ? {} : { control }),
    });
  } catch (error) {
    return classifyRejectedPublication(
      repository,
      artifactStoreRoot,
      ref,
      errorDetail(error),
    );
  }
  const mapped = await mapPublicationResult(repository, artifactStoreRoot, ref, result);
  if (mapped.kind !== "Published" || options.failpoint === undefined) return mapped;
  try {
    await options.failpoint(Object.freeze({ kind: "AfterFinalVerification" }));
    return mapped;
  } catch (error) {
    return Object.freeze({
      kind: "Unsettled",
      ref,
      failure: errorDetail(error),
      observation: "Verified",
    });
  }
}

async function relayPublicationEvent(
  failpoint: ArtifactStoreFailpoint,
  event: ArtifactRepositoryPublicationEvent,
  entries: readonly ArtifactTreeEntry[],
): Promise<void> {
  if (event.kind === "AfterStagingWrite") {
    for (const entry of entries) {
      await failpoint(Object.freeze({ kind: "AfterStagingFile", path: entry.path }));
    }
    await failpoint(Object.freeze({ kind: "AfterStagingFlush" }));
    return;
  }
  const mapped: ArtifactStoreFailpointEvent = event.kind === "AfterStagingVerification"
    ? Object.freeze({ kind: "AfterStagingVerification" })
    : event.kind === "BeforeNoReplacePublication"
      ? Object.freeze({ kind: "BeforeNoReplacePublication" })
      : Object.freeze({ kind: "AfterNoReplacePublication" });
  await failpoint(mapped);
}

async function classifyRejectedPublication(
  repository: ArtifactRepositoryAsyncPort,
  artifactStoreRoot: string,
  ref: ArtifactRef,
  failure: string,
): Promise<ArtifactPublicationResult> {
  const observed = await readArtifact(repository, artifactStoreRoot, ref);
  if (observed.kind === "Verified") {
    return Object.freeze({ kind: "Unsettled", ref, failure, observation: "Verified" });
  }
  if (observed.kind === "Mismatch") {
    return Object.freeze({ kind: "Unsettled", ref, failure, observation: "Mismatch" });
  }
  return Object.freeze({ kind: "Rejected", ref, failure });
}

async function mapPublicationResult(
  repository: ArtifactRepositoryAsyncPort,
  artifactStoreRoot: string,
  ref: ArtifactRef,
  result: ResourcePublicationResult,
): Promise<ArtifactPublicationResult> {
  switch (result.kind) {
    case "Published":
    case "ReadOnlyConverged":
      return Object.freeze({ kind: result.kind, ref });
    case "Occupied":
      return Object.freeze({
        kind: "Rejected",
        ref,
        failure: `Conflicting immutable artifact address is ${result.observation.toLowerCase()}`,
        ...(result.cleanupFailure === undefined ? {} : { cleanupFailure: result.cleanupFailure }),
      });
    case "Rejected":
      return Object.freeze({
        kind: "Rejected",
        ref,
        failure: result.failure,
        ...(result.cleanupFailure === undefined ? {} : { cleanupFailure: result.cleanupFailure }),
      });
    case "Unsettled": {
      const observed = await readArtifact(
        repository,
        artifactStoreRoot,
        ref,
      );
      return Object.freeze({
        kind: "Unsettled",
        ref,
        failure: result.failure,
        observation: observed.kind,
        ...(result.cleanupFailure === undefined ? {} : { cleanupFailure: result.cleanupFailure }),
      });
    }
  }
}

function addressFor(artifactStoreRoot: string, ref: ArtifactRef): ArtifactObjectAddress {
  const releaseNamespace = Object.freeze(["releases", "sha256"] satisfies [string, string]);
  const setNamespace = Object.freeze(["sets", "sha256"] satisfies [string, string]);
  return ref.kind === "release"
    ? Object.freeze({
      repositoryRoot: artifactStoreRoot,
      namespace: releaseNamespace,
      objectId: ref.artifactDigest,
    })
    : Object.freeze({
      repositoryRoot: artifactStoreRoot,
      namespace: setNamespace,
      objectId: ref.releaseSetDigest,
    });
}

function exactTreeIssue(
  snapshot: ArtifactTreeSnapshot,
  expectedFiles: ReadonlySet<string>,
  expectedDirectories: ReadonlySet<string>,
): ArtifactReadIssue | undefined {
  for (const entry of snapshot.entries) {
    if (!expectedFiles.has(entry.path)) {
      return Object.freeze({ code: "UnexpectedEntry", detail: `Unexpected artifact file ${entry.path}` });
    }
  }
  for (const path of expectedFiles) {
    if (!snapshot.entries.some((entry) => entry.path === path)) {
      return Object.freeze({ code: "MissingEntry", detail: `Missing artifact file ${path}` });
    }
  }
  for (const directory of snapshot.directories) {
    if (!expectedDirectories.has(directory.path)) {
      return Object.freeze({ code: "UnexpectedEntry", detail: `Unexpected artifact directory ${directory.path}` });
    }
  }
  for (const path of expectedDirectories) {
    if (!snapshot.directories.some((directory) => directory.path === path)) {
      return Object.freeze({ code: "MissingEntry", detail: `Missing artifact directory ${path}` });
    }
  }
  return undefined;
}

function mismatchFromRepository(
  ref: ArtifactRef,
  repositoryIssues: readonly [ArtifactRepositoryIssue, ...ArtifactRepositoryIssue[]],
): ArtifactReadResult {
  const mapped = repositoryIssues.map((issue) => Object.freeze({
    code: mapRepositoryIssueCode(issue.code),
    detail: issue.detail,
  }));
  const first = mapped[0];
  if (first === undefined) return mismatch(ref, "ReadFailure", "Artifact repository reported no issue detail");
  const issues: [ArtifactReadIssue, ...ArtifactReadIssue[]] = [first, ...mapped.slice(1)];
  return Object.freeze({
    kind: "Mismatch",
    ref,
    issues: Object.freeze(issues),
  });
}

function mapRepositoryIssueCode(code: ArtifactRepositoryIssue["code"]): ArtifactReadIssue["code"] {
  switch (code) {
    case "UnexpectedEntry":
    case "InvalidEntryType":
    case "SharedInode":
    case "ModeMismatch":
    case "ReadFailure":
      return code;
    case "AliasedEntry":
      return "InvalidEntryType";
    case "LimitExceeded":
    case "IdentityChanged":
      return "ReadFailure";
  }
}

function mismatch(ref: ArtifactRef, code: ArtifactReadIssue["code"], detail: string): ArtifactReadResult {
  const issues: [ArtifactReadIssue, ...ArtifactReadIssue[]] = [Object.freeze({ code, detail })];
  return Object.freeze({
    kind: "Mismatch",
    ref,
    issues: Object.freeze(issues),
  });
}

function addParentDirectories(path: string, directories: Set<string>): void {
  const segments = path.split("/");
  for (let index = 1; index < segments.length; index += 1) {
    directories.add(segments.slice(0, index).join("/"));
  }
}

function copyReleaseSnapshot(snapshot: VerifiedReleaseArtifactV1): VerifiedReleaseArtifactV1 {
  return Object.freeze({
    ...snapshot,
    files: Object.freeze(snapshot.files.map((file) => Object.freeze({
      ...file,
      bytes: new Uint8Array(file.bytes),
    }))),
  });
}

function sameAddress(left: ArtifactObjectAddress, right: ArtifactObjectAddress): boolean {
  return left.repositoryRoot === right.repositoryRoot
    && left.objectId === right.objectId
    && left.namespace.length === right.namespace.length
    && left.namespace.every((segment, index) => segment === right.namespace[index]);
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength
    && left.every((value, index) => value === right[index]);
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "detail" in error && typeof error.detail === "string") {
    return error.detail;
  }
  return String(error);
}
