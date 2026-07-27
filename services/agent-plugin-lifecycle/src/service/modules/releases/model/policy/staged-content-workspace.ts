import { createHash } from "node:crypto";
import type {
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
  GitStagedIndexBinding,
  GitStagedIndexEntry,
  GitStagedIndexObservation,
  GitWorkspaceAnchor,
} from "@rawr/resource-content-workspace";
import {
  type SourceEligibilityIssue,
  type SourceEligibilityIssueCode,
  sourceEligibilityIssue,
} from "#agent-plugin-lifecycle-service/model/dto/content-workspace";
import { validateDeclaredPluginTree } from "#agent-plugin-lifecycle-service/model/policy/declared-plugin-tree";
import {
  addReleaseSetPayloadBytes,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
} from "#agent-plugin-lifecycle-service/model/policy/release-payload-accounting";
import {
  type AgentPluginPayload,
  type AgentPluginReleaseInput,
  compareCanonicalText,
  createAgentPluginPayload,
  decodeAgentPluginReleaseInput,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  type PluginId,
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
  type ReleaseRelativePath,
} from "#agent-plugin-lifecycle-service/shared/release/index";
import {
  normalizeReleaseSourceChangedDetail,
  type ReleaseInputRefreshRequest,
  type ReleaseInputRefreshResult,
} from "../dto/release-lifecycle";
import type {
  StagedContentWorkspaceInspection,
  StagedContentWorkspacePolicy,
} from "../dto/staged-content-workspace";
import { authorReleaseInputRefresh, releaseInputRefreshIneligible } from "./release-input-refresh";

export const MAX_STAGED_INDEX_ENTRIES = 200_000;
export const MAX_STAGED_INDEX_BYTES = 100 * 1024 * 1024;

const materializedByteLimit = addStagedObservationByteLimits(
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_SET_PAYLOAD_BYTES
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

type ObserveStagedIndexInput = Parameters<
  ContentWorkspaceResource<never>["observeGitStagedIndex"]
>[0];

export type StagedReleaseInputClassification =
  | Readonly<{
      kind: "ReadyForMaterialization";
      opening: GitStagedIndexBinding;
      releaseInput: AgentPluginReleaseInput;
      memberRoots: readonly StagedMemberRoot[];
    }>
  | Exclude<StagedContentWorkspaceInspection, { kind: "StagedContentWorkspaceEligible" }>;

export function addStagedObservationByteLimits(
  releaseInputBytes: number,
  aggregatePayloadBytes: number
): Readonly<{ ok: true; value: number }> | Readonly<{ ok: false }> {
  if (
    !Number.isSafeInteger(releaseInputBytes) ||
    !Number.isSafeInteger(aggregatePayloadBytes) ||
    releaseInputBytes < 0 ||
    aggregatePayloadBytes < 0 ||
    releaseInputBytes > Number.MAX_SAFE_INTEGER - aggregatePayloadBytes
  )
    return { ok: false };
  const value = releaseInputBytes + aggregatePayloadBytes;
  return value > 0 ? { ok: true, value } : { ok: false };
}

export function validateStagedContentWorkspacePolicy(
  policy: StagedContentWorkspacePolicy
): SourceEligibilityIssue | undefined {
  if (!parseRepositoryIdentity(policy.repositoryIdentity).ok) {
    return sourceIssue("WrongRepository", "repository identity is not canonical");
  }
  if (!parseContentAuthority(policy.contentAuthority).ok) {
    return sourceIssue("ReleaseInputMismatch", "content authority is not canonical");
  }
  if (
    !parseReleaseRelativePath(policy.releaseInputPath).ok ||
    !parseReleaseRelativePath(policy.pluginRoot).ok
  ) {
    return sourceIssue("ReleaseInputMismatch", "content workspace paths are not canonical");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(policy.remoteName)) {
    return sourceIssue("WrongRepository", "remote name is not canonical");
  }
  if (!isCanonicalHeadRef(policy.refName))
    return sourceIssue("WrongRef", "ref name is not a canonical branch ref");
  if (policy.remoteUrl.length === 0 || /[\u0000-\u001f\u007f]/u.test(policy.remoteUrl)) {
    return sourceIssue("WrongRepository", "remote URL policy is not canonical");
  }
  return undefined;
}

export function releaseInputObservationRequest(
  policy: StagedContentWorkspacePolicy
): ObserveStagedIndexInput {
  return Object.freeze({
    locator: policy.locator,
    remoteSelection: Object.freeze({ kind: "Named", remoteName: policy.remoteName }),
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
  memberRoots: readonly StagedMemberRoot[]
): ObserveStagedIndexInput {
  return Object.freeze({
    locator: policy.locator,
    remoteSelection: Object.freeze({ kind: "Named", remoteName: policy.remoteName }),
    refName: policy.refName,
    materializedPaths: Object.freeze([policy.releaseInputPath]),
    materializedRoots: Object.freeze(
      memberRoots.map((entry) => entry.root).sort(compareCanonicalText)
    ),
    maxEntries: MAX_STAGED_INDEX_ENTRIES,
    maxIndexBytes: MAX_STAGED_INDEX_BYTES,
    maxBlobBytes: MAX_STAGED_MATERIALIZED_BLOB_BYTES,
  });
}

export type ReleaseInputRefreshObservationPlan =
  | Readonly<{
      kind: "Ready";
      observationRequest: ObserveStagedIndexInput;
      memberRoots: readonly StagedMemberRoot[];
    }>
  | Extract<ReleaseInputRefreshResult, { kind: "RepositoryIneligible" }>;

export function planReleaseInputRefreshObservation(
  request: ReleaseInputRefreshRequest
): ReleaseInputRefreshObservationPlan {
  const memberRoots = refreshMemberRoots(request);
  if (!memberRoots.ok) {
    return releaseInputRefreshIneligible("ReleaseInputMismatch", memberRoots.detail);
  }
  return Object.freeze({
    kind: "Ready",
    observationRequest: Object.freeze({
      locator: request.contentWorkspace.locator,
      remoteSelection: Object.freeze({
        kind: "Named",
        remoteName: request.contentWorkspace.remoteName,
      }),
      refName: request.contentWorkspace.refName,
      materializedPaths: Object.freeze([request.contentWorkspace.releaseInputPath]),
      materializedRoots: Object.freeze(
        memberRoots.value.map((entry) => entry.root).sort(compareCanonicalText)
      ),
      maxEntries: MAX_STAGED_INDEX_ENTRIES,
      maxIndexBytes: MAX_STAGED_INDEX_BYTES,
      maxBlobBytes: MAX_STAGED_MATERIALIZED_BLOB_BYTES,
    }),
    memberRoots: memberRoots.value,
  });
}

export function classifyReleaseInputRefreshObservation(
  request: ReleaseInputRefreshRequest,
  memberRoots: readonly StagedMemberRoot[],
  observation: GitStagedIndexObservation
): ReleaseInputRefreshResult {
  if (!sameStagedIndexBinding(observation.opening, observation.closing)) {
    return refreshSourceChanged(
      "Git HEAD, ref, repository, or index changed during staged observation"
    );
  }

  try {
    const policy = request.contentWorkspace;
    const policyIssue = validateStagedContentWorkspacePolicy(policy);
    if (policyIssue !== undefined) {
      return releaseInputRefreshIneligible(policyIssue.code, policyIssue.detail);
    }
    if (
      policy.releaseInputPath === policy.pluginRoot ||
      policy.releaseInputPath.startsWith(`${policy.pluginRoot}/`)
    ) {
      return releaseInputRefreshIneligible(
        "ReleaseInputMismatch",
        "release input must be outside the plugin root"
      );
    }
    const anchorIssue = validateAnchor(observation.opening.anchor, policy);
    if (anchorIssue !== undefined) {
      return releaseInputRefreshIneligible(anchorIssue.code, anchorIssue.detail);
    }

    const entries = classifyStagedIndexEntries(observation.opening.entries);
    const pluginTreeIssue = validateDeclaredPluginTree({
      pluginRoot: policy.pluginRoot,
      paths: entries.map((entry) => entry.path),
      declaredPluginIds: memberRoots.map((entry) => entry.pluginId),
    });
    if (pluginTreeIssue !== undefined) {
      return releaseInputRefreshIneligible(pluginTreeIssue.code, pluginTreeIssue.detail);
    }

    const missingMember = memberRoots.find(
      (member) => !entries.some((entry) => entry.path.startsWith(`${member.root}/`))
    );
    if (missingMember !== undefined) {
      return releaseInputRefreshIneligible(
        "PayloadMismatch",
        `plugin tree is missing declared member ${missingMember.pluginId}`
      );
    }

    const materializedRoots = memberRoots.map((entry) => entry.root);
    const blobByObjectId = stagedBlobMap(
      observation,
      entries,
      [policy.releaseInputPath],
      materializedRoots
    );
    const existingEntry = entries.find((entry) => entry.path === policy.releaseInputPath);
    const existingBytes =
      existingEntry === undefined ? undefined : requireStagedBlob(blobByObjectId, existingEntry);
    const members = memberRoots.map((member) =>
      Object.freeze({
        pluginId: member.pluginId,
        payloadEntries: Object.freeze(
          entries
            .filter((entry) => entry.path.startsWith(`${member.root}/`))
            .map((entry) => {
              const relativePath = parseReleaseRelativePath(
                entry.path.slice(member.root.length + 1),
                `releaseInputRefresh.${member.pluginId}.payloadPath`
              );
              if (!relativePath.ok) {
                throw stagedError(
                  "PayloadMismatch",
                  `payload path is not canonical for ${member.pluginId}`
                );
              }
              return Object.freeze({
                path: relativePath.value,
                mode: entry.mode,
                bytes: requireStagedBlob(blobByObjectId, entry),
              });
            })
        ),
      })
    );
    return authorReleaseInputRefresh({
      contentAuthority: policy.contentAuthority,
      existingBytes,
      members,
    });
  } catch (error) {
    return refreshInspectionFailure(classificationFailure(error));
  }
}

export function classifyStagedReleaseInputObservation(
  policy: StagedContentWorkspacePolicy,
  observation: GitStagedIndexObservation
): StagedReleaseInputClassification {
  if (!sameStagedIndexBinding(observation.opening, observation.closing)) {
    return sourceChanged("Git HEAD, ref, repository, or index changed during staged observation");
  }

  try {
    const anchorIssue = validateAnchor(observation.opening.anchor, policy);
    if (anchorIssue !== undefined) return stagedIneligible(anchorIssue.code, anchorIssue.detail);
    const openingEntries = classifyStagedIndexEntries(observation.opening.entries);
    const openingBlobByObjectId = stagedBlobMap(
      observation,
      openingEntries,
      [policy.releaseInputPath],
      []
    );
    const releaseInputEntry = openingEntries.find(
      (entry) => entry.path === policy.releaseInputPath
    );
    if (releaseInputEntry === undefined) {
      return stagedIneligible(
        "MissingReleaseInput",
        `missing staged release input ${policy.releaseInputPath}`
      );
    }
    const releaseInputBytes = requireStagedBlob(openingBlobByObjectId, releaseInputEntry);
    if (releaseInputBytes.byteLength > MAX_RELEASE_INPUT_ENVELOPE_BYTES) {
      return stagedIneligible(
        "ReleaseInputMismatch",
        "staged release input exceeds the public envelope bound"
      );
    }
    const releaseInputResult = decodeAgentPluginReleaseInput(releaseInputBytes);
    if (!releaseInputResult.ok) {
      return stagedIneligible(
        "ReleaseInputMismatch",
        releaseInputResult.issues.map((issue) => issue.code).join(",")
      );
    }
    const releaseInput = releaseInputResult.value;
    if (releaseInput.body.contentAuthority !== policy.contentAuthority) {
      return stagedIneligible(
        "ReleaseInputMismatch",
        "release input declares a different content authority"
      );
    }
    const memberRoots: StagedMemberRoot[] = [];
    for (const member of releaseInput.body.members) {
      const memberRootResult = parseReleaseRelativePath(
        `${policy.pluginRoot}/${member.pluginId}`,
        "memberRoot"
      );
      if (!memberRootResult.ok)
        return stagedIneligible("ReleaseInputMismatch", "member root is not canonical");
      memberRoots.push(Object.freeze({ pluginId: member.pluginId, root: memberRootResult.value }));
    }
    const declaredPluginIssue = validateDeclaredPluginTree({
      pluginRoot: policy.pluginRoot,
      paths: openingEntries.map((entry) => entry.path),
      declaredPluginIds: memberRoots.map((entry) => entry.pluginId),
    });
    if (declaredPluginIssue !== undefined) {
      return stagedIneligible(declaredPluginIssue.code, declaredPluginIssue.detail);
    }
    const aggregateIssue = preflightAggregatePayloadBytes(releaseInput);
    if (aggregateIssue !== undefined) return stagedIneligible("PayloadMismatch", aggregateIssue);

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
  releaseInputClassification: Extract<
    StagedReleaseInputClassification,
    { kind: "ReadyForMaterialization" }
  >,
  observation: GitStagedIndexObservation
): StagedContentWorkspaceInspection {
  if (
    !sameStagedIndexBinding(observation.opening, observation.closing) ||
    !sameStagedIndexBinding(releaseInputClassification.opening, observation.opening)
  )
    return sourceChanged(
      "Git HEAD, ref, repository, or index changed before staged materialization closed"
    );

  try {
    const anchor = observation.opening.anchor;
    const entries = classifyStagedIndexEntries(observation.opening.entries);
    const materializedRoots = releaseInputClassification.memberRoots.map((entry) => entry.root);
    const blobByObjectId = stagedBlobMap(
      observation,
      entries,
      [policy.releaseInputPath],
      materializedRoots
    );

    const admitted = new Set<ReleaseRelativePath>([policy.releaseInputPath]);
    const payloads: Array<Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>> = [];
    for (const member of releaseInputClassification.releaseInput.body.members) {
      const memberRoot = releaseInputClassification.memberRoots.find(
        (entry) => entry.pluginId === member.pluginId
      )?.root;
      if (memberRoot === undefined)
        return stagedIneligible("ReleaseInputMismatch", "member root is missing");
      const payloadEntries: Array<{ path: ReleaseRelativePath; mode: number; bytes: Uint8Array }> =
        [];
      for (const declared of member.payload.manifest) {
        const repositoryPathResult = parseReleaseRelativePath(
          `${memberRoot}/${declared.path}`,
          "repositoryPayloadPath"
        );
        if (!repositoryPathResult.ok) {
          return stagedIneligible("ReleaseInputMismatch", "payload path is not canonical");
        }
        const repositoryPath = repositoryPathResult.value;
        const entry = entries.find((candidate) => candidate.path === repositoryPath);
        if (entry === undefined)
          return stagedIneligible("PayloadMismatch", `missing staged payload ${repositoryPath}`);
        payloadEntries.push({
          path: declared.path,
          mode: entry.mode,
          bytes: requireStagedBlob(blobByObjectId, entry),
        });
        admitted.add(repositoryPath);
      }
      if (
        entries.some(
          (entry) => entry.path.startsWith(`${memberRoot}/`) && !admitted.has(entry.path)
        )
      ) {
        return stagedIneligible(
          "PayloadMismatch",
          `staged payload root ${memberRoot} contains undeclared files`
        );
      }
      const payloadResult = createAgentPluginPayload(payloadEntries);
      if (!payloadResult.ok) {
        return stagedIneligible(
          "PayloadMismatch",
          payloadResult.issues.map((issue) => issue.code).join(",")
        );
      }
      if (
        payloadResult.value.payloadDigest !== member.payload.payloadDigest ||
        !sameManifest(payloadResult.value.manifest, member.payload.manifest)
      )
        return stagedIneligible(
          "PayloadMismatch",
          `payload declaration differs for ${member.pluginId}`
        );
      payloads.push(Object.freeze({ pluginId: member.pluginId, payload: payloadResult.value }));
    }

    const objectBindings = Object.freeze(
      [...admitted].sort(compareCanonicalText).map((path) => {
        const entry = entries.find((candidate) => candidate.path === path);
        if (entry === undefined) throw new Error(`missing admitted staged path ${path}`);
        return Object.freeze({ path, objectId: entry.objectId, mode: entry.mode });
      })
    );
    const commit = parsedGitCommit(anchor.commit);
    const tree = parsedGitTree(anchor.tree);
    const stagedBinding = digestBinding({
      repositoryIdentity: policy.repositoryIdentity,
      remoteName: policy.remoteName,
      remoteUrl: policy.remoteUrl,
      refName: policy.refName,
      headCommit: commit,
      headTree: tree,
      entries: observation.opening.entries,
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
  failure: ContentWorkspaceFailure,
  phase: "release-input" | "payloads"
): Exclude<StagedContentWorkspaceInspection, { kind: "StagedContentWorkspaceEligible" }> {
  switch (failure.reason) {
    case "Aliased":
      return stagedIneligible("AliasedLocator", failure.detail);
    case "InvalidInput":
    case "UnsupportedEntry":
      return stagedIneligible("InvalidTree", failure.detail);
    case "LimitExceeded":
      return stagedIneligible(
        phase === "release-input" ? "ReleaseInputMismatch" : "PayloadMismatch",
        failure.detail
      );
    default:
      return stagedIneligible("GitFailure", failure.detail);
  }
}

/** Maps a staged resource failure into the refresh operation's public domain result. */
export function classifyReleaseInputRefreshObservationFailure(
  failure: ContentWorkspaceFailure
): ReleaseInputRefreshResult {
  return refreshInspectionFailure(classifyStagedObservationFailure(failure, "payloads"));
}

function validateAnchor(
  anchor: GitWorkspaceAnchor,
  policy: StagedContentWorkspacePolicy
): SourceEligibilityIssue | undefined {
  if (anchor.refName !== policy.refName) {
    return sourceIssue("WrongRef", `expected ${policy.refName}, observed ${anchor.refName}`);
  }
  if (anchor.refCommit !== anchor.commit)
    return sourceIssue("WrongCommit", "HEAD and its exact branch ref differ");
  if (anchor.remoteUrls.length !== 1 || anchor.remoteUrls[0] !== policy.remoteUrl) {
    return sourceIssue(
      "WrongRepository",
      "configured remote does not exactly match repository policy"
    );
  }
  if (!parseGitCommitId(anchor.commit).ok)
    return sourceIssue("WrongCommit", "observed HEAD commit is not canonical");
  if (!parseGitTreeId(anchor.tree).ok)
    return sourceIssue("WrongTree", "observed HEAD tree is not canonical");
  return undefined;
}

function classifyStagedIndexEntries(
  facts: readonly GitStagedIndexEntry[]
): readonly StagedTreeEntry[] {
  const entries: StagedTreeEntry[] = [];
  const portablePaths = new Map<string, ReleaseRelativePath>();
  for (const fact of facts) {
    if (fact.mode !== "100644" && fact.mode !== "100755") {
      throw stagedError("InvalidTree", "Git index contains a non-regular entry");
    }
    if (fact.stage !== 0) throw stagedError("DirtyIndex", "Git index contains an unmerged entry");
    const pathResult = parseReleaseRelativePath(fact.path, "stagedIndex.path");
    if (!pathResult.ok) throw stagedError("InvalidTree", "Git index contains a noncanonical path");
    const portablePath = pathResult.value.normalize("NFC").toLowerCase();
    const existingPath = portablePaths.get(portablePath);
    if (existingPath !== undefined && existingPath !== pathResult.value) {
      throw stagedError("InvalidTree", `Git index contains a colliding path: ${pathResult.value}`);
    }
    portablePaths.set(portablePath, pathResult.value);
    entries.push(
      Object.freeze({
        mode: fact.mode === "100755" ? 0o755 : 0o644,
        objectId: fact.objectId,
        path: pathResult.value,
      })
    );
  }
  entries.sort((left, right) => compareCanonicalText(left.path, right.path));
  return Object.freeze(entries);
}

function stagedBlobMap(
  observation: GitStagedIndexObservation,
  entries: readonly StagedTreeEntry[],
  materializedPaths: readonly string[],
  materializedRoots: readonly string[]
): ReadonlyMap<string, Uint8Array> {
  const expected = new Set(
    entries
      .filter(
        (entry) =>
          materializedPaths.includes(entry.path) ||
          materializedRoots.some((root) => entry.path === root || entry.path.startsWith(`${root}/`))
      )
      .map((entry) => entry.objectId)
  );
  const blobs = new Map<string, Uint8Array>();
  for (const blob of observation.blobs) {
    if (!expected.has(blob.objectId) || blobs.has(blob.objectId)) {
      throw stagedError(
        "GitFailure",
        "staged blob observation does not exactly match the opening index"
      );
    }
    blobs.set(blob.objectId, blob.bytes);
  }
  if (blobs.size !== expected.size)
    throw stagedError("GitFailure", "staged blob observation is incomplete");
  return blobs;
}

function requireStagedBlob(
  blobs: ReadonlyMap<string, Uint8Array>,
  entry: StagedTreeEntry
): Uint8Array {
  const bytes = blobs.get(entry.objectId);
  if (bytes === undefined)
    throw stagedError("GitFailure", `missing staged blob bytes for ${entry.path}`);
  return bytes;
}

function sameStagedIndexBinding(
  left: GitStagedIndexBinding,
  right: GitStagedIndexBinding
): boolean {
  return (
    sameAnchor(left.anchor, right.anchor) && sameStagedIndexEntries(left.entries, right.entries)
  );
}

function sameAnchor(left: GitWorkspaceAnchor, right: GitWorkspaceAnchor): boolean {
  return (
    left.root === right.root &&
    left.rootDevice === right.rootDevice &&
    left.rootInode === right.rootInode &&
    left.refName === right.refName &&
    left.commit === right.commit &&
    left.refCommit === right.refCommit &&
    left.tree === right.tree &&
    left.objectFormat === right.objectFormat &&
    left.remoteUrls.length === right.remoteUrls.length &&
    left.remoteUrls.every((url, index) => url === right.remoteUrls[index])
  );
}

function sameStagedIndexEntries(
  left: readonly GitStagedIndexEntry[],
  right: readonly GitStagedIndexEntry[]
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        entry.path === other.path &&
        entry.mode === other.mode &&
        entry.objectId === other.objectId &&
        entry.stage === other.stage
      );
    })
  );
}

function sameManifest(
  left: readonly { path: string; mode: number; byteLength: number; contentDigest: string }[],
  right: readonly { path: string; mode: number; byteLength: number; contentDigest: string }[]
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        entry.path === other.path &&
        entry.mode === other.mode &&
        entry.byteLength === other.byteLength &&
        entry.contentDigest === other.contentDigest
      );
    })
  );
}

function preflightAggregatePayloadBytes(releaseInput: AgentPluginReleaseInput): string | undefined {
  let aggregateBytes = 0;
  for (const member of releaseInput.body.members) {
    for (const entry of member.payload.manifest) {
      const next = addReleaseSetPayloadBytes(aggregateBytes, entry.byteLength);
      if (!next.ok)
        return `release input payloads exceed ${MAX_RELEASE_SET_PAYLOAD_BYTES} decoded bytes`;
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

function refreshMemberRoots(
  request: ReleaseInputRefreshRequest
):
  | Readonly<{ ok: true; value: readonly StagedMemberRoot[] }>
  | Readonly<{ ok: false; detail: string }> {
  const roots: StagedMemberRoot[] = [];
  for (const memberId of request.memberIds) {
    const parsedMember = parsePluginId(memberId, "releaseInputRefresh.memberIds");
    if (!parsedMember.ok) {
      return Object.freeze({ ok: false, detail: "member identity is not canonical" });
    }
    const parsedRoot = parseReleaseRelativePath(
      `${request.contentWorkspace.pluginRoot}/${parsedMember.value}`,
      "releaseInputRefresh.memberRoot"
    );
    if (!parsedRoot.ok) {
      return Object.freeze({
        ok: false,
        detail: `derived plugin root is not canonical for ${parsedMember.value}`,
      });
    }
    roots.push(Object.freeze({ pluginId: parsedMember.value, root: parsedRoot.value }));
  }
  roots.sort((left, right) => compareCanonicalText(left.pluginId, right.pluginId));
  return Object.freeze({ ok: true, value: Object.freeze(roots) });
}

function digestBinding(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function classificationFailure(
  error: unknown
): Exclude<StagedContentWorkspaceInspection, { kind: "StagedContentWorkspaceEligible" }> {
  if (isStagedClassificationError(error)) {
    return stagedIneligible(error.classificationCode, error.message);
  }
  throw error;
}

function refreshInspectionFailure(
  failure: Exclude<StagedContentWorkspaceInspection, { kind: "StagedContentWorkspaceEligible" }>
): ReleaseInputRefreshResult {
  return failure.kind === "SourceChanged"
    ? refreshSourceChanged(failure.detail)
    : releaseInputRefreshIneligible(failure.issues[0].code, failure.issues[0].detail);
}

function refreshSourceChanged(
  detail: string
): Extract<ReleaseInputRefreshResult, { kind: "SourceChanged" }> {
  return Object.freeze({
    kind: "SourceChanged",
    mode: "staged",
    detail: normalizeReleaseSourceChangedDetail(detail),
  });
}

function stagedIneligible(
  code: SourceEligibilityIssueCode,
  detail: string
): Extract<StagedContentWorkspaceInspection, { kind: "StagedContentWorkspaceIneligible" }> {
  return { kind: "StagedContentWorkspaceIneligible", issues: [sourceIssue(code, detail)] };
}

function sourceChanged(
  detail: string
): Extract<StagedContentWorkspaceInspection, { kind: "SourceChanged" }> {
  return { kind: "SourceChanged", detail };
}

function sourceIssue(code: SourceEligibilityIssueCode, detail: string): SourceEligibilityIssue {
  return sourceEligibilityIssue(code, detail);
}

class StagedClassificationError extends Error {
  constructor(
    readonly classificationCode: SourceEligibilityIssueCode,
    detail: string
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
  return (
    value.startsWith("refs/heads/") &&
    value.length <= 512 &&
    !/[\u0000-\u0020~^:?*\\[]/u.test(value) &&
    !value.includes("..") &&
    !value.includes("@{") &&
    !value.endsWith("/") &&
    !value.endsWith(".") &&
    value
      .split("/")
      .every((part) => part !== "" && !part.startsWith(".") && !part.endsWith(".lock"))
  );
}
