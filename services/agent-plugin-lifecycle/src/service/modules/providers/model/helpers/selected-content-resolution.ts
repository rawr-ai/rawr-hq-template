import type { ContentWorkspaceFailure, GitRefObservation } from "@rawr/resource-content-workspace";
import { Effect } from "effect";
import type { ContentWorkspacePolicy } from "#agent-plugin-lifecycle-service/model/dto/releases/content-workspace";
import { createCleanContentWorkspaceReader } from "#agent-plugin-lifecycle-service/model/policy/clean-content-workspace";
import { validateDeclaredPluginTree } from "#agent-plugin-lifecycle-service/model/policy/declared-plugin-tree";
import type { CleanContentWorkspaceReader } from "#agent-plugin-lifecycle-service/model/ports/clean-content-workspace";
import {
  type AgentPluginPayload,
  type AgentPluginRelease,
  type AgentPluginReleaseInput,
  compareCanonicalText,
  createAgentPluginPayload,
  createAgentPluginRelease,
  createAgentPluginReleaseSet,
  decodeAgentPluginReleaseInput,
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  type PluginId,
  parseReleaseRelativePath,
  type ReleaseRelativePath,
} from "#agent-plugin-lifecycle-service/shared/release/index";
import type {
  SelectedContent,
  SelectedContentIssueCode,
  SelectedContentResolution,
  SelectedContentTestMode,
} from "../dto/selected-content";
import { validateNativeMarketplaces } from "../policy/native-marketplace";
import type { SelectedContentReadPort, SelectedContentResolver } from "../ports/selected-content";

const RELEASE_INPUT_PATH = requireReleasePath(".rawr/release-input.json");
const PLUGIN_ROOT = requireReleasePath("plugins/agents");
const CODEX_MARKETPLACE_MANIFEST = requireReleasePath(".agents/plugins/marketplace.json");
const CLAUDE_MARKETPLACE_MANIFEST = requireReleasePath(".claude-plugin/marketplace.json");
const NATIVE_MARKETPLACE_MANIFESTS = Object.freeze([
  CODEX_MARKETPLACE_MANIFEST,
  CLAUDE_MARKETPLACE_MANIFEST,
]);
const SELECTED_CONTENT_INTERFACE_PATHS = Object.freeze([
  RELEASE_INPUT_PATH,
  requireReleasePath(".agents/plugins"),
  requireReleasePath(".claude-plugin"),
  PLUGIN_ROOT,
]);
const NATIVE_MARKETPLACE_SPARSE_PATHS = Object.freeze([
  ".agents/plugins",
  ".claude-plugin",
  "plugins/agents",
]);
const MAX_TREE_ENTRIES = 200_000;
const MAX_TREE_BYTES = 100 * 1024 * 1024;
const MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES = 2 * 1024 * 1024;

interface TreeEntry {
  readonly mode: 0o644 | 0o755;
  readonly objectId: string;
  readonly path: ReleaseRelativePath;
}

interface ConstructSelectionInput {
  readonly contentAuthority: SelectedContent["contentAuthority"];
  readonly repositoryIdentity: SelectedContent["repositoryIdentity"];
  readonly sourceCommit: SelectedContent["sourceCommit"];
  readonly sourceTree: SelectedContent["sourceTree"];
  readonly releaseInput: AgentPluginReleaseInput;
  readonly payloads: readonly Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>[];
  readonly mode: SelectedContentTestMode;
  readonly marketplace: SelectedContent["marketplace"];
}

class SelectedContentFailure extends Error {
  constructor(
    readonly code: SelectedContentIssueCode,
    detail: string
  ) {
    super(detail);
    this.name = "SelectedContentFailure";
  }
}

type SelectedContentReadFailure = ContentWorkspaceFailure | SelectedContentFailure;

/**
 * Creates the provider module's invocation-local selected-content resolver over the narrowed
 * host content-workspace capability.
 */
export function createSelectedContentResolver(
  binding: Readonly<{ contentWorkspace: SelectedContentReadPort }>
): SelectedContentResolver {
  const workspaceReader = createCleanContentWorkspaceReader({
    contentWorkspace: binding.contentWorkspace,
  });
  return Object.freeze({
    resolveChannel: (input: Parameters<SelectedContentResolver["resolveChannel"]>[0]) =>
      resolveChannel(binding.contentWorkspace, input).pipe(
        Effect.catch((error) => Effect.succeed(rejectedFrom(error)))
      ),
    resolveWorkspace: (input: Parameters<SelectedContentResolver["resolveWorkspace"]>[0]) =>
      resolveWorkspace(
        binding.contentWorkspace,
        workspaceReader,
        input.contentWorkspace,
        input.mode
      ).pipe(Effect.catch((error) => Effect.succeed(rejectedFrom(error)))),
  });
}

function resolveChannel(
  contentWorkspace: SelectedContentReadPort,
  input: Parameters<SelectedContentResolver["resolveChannel"]>[0]
): Effect.Effect<SelectedContentResolution, SelectedContentReadFailure> {
  return Effect.gen(function* () {
    const { locator, selection } = input;
    if (locator.expectedRepositoryIdentity !== selection.sourceRepositoryIdentity) {
      return rejected(
        "SelectionMismatch",
        "Current-main selection belongs to another repository identity."
      );
    }
    const opening = yield* contentWorkspace.inspectGitRef({
      locator: locator.workspacePath,
      remoteSelection: { kind: "All" },
      refName: selection.sourceRef,
    });
    const anchorIssue = channelAnchorIssue(opening, selection);
    if (anchorIssue !== undefined) return yield* Effect.fail(anchorIssue);
    const treeEntries = yield* readTreeEntries(contentWorkspace, opening);
    const entryByPath = new Map(treeEntries.map((entry) => [entry.path, entry]));
    const releaseInputEntry = entryByPath.get(RELEASE_INPUT_PATH);
    if (releaseInputEntry === undefined) {
      return yield* Effect.fail(
        new SelectedContentFailure(
          "SourceIneligible",
          `Selected tree is missing ${RELEASE_INPUT_PATH}.`
        )
      );
    }
    const releaseInputBytes = yield* readBlob(
      contentWorkspace,
      opening,
      releaseInputEntry,
      MAX_RELEASE_INPUT_ENVELOPE_BYTES
    );
    const decoded = decodeAgentPluginReleaseInput(releaseInputBytes);
    if (!decoded.ok) {
      return yield* Effect.fail(
        new SelectedContentFailure(
          "SourceIneligible",
          `Selected release input is invalid: ${decoded.issues.map((issue) => issue.code).join(",")}.`
        )
      );
    }
    const releaseInput = decoded.value;
    if (releaseInput.releaseInputDigest !== selection.releaseInputDigest) {
      return yield* Effect.fail(
        new SelectedContentFailure(
          "SelectionMismatch",
          "Selected release-input digest differs from current-main."
        )
      );
    }
    if (releaseInput.body.contentAuthority !== selection.contentAuthority) {
      return yield* Effect.fail(
        new SelectedContentFailure(
          "SelectionMismatch",
          "Selected release input declares another content authority."
        )
      );
    }
    const manifestBytes = yield* requireNativeMarketplaceManifests(
      contentWorkspace,
      opening,
      entryByPath
    );
    const marketplaceIssue = validNativeMarketplacesIssue(releaseInput, manifestBytes);
    if (marketplaceIssue !== undefined) return yield* Effect.fail(marketplaceIssue);
    const payloads = yield* readDeclaredPayloads(
      contentWorkspace,
      opening,
      treeEntries,
      releaseInput
    );
    const constructed = constructSelection({
      contentAuthority: selection.contentAuthority,
      repositoryIdentity: selection.sourceRepositoryIdentity,
      sourceCommit: selection.contentCommit,
      sourceTree: selection.contentTree,
      releaseInput,
      payloads,
      mode: { kind: "complete-set" },
      marketplace: Object.freeze({
        identity: selection.contentAuthority,
        source: Object.freeze({
          kind: "git",
          repositoryUrl: selection.sourceRepositoryUrl,
          revision: selection.contentCommit,
          sparsePaths: [...NATIVE_MARKETPLACE_SPARSE_PATHS],
        }),
      }),
    });
    if (constructed.kind === "Rejected") return constructed;
    const closing = yield* contentWorkspace.inspectGitRef({
      locator: locator.workspacePath,
      remoteSelection: { kind: "All" },
      refName: selection.sourceRef,
    });
    if (!sameRefObservation(opening, closing)) {
      return rejected("SelectionMismatch", "Selected Git tag changed while its content was read.");
    }
    return constructed;
  });
}

function resolveWorkspace(
  contentWorkspace: SelectedContentReadPort,
  workspaceReader: CleanContentWorkspaceReader,
  policy: ContentWorkspacePolicy,
  mode: SelectedContentTestMode
): Effect.Effect<SelectedContentResolution, SelectedContentReadFailure> {
  return Effect.gen(function* () {
    if (policy.releaseInputPath !== RELEASE_INPUT_PATH || policy.pluginRoot !== PLUGIN_ROOT) {
      return rejected(
        "SourceIneligible",
        `Local provider content must use ${RELEASE_INPUT_PATH} and ${PLUGIN_ROOT}.`
      );
    }
    const inspected = yield* workspaceReader.inspect(policy);
    if (inspected.kind === "Ineligible") {
      return rejected(
        "SourceIneligible",
        inspected.issues.map((issue) => `${issue.code}: ${issue.detail}`).join("; ")
      );
    }
    const treeObservation: GitRefObservation = Object.freeze({
      root: policy.locator,
      refName: policy.refName,
      commit: policy.sourceCommit,
      tree: policy.sourceTree,
      objectFormat: policy.sourceCommit.length === 40 ? "sha1" : "sha256",
      remoteUrls: Object.freeze([policy.remoteUrl]),
    });
    const treeEntries = yield* readTreeEntries(contentWorkspace, treeObservation);
    const entryByPath = new Map(treeEntries.map((entry) => [entry.path, entry]));
    const manifestBytes = yield* requireNativeMarketplaceManifests(
      contentWorkspace,
      treeObservation,
      entryByPath
    );
    const marketplaceIssue = validNativeMarketplacesIssue(
      inspected.snapshot.releaseInput,
      manifestBytes
    );
    if (marketplaceIssue !== undefined) return yield* Effect.fail(marketplaceIssue);
    yield* requireMatchingWorkspaceManifests(contentWorkspace, policy.locator, manifestBytes);
    const constructed = constructSelection({
      contentAuthority: policy.contentAuthority,
      repositoryIdentity: inspected.snapshot.repositoryIdentity,
      sourceCommit: inspected.snapshot.sourceCommit,
      sourceTree: inspected.snapshot.sourceTree,
      releaseInput: inspected.snapshot.releaseInput,
      payloads: inspected.snapshot.payloads,
      mode,
      marketplace: Object.freeze({
        identity: policy.contentAuthority,
        source: Object.freeze({ kind: "local", root: policy.locator }),
      }),
    });
    if (constructed.kind === "Rejected") return constructed;
    const closing = yield* workspaceReader.revalidate(
      policy,
      inspected.snapshot.eligibilityBinding
    );
    if (closing.kind !== "Eligible") {
      return rejected("SelectionMismatch", "Local content changed before provider testing.");
    }
    yield* requireMatchingWorkspaceManifests(contentWorkspace, policy.locator, manifestBytes);
    return constructed;
  });
}

function constructSelection(input: ConstructSelectionInput): SelectedContentResolution {
  const requested =
    input.mode.kind === "targeted"
      ? [...input.mode.pluginIds].sort(compareCanonicalText)
      : input.releaseInput.body.members.map((member) => member.pluginId);
  if (requested.length === 0 || new Set(requested).size !== requested.length) {
    return rejected("SelectionMismatch", "Selected plugin identities are empty or duplicated.");
  }
  const declared = new Set(input.releaseInput.body.members.map((member) => member.pluginId));
  const absent = requested.find((pluginId) => !declared.has(pluginId));
  if (absent !== undefined) {
    return rejected("SelectionMismatch", `Selected plugin ${absent} is not declared.`);
  }
  const payloadByPlugin = new Map(input.payloads.map((entry) => [entry.pluginId, entry.payload]));
  const releases: AgentPluginRelease[] = [];
  for (const pluginId of requested) {
    const payload = payloadByPlugin.get(pluginId);
    if (payload === undefined) {
      return rejected("SourceIneligible", `Verified payload is absent for ${pluginId}.`);
    }
    const created = createAgentPluginRelease({
      releaseInput: input.releaseInput,
      pluginId,
      source: {
        sourceRepository: input.repositoryIdentity,
        sourceCommit: input.sourceCommit,
        sourceTree: input.sourceTree,
      },
      payload,
    });
    if (!created.ok) {
      return rejected(
        "ReleaseConstructionFailed",
        `Release construction failed for ${pluginId}: ${created.issues
          .map((issue) => issue.code)
          .join(",")}.`
      );
    }
    releases.push(created.value);
  }
  releases.sort((left, right) =>
    compareCanonicalText(
      left.artifactBody.releaseBody.pluginId,
      right.artifactBody.releaseBody.pluginId
    )
  );
  const members = releases.map((release) => {
    const body = release.artifactBody.releaseBody;
    return Object.freeze({
      pluginId: body.pluginId,
      aliases: [...body.aliases],
      payloadDigest: body.payloadDigest,
      releaseDigest: release.releaseDigest,
      manifest: body.payloadManifest.map((entry) => Object.freeze({ ...entry })),
    });
  });
  const common = Object.freeze({
    contentAuthority: input.contentAuthority,
    repositoryIdentity: input.repositoryIdentity,
    sourceCommit: input.sourceCommit,
    sourceTree: input.sourceTree,
    releaseInputDigest: input.releaseInput.releaseInputDigest,
    marketplace: input.marketplace,
    members,
  });
  if (input.mode.kind === "targeted") {
    const content: SelectedContent = Object.freeze({
      ...common,
      selectionKind: "targeted",
      releaseSetDigest: null,
    });
    return Object.freeze({ kind: "Selected", content });
  }
  const releaseSet = createAgentPluginReleaseSet({
    releaseInput: input.releaseInput,
    releases,
  });
  if (!releaseSet.ok) {
    return rejected(
      "ReleaseConstructionFailed",
      `Complete release-set construction failed: ${releaseSet.issues
        .map((issue) => issue.code)
        .join(",")}.`
    );
  }
  const content: SelectedContent = Object.freeze({
    ...common,
    selectionKind: "complete-set",
    releaseSetDigest: releaseSet.value.releaseSetDigest,
  });
  return Object.freeze({ kind: "Selected", content });
}

function readDeclaredPayloads(
  contentWorkspace: SelectedContentReadPort,
  observation: GitRefObservation,
  treeEntries: readonly TreeEntry[],
  releaseInput: AgentPluginReleaseInput
): Effect.Effect<
  readonly Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>[],
  SelectedContentReadFailure
> {
  return Effect.gen(function* () {
    const declaredTreeIssue = validateDeclaredPluginTree({
      pluginRoot: PLUGIN_ROOT,
      paths: treeEntries.map((entry) => entry.path),
      declaredPluginIds: releaseInput.body.members.map((member) => member.pluginId),
    });
    if (declaredTreeIssue !== undefined) {
      return yield* Effect.fail(
        new SelectedContentFailure(
          "SourceIneligible",
          `${declaredTreeIssue.code}: ${declaredTreeIssue.detail}`
        )
      );
    }
    const entryByPath = new Map(treeEntries.map((entry) => [entry.path, entry]));
    const declaredMembers: Array<
      Readonly<{
        pluginId: PluginId;
        entries: readonly Readonly<{ relativePath: ReleaseRelativePath; entry: TreeEntry }>[];
      }>
    > = [];
    const uniqueBlobs = new Set<string>();
    for (const member of releaseInput.body.members) {
      if (member.payload.manifest.length === 0) {
        return yield* Effect.fail(
          new SelectedContentFailure(
            "SourceIneligible",
            `Declared payload is empty for ${member.pluginId}.`
          )
        );
      }
      const memberRoot = requireReleasePath(`${PLUGIN_ROOT}/${member.pluginId}`);
      const entries: Array<Readonly<{ relativePath: ReleaseRelativePath; entry: TreeEntry }>> = [];
      for (const manifestEntry of member.payload.manifest) {
        const repositoryPath = requireReleasePath(`${memberRoot}/${manifestEntry.path}`);
        const entry = entryByPath.get(repositoryPath);
        if (entry === undefined) {
          return yield* Effect.fail(
            new SelectedContentFailure(
              "SourceIneligible",
              `Selected tree is missing ${repositoryPath}.`
            )
          );
        }
        uniqueBlobs.add(entry.objectId);
        entries.push(Object.freeze({ relativePath: manifestEntry.path, entry }));
      }
      const expectedPaths = new Set(entries.map(({ entry }) => entry.path));
      const undeclared = treeEntries.find(
        (entry) => entry.path.startsWith(`${memberRoot}/`) && !expectedPaths.has(entry.path)
      );
      if (undeclared !== undefined) {
        return yield* Effect.fail(
          new SelectedContentFailure(
            "SourceIneligible",
            `Declared payload root contains an undeclared file: ${undeclared.path}.`
          )
        );
      }
      declaredMembers.push(
        Object.freeze({ pluginId: member.pluginId, entries: Object.freeze(entries) })
      );
    }
    const blobs = [...uniqueBlobs].sort(compareCanonicalText);
    const observations = yield* contentWorkspace.readGitBlobs({
      root: observation.root,
      blobs,
      objectFormat: observation.objectFormat,
      maxBlobs: MAX_TREE_ENTRIES,
      maxBlobBytes: MAX_PAYLOAD_BYTES_PER_MEMBER,
      maxTotalBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
    });
    const bytesByBlob = new Map(observations.map((item) => [item.blob, item.bytes]));
    if (bytesByBlob.size !== blobs.length) {
      return yield* Effect.fail(
        new SelectedContentFailure(
          "SourceReadFailed",
          "Git batch omitted or duplicated a declared payload blob."
        )
      );
    }
    const payloads: Array<Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>> = [];
    for (const member of declaredMembers) {
      const payloadEntries: Array<{
        path: ReleaseRelativePath;
        mode: TreeEntry["mode"];
        bytes: Uint8Array;
      }> = [];
      for (const { relativePath, entry } of member.entries) {
        const bytes = bytesByBlob.get(entry.objectId);
        if (bytes === undefined) {
          return yield* Effect.fail(
            new SelectedContentFailure("SourceReadFailed", `Git batch omitted ${entry.path}.`)
          );
        }
        payloadEntries.push({ path: relativePath, mode: entry.mode, bytes });
      }
      const created = createAgentPluginPayload(payloadEntries);
      if (!created.ok) {
        return yield* Effect.fail(
          new SelectedContentFailure(
            "SourceIneligible",
            `Payload construction failed for ${member.pluginId}: ${created.issues
              .map((issue) => issue.code)
              .join(",")}.`
          )
        );
      }
      const declaration = releaseInput.body.members.find(
        (candidate) => candidate.pluginId === member.pluginId
      )!;
      if (
        created.value.payloadDigest !== declaration.payload.payloadDigest ||
        !samePayloadManifest(created.value.manifest, declaration.payload.manifest)
      ) {
        return yield* Effect.fail(
          new SelectedContentFailure(
            "SourceIneligible",
            `Selected payload differs from its declaration for ${member.pluginId}.`
          )
        );
      }
      payloads.push(Object.freeze({ pluginId: member.pluginId, payload: created.value }));
    }
    return Object.freeze(payloads);
  });
}

function readTreeEntries(
  contentWorkspace: SelectedContentReadPort,
  observation: GitRefObservation
): Effect.Effect<readonly TreeEntry[], SelectedContentReadFailure> {
  return Effect.gen(function* () {
    const observedEntries = yield* contentWorkspace
      .readGitTree({
        root: observation.root,
        tree: observation.tree,
        objectFormat: observation.objectFormat,
        paths: SELECTED_CONTENT_INTERFACE_PATHS,
        maxEntries: MAX_TREE_ENTRIES,
        maxBytes: MAX_TREE_BYTES,
      })
      .pipe(Effect.mapError(classifySelectedTreeReadFailure));
    const entries: TreeEntry[] = [];
    const exactPaths = new Set<string>();
    const portablePaths = new Set<string>();
    for (const observed of observedEntries) {
      const parsedPath = parseReleaseRelativePath(observed.path, "selectedContent.tree.path");
      if (!parsedPath.ok) {
        return yield* Effect.fail(
          new SelectedContentFailure(
            "SourceIneligible",
            `Selected Git tree contains a noncanonical release path: ${observed.path}.`
          )
        );
      }
      const portablePath = parsedPath.value.normalize("NFC").toLowerCase();
      if (exactPaths.has(parsedPath.value) || portablePaths.has(portablePath)) {
        return yield* Effect.fail(
          new SelectedContentFailure(
            "SourceIneligible",
            `Selected Git tree contains a path collision: ${parsedPath.value}.`
          )
        );
      }
      exactPaths.add(parsedPath.value);
      portablePaths.add(portablePath);
      entries.push(
        Object.freeze({
          mode: observed.mode === "100755" ? 0o755 : 0o644,
          objectId: observed.blob,
          path: parsedPath.value,
        })
      );
    }
    return Object.freeze(entries);
  });
}

function classifySelectedTreeReadFailure(failure: ContentWorkspaceFailure): SelectedContentFailure {
  const code =
    failure.reason === "UnsupportedEntry" || failure.reason === "LimitExceeded"
      ? "SourceIneligible"
      : "SourceReadFailed";
  return new SelectedContentFailure(code, failure.detail);
}

function requireNativeMarketplaceManifests(
  contentWorkspace: SelectedContentReadPort,
  observation: GitRefObservation,
  entryByPath: ReadonlyMap<ReleaseRelativePath, TreeEntry>
): Effect.Effect<ReadonlyMap<ReleaseRelativePath, Uint8Array>, SelectedContentReadFailure> {
  return Effect.gen(function* () {
    const manifestBytes = new Map<ReleaseRelativePath, Uint8Array>();
    for (const path of NATIVE_MARKETPLACE_MANIFESTS) {
      const entry = entryByPath.get(path);
      if (entry === undefined) {
        return yield* Effect.fail(
          new SelectedContentFailure(
            "SourceIneligible",
            `Selected tree is missing native marketplace manifest ${path}.`
          )
        );
      }
      const bytes = yield* readBlob(
        contentWorkspace,
        observation,
        entry,
        MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES
      );
      if (bytes.byteLength === 0) {
        return yield* Effect.fail(
          new SelectedContentFailure(
            "SourceIneligible",
            `Native marketplace manifest ${path} is empty.`
          )
        );
      }
      manifestBytes.set(path, bytes);
    }
    return manifestBytes;
  });
}

function validNativeMarketplacesIssue(
  releaseInput: AgentPluginReleaseInput,
  manifests: ReadonlyMap<ReleaseRelativePath, Uint8Array>
): SelectedContentFailure | undefined {
  const codexBytes = manifests.get(CODEX_MARKETPLACE_MANIFEST);
  const claudeBytes = manifests.get(CLAUDE_MARKETPLACE_MANIFEST);
  if (codexBytes === undefined || claudeBytes === undefined) {
    return new SelectedContentFailure(
      "SourceIneligible",
      "Selected content does not contain both native marketplace manifests."
    );
  }
  const validated = validateNativeMarketplaces({ releaseInput, codexBytes, claudeBytes });
  if (!validated.ok) {
    return new SelectedContentFailure("SourceIneligible", validated.detail);
  }
  return undefined;
}

function requireMatchingWorkspaceManifests(
  contentWorkspace: SelectedContentReadPort,
  root: string,
  expected: ReadonlyMap<ReleaseRelativePath, Uint8Array>
): Effect.Effect<void, SelectedContentReadFailure> {
  return Effect.gen(function* () {
    for (const [path, expectedBytes] of expected) {
      const actual = yield* contentWorkspace.readFile({
        root,
        path,
        maxBytes: MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
      });
      if (!equalBytes(actual, expectedBytes)) {
        return yield* Effect.fail(
          new SelectedContentFailure(
            "SourceIneligible",
            `Local native marketplace manifest differs from Git: ${path}.`
          )
        );
      }
    }
  });
}

function readBlob(
  contentWorkspace: SelectedContentReadPort,
  observation: GitRefObservation,
  entry: TreeEntry,
  maximumBytes: number
): Effect.Effect<Uint8Array, SelectedContentReadFailure> {
  return Effect.gen(function* () {
    const bytes = yield* contentWorkspace.readGitBlob({
      root: observation.root,
      blob: entry.objectId,
      objectFormat: observation.objectFormat,
      maxBytes: maximumBytes,
    });
    if (bytes.byteLength > maximumBytes) {
      return yield* Effect.fail(
        new SelectedContentFailure("SourceReadFailed", `Git blob exceeds its bound: ${entry.path}.`)
      );
    }
    return bytes;
  });
}

function channelAnchorIssue(
  observation: GitRefObservation,
  selection: Parameters<SelectedContentResolver["resolveChannel"]>[0]["selection"]
): SelectedContentFailure | undefined {
  if (
    observation.refName !== selection.sourceRef ||
    observation.commit !== selection.contentCommit ||
    observation.tree !== selection.contentTree
  ) {
    return new SelectedContentFailure(
      "SelectionMismatch",
      "Selected Git tag does not resolve to the reviewed commit and tree."
    );
  }
  if (!observation.remoteUrls.includes(selection.sourceRepositoryUrl)) {
    return new SelectedContentFailure(
      "SelectionMismatch",
      "Selected Git workspace does not expose the reviewed repository URL."
    );
  }
  return undefined;
}

function sameRefObservation(left: GitRefObservation, right: GitRefObservation): boolean {
  return (
    left.root === right.root &&
    left.refName === right.refName &&
    left.commit === right.commit &&
    left.tree === right.tree &&
    left.objectFormat === right.objectFormat &&
    left.remoteUrls.length === right.remoteUrls.length &&
    left.remoteUrls.every((value, index) => value === right.remoteUrls[index])
  );
}

function samePayloadManifest(
  left: readonly Readonly<{
    path: string;
    mode: number;
    byteLength: number;
    contentDigest: string;
  }>[],
  right: readonly Readonly<{
    path: string;
    mode: number;
    byteLength: number;
    contentDigest: string;
  }>[]
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

function requireReleasePath(value: string): ReleaseRelativePath {
  const parsed = parseReleaseRelativePath(value, "selectedContent.path");
  if (!parsed.ok) throw new Error(`Compiled selected-content path is invalid: ${value}`);
  return parsed.value;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }
  return difference === 0;
}

function rejected(
  code: SelectedContentIssueCode,
  detail: string
): Extract<SelectedContentResolution, { kind: "Rejected" }> {
  const issue = Object.freeze({ code, detail: boundedDetail(detail) });
  const issues: [typeof issue, ...(typeof issue)[]] = [issue];
  return Object.freeze({
    kind: "Rejected",
    issues: Object.freeze(issues),
  });
}

function rejectedFrom(
  error: SelectedContentReadFailure
): Extract<SelectedContentResolution, { kind: "Rejected" }> {
  if (error instanceof SelectedContentFailure) return rejected(error.code, error.message);
  return rejected("SourceReadFailed", error.detail);
}

function boundedDetail(detail: string): string {
  return detail.length <= 4_096 ? detail : `${detail.slice(0, 4_080)}...[truncated]`;
}
