import type {
  ContentTreeEntry,
  ContentWorkspaceFailure,
  GitBlobObservation,
  GitTrackedPathFlag,
  GitWorkspaceAnchor,
  GitWorkspaceEvidence,
} from "@habitat-ai/rawr-resource-content-workspace";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Result } from "effect";
import {
  type AgentPluginPayload,
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  type NormalizedFileMode,
} from "../dto/agent-plugin-payload";
import type {
  ContentWorkspaceInspection,
  ContentWorkspacePolicy,
  SourceEligibilityIssue,
  SourceEligibilityIssueCode,
} from "../dto/content-workspace";
import { sourceEligibilityIssue } from "../dto/content-workspace";
import type { PluginId, ReleaseRelativePath } from "../dto/release-identity";
import {
  type AgentPluginReleaseInput,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
} from "../dto/release-input";
import { createAgentPluginPayload } from "./agent-plugin-payload";
import { equalBytes } from "./byte-equality";
import { compareCanonicalText } from "./canonical-text-ordering";
import { validateDeclaredPluginTree } from "./declared-plugin-tree";
import { validateAgentPluginPayloadOwnership } from "./distribution-ownership";
import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "./release-identity";
import { decodeAgentPluginReleaseInput } from "./release-input";
import {
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  totalReleaseSetPayloadBytes,
} from "./release-payload-accounting";

const decoder = new TextDecoder("utf-8", { fatal: true });
const encoder = new TextEncoder();

/** Maximum native Git tree bytes admitted by clean-content policy. */
export const MAX_CLEAN_CONTENT_TREE_BYTES = 100 * 1024 * 1024;

/** Maximum status, tracked-flag, or index bytes admitted per evidence field. */
export const MAX_CLEAN_CONTENT_INDEX_BYTES = 64 * 1024 * 1024;

/** Maximum canonical release-input bytes read by one clean-content operation. */
export const MAX_CLEAN_RELEASE_INPUT_BYTES = MAX_RELEASE_INPUT_ENVELOPE_BYTES;

/** Maximum decoded payload bytes admitted for any one release-set member. */
export const MAX_CLEAN_MEMBER_PAYLOAD_BYTES = MAX_PAYLOAD_BYTES_PER_MEMBER;

/** Maximum bytes read from any one admitted worktree file. */
export const MAX_CLEAN_CONTENT_WORKTREE_FILE_BYTES = Math.max(
  MAX_CLEAN_RELEASE_INPUT_BYTES,
  MAX_CLEAN_MEMBER_PAYLOAD_BYTES
);

/** Maximum aggregate bytes read from all admitted worktree files. */
export const MAX_CLEAN_CONTENT_WORKTREE_BYTES =
  MAX_CLEAN_RELEASE_INPUT_BYTES + MAX_RELEASE_SET_PAYLOAD_BYTES;

/** Canonical regular Git tree fact interpreted by clean-content policy. */
interface CleanContentTreeEntry {
  readonly mode: NormalizedFileMode;
  readonly objectId: string;
  readonly path: ReleaseRelativePath;
}

/** One policy-classified clean workspace evidence capture. */
interface CleanWorkspaceEvidence {
  readonly anchor: GitWorkspaceAnchor;
  readonly trackedStatus: Uint8Array;
  readonly trackedFlags: readonly GitTrackedPathFlag[];
  readonly worktreeObjectIds: readonly Readonly<{
    path: ReleaseRelativePath;
    objectId: string;
  }>[];
  readonly untracked: Uint8Array;
  readonly ignored: Uint8Array;
  readonly index: Uint8Array;
}

/** Pure clean-content decision returned between resource observations. */
type CleanContentDecision<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{
      ok: false;
      result: Extract<ContentWorkspaceInspection, { kind: "Ineligible" }>;
    }>;

/** Admitted Git anchor facts required by the clean tree observation. */
interface CleanWorkspaceAnchorFacts {
  readonly anchor: GitWorkspaceAnchor;
}

/** Admitted tree facts required by the release-input blob observation. */
interface CleanWorkspaceTreeFacts extends CleanWorkspaceAnchorFacts {
  readonly treeEntries: readonly CleanContentTreeEntry[];
  readonly entryByPath: ReadonlyMap<ReleaseRelativePath, CleanContentTreeEntry>;
  readonly releaseInputEntry: CleanContentTreeEntry;
}

/** Admitted release-input facts required by the payload blob batch observation. */
interface CleanPayloadReadFacts extends CleanWorkspaceTreeFacts {
  readonly releaseInput: AgentPluginReleaseInput;
  readonly admittedPaths: readonly ReleaseRelativePath[];
  readonly consumedRoots: readonly ReleaseRelativePath[];
  readonly blobEntries: readonly CleanContentTreeEntry[];
  readonly memberPayloads: readonly Readonly<{
    pluginId: PluginId;
    entries: readonly Readonly<{
      path: ReleaseRelativePath;
      entry: CleanContentTreeEntry;
    }>[];
  }>[];
}

/** Admitted payload facts required by the two workspace evidence captures. */
interface CleanEvidenceReadFacts extends CleanPayloadReadFacts {
  readonly payloads: readonly Readonly<{
    pluginId: PluginId;
    payload: AgentPluginPayload;
  }>[];
}

/** Classifies one typed workspace anchor observation without performing I/O. */
export function classifyCleanContentWorkspaceAnchor(
  policy: ContentWorkspacePolicy,
  attempt: Result.Result<GitWorkspaceAnchor, ContentWorkspaceFailure>
): CleanContentDecision<CleanWorkspaceAnchorFacts> {
  if (attempt._tag === "Failure") return declined(inspectWorkspaceFailure(attempt.failure));
  const anchor = attempt.success;
  const objectFormat = anchor.objectFormat;
  const objectIdPattern =
    objectFormat === "sha1"
      ? /^[0-9a-f]{40}$/u
      : objectFormat === "sha256"
        ? /^[0-9a-f]{64}$/u
        : undefined;
  if (objectIdPattern === undefined) {
    return declined(ineligible("GitFailure", `unsupported Git object format: ${objectFormat}`));
  }
  if (anchor.refName !== policy.refName) {
    return declined(
      ineligible("WrongRef", `expected ${policy.refName}, observed ${anchor.refName}`)
    );
  }
  if (anchor.remoteUrls.length !== 1 || anchor.remoteUrls[0] !== policy.remoteUrl) {
    return declined(
      ineligible("WrongRepository", "configured remote does not exactly match repository policy")
    );
  }
  if (
    !objectIdPattern.test(anchor.commit) ||
    anchor.commit !== policy.sourceCommit ||
    anchor.refCommit !== anchor.commit
  ) {
    return declined(
      ineligible("WrongCommit", `expected ${policy.sourceCommit}, observed ${anchor.commit}`)
    );
  }
  if (!objectIdPattern.test(anchor.tree) || anchor.tree !== policy.sourceTree) {
    return declined(
      ineligible("WrongTree", `expected ${policy.sourceTree}, observed ${anchor.tree}`)
    );
  }
  return admitted(Object.freeze({ anchor }));
}

/** Classifies bounded Git tree facts and selects the declared release-input blob. */
export function classifyCleanContentWorkspaceTree(
  policy: ContentWorkspacePolicy,
  anchor: CleanWorkspaceAnchorFacts,
  attempt: Result.Result<readonly ContentTreeEntry[], ContentWorkspaceFailure>
): CleanContentDecision<CleanWorkspaceTreeFacts> {
  if (attempt._tag === "Failure") return declined(inspectWorkspaceFailure(attempt.failure));
  try {
    const treeEntries = interpretTreeEntries(attempt.success);
    const entryByPath = new Map(treeEntries.map((entry) => [entry.path, entry]));
    const releaseInputPath = parseReleaseRelativePath(
      policy.releaseInputPath,
      "policy.releaseInputPath"
    );
    if (!releaseInputPath.ok) {
      return declined(ineligible("ReleaseInputMismatch", "release-input path is not canonical"));
    }
    const releaseInputEntry = entryByPath.get(releaseInputPath.value);
    if (releaseInputEntry === undefined) {
      return declined(
        ineligible(
          "MissingReleaseInput",
          `missing tracked release input ${policy.releaseInputPath}`
        )
      );
    }
    return admitted(
      Object.freeze({
        ...anchor,
        treeEntries,
        entryByPath,
        releaseInputEntry,
      })
    );
  } catch (error) {
    return declined(inspectWorkspaceFailure(error));
  }
}

/**
 * Classifies release-input bytes and derives every blob below each declared member root.
 *
 * @remarks
 * This phase owns release policy only. The calling operation remains responsible
 * for invoking the content-workspace resource before and after this decision.
 */
export function classifyCleanReleaseInput(
  policy: ContentWorkspacePolicy,
  tree: CleanWorkspaceTreeFacts,
  attempt: Result.Result<Uint8Array, ContentWorkspaceFailure>
): CleanContentDecision<CleanPayloadReadFacts> {
  if (attempt._tag === "Failure") return declined(inspectWorkspaceFailure(attempt.failure));
  const releaseInputBytes = attempt.success;
  if (releaseInputBytes.byteLength > MAX_CLEAN_RELEASE_INPUT_BYTES) {
    return declined(
      ineligible(
        "GitFailure",
        `blob for ${tree.releaseInputEntry.path} exceeds ${MAX_CLEAN_RELEASE_INPUT_BYTES} bytes`
      )
    );
  }
  const releaseInputResult = decodeAgentPluginReleaseInput(releaseInputBytes);
  if (!releaseInputResult.ok) {
    return declined(
      ineligible(
        "ReleaseInputMismatch",
        releaseInputResult.issues.map((entry) => entry.code).join(",")
      )
    );
  }
  const releaseInput = releaseInputResult.value;
  if (releaseInput.body.contentAuthority !== policy.contentAuthority) {
    return declined(
      ineligible("ReleaseInputMismatch", "release input declares a different content authority")
    );
  }
  const pluginRoot = parseReleaseRelativePath(policy.pluginRoot, "policy.pluginRoot");
  const memberIds: PluginId[] = [];
  for (const member of releaseInput.body.members) {
    const pluginId = parsePluginId(member.pluginId, "releaseInput.members.pluginId");
    if (!pluginId.ok) {
      return declined(ineligible("ReleaseInputMismatch", "member identity is not canonical"));
    }
    memberIds.push(pluginId.value);
  }
  if (!pluginRoot.ok) {
    return declined(ineligible("ReleaseInputMismatch", "plugin root is not canonical"));
  }
  const declaredPluginIssue = validateDeclaredPluginTree({
    pluginRoot: pluginRoot.value,
    paths: tree.treeEntries.map((entry) => entry.path),
    declaredPluginIds: memberIds,
  });
  if (declaredPluginIssue !== undefined) return declined(ineligibleIssue(declaredPluginIssue));

  const admittedPaths = new Set<ReleaseRelativePath>([tree.releaseInputEntry.path]);
  const consumedRoots: ReleaseRelativePath[] = [];
  const memberPayloads: Array<
    Readonly<{
      pluginId: PluginId;
      entries: readonly Readonly<{
        path: ReleaseRelativePath;
        entry: CleanContentTreeEntry;
      }>[];
    }>
  > = [];
  const uniqueBlobEntries = new Map<string, CleanContentTreeEntry>();
  for (const [index, member] of releaseInput.body.members.entries()) {
    const pluginId = memberIds[index]!;
    const rootResult = parseReleaseRelativePath(`${pluginRoot.value}/${pluginId}`, "memberRoot");
    if (!rootResult.ok) {
      return declined(ineligible("ReleaseInputMismatch", "member root is not canonical"));
    }
    const memberRoot = rootResult.value;
    consumedRoots.push(memberRoot);
    const entries: Array<Readonly<{ path: ReleaseRelativePath; entry: CleanContentTreeEntry }>> =
      [];
    const actualUnderRoot = tree.treeEntries
      .filter((entry) => entry.path.startsWith(`${memberRoot}/`))
      .sort((left, right) => compareCanonicalText(left.path, right.path));
    if (actualUnderRoot.length === 0) {
      return declined(
        ineligible("PayloadMismatch", `declared payload root ${memberRoot} contains no files`)
      );
    }
    for (const entry of actualUnderRoot) {
      const relativePathResult = parseReleaseRelativePath(
        entry.path.slice(memberRoot.length + 1),
        "repositoryPayloadPath"
      );
      if (!relativePathResult.ok) {
        return declined(ineligible("PayloadMismatch", "payload path is not canonical"));
      }
      entries.push(Object.freeze({ path: relativePathResult.value, entry }));
      uniqueBlobEntries.set(entry.objectId, entry);
      admittedPaths.add(entry.path);
    }
    memberPayloads.push(
      Object.freeze({
        pluginId,
        entries: Object.freeze(entries),
      })
    );
  }

  return admitted(
    Object.freeze({
      ...tree,
      releaseInput,
      admittedPaths: Object.freeze([...admittedPaths].sort(compareCanonicalText)),
      consumedRoots: Object.freeze([...consumedRoots].sort(compareCanonicalText)),
      blobEntries: Object.freeze([...uniqueBlobEntries.values()]),
      memberPayloads: Object.freeze(memberPayloads),
    })
  );
}

/** Classifies one bounded payload blob batch into byte-derived member payloads. */
export function classifyCleanPayloads(
  releaseInput: CleanPayloadReadFacts,
  attempt: Result.Result<readonly GitBlobObservation[], ContentWorkspaceFailure>
): CleanContentDecision<CleanEvidenceReadFacts> {
  if (attempt._tag === "Failure") return declined(inspectWorkspaceFailure(attempt.failure));
  const bytesByBlob = new Map(
    attempt.success.map((observation) => [observation.blob, observation.bytes])
  );
  if (bytesByBlob.size !== releaseInput.blobEntries.length) {
    return declined(
      ineligible("PayloadMismatch", "Git batch omitted or duplicated a selected payload blob")
    );
  }

  const payloads: Array<Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>> = [];
  for (const memberPayload of releaseInput.memberPayloads) {
    const payloadEntries: Array<{
      path: ReleaseRelativePath;
      mode: NormalizedFileMode;
      bytes: Uint8Array;
    }> = [];
    for (const selected of memberPayload.entries) {
      const bytes = bytesByBlob.get(selected.entry.objectId);
      if (bytes === undefined) {
        return declined(
          ineligible("PayloadMismatch", `Git batch omitted selected payload ${selected.entry.path}`)
        );
      }
      payloadEntries.push({
        path: selected.path,
        mode: selected.entry.mode,
        bytes,
      });
    }
    const payloadResult = createAgentPluginPayload(payloadEntries);
    if (!payloadResult.ok) {
      return declined(
        ineligible("PayloadMismatch", payloadResult.issues.map((entry) => entry.code).join(","))
      );
    }
    const ownershipIssues = validateAgentPluginPayloadOwnership(
      releaseInput.releaseInput.ownershipIndex,
      memberPayload.pluginId,
      payloadResult.value.manifest,
      `release.payloads.${memberPayload.pluginId}.manifest`
    );
    if (ownershipIssues.length > 0) {
      return declined(
        ineligible("PayloadMismatch", ownershipIssues.map((entry) => entry.code).join(","))
      );
    }
    payloads.push(
      Object.freeze({
        pluginId: memberPayload.pluginId,
        payload: payloadResult.value,
      })
    );
  }
  if (!totalReleaseSetPayloadBytes(payloads).ok) {
    return declined(
      ineligible(
        "PayloadMismatch",
        `release input payloads exceed ${MAX_RELEASE_SET_PAYLOAD_BYTES} decoded bytes`
      )
    );
  }

  return admitted(
    Object.freeze({
      ...releaseInput,
      payloads: Object.freeze(payloads),
    })
  );
}

/** Classifies one resource-owned evidence capture into clean-content policy facts. */
export function classifyCleanWorkspaceEvidence(
  policy: ContentWorkspacePolicy,
  payloads: CleanEvidenceReadFacts,
  attempt: Result.Result<GitWorkspaceEvidence, ContentWorkspaceFailure>
): CleanContentDecision<CleanWorkspaceEvidence> {
  if (attempt._tag === "Failure") return declined(inspectWorkspaceFailure(attempt.failure));
  try {
    const evidence = interpretWorkspaceEvidence(attempt.success, payloads.consumedRoots);
    const issue = validateWorkspaceEvidence(
      evidence,
      policy,
      payloads.anchor.objectFormat,
      payloads.entryByPath,
      payloads.admittedPaths
    );
    return issue === undefined ? admitted(evidence) : declined(ineligibleIssue(issue));
  } catch (error) {
    return declined(inspectWorkspaceFailure(error));
  }
}

/**
 * Classifies the closing evidence capture without assigning it a new refusal.
 *
 * @remarks
 * The opening capture owns concrete eligibility. A different but internally
 * coherent closing capture is classified as source change during finalization,
 * preserving the operation's linearization precedence.
 */
export function classifyClosingCleanWorkspaceEvidence(
  payloads: CleanEvidenceReadFacts,
  attempt: Result.Result<GitWorkspaceEvidence, ContentWorkspaceFailure>
): CleanContentDecision<CleanWorkspaceEvidence> {
  if (attempt._tag === "Failure") return declined(inspectWorkspaceFailure(attempt.failure));
  try {
    return admitted(interpretWorkspaceEvidence(attempt.success, payloads.consumedRoots));
  } catch (error) {
    return declined(inspectWorkspaceFailure(error));
  }
}

/** Finishes one clean snapshot after two equal, independently classified evidence captures. */
export function finishCleanContentWorkspaceInspection(
  policy: ContentWorkspacePolicy,
  payloads: CleanEvidenceReadFacts,
  openingEvidence: CleanWorkspaceEvidence,
  closingEvidence: CleanWorkspaceEvidence
): ContentWorkspaceInspection {
  if (!sameWorkspaceEvidence(openingEvidence, closingEvidence)) {
    return ineligible(
      "SourceChanged",
      "repository evidence changed before the eligibility linearization point"
    );
  }

  const objectBindings: Array<
    Readonly<{ path: ReleaseRelativePath; objectId: string; mode: NormalizedFileMode }>
  > = [];
  for (const path of payloads.admittedPaths) {
    const entry = payloads.entryByPath.get(path);
    if (entry === undefined) {
      return ineligible("InvalidTree", `admitted path disappeared from tree facts: ${path}`);
    }
    objectBindings.push(Object.freeze({ path, objectId: entry.objectId, mode: entry.mode }));
  }
  const frozenBindings = Object.freeze(objectBindings);
  const eligibilityBinding = digestBinding({
    repositoryIdentity: policy.repositoryIdentity,
    remoteName: policy.remoteName,
    remoteUrl: policy.remoteUrl,
    refName: payloads.anchor.refName,
    commit: payloads.anchor.commit,
    tree: payloads.anchor.tree,
    objectBindings: frozenBindings,
    index: hashBytes(closingEvidence.index),
    trackedStatus: hashBytes(closingEvidence.trackedStatus),
    untracked: hashBytes(closingEvidence.untracked),
    ignored: hashBytes(closingEvidence.ignored),
    trackedFlags: closingEvidence.trackedFlags,
    worktreeObjectIds: closingEvidence.worktreeObjectIds,
  });
  return {
    kind: "Eligible",
    snapshot: Object.freeze({
      repositoryIdentity: policy.repositoryIdentity,
      sourceCommit: policy.sourceCommit,
      sourceTree: policy.sourceTree,
      releaseInput: payloads.releaseInput,
      payloads: payloads.payloads,
      objectBindings: frozenBindings,
      eligibilityBinding,
    }),
  };
}

function interpretWorkspaceEvidence(
  evidence: GitWorkspaceEvidence,
  consumedRoots: readonly ReleaseRelativePath[]
): CleanWorkspaceEvidence {
  const openingStatus = classifyWorkspaceStatus(evidence.openingStatus, consumedRoots);
  const closingStatus = classifyWorkspaceStatus(evidence.closingStatus, consumedRoots);
  if (!sameRepositoryAnchor(evidence.openingAnchor, evidence.closingAnchor)) {
    throw eligibilityError("SourceChanged", "repository anchor changed during its closing capture");
  }
  if (!sameTrackedPathFlags(evidence.openingTrackedFlags, evidence.closingTrackedFlags)) {
    throw eligibilityError(
      "SourceChanged",
      "admitted path flags changed during the repository evidence capture"
    );
  }
  if (!sameWorkspaceStatus(openingStatus, closingStatus)) {
    throw eligibilityError(
      "SourceChanged",
      "tracked or consumed-path status changed during the repository evidence capture"
    );
  }
  return Object.freeze({
    anchor: evidence.closingAnchor,
    trackedStatus: closingStatus.tracked,
    trackedFlags: evidence.closingTrackedFlags,
    worktreeObjectIds: evidence.worktreeObjectIds.map((entry) =>
      Object.freeze({
        path: requireReleasePath(entry.path),
        objectId: entry.objectId,
      })
    ),
    untracked: closingStatus.untracked,
    ignored: closingStatus.ignored,
    index: evidence.indexEntries,
  });
}

function classifyWorkspaceStatus(
  status: Uint8Array,
  consumedRoots: readonly ReleaseRelativePath[]
): Readonly<{
  tracked: Uint8Array;
  untracked: Uint8Array;
  ignored: Uint8Array;
}> {
  const tracked: string[] = [];
  const untracked: string[] = [];
  const ignored: string[] = [];
  const records = splitNul(status).map((record) => decoder.decode(record));
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]!;
    if (record.startsWith("2 ")) {
      tracked.push(record);
      const originalPath = records[index + 1];
      if (originalPath === undefined) {
        throw eligibilityError("SourceChanged", "Git status rename evidence is incomplete");
      }
      tracked.push(originalPath);
      index += 1;
      continue;
    }
    if (record.startsWith("1 ") || record.startsWith("u ")) {
      tracked.push(record);
      continue;
    }
    const target = record.startsWith("? ")
      ? untracked
      : record.startsWith("! ")
        ? ignored
        : undefined;
    if (target !== undefined) {
      const path = record.slice(2);
      if (
        consumedRoots.some((candidate) => path === candidate || path.startsWith(`${candidate}/`))
      ) {
        target.push(path);
      }
      continue;
    }
    if (!record.startsWith("# ")) tracked.push(record);
  }
  return Object.freeze({
    tracked: encodeNulList(tracked),
    untracked: encodeNulList(untracked),
    ignored: encodeNulList(ignored),
  });
}

function sameWorkspaceStatus(
  left: ReturnType<typeof classifyWorkspaceStatus>,
  right: ReturnType<typeof classifyWorkspaceStatus>
): boolean {
  return (
    equalBytes(left.tracked, right.tracked) &&
    equalBytes(left.untracked, right.untracked) &&
    equalBytes(left.ignored, right.ignored)
  );
}

function requireReleasePath(candidate: string): ReleaseRelativePath {
  const result = parseReleaseRelativePath(candidate, "gitEvidence.path");
  if (!result.ok)
    throw eligibilityError("InvalidTree", "Git evidence returned a noncanonical path");
  return result.value;
}

function validateWorkspaceEvidence(
  evidence: CleanWorkspaceEvidence,
  policy: ContentWorkspacePolicy,
  objectFormat: string,
  entryByPath: ReadonlyMap<ReleaseRelativePath, CleanContentTreeEntry>,
  admittedPaths: readonly ReleaseRelativePath[]
): SourceEligibilityIssue | undefined {
  const anchor = evidence.anchor;
  if (anchor.objectFormat !== objectFormat)
    return sourceIssue("SourceChanged", "Git object format changed");
  if (anchor.refName !== policy.refName)
    return sourceIssue("WrongRef", `expected ${policy.refName}, observed ${anchor.refName}`);
  if (anchor.remoteUrls.length !== 1 || anchor.remoteUrls[0] !== policy.remoteUrl) {
    return sourceIssue(
      "WrongRepository",
      "configured remote does not exactly match repository policy"
    );
  }
  if (anchor.commit !== policy.sourceCommit || anchor.refCommit !== anchor.commit) {
    return sourceIssue("WrongCommit", `expected ${policy.sourceCommit}, observed ${anchor.commit}`);
  }
  if (anchor.tree !== policy.sourceTree)
    return sourceIssue("WrongTree", `expected ${policy.sourceTree}, observed ${anchor.tree}`);

  const dirty = classifyTrackedStatus(evidence.trackedStatus);
  if (dirty === "index") return sourceIssue("DirtyIndex", "Git index differs from HEAD");
  if (dirty === "worktree")
    return sourceIssue("DirtyTrackedWorktree", "tracked worktree differs from index");
  const trackedPaths = new Set(evidence.trackedFlags.map((fact) => fact.path));
  if (
    evidence.trackedFlags.length !== admittedPaths.length ||
    trackedPaths.size !== evidence.trackedFlags.length ||
    evidence.trackedFlags.some((fact) => fact.status !== "Cached" || fact.assumeUnchanged) ||
    admittedPaths.some((path) => !trackedPaths.has(path))
  ) {
    return sourceIssue("DirtyIndex", "admitted paths carry noncanonical index flags");
  }
  for (const observed of evidence.worktreeObjectIds) {
    if (observed.objectId !== entryByPath.get(observed.path)?.objectId) {
      return sourceIssue("DirtyTrackedWorktree", `worktree bytes differ at ${observed.path}`);
    }
  }
  if (evidence.untracked.byteLength > 0) {
    return sourceIssue(
      "UntrackedConsumedPath",
      decodeNulList(evidence.untracked)[0] ?? "unknown path"
    );
  }
  if (evidence.ignored.byteLength > 0) {
    return sourceIssue("IgnoredConsumedPath", decodeNulList(evidence.ignored)[0] ?? "unknown path");
  }
  return undefined;
}

function sameWorkspaceEvidence(
  left: CleanWorkspaceEvidence,
  right: CleanWorkspaceEvidence
): boolean {
  return (
    sameRepositoryAnchor(left.anchor, right.anchor) &&
    equalBytes(left.trackedStatus, right.trackedStatus) &&
    sameTrackedPathFlags(left.trackedFlags, right.trackedFlags) &&
    sameWorktreeObjectIds(left.worktreeObjectIds, right.worktreeObjectIds) &&
    equalBytes(left.untracked, right.untracked) &&
    equalBytes(left.ignored, right.ignored) &&
    equalBytes(left.index, right.index)
  );
}

function sameRepositoryAnchor(left: GitWorkspaceAnchor, right: GitWorkspaceAnchor): boolean {
  return (
    left.root === right.root &&
    left.rootDevice === right.rootDevice &&
    left.rootInode === right.rootInode &&
    left.objectFormat === right.objectFormat &&
    left.refName === right.refName &&
    left.remoteUrls.length === right.remoteUrls.length &&
    left.remoteUrls.every((url, index) => url === right.remoteUrls[index]) &&
    left.commit === right.commit &&
    left.refCommit === right.refCommit &&
    left.tree === right.tree
  );
}

function sameWorktreeObjectIds(
  left: CleanWorkspaceEvidence["worktreeObjectIds"],
  right: CleanWorkspaceEvidence["worktreeObjectIds"]
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => {
      const other = right[index];
      return other !== undefined && entry.path === other.path && entry.objectId === other.objectId;
    })
  );
}

function sameTrackedPathFlags(
  left: readonly GitTrackedPathFlag[],
  right: readonly GitTrackedPathFlag[]
): boolean {
  return (
    left.length === right.length &&
    left.every((fact, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        fact.path === other.path &&
        fact.status === other.status &&
        fact.assumeUnchanged === other.assumeUnchanged
      );
    })
  );
}

function interpretTreeEntries(
  entries: readonly ContentTreeEntry[]
): readonly CleanContentTreeEntry[] {
  const interpreted: CleanContentTreeEntry[] = [];
  const exactPaths = new Set<string>();
  const portablePaths = new Set<string>();
  for (const entry of entries) {
    const path = parseReleaseRelativePath(entry.path, "gitTree.path");
    if (!path.ok)
      throw eligibilityError(
        "InvalidTree",
        `Git tree contains a noncanonical release path: ${entry.path}`
      );
    if (exactPaths.has(path.value)) {
      throw eligibilityError("InvalidTree", `Git tree contains a duplicate path: ${path.value}`);
    }
    const portablePath = path.value.normalize("NFC").toLowerCase();
    if (portablePaths.has(portablePath)) {
      throw eligibilityError(
        "InvalidTree",
        `Git tree contains a case or Unicode-normalization collision: ${path.value}`
      );
    }
    exactPaths.add(path.value);
    portablePaths.add(portablePath);
    interpreted.push(
      Object.freeze({
        mode: entry.mode === "100755" ? 0o755 : 0o644,
        objectId: entry.blob,
        path: path.value,
      })
    );
  }
  return Object.freeze(interpreted);
}

function classifyTrackedStatus(bytes: Uint8Array): "clean" | "index" | "worktree" {
  for (const recordBytes of splitNul(bytes)) {
    const record = decoder.decode(recordBytes);
    if (record.startsWith("u ")) return "index";
    if (record.startsWith("1 ") || record.startsWith("2 ")) {
      const xy = record.slice(2, 4);
      if (xy[0] !== ".") return "index";
      if (xy[1] !== ".") return "worktree";
    }
  }
  return "clean";
}

function splitNul(bytes: Uint8Array): readonly Uint8Array[] {
  const records: Uint8Array[] = [];
  let start = 0;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (bytes[index] !== 0) continue;
    if (index > start) records.push(bytes.slice(start, index));
    start = index + 1;
  }
  if (start !== bytes.byteLength) throw new Error("Git -z output lacks a trailing NUL");
  return records;
}

function decodeNulList(bytes: Uint8Array): readonly string[] {
  return splitNul(bytes).map((record) => decoder.decode(record));
}

function encodeNulList(values: readonly string[]): Uint8Array {
  return values.length === 0 ? new Uint8Array() : encoder.encode(`${values.join("\0")}\0`);
}

function digestBinding(value: unknown): string {
  return hashBytes(encoder.encode(JSON.stringify(value)));
}

function hashBytes(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}

function ineligible(
  code: SourceEligibilityIssueCode,
  detail: string
): Extract<ContentWorkspaceInspection, { kind: "Ineligible" }> {
  return { kind: "Ineligible", issues: [sourceEligibilityIssue(code, detail)] };
}

function ineligibleIssue(
  issue: SourceEligibilityIssue
): Extract<ContentWorkspaceInspection, { kind: "Ineligible" }> {
  return { kind: "Ineligible", issues: [issue] };
}

function admitted<T>(value: T): CleanContentDecision<T> {
  return { ok: true, value };
}

function declined(
  result: Extract<ContentWorkspaceInspection, { kind: "Ineligible" }>
): CleanContentDecision<never> {
  return { ok: false, result };
}

function inspectWorkspaceFailure(
  error: unknown
): Extract<ContentWorkspaceInspection, { kind: "Ineligible" }> {
  if (isEligibilityError(error)) return ineligible(error.eligibilityCode, error.message);
  if (isContentWorkspaceFailure(error)) {
    if (error.operation === "read-git-tree" && error.reason === "UnsupportedEntry") {
      return ineligible("InvalidTree", error.detail);
    }
    if (
      error.operation === "inspect-git-workspace" &&
      (error.reason === "Aliased" || error.reason === "InvalidInput")
    ) {
      return ineligible("AliasedLocator", error.detail);
    }
    return ineligible("GitFailure", error.detail);
  }
  throw error;
}

/** Validates the service-wide clean-content policy before any resource call. */
export function validateCleanContentWorkspacePolicy(
  policy: ContentWorkspacePolicy
): SourceEligibilityIssue | undefined {
  const repositoryIdentity = parseRepositoryIdentity(
    policy.repositoryIdentity,
    "policy.repositoryIdentity"
  );
  if (!repositoryIdentity.ok || repositoryIdentity.value !== policy.repositoryIdentity) {
    return sourceIssue("WrongRepository", "repository identity is not canonical");
  }
  const authority = parseContentAuthority(policy.contentAuthority, "policy.contentAuthority");
  if (!authority.ok || authority.value !== policy.contentAuthority) {
    return sourceIssue("ReleaseInputMismatch", "content authority is not canonical");
  }
  const commit = parseGitCommitId(policy.sourceCommit, "policy.sourceCommit");
  const tree = parseGitTreeId(policy.sourceTree, "policy.sourceTree");
  if (!commit.ok || commit.value !== policy.sourceCommit)
    return sourceIssue("WrongCommit", "source commit is not canonical");
  if (!tree.ok || tree.value !== policy.sourceTree)
    return sourceIssue("WrongTree", "source tree is not canonical");
  const releaseInputPath = parseReleaseRelativePath(
    policy.releaseInputPath,
    "policy.releaseInputPath"
  );
  const pluginRoot = parseReleaseRelativePath(policy.pluginRoot, "policy.pluginRoot");
  if (
    !releaseInputPath.ok ||
    releaseInputPath.value !== policy.releaseInputPath ||
    !pluginRoot.ok ||
    pluginRoot.value !== policy.pluginRoot
  ) {
    return sourceIssue("ReleaseInputMismatch", "content workspace paths are not canonical");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(policy.remoteName)) {
    return sourceIssue("WrongRepository", "remote name is not canonical");
  }
  if (
    !policy.refName.startsWith("refs/heads/") ||
    policy.refName.length > 512 ||
    /[\u0000-\u0020~^:?*\\[]/u.test(policy.refName) ||
    policy.refName.includes("..") ||
    policy.refName.includes("@{") ||
    policy.refName.endsWith("/") ||
    policy.refName.endsWith(".") ||
    policy.refName
      .split("/")
      .some((part) => part === "" || part.startsWith(".") || part.endsWith(".lock"))
  ) {
    return sourceIssue("WrongRef", "ref name is not a canonical branch ref");
  }
  if (policy.remoteUrl.length === 0 || /[\u0000-\u001f\u007f]/u.test(policy.remoteUrl)) {
    return sourceIssue("WrongRepository", "remote URL policy is not canonical");
  }
  return undefined;
}

function sourceIssue(code: SourceEligibilityIssueCode, detail: string): SourceEligibilityIssue {
  return sourceEligibilityIssue(code, detail);
}

function eligibilityError(
  eligibilityCode: SourceEligibilityIssueCode,
  detail: string
): Error & { readonly eligibilityCode: SourceEligibilityIssueCode } {
  return Object.assign(new Error(detail), { eligibilityCode });
}

function isEligibilityError(
  error: unknown
): error is Error & { readonly eligibilityCode: SourceEligibilityIssueCode } {
  return error instanceof Error && "eligibilityCode" in error;
}

function isContentWorkspaceFailure(error: unknown): error is ContentWorkspaceFailure {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "ContentWorkspaceFailure"
  );
}
