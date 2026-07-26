import type { ContentWorkspaceFailure, GitRefObservation } from "@rawr/resource-content-workspace";
import { Effect } from "effect";
import type { ContentWorkspaceSnapshot } from "#agent-plugin-lifecycle-service/model/dto/content-workspace";
import { parseRelativePath } from "#agent-plugin-lifecycle-service/model/dto/current-main-primitives";
import type { ReleaseDerivationSource } from "#agent-plugin-lifecycle-service/model/dto/release-derivation";
import { validateDeclaredPluginTree } from "#agent-plugin-lifecycle-service/model/policy/declared-plugin-tree";
import { deriveReleaseSelection } from "#agent-plugin-lifecycle-service/model/policy/release-derivation";
import {
  compareCanonicalText,
  createAgentPluginPayload,
  decodeAgentPluginReleaseInput,
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
} from "#agent-plugin-lifecycle-service/shared/release/index";
import type { SelectedContentIssueCode, SelectedContentResolution } from "../dto/selected-content";
import {
  constructSelectedContent,
  selectedContentFromReleaseDerivationFailure,
  selectedContentRejected,
} from "../policy/selected-content";
import {
  MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES,
  NATIVE_MARKETPLACE_MANIFESTS,
  SELECTED_CONTENT_PLUGIN_ROOT,
  SELECTED_CONTENT_RELEASE_INPUT_PATH,
  validateSelectedNativeMarketplaces,
} from "../policy/source-interface";
import type { SelectedContentReadPort, SelectedContentResolver } from "../ports/selected-content";

const SELECTED_CONTENT_INTERFACE_PATHS = Object.freeze([
  SELECTED_CONTENT_RELEASE_INPUT_PATH,
  requireReleasePath(".agents/plugins"),
  requireReleasePath(".claude-plugin"),
  SELECTED_CONTENT_PLUGIN_ROOT,
]);
const NATIVE_MARKETPLACE_SPARSE_PATHS = Object.freeze([
  ".agents/plugins",
  ".claude-plugin",
  "plugins/agents",
]);
const MAX_TREE_ENTRIES = 200_000;
const MAX_TREE_BYTES = 100 * 1024 * 1024;

type AgentPluginReleaseInput = ReleaseDerivationSource["releaseInput"];
type AgentPluginPayload = ReleaseDerivationSource["payloads"][number]["payload"];
type PluginId = ReleaseDerivationSource["payloads"][number]["pluginId"];
type ReleaseRelativePath = ContentWorkspaceSnapshot["objectBindings"][number]["path"];

interface TreeEntry {
  readonly mode: 0o644 | 0o755;
  readonly objectId: string;
  readonly path: ReleaseRelativePath;
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
 * Creates the Provider channel resolver used only by status and sync.
 *
 * @remarks
 * Disposable test selection is authored directly in its operation handler and
 * does not enter this transitional channel boundary.
 */
export function createSelectedContentResolver(
  binding: Readonly<{ contentWorkspace: SelectedContentReadPort }>
): SelectedContentResolver {
  return Object.freeze({
    resolveChannel: (input: Parameters<SelectedContentResolver["resolveChannel"]>[0]) =>
      resolveChannel(binding.contentWorkspace, input).pipe(
        Effect.catch((error) => Effect.succeed(rejectedFrom(error)))
      ),
  });
}

function resolveChannel(
  contentWorkspace: SelectedContentReadPort,
  input: Parameters<SelectedContentResolver["resolveChannel"]>[0]
): Effect.Effect<SelectedContentResolution, SelectedContentReadFailure> {
  return Effect.gen(function* () {
    const { locator, selection } = input;
    if (locator.expectedRepositoryIdentity !== selection.sourceRepositoryIdentity) {
      return selectedContentRejected(
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
    const releaseInputEntry = entryByPath.get(SELECTED_CONTENT_RELEASE_INPUT_PATH);
    if (releaseInputEntry === undefined) {
      return yield* Effect.fail(
        new SelectedContentFailure(
          "SourceIneligible",
          `Selected tree is missing ${SELECTED_CONTENT_RELEASE_INPUT_PATH}.`
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
    const marketplaceIssue = validateSelectedNativeMarketplaces(releaseInput, manifestBytes);
    if (marketplaceIssue !== undefined) return marketplaceIssue;
    const payloads = yield* readDeclaredPayloads(
      contentWorkspace,
      opening,
      treeEntries,
      releaseInput
    );
    const derivation = deriveReleaseSelection(
      {
        repositoryIdentity: selection.sourceRepositoryIdentity,
        sourceCommit: selection.contentCommit,
        sourceTree: selection.contentTree,
        releaseInput,
        payloads,
      },
      { kind: "complete-set" }
    );
    if (!derivation.ok) {
      return selectedContentFromReleaseDerivationFailure(derivation.failure);
    }
    const constructed = constructSelectedContent({
      derivation: derivation.value,
      selectionKind: "complete-set",
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
      return selectedContentRejected(
        "SelectionMismatch",
        "Selected Git tag changed while its content was read."
      );
    }
    return constructed;
  });
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
      pluginRoot: SELECTED_CONTENT_PLUGIN_ROOT,
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
      const memberRoot = requireReleasePath(`${SELECTED_CONTENT_PLUGIN_ROOT}/${member.pluginId}`);
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
      const parsedPath = parseRelativePath(observed.path, "selectedContent.tree.path");
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
  const parsed = parseRelativePath(value, "selectedContent.path");
  if (!parsed.ok) throw new Error(`Compiled selected-content path is invalid: ${value}`);
  return parsed.value;
}

function rejectedFrom(
  error: SelectedContentReadFailure
): Extract<SelectedContentResolution, { kind: "Rejected" }> {
  if (error instanceof SelectedContentFailure) {
    return selectedContentRejected(error.code, error.message);
  }
  return selectedContentRejected("SourceReadFailed", error.detail);
}
