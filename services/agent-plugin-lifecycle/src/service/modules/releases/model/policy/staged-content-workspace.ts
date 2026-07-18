import { createHash } from "node:crypto";

import {
  addReleaseSetPayloadBytes,
  compareCanonicalText,
  createAgentPluginPayload,
  decodeAgentPluginReleaseInput,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
  type AgentPluginPayload,
  type AgentPluginReleaseInput,
  type PluginId,
  type ReleaseRelativePath,
} from "../../../../shared/release";
import type {
  SourceEligibilityIssue,
  SourceEligibilityIssueCode,
  StagedContentWorkspaceInspection,
  StagedContentWorkspacePolicy,
  StagedIndexBindingObservation,
  StagedIndexObservation,
  StagedIndexObservationRequest,
  StagedIndexObservationResult,
  StagedObservationFailureReason,
} from "../dto/content-workspace";

const decoder = new TextDecoder("utf-8", { fatal: true });

export const MAX_STAGED_INDEX_ENTRIES = 200_000;
export const MAX_STAGED_INDEX_BYTES = 100 * 1024 * 1024;

const materializedByteLimit = addStagedObservationByteLimits(
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
);

if (!materializedByteLimit.ok) {
  throw new Error("The staged materialization byte limit is not a positive safe integer");
}

export const MAX_STAGED_MATERIALIZED_BLOB_BYTES = materializedByteLimit.value;

interface StagedTreeEntry {
  readonly mode: number;
  readonly objectId: string;
  readonly path: ReleaseRelativePath;
}

interface StagedMemberRoot {
  readonly pluginId: PluginId;
  readonly root: ReleaseRelativePath;
}

export type StagedReleaseInputClassification =
  | Readonly<{
    kind: "ReadyForMaterialization";
    opening: StagedIndexBindingObservation;
    releaseInput: AgentPluginReleaseInput;
    memberRoots: readonly StagedMemberRoot[];
  }>
  | Exclude<StagedContentWorkspaceInspection, { kind: "StagedContentWorkspaceEligible" }>;

export function addStagedObservationByteLimits(
  releaseInputBytes: number,
  aggregatePayloadBytes: number,
): Readonly<{ ok: true; value: number }> | Readonly<{ ok: false }> {
  if (
    !Number.isSafeInteger(releaseInputBytes)
    || !Number.isSafeInteger(aggregatePayloadBytes)
    || releaseInputBytes < 0
    || aggregatePayloadBytes < 0
    || releaseInputBytes > Number.MAX_SAFE_INTEGER - aggregatePayloadBytes
  ) return { ok: false };
  const value = releaseInputBytes + aggregatePayloadBytes;
  return value > 0 ? { ok: true, value } : { ok: false };
}

export function validateStagedContentWorkspacePolicy(
  policy: StagedContentWorkspacePolicy,
): SourceEligibilityIssue | undefined {
  if (!parseRepositoryIdentity(policy.repositoryIdentity).ok) {
    return sourceIssue("WrongRepository", "repository identity is not canonical");
  }
  if (!parseContentAuthority(policy.contentAuthority).ok) {
    return sourceIssue("ReleaseInputMismatch", "content authority is not canonical");
  }
  if (!parseReleaseRelativePath(policy.releaseInputPath).ok || !parseReleaseRelativePath(policy.pluginRoot).ok) {
    return sourceIssue("ReleaseInputMismatch", "content workspace paths are not canonical");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(policy.remoteName)) {
    return sourceIssue("WrongRepository", "remote name is not canonical");
  }
  if (!isCanonicalHeadRef(policy.refName)) return sourceIssue("WrongRef", "ref name is not a canonical branch ref");
  if (policy.remoteUrl.length === 0 || /[\u0000-\u001f\u007f]/u.test(policy.remoteUrl)) {
    return sourceIssue("WrongRepository", "remote URL policy is not canonical");
  }
  return undefined;
}

export function releaseInputObservationRequest(
  policy: StagedContentWorkspacePolicy,
): StagedIndexObservationRequest {
  return Object.freeze({
    locator: policy.locator,
    remoteName: policy.remoteName,
    refName: policy.refName,
    materializedPaths: Object.freeze([policy.releaseInputPath]),
    materializedRoots: Object.freeze([]),
    maxEntries: MAX_STAGED_INDEX_ENTRIES,
    maxIndexBytes: MAX_STAGED_INDEX_BYTES,
    maxBlobBytes: MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  });
}

export function materializationObservationRequest(
  policy: StagedContentWorkspacePolicy,
  memberRoots: readonly StagedMemberRoot[],
): StagedIndexObservationRequest {
  return Object.freeze({
    locator: policy.locator,
    remoteName: policy.remoteName,
    refName: policy.refName,
    materializedPaths: Object.freeze([policy.releaseInputPath]),
    materializedRoots: Object.freeze(memberRoots.map((entry) => entry.root).sort(compareCanonicalText)),
    maxEntries: MAX_STAGED_INDEX_ENTRIES,
    maxIndexBytes: MAX_STAGED_INDEX_BYTES,
    maxBlobBytes: MAX_STAGED_MATERIALIZED_BLOB_BYTES,
  });
}

export function classifyStagedReleaseInputObservation(
  policy: StagedContentWorkspacePolicy,
  result: StagedIndexObservationResult,
): StagedReleaseInputClassification {
  if (result.kind === "Failed") return classifyStagedObservationFailure(result.reason, result.detail, "release-input");
  const observation = result.observation;
  if (!sameStagedIndexBinding(observation.opening, observation.closing)) {
    return sourceChanged("Git HEAD, ref, repository, or index changed during staged observation");
  }

  try {
    const anchorIssue = validateAnchor(observation.opening.anchor, policy);
    if (anchorIssue !== undefined) return stagedIneligible(anchorIssue.code, anchorIssue.detail);
    const openingEntries = parseStagedIndex(
      observation.opening.indexEntries,
      observation.opening.anchor.objectFormat,
    );
    const openingBlobByObjectId = stagedBlobMap(
      observation,
      openingEntries,
      [policy.releaseInputPath],
      [],
    );
    const releaseInputEntry = openingEntries.find((entry) => entry.path === policy.releaseInputPath);
    if (releaseInputEntry === undefined) {
      return stagedIneligible("MissingReleaseInput", `missing staged release input ${policy.releaseInputPath}`);
    }
    const releaseInputBytes = requireStagedBlob(openingBlobByObjectId, releaseInputEntry);
    if (releaseInputBytes.byteLength > MAX_RELEASE_INPUT_ENVELOPE_BYTES) {
      return stagedIneligible("ReleaseInputMismatch", "staged release input exceeds the public envelope bound");
    }
    const releaseInputResult = decodeAgentPluginReleaseInput(releaseInputBytes);
    if (!releaseInputResult.ok) {
      return stagedIneligible(
        "ReleaseInputMismatch",
        releaseInputResult.issues.map((issue) => issue.code).join(","),
      );
    }
    const releaseInput = releaseInputResult.value;
    if (releaseInput.body.contentAuthority !== policy.contentAuthority) {
      return stagedIneligible("ReleaseInputMismatch", "release input declares a different content authority");
    }
    const aggregateIssue = preflightAggregatePayloadBytes(releaseInput);
    if (aggregateIssue !== undefined) return stagedIneligible("PayloadMismatch", aggregateIssue);

    const memberRoots: StagedMemberRoot[] = [];
    for (const member of releaseInput.body.members) {
      const memberRootResult = parseReleaseRelativePath(`${policy.pluginRoot}/${member.pluginId}`, "memberRoot");
      if (!memberRootResult.ok) return stagedIneligible("ReleaseInputMismatch", "member root is not canonical");
      memberRoots.push(Object.freeze({ pluginId: member.pluginId, root: memberRootResult.value }));
    }
    return Object.freeze({
      kind: "ReadyForMaterialization",
      opening: observation.opening,
      releaseInput,
      memberRoots: Object.freeze(memberRoots),
    });
  } catch (error) {
    return classificationFailure(error);
  }
}

export function classifyStagedMaterializationObservation(
  policy: StagedContentWorkspacePolicy,
  releaseInputClassification: Extract<StagedReleaseInputClassification, { kind: "ReadyForMaterialization" }>,
  result: StagedIndexObservationResult,
): StagedContentWorkspaceInspection {
  if (result.kind === "Failed") return classifyStagedObservationFailure(result.reason, result.detail, "payloads");
  const observation = result.observation;
  if (
    !sameStagedIndexBinding(observation.opening, observation.closing)
    || !sameStagedIndexBinding(releaseInputClassification.opening, observation.opening)
  ) return sourceChanged("Git HEAD, ref, repository, or index changed before staged materialization closed");

  try {
    const anchor = observation.opening.anchor;
    const entries = parseStagedIndex(observation.opening.indexEntries, anchor.objectFormat);
    const materializedRoots = releaseInputClassification.memberRoots.map((entry) => entry.root);
    const blobByObjectId = stagedBlobMap(
      observation,
      entries,
      [policy.releaseInputPath],
      materializedRoots,
    );

    const admitted = new Set<ReleaseRelativePath>([policy.releaseInputPath]);
    const payloads: Array<Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>> = [];
    for (const member of releaseInputClassification.releaseInput.body.members) {
      const memberRoot = releaseInputClassification.memberRoots.find((entry) => entry.pluginId === member.pluginId)?.root;
      if (memberRoot === undefined) return stagedIneligible("ReleaseInputMismatch", "member root is missing");
      const payloadEntries: Array<{ path: ReleaseRelativePath; mode: number; bytes: Uint8Array }> = [];
      for (const declared of member.payload.manifest) {
        const repositoryPathResult = parseReleaseRelativePath(
          `${memberRoot}/${declared.path}`,
          "repositoryPayloadPath",
        );
        if (!repositoryPathResult.ok) {
          return stagedIneligible("ReleaseInputMismatch", "payload path is not canonical");
        }
        const repositoryPath = repositoryPathResult.value;
        const entry = entries.find((candidate) => candidate.path === repositoryPath);
        if (entry === undefined) return stagedIneligible("PayloadMismatch", `missing staged payload ${repositoryPath}`);
        payloadEntries.push({
          path: declared.path,
          mode: entry.mode,
          bytes: requireStagedBlob(blobByObjectId, entry),
        });
        admitted.add(repositoryPath);
      }
      if (entries.some((entry) => entry.path.startsWith(`${memberRoot}/`) && !admitted.has(entry.path))) {
        return stagedIneligible("PayloadMismatch", `staged payload root ${memberRoot} contains undeclared files`);
      }
      const payloadResult = createAgentPluginPayload(payloadEntries);
      if (!payloadResult.ok) {
        return stagedIneligible("PayloadMismatch", payloadResult.issues.map((issue) => issue.code).join(","));
      }
      if (
        payloadResult.value.payloadDigest !== member.payload.payloadDigest
        || !sameManifest(payloadResult.value.manifest, member.payload.manifest)
      ) return stagedIneligible("PayloadMismatch", `payload declaration differs for ${member.pluginId}`);
      payloads.push(Object.freeze({ pluginId: member.pluginId, payload: payloadResult.value }));
    }

    const objectBindings = Object.freeze([...admitted].sort(compareCanonicalText).map((path) => {
      const entry = entries.find((candidate) => candidate.path === path);
      if (entry === undefined) throw new Error(`missing admitted staged path ${path}`);
      return Object.freeze({ path, objectId: entry.objectId, mode: entry.mode });
    }));
    const commit = parsedGitCommit(anchor.commit);
    const tree = parsedGitTree(anchor.tree);
    const stagedBinding = digestBinding({
      repositoryIdentity: policy.repositoryIdentity,
      remoteName: policy.remoteName,
      remoteUrl: policy.remoteUrl,
      refName: policy.refName,
      headCommit: commit,
      headTree: tree,
      index: hashBytes(observation.opening.indexEntries),
      objectBindings,
      blobs: [...observation.blobs]
        .sort((left, right) => compareCanonicalText(left.objectId, right.objectId))
        .map((blob) => ({ objectId: blob.objectId, digest: hashBytes(blob.bytes) })),
    });
    return {
      kind: "StagedContentWorkspaceEligible",
      snapshot: Object.freeze({
        kind: "StagedContentWorkspaceSnapshot",
        repositoryIdentity: policy.repositoryIdentity,
        refName: policy.refName,
        headCommit: commit,
        headTree: tree,
        releaseInput: releaseInputClassification.releaseInput,
        payloads: Object.freeze(payloads),
        objectBindings,
        stagedBinding,
      }),
    };
  } catch (error) {
    return classificationFailure(error);
  }
}

export function classifyStagedObservationFailure(
  reason: StagedObservationFailureReason,
  detail: string,
  phase: "release-input" | "payloads",
): Exclude<StagedContentWorkspaceInspection, { kind: "StagedContentWorkspaceEligible" }> {
  switch (reason) {
    case "Aliased":
      return stagedIneligible("AliasedLocator", detail);
    case "InvalidInput":
      return stagedIneligible("InvalidTree", detail);
    case "LimitExceeded":
      return stagedIneligible(phase === "release-input" ? "ReleaseInputMismatch" : "PayloadMismatch", detail);
    case "Unavailable":
      return stagedIneligible("GitFailure", detail);
  }
}

function validateAnchor(
  anchor: StagedIndexBindingObservation["anchor"],
  policy: StagedContentWorkspacePolicy,
): SourceEligibilityIssue | undefined {
  if (anchor.refName !== policy.refName) {
    return sourceIssue("WrongRef", `expected ${policy.refName}, observed ${anchor.refName}`);
  }
  if (anchor.refCommit !== anchor.commit) return sourceIssue("WrongCommit", "HEAD and its exact branch ref differ");
  if (anchor.remoteUrls.length !== 1 || anchor.remoteUrls[0] !== policy.remoteUrl) {
    return sourceIssue("WrongRepository", "configured remote does not exactly match repository policy");
  }
  if (!parseGitCommitId(anchor.commit).ok) return sourceIssue("WrongCommit", "observed HEAD commit is not canonical");
  if (!parseGitTreeId(anchor.tree).ok) return sourceIssue("WrongTree", "observed HEAD tree is not canonical");
  return undefined;
}

function parseStagedIndex(
  bytes: Uint8Array,
  objectFormat: "sha1" | "sha256",
): readonly StagedTreeEntry[] {
  const records = splitNul(bytes);
  if (records.length > MAX_STAGED_INDEX_ENTRIES) {
    throw stagedError("InvalidTree", "Git index exceeds the staged entry bound");
  }
  const entries: StagedTreeEntry[] = [];
  const exactPaths = new Set<string>();
  const portablePaths = new Set<string>();
  const objectPattern = objectFormat === "sha1" ? /^[0-9a-f]{40}$/u : /^[0-9a-f]{64}$/u;
  for (const record of records) {
    const match = /^(100644|100755) ([0-9a-f]+) ([0-3])\t(.+)$/u.exec(record);
    if (match === null || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
      throw stagedError("InvalidTree", "Git index contains a non-regular or malformed entry");
    }
    if (match[3] !== "0") throw stagedError("DirtyIndex", "Git index contains an unmerged entry");
    if (!objectPattern.test(match[2])) {
      throw stagedError("InvalidTree", "Git index object identity has the wrong format");
    }
    const pathResult = parseReleaseRelativePath(match[4], "stagedIndex.path");
    if (!pathResult.ok) throw stagedError("InvalidTree", "Git index contains a noncanonical path");
    const portablePath = pathResult.value.normalize("NFC").toLowerCase();
    if (exactPaths.has(pathResult.value) || portablePaths.has(portablePath)) {
      throw stagedError("InvalidTree", `Git index contains a colliding path: ${pathResult.value}`);
    }
    exactPaths.add(pathResult.value);
    portablePaths.add(portablePath);
    entries.push(Object.freeze({
      mode: match[1] === "100755" ? 0o755 : 0o644,
      objectId: match[2],
      path: pathResult.value,
    }));
  }
  return Object.freeze(entries);
}

function stagedBlobMap(
  observation: StagedIndexObservation,
  entries: readonly StagedTreeEntry[],
  materializedPaths: readonly string[],
  materializedRoots: readonly string[],
): ReadonlyMap<string, Uint8Array> {
  const expected = new Set(entries.filter((entry) => (
    materializedPaths.includes(entry.path)
    || materializedRoots.some((root) => entry.path === root || entry.path.startsWith(`${root}/`))
  )).map((entry) => entry.objectId));
  const blobs = new Map<string, Uint8Array>();
  for (const blob of observation.blobs) {
    if (!expected.has(blob.objectId) || blobs.has(blob.objectId)) {
      throw stagedError("GitFailure", "staged blob observation does not exactly match the opening index");
    }
    blobs.set(blob.objectId, blob.bytes);
  }
  if (blobs.size !== expected.size) throw stagedError("GitFailure", "staged blob observation is incomplete");
  return blobs;
}

function requireStagedBlob(
  blobs: ReadonlyMap<string, Uint8Array>,
  entry: StagedTreeEntry,
): Uint8Array {
  const bytes = blobs.get(entry.objectId);
  if (bytes === undefined) throw stagedError("GitFailure", `missing staged blob bytes for ${entry.path}`);
  return bytes;
}

function sameStagedIndexBinding(
  left: StagedIndexBindingObservation,
  right: StagedIndexBindingObservation,
): boolean {
  return sameAnchor(left.anchor, right.anchor) && equalBytes(left.indexEntries, right.indexEntries);
}

function sameAnchor(
  left: StagedIndexBindingObservation["anchor"],
  right: StagedIndexBindingObservation["anchor"],
): boolean {
  return left.root === right.root
    && left.rootDevice === right.rootDevice
    && left.rootInode === right.rootInode
    && left.refName === right.refName
    && left.commit === right.commit
    && left.refCommit === right.refCommit
    && left.tree === right.tree
    && left.objectFormat === right.objectFormat
    && left.remoteUrls.length === right.remoteUrls.length
    && left.remoteUrls.every((url, index) => url === right.remoteUrls[index]);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    const leftByte = left[index];
    const rightByte = right[index];
    if (leftByte === undefined || rightByte === undefined) return false;
    difference |= leftByte ^ rightByte;
  }
  return difference === 0;
}

function splitNul(bytes: Uint8Array): readonly string[] {
  if (bytes.byteLength === 0) return [];
  let decoded: string;
  try {
    decoded = decoder.decode(bytes);
  } catch {
    throw stagedError("InvalidTree", "Git index output is not valid UTF-8");
  }
  if (!decoded.endsWith("\0")) throw stagedError("InvalidTree", "Git index output lacks a trailing NUL");
  return decoded.slice(0, -1).split("\0");
}

function sameManifest(
  left: readonly { path: string; mode: number; byteLength: number; contentDigest: string }[],
  right: readonly { path: string; mode: number; byteLength: number; contentDigest: string }[],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && entry.path === other.path
      && entry.mode === other.mode
      && entry.byteLength === other.byteLength
      && entry.contentDigest === other.contentDigest;
  });
}

function preflightAggregatePayloadBytes(releaseInput: AgentPluginReleaseInput): string | undefined {
  let aggregateBytes = 0;
  for (const member of releaseInput.body.members) {
    for (const entry of member.payload.manifest) {
      const next = addReleaseSetPayloadBytes(aggregateBytes, entry.byteLength);
      if (!next.ok) return `release input payloads exceed ${MAX_RELEASE_SET_PAYLOAD_BYTES} decoded bytes`;
      aggregateBytes = next.value;
    }
  }
  return undefined;
}

function parsedGitCommit(value: string) {
  const parsed = parseGitCommitId(value);
  if (!parsed.ok) throw stagedError("WrongCommit", "observed HEAD commit is not canonical");
  return parsed.value;
}

function parsedGitTree(value: string) {
  const parsed = parseGitTreeId(value);
  if (!parsed.ok) throw stagedError("WrongTree", "observed HEAD tree is not canonical");
  return parsed.value;
}

function digestBinding(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function classificationFailure(error: unknown): Exclude<
  StagedContentWorkspaceInspection,
  { kind: "StagedContentWorkspaceEligible" }
> {
  if (isStagedClassificationError(error)) {
    return stagedIneligible(error.classificationCode, error.message);
  }
  return stagedIneligible("GitFailure", error instanceof Error ? error.message : String(error));
}

function stagedIneligible(
  code: SourceEligibilityIssueCode,
  detail: string,
): Extract<StagedContentWorkspaceInspection, { kind: "StagedContentWorkspaceIneligible" }> {
  return { kind: "StagedContentWorkspaceIneligible", issues: [sourceIssue(code, detail)] };
}

function sourceChanged(
  detail: string,
): Extract<StagedContentWorkspaceInspection, { kind: "SourceChanged" }> {
  return { kind: "SourceChanged", detail };
}

function sourceIssue(code: SourceEligibilityIssueCode, detail: string): SourceEligibilityIssue {
  return Object.freeze({ code, detail });
}

class StagedClassificationError extends Error {
  constructor(
    readonly classificationCode: SourceEligibilityIssueCode,
    detail: string,
  ) {
    super(detail);
    this.name = "StagedClassificationError";
  }
}

function stagedError(code: SourceEligibilityIssueCode, detail: string): StagedClassificationError {
  return new StagedClassificationError(code, detail);
}

function isStagedClassificationError(error: unknown): error is StagedClassificationError {
  return error instanceof StagedClassificationError;
}

function isCanonicalHeadRef(value: string): boolean {
  return value.startsWith("refs/heads/")
    && value.length <= 512
    && !/[\u0000-\u0020~^:?*\\[]/u.test(value)
    && !value.includes("..")
    && !value.includes("@{")
    && !value.endsWith("/")
    && !value.endsWith(".")
    && value.split("/").every((part) => part !== "" && !part.startsWith(".") && !part.endsWith(".lock"));
}
