import { createHash } from "node:crypto";
import type {
  ContentWorkspaceFailure,
  ContentWorkspaceGitReadAsyncPort,
  GitWorkspaceAnchor,
  GitWorkspaceEvidence,
} from "@rawr/resource-content-workspace";

import {
  addReleaseSetPayloadBytes,
  createAgentPluginPayload,
  compareCanonicalText,
  decodeAgentPluginReleaseInput,
  MAX_PAYLOAD_BYTES_PER_MEMBER,
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
} from "../../../shared/release";
import type {
  ContentWorkspaceInspection,
  ContentWorkspacePolicy,
  ContentWorkspaceSnapshotReader,
  SourceEligibilityIssue,
  SourceEligibilityIssueCode,
} from "../../../model/dependencies/releases";

const decoder = new TextDecoder("utf-8", { fatal: true });
const encoder = new TextEncoder();
const MAX_TREE_ENTRIES = 200_000;
const MAX_TREE_BYTES = 100 * 1024 * 1024;
const MAX_INDEX_BYTES = 64 * 1024 * 1024;

export type ResourceContentWorkspaceSnapshotReadPort = Pick<
  ContentWorkspaceGitReadAsyncPort,
  "inspectGitWorkspace" | "readGitTree" | "readGitBlob" | "captureGitWorkspaceEvidence"
>;

interface TreeEntry {
  readonly mode: number;
  readonly type: "blob";
  readonly objectId: string;
  readonly path: ReleaseRelativePath;
}

interface WorkspaceEvidence {
  readonly anchor: GitWorkspaceAnchor;
  readonly trackedStatus: Uint8Array;
  readonly trackedFlags: Uint8Array;
  readonly worktreeObjectIds: readonly Readonly<{ path: ReleaseRelativePath; objectId: string }>[];
  readonly untracked: Uint8Array;
  readonly ignored: Uint8Array;
  readonly index: Uint8Array;
}

export function createResourceContentWorkspaceSnapshotReader(binding: Readonly<{
  contentWorkspace: ResourceContentWorkspaceSnapshotReadPort;
}>): ContentWorkspaceSnapshotReader {
  const reader: ContentWorkspaceSnapshotReader = {
    async inspect(policy) {
      return await inspectWorkspace(binding.contentWorkspace, policy);
    },
    async revalidate(policy, eligibilityBinding) {
      const inspected = await inspectWorkspace(binding.contentWorkspace, policy);
      if (inspected.kind === "Ineligible") return inspected;
      if (inspected.snapshot.eligibilityBinding !== eligibilityBinding) {
        return ineligible("SourceChanged", "repository, ref, index, worktree, or object bindings changed");
      }
      return inspected;
    },
  };
  return Object.freeze(reader);
}

async function inspectWorkspace(
  contentWorkspace: ResourceContentWorkspaceSnapshotReadPort,
  policy: ContentWorkspacePolicy,
): Promise<ContentWorkspaceInspection> {
  try {
    const policyIssue = validatePolicy(policy);
    if (policyIssue !== undefined) return { kind: "Ineligible", issues: [policyIssue] };
    const anchor = await contentWorkspace.inspectGitWorkspace({
      locator: policy.locator,
      remoteSelection: { kind: "Named", remoteName: policy.remoteName },
      refName: policy.refName,
    });
    const objectFormat = anchor.objectFormat;
    const objectIdPattern = objectFormat === "sha1" ? /^[0-9a-f]{40}$/u : objectFormat === "sha256"
      ? /^[0-9a-f]{64}$/u
      : undefined;
    if (objectIdPattern === undefined) return ineligible("GitFailure", `unsupported Git object format: ${objectFormat}`);

    const refName = anchor.refName;
    if (refName !== policy.refName) return ineligible("WrongRef", `expected ${policy.refName}, observed ${refName}`);

    const remoteUrls = anchor.remoteUrls;
    if (remoteUrls.length !== 1 || remoteUrls[0] !== policy.remoteUrl) {
      return ineligible("WrongRepository", "configured remote does not exactly match repository policy");
    }

    const commit = anchor.commit;
    const refCommit = anchor.refCommit;
    if (!objectIdPattern.test(commit) || commit !== policy.sourceCommit || refCommit !== commit) {
      return ineligible("WrongCommit", `expected ${policy.sourceCommit}, observed ${commit}`);
    }
    const tree = anchor.tree;
    if (!objectIdPattern.test(tree) || tree !== policy.sourceTree) {
      return ineligible("WrongTree", `expected ${policy.sourceTree}, observed ${tree}`);
    }

    const entriesResult = await contentWorkspace.readGitTree({
      root: anchor.root,
      tree,
      objectFormat,
      maxBytes: MAX_TREE_BYTES,
    });
    const treeEntries = parseTree(entriesResult, objectIdPattern);
    const entryByPath = new Map(treeEntries.map((entry) => [entry.path, entry]));
    const releaseInputEntry = entryByPath.get(policy.releaseInputPath);
    if (releaseInputEntry === undefined) {
      return ineligible("MissingReleaseInput", `missing tracked release input ${policy.releaseInputPath}`);
    }
    const releaseInputBytes = await readGitBlobObject(
      contentWorkspace,
      anchor.root,
      releaseInputEntry,
      objectFormat,
      objectIdPattern,
      MAX_RELEASE_INPUT_ENVELOPE_BYTES,
    );
    const releaseInputResult = decodeAgentPluginReleaseInput(releaseInputBytes);
    if (!releaseInputResult.ok) {
      return ineligible("ReleaseInputMismatch", releaseInputResult.issues.map((entry) => entry.code).join(","));
    }
    const releaseInput = releaseInputResult.value;
    if (releaseInput.body.contentAuthority !== policy.contentAuthority) {
      return ineligible("ReleaseInputMismatch", "release input declares a different content authority");
    }
    const aggregatePayloadIssue = preflightAggregatePayloadBytes(releaseInput);
    if (aggregatePayloadIssue !== undefined) return ineligible("PayloadMismatch", aggregatePayloadIssue);

    const payloads: Array<Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>> = [];
    const admitted = new Set<ReleaseRelativePath>([policy.releaseInputPath]);
    const consumedRoots: ReleaseRelativePath[] = [];
    for (const member of releaseInput.body.members) {
      const rootResult = parseReleaseRelativePath(`${policy.pluginRoot}/${member.pluginId}`, "memberRoot");
      if (!rootResult.ok) return ineligible("ReleaseInputMismatch", "member root is not canonical");
      const memberRoot = rootResult.value;
      consumedRoots.push(memberRoot);
      const payloadEntries: Array<{ path: ReleaseRelativePath; mode: number; bytes: Uint8Array }> = [];
      for (const declared of member.payload.manifest) {
        const repositoryPathResult = parseReleaseRelativePath(
          `${memberRoot}/${declared.path}`,
          "repositoryPayloadPath",
        );
        if (!repositoryPathResult.ok) return ineligible("ReleaseInputMismatch", "payload path is not canonical");
        const repositoryPath = repositoryPathResult.value;
        const entry = entryByPath.get(repositoryPath);
        if (entry === undefined) return ineligible("PayloadMismatch", `missing tracked payload ${repositoryPath}`);
        const bytes = await readGitBlobObject(
          contentWorkspace,
          anchor.root,
          entry,
          objectFormat,
          objectIdPattern,
          MAX_PAYLOAD_BYTES_PER_MEMBER,
        );
        payloadEntries.push({ path: declared.path, mode: entry.mode, bytes });
        admitted.add(repositoryPath);
      }
      const actualUnderRoot = treeEntries.filter((entry) => entry.path.startsWith(`${memberRoot}/`));
      if (actualUnderRoot.some((entry) => !admitted.has(entry.path))) {
        return ineligible("PayloadMismatch", `tracked payload root ${memberRoot} contains undeclared files`);
      }
      const payloadResult = createAgentPluginPayload(payloadEntries);
      if (!payloadResult.ok) {
        return ineligible("PayloadMismatch", payloadResult.issues.map((entry) => entry.code).join(","));
      }
      if (
        payloadResult.value.payloadDigest !== member.payload.payloadDigest
        || !sameManifest(payloadResult.value.manifest, member.payload.manifest)
      ) {
        return ineligible("PayloadMismatch", `payload declaration differs for ${member.pluginId}`);
      }
      payloads.push(Object.freeze({ pluginId: member.pluginId, payload: payloadResult.value }));
    }

    const admittedPaths = [...admitted].sort(compareCanonicalText);
    const consumedPathspecs = [...consumedRoots].sort(compareCanonicalText);
    const evidence = await captureWorkspaceEvidence(
      contentWorkspace,
      anchor.root,
      policy,
      admittedPaths,
      consumedPathspecs,
    );
    const evidenceIssue = validateWorkspaceEvidence(
      evidence,
      policy,
      objectFormat,
      entryByPath,
      admittedPaths,
    );
    if (evidenceIssue !== undefined) return { kind: "Ineligible", issues: [evidenceIssue] };

    // A second matching capture closes the bounded status/flag eligibility observation.
    const closingEvidence = await captureWorkspaceEvidence(
      contentWorkspace,
      anchor.root,
      policy,
      admittedPaths,
      consumedPathspecs,
    );
    if (!sameWorkspaceEvidence(evidence, closingEvidence)) {
      return ineligible("SourceChanged", "repository evidence changed before the eligibility linearization point");
    }

    const objectBindings = Object.freeze([...admitted]
      .sort(compareCanonicalText)
      .map((path) => {
        const entry = entryByPath.get(path)!;
        return Object.freeze({ path, objectId: entry.objectId, mode: entry.mode });
      }));
    const eligibilityBinding = digestBinding({
      repositoryIdentity: policy.repositoryIdentity,
      remoteName: policy.remoteName,
      remoteUrl: policy.remoteUrl,
      refName,
      commit,
      tree,
      objectBindings,
      index: hashBytes(closingEvidence.index),
      trackedStatus: hashBytes(closingEvidence.trackedStatus),
      untracked: hashBytes(closingEvidence.untracked),
      ignored: hashBytes(closingEvidence.ignored),
      trackedFlags: hashBytes(closingEvidence.trackedFlags),
      worktreeObjectIds: closingEvidence.worktreeObjectIds,
    });
    return {
      kind: "Eligible",
      snapshot: Object.freeze({
        repositoryIdentity: policy.repositoryIdentity,
        sourceCommit: policy.sourceCommit,
        sourceTree: policy.sourceTree,
        releaseInput,
        payloads: Object.freeze(payloads),
        objectBindings,
        eligibilityBinding,
      }),
    };
  } catch (error) {
    if (isEligibilityError(error)) return ineligible(error.eligibilityCode, error.message);
    if (isContentWorkspaceFailure(error)) {
      if (
        error.operation === "inspect-git-workspace"
        && (error.reason === "Aliased" || error.reason === "InvalidInput")
      ) {
        return ineligible("AliasedLocator", error.detail);
      }
      return ineligible("GitFailure", error.detail);
    }
    return ineligible("GitFailure", error instanceof Error ? error.message : String(error));
  }
}

async function captureWorkspaceEvidence(
  contentWorkspace: ResourceContentWorkspaceSnapshotReadPort,
  root: string,
  policy: ContentWorkspacePolicy,
  admittedPaths: readonly ReleaseRelativePath[],
  consumedPathspecs: readonly ReleaseRelativePath[],
): Promise<WorkspaceEvidence> {
  const evidence = await contentWorkspace.captureGitWorkspaceEvidence({
    root,
    remoteSelection: { kind: "Named", remoteName: policy.remoteName },
    refName: policy.refName,
    admittedPaths,
    consumedRoots: consumedPathspecs,
    objectFormat: policy.sourceCommit.length === 40 ? "sha1" : "sha256",
    maxPaths: MAX_TREE_ENTRIES,
    maxBytes: MAX_INDEX_BYTES,
  });
  if (
    !equalBytes(evidence.openingStatus, evidence.closingStatus)
    || !equalBytes(evidence.openingTrackedFlags, evidence.closingTrackedFlags)
    || !sameRepositoryAnchor(evidence.openingAnchor, evidence.closingAnchor)
  ) {
    throw eligibilityError("SourceChanged", "repository evidence changed during its closing capture");
  }
  const workspaceStatus = classifyConsumedStatus(evidence.closingStatus, consumedPathspecs);
  return Object.freeze({
    anchor: evidence.closingAnchor,
    trackedStatus: evidence.closingStatus,
    trackedFlags: evidence.closingTrackedFlags,
    worktreeObjectIds: evidence.worktreeObjectIds.map((entry) => Object.freeze({
      path: requireReleasePath(entry.path),
      objectId: entry.objectId,
    })),
    untracked: workspaceStatus.untracked,
    ignored: workspaceStatus.ignored,
    index: evidence.indexEntries,
  });
}

function classifyConsumedStatus(
  status: Uint8Array,
  consumedRoots: readonly ReleaseRelativePath[],
): Readonly<{ untracked: Uint8Array; ignored: Uint8Array }> {
  const untracked: string[] = [];
  const ignored: string[] = [];
  for (const recordBytes of splitNul(status)) {
    const record = decoder.decode(recordBytes);
    const target = record.startsWith("? ") ? untracked : record.startsWith("! ") ? ignored : undefined;
    if (target === undefined) continue;
    const path = record.slice(2);
    if (consumedRoots.some((candidate) => path === candidate || path.startsWith(`${candidate}/`))) {
      target.push(path);
    }
  }
  return Object.freeze({
    untracked: encodeNulList(untracked),
    ignored: encodeNulList(ignored),
  });
}

function requireReleasePath(candidate: string): ReleaseRelativePath {
  const result = parseReleaseRelativePath(candidate, "gitEvidence.path");
  if (!result.ok) throw eligibilityError("InvalidTree", "Git evidence returned a noncanonical path");
  return result.value;
}

function validateWorkspaceEvidence(
  evidence: WorkspaceEvidence,
  policy: ContentWorkspacePolicy,
  objectFormat: string,
  entryByPath: ReadonlyMap<ReleaseRelativePath, TreeEntry>,
  admittedPaths: readonly ReleaseRelativePath[],
): SourceEligibilityIssue | undefined {
  const anchor = evidence.anchor;
  if (anchor.objectFormat !== objectFormat) return sourceIssue("SourceChanged", "Git object format changed");
  if (anchor.refName !== policy.refName) return sourceIssue("WrongRef", `expected ${policy.refName}, observed ${anchor.refName}`);
  if (anchor.remoteUrls.length !== 1 || anchor.remoteUrls[0] !== policy.remoteUrl) {
    return sourceIssue("WrongRepository", "configured remote does not exactly match repository policy");
  }
  if (anchor.commit !== policy.sourceCommit || anchor.refCommit !== anchor.commit) {
    return sourceIssue("WrongCommit", `expected ${policy.sourceCommit}, observed ${anchor.commit}`);
  }
  if (anchor.tree !== policy.sourceTree) return sourceIssue("WrongTree", `expected ${policy.sourceTree}, observed ${anchor.tree}`);

  const dirty = classifyTrackedStatus(evidence.trackedStatus);
  if (dirty === "index") return sourceIssue("DirtyIndex", "Git index differs from HEAD");
  if (dirty === "worktree") return sourceIssue("DirtyTrackedWorktree", "tracked worktree differs from index");
  const flagRecords = decodeNulList(evidence.trackedFlags);
  if (flagRecords.length !== admittedPaths.length || flagRecords.some((record) => !record.startsWith("H "))) {
    return sourceIssue("DirtyIndex", "admitted paths carry noncanonical index flags");
  }
  for (const observed of evidence.worktreeObjectIds) {
    if (observed.objectId !== entryByPath.get(observed.path)?.objectId) {
      return sourceIssue("DirtyTrackedWorktree", `worktree bytes differ at ${observed.path}`);
    }
  }
  if (evidence.untracked.byteLength > 0) {
    return sourceIssue("UntrackedConsumedPath", decodeNulList(evidence.untracked)[0] ?? "unknown path");
  }
  if (evidence.ignored.byteLength > 0) {
    return sourceIssue("IgnoredConsumedPath", decodeNulList(evidence.ignored)[0] ?? "unknown path");
  }
  return undefined;
}

function sameWorkspaceEvidence(left: WorkspaceEvidence, right: WorkspaceEvidence): boolean {
  return sameRepositoryAnchor(left.anchor, right.anchor)
    && equalBytes(left.trackedStatus, right.trackedStatus)
    && equalBytes(left.trackedFlags, right.trackedFlags)
    && sameWorktreeObjectIds(left.worktreeObjectIds, right.worktreeObjectIds)
    && equalBytes(left.untracked, right.untracked)
    && equalBytes(left.ignored, right.ignored)
    && equalBytes(left.index, right.index);
}

function sameRepositoryAnchor(left: GitWorkspaceAnchor, right: GitWorkspaceAnchor): boolean {
  return left.root === right.root
    && left.rootDevice === right.rootDevice
    && left.rootInode === right.rootInode
    && left.objectFormat === right.objectFormat
    && left.refName === right.refName
    && left.remoteUrls.length === right.remoteUrls.length
    && left.remoteUrls.every((url, index) => url === right.remoteUrls[index])
    && left.commit === right.commit
    && left.refCommit === right.refCommit
    && left.tree === right.tree;
}

function sameWorktreeObjectIds(
  left: WorkspaceEvidence["worktreeObjectIds"],
  right: WorkspaceEvidence["worktreeObjectIds"],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined && entry.path === other.path && entry.objectId === other.objectId;
  });
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

async function readGitBlobObject(
  contentWorkspace: ResourceContentWorkspaceSnapshotReadPort,
  cwd: string,
  entry: Readonly<{ objectId: string; path: string }>,
  objectFormat: "sha1" | "sha256",
  objectIdPattern: RegExp,
  maximumBytes: number,
): Promise<Uint8Array> {
  if (!objectIdPattern.test(entry.objectId)) throw new Error(`invalid blob object id for ${entry.path}`);
  const bytes = await contentWorkspace.readGitBlob({
    root: cwd,
    blob: entry.objectId,
    objectFormat,
    maxBytes: maximumBytes,
  });
  if (bytes.byteLength > maximumBytes) throw new Error(`blob for ${entry.path} exceeds ${maximumBytes} bytes`);
  return bytes;
}

function parseTree(bytes: Uint8Array, objectIdPattern: RegExp): readonly TreeEntry[] {
  const records = splitNul(bytes);
  if (records.length > MAX_TREE_ENTRIES) throw new Error(`Git tree exceeds ${MAX_TREE_ENTRIES} entries`);
  const entries: TreeEntry[] = [];
  const exactPaths = new Set<string>();
  const portablePaths = new Set<string>();
  for (const recordBytes of records) {
    const record = decoder.decode(recordBytes);
    const match = /^(100644|100755) blob ([0-9a-f]+)\t(.+)$/u.exec(record);
    if (match === null || !objectIdPattern.test(match[2]!)) {
      throw eligibilityError("InvalidTree", "Git tree contains a non-regular or malformed entry");
    }
    const path = parseReleaseRelativePath(match[3], "gitTree.path");
    if (!path.ok) throw eligibilityError("InvalidTree", `Git tree contains a noncanonical path: ${match[3]}`);
    if (exactPaths.has(path.value)) {
      throw eligibilityError("InvalidTree", `Git tree contains a duplicate path: ${path.value}`);
    }
    const portablePath = path.value.normalize("NFC").toLowerCase();
    if (portablePaths.has(portablePath)) {
      throw eligibilityError(
        "InvalidTree",
        `Git tree contains a case or Unicode-normalization collision: ${path.value}`,
      );
    }
    exactPaths.add(path.value);
    portablePaths.add(portablePath);
    entries.push(Object.freeze({
      mode: match[1] === "100755" ? 0o755 : 0o644,
      type: "blob",
      objectId: match[2]!,
      path: path.value,
    }));
  }
  return Object.freeze(entries);
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
      if (!next.ok) {
        return `release input payloads exceed ${MAX_RELEASE_SET_PAYLOAD_BYTES} decoded bytes`;
      }
      aggregateBytes = next.value;
    }
  }
  return undefined;
}

function digestBinding(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function ineligible(code: SourceEligibilityIssueCode, detail: string): ContentWorkspaceInspection {
  return { kind: "Ineligible", issues: [Object.freeze({ code, detail })] };
}

function validatePolicy(policy: ContentWorkspacePolicy): SourceEligibilityIssue | undefined {
  const repositoryIdentity = parseRepositoryIdentity(policy.repositoryIdentity, "policy.repositoryIdentity");
  if (!repositoryIdentity.ok || repositoryIdentity.value !== policy.repositoryIdentity) {
    return sourceIssue("WrongRepository", "repository identity is not canonical");
  }
  const authority = parseContentAuthority(policy.contentAuthority, "policy.contentAuthority");
  if (!authority.ok || authority.value !== policy.contentAuthority) {
    return sourceIssue("ReleaseInputMismatch", "content authority is not canonical");
  }
  const commit = parseGitCommitId(policy.sourceCommit, "policy.sourceCommit");
  const tree = parseGitTreeId(policy.sourceTree, "policy.sourceTree");
  if (!commit.ok || commit.value !== policy.sourceCommit) return sourceIssue("WrongCommit", "source commit is not canonical");
  if (!tree.ok || tree.value !== policy.sourceTree) return sourceIssue("WrongTree", "source tree is not canonical");
  const releaseInputPath = parseReleaseRelativePath(policy.releaseInputPath, "policy.releaseInputPath");
  const pluginRoot = parseReleaseRelativePath(policy.pluginRoot, "policy.pluginRoot");
  if (
    !releaseInputPath.ok
    || releaseInputPath.value !== policy.releaseInputPath
    || !pluginRoot.ok
    || pluginRoot.value !== policy.pluginRoot
  ) {
    return sourceIssue("ReleaseInputMismatch", "content workspace paths are not canonical");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(policy.remoteName)) {
    return sourceIssue("WrongRepository", "remote name is not canonical");
  }
  if (
    !policy.refName.startsWith("refs/heads/")
    || policy.refName.length > 512
    || /[\u0000-\u0020~^:?*\\[]/u.test(policy.refName)
    || policy.refName.includes("..")
    || policy.refName.includes("@{")
    || policy.refName.endsWith("/")
    || policy.refName.endsWith(".")
    || policy.refName.split("/").some((part) => part === "" || part.startsWith(".") || part.endsWith(".lock"))
  ) {
    return sourceIssue("WrongRef", "ref name is not a canonical branch ref");
  }
  if (policy.remoteUrl.length === 0 || /[\u0000-\u001f\u007f]/u.test(policy.remoteUrl)) {
    return sourceIssue("WrongRepository", "remote URL policy is not canonical");
  }
  return undefined;
}

function sourceIssue(code: SourceEligibilityIssueCode, detail: string): SourceEligibilityIssue {
  return Object.freeze({ code, detail });
}

function eligibilityError(
  eligibilityCode: SourceEligibilityIssueCode,
  detail: string,
): Error & { readonly eligibilityCode: SourceEligibilityIssueCode } {
  return Object.assign(new Error(detail), { eligibilityCode });
}

function isEligibilityError(
  error: unknown,
): error is Error & { readonly eligibilityCode: SourceEligibilityIssueCode } {
  return error instanceof Error && "eligibilityCode" in error;
}

function isContentWorkspaceFailure(error: unknown): error is ContentWorkspaceFailure {
  return typeof error === "object"
    && error !== null
    && "_tag" in error
    && error._tag === "ContentWorkspaceFailure";
}
