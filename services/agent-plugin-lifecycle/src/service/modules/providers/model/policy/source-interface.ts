import type {
  ContentTreeEntry,
  ContentWorkspaceFailure,
  DisposableContentTreeEntry,
  GitBlobObservation,
  GitRefObservation,
  MaterializedContentTree,
} from "@habitat-ai/rawr-resource-content-workspace";
import type { Result } from "effect";
import { MAX_PAYLOAD_BYTES_PER_MEMBER } from "../../../../model/dto/agent-plugin-payload";
import type { ContentWorkspaceSnapshot } from "../../../../model/dto/content-workspace";
import type {
  CanonicalChannelSelection,
  CurrentMainSelectionLocator,
} from "../../../../model/dto/current-main-selection";
import type { ReleaseDerivationSource } from "../../../../model/dto/release-derivation";
import type { PluginId, ReleaseRelativePath } from "../../../../model/dto/release-identity";
import { MAX_RELEASE_INPUT_ENVELOPE_BYTES } from "../../../../model/dto/release-input";
import {
  createAgentPluginPayload,
  payloadEntryBytes,
} from "../../../../model/policy/agent-plugin-payload";
import { compareCanonicalText } from "../../../../model/policy/canonical-text-ordering";
import { validateDeclaredPluginTree } from "../../../../model/policy/declared-plugin-tree";
import { parsePluginId, parseReleaseRelativePath } from "../../../../model/policy/release-identity";
import { decodeAgentPluginReleaseInput } from "../../../../model/policy/release-input";
import {
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  totalReleaseSetPayloadBytes,
} from "../../../../model/policy/release-payload-accounting";
import type { SelectedContentResolution } from "../dto/selected-content";
import { validateNativeMarketplaces } from "./native-marketplace";
import { selectedContentRejected } from "./selected-content";

/** Maximum regular Git tree entries admitted by one channel selection. */
export const MAX_SELECTED_CONTENT_TREE_ENTRIES = 200_000;

/** Maximum native Git tree bytes admitted by one channel selection. */
export const MAX_SELECTED_CONTENT_TREE_BYTES = 100 * 1024 * 1024;

/** Maximum canonical release-input bytes read by one channel selection. */
export const MAX_SELECTED_CONTENT_RELEASE_INPUT_BYTES = MAX_RELEASE_INPUT_ENVELOPE_BYTES;

/** Maximum decoded payload bytes admitted for one selected member. */
export const MAX_SELECTED_CONTENT_MEMBER_PAYLOAD_BYTES = MAX_PAYLOAD_BYTES_PER_MEMBER;

/** Maximum bytes accepted from either provider-native marketplace manifest. */
export const MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES = 2 * 1024 * 1024;

/** Fixed release-input path admitted by Provider selection. */
export const SELECTED_CONTENT_RELEASE_INPUT_PATH = requireReleasePath(".rawr/release-input.json");

/** Fixed agent-plugin source root admitted by Provider selection. */
export const SELECTED_CONTENT_PLUGIN_ROOT = requireReleasePath("plugins/agents");

/** Codex marketplace interface path selected from exact Git content. */
export const CODEX_MARKETPLACE_MANIFEST = requireReleasePath(".agents/plugins/marketplace.json");

/** Claude marketplace interface path selected from exact Git content. */
export const CLAUDE_MARKETPLACE_MANIFEST = requireReleasePath(".claude-plugin/marketplace.json");

/** Required provider-native marketplace manifest paths in canonical order. */
export const NATIVE_MARKETPLACE_MANIFESTS = Object.freeze([
  CODEX_MARKETPLACE_MANIFEST,
  CLAUDE_MARKETPLACE_MANIFEST,
]);

/** Git tree roots required to read the provider-native marketplace interface. */
export const NATIVE_MARKETPLACE_INTERFACE_PATHS = Object.freeze([
  requireReleasePath(".agents/plugins"),
  requireReleasePath(".claude-plugin"),
]);

/** Exact Git tree paths consumed by governed Provider channel selection. */
export const CHANNEL_SELECTED_CONTENT_PATHS = Object.freeze([
  SELECTED_CONTENT_RELEASE_INPUT_PATH,
  ...NATIVE_MARKETPLACE_INTERFACE_PATHS,
  SELECTED_CONTENT_PLUGIN_ROOT,
]);

/** Sparse Git paths passed to native providers for the selected marketplace. */
export const CHANNEL_NATIVE_MARKETPLACE_SPARSE_PATHS = Object.freeze([
  ".agents/plugins",
  ".claude-plugin",
  "plugins/agents",
]);

type AgentPluginReleaseInput = ReleaseDerivationSource["releaseInput"];
type AgentPluginPayload = ReleaseDerivationSource["payloads"][number]["payload"];

interface SelectedContentTreeEntry {
  readonly mode: 0o644 | 0o755;
  readonly objectId: string;
  readonly path: ReleaseRelativePath;
}

interface SelectedContentInterfaceEntry {
  readonly mode: 0o644 | 0o755;
  readonly objectId: string;
  readonly path: ReleaseRelativePath;
}

interface SelectedContentInterfaceFacts {
  readonly manifestEntries: readonly SelectedContentInterfaceEntry[];
}

interface ChannelAnchorFacts {
  readonly observation: GitRefObservation;
}

interface ChannelTreeFacts extends ChannelAnchorFacts {
  readonly treeEntries: readonly SelectedContentTreeEntry[];
  readonly entryByPath: ReadonlyMap<ReleaseRelativePath, SelectedContentTreeEntry>;
  readonly releaseInputEntry: SelectedContentTreeEntry;
}

interface ChannelReleaseInputFacts extends ChannelTreeFacts {
  readonly releaseInput: AgentPluginReleaseInput;
}

interface ChannelPayloadReadPlan extends ChannelReleaseInputFacts {
  readonly blobs: readonly string[];
  readonly memberPayloads: readonly Readonly<{
    pluginId: PluginId;
    entries: readonly Readonly<{
      relativePath: ReleaseRelativePath;
      entry: SelectedContentTreeEntry;
    }>[];
  }>[];
}

interface ChannelPayloadFacts extends ChannelPayloadReadPlan {
  readonly payloads: readonly Readonly<{
    pluginId: PluginId;
    payload: AgentPluginPayload;
  }>[];
}

type SelectedContentDecision<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{
      ok: false;
      result: Extract<SelectedContentResolution, { kind: "Rejected" }>;
    }>;

/**
 * Admits current-main for Provider channel reads only when its repository
 * identity still matches the explicit invocation locator.
 */
export function classifySelectedContentChannelSelection(
  locator: CurrentMainSelectionLocator,
  selection: CanonicalChannelSelection
): SelectedContentDecision<CanonicalChannelSelection> {
  return locator.expectedRepositoryIdentity === selection.sourceRepositoryIdentity
    ? admitted(selection)
    : declined(
        selectedContentRejected(
          "SelectionMismatch",
          "Current-main selection belongs to another repository identity."
        )
      );
}

/** Classifies the opening selected-ref observation for one channel selection. */
export function classifySelectedContentChannelAnchor(
  selection: CanonicalChannelSelection,
  attempt: Result.Result<GitRefObservation, ContentWorkspaceFailure>
): SelectedContentDecision<ChannelAnchorFacts> {
  if (attempt._tag === "Failure") {
    return declined(selectedContentResourceFailure(attempt.failure));
  }
  const observation = attempt.success;
  if (
    observation.refName !== selection.sourceRef ||
    observation.commit !== selection.contentCommit ||
    observation.tree !== selection.contentTree
  ) {
    return declined(
      selectedContentRejected(
        "SelectionMismatch",
        "Selected Git tag does not resolve to the reviewed commit and tree."
      )
    );
  }
  if (!observation.remoteUrls.includes(selection.sourceRepositoryUrl)) {
    return declined(
      selectedContentRejected(
        "SelectionMismatch",
        "Selected Git workspace does not expose the reviewed repository URL."
      )
    );
  }
  return admitted(Object.freeze({ observation }));
}

/**
 * Classifies the complete channel tree and selects its release-input blob.
 *
 * @remarks
 * Marketplace presence remains unclassified until after the release input is
 * read and validated so public failure precedence matches the operation.
 */
export function classifySelectedContentChannelTree(
  anchor: ChannelAnchorFacts,
  attempt: Result.Result<readonly ContentTreeEntry[], ContentWorkspaceFailure>
): SelectedContentDecision<ChannelTreeFacts> {
  const interpreted = classifySelectedContentTree(attempt);
  if (!interpreted.ok) return interpreted;
  const entryByPath = new Map(interpreted.value.map((entry) => [entry.path, entry]));
  const releaseInputEntry = entryByPath.get(SELECTED_CONTENT_RELEASE_INPUT_PATH);
  if (releaseInputEntry === undefined) {
    return declined(
      selectedContentRejected(
        "SourceIneligible",
        `Selected tree is missing ${SELECTED_CONTENT_RELEASE_INPUT_PATH}.`
      )
    );
  }
  return admitted(
    Object.freeze({
      ...anchor,
      treeEntries: interpreted.value,
      entryByPath,
      releaseInputEntry,
    })
  );
}

/** Classifies the selected release-input blob against current-main. */
export function classifySelectedContentChannelReleaseInput(
  selection: CanonicalChannelSelection,
  tree: ChannelTreeFacts,
  attempt: Result.Result<Uint8Array, ContentWorkspaceFailure>
): SelectedContentDecision<ChannelReleaseInputFacts> {
  if (attempt._tag === "Failure") {
    return declined(selectedContentResourceFailure(attempt.failure));
  }
  if (attempt.success.byteLength > MAX_SELECTED_CONTENT_RELEASE_INPUT_BYTES) {
    return declined(
      selectedContentRejected(
        "SourceReadFailed",
        `Git blob exceeds its bound: ${tree.releaseInputEntry.path}.`
      )
    );
  }
  const decoded = decodeAgentPluginReleaseInput(attempt.success);
  if (!decoded.ok) {
    return declined(
      selectedContentRejected(
        "SourceIneligible",
        `Selected release input is invalid: ${decoded.issues.map((issue) => issue.code).join(",")}.`
      )
    );
  }
  if (decoded.value.releaseInputDigest !== selection.releaseInputDigest) {
    return declined(
      selectedContentRejected(
        "SelectionMismatch",
        "Selected release-input digest differs from current-main."
      )
    );
  }
  if (decoded.value.body.contentAuthority !== selection.contentAuthority) {
    return declined(
      selectedContentRejected(
        "SelectionMismatch",
        "Selected release input declares another content authority."
      )
    );
  }
  return admitted(Object.freeze({ ...tree, releaseInput: decoded.value }));
}

/**
 * Selects one required marketplace manifest after release-input admission.
 *
 * @remarks
 * Handlers call this in canonical manifest order immediately before each blob
 * read. A missing later manifest therefore cannot outrank an earlier read
 * failure.
 */
export function selectSelectedContentChannelManifestEntry(
  source: ChannelReleaseInputFacts,
  path: ReleaseRelativePath
): SelectedContentDecision<SelectedContentTreeEntry> {
  const entry = source.entryByPath.get(path);
  return entry === undefined
    ? declined(
        selectedContentRejected(
          "SourceIneligible",
          `Selected tree is missing native marketplace manifest ${path}.`
        )
      )
    : admitted(entry);
}

/**
 * Plans the one bounded payload batch from the selected tree and release input.
 *
 * @remarks
 * This phase is inert: it validates declared membership and returns exact blob
 * identities without reading the content-workspace resource.
 */
export function planSelectedContentChannelPayloadRead(
  source: ChannelReleaseInputFacts
): SelectedContentDecision<ChannelPayloadReadPlan> {
  const declaredMembers: Array<
    Readonly<{
      pluginId: PluginId;
    }>
  > = [];
  for (const [memberIndex, member] of source.releaseInput.body.members.entries()) {
    const pluginId = parsePluginId(
      member.pluginId,
      `selectedContent.releaseInput.body.members[${memberIndex}].pluginId`
    );
    if (!pluginId.ok) {
      return declined(
        selectedContentRejected(
          "SourceIneligible",
          `Release input member identity is not canonical: ${member.pluginId}.`
        )
      );
    }
    declaredMembers.push(Object.freeze({ pluginId: pluginId.value }));
  }
  const declaredTreeIssue = validateDeclaredPluginTree({
    pluginRoot: SELECTED_CONTENT_PLUGIN_ROOT,
    paths: source.treeEntries.map((entry) => entry.path),
    declaredPluginIds: declaredMembers.map((member) => member.pluginId),
  });
  if (declaredTreeIssue !== undefined) {
    return declined(
      selectedContentRejected(
        "SourceIneligible",
        `${declaredTreeIssue.code}: ${declaredTreeIssue.detail}`
      )
    );
  }

  const uniqueBlobs = new Set<string>();
  const memberPayloads: ChannelPayloadReadPlan["memberPayloads"][number][] = [];
  for (const member of declaredMembers) {
    const memberRoot = requireReleasePath(`${SELECTED_CONTENT_PLUGIN_ROOT}/${member.pluginId}`);
    const entriesUnderRoot = source.treeEntries
      .filter((entry) => entry.path.startsWith(`${memberRoot}/`))
      .sort((left, right) => compareCanonicalText(left.path, right.path));
    if (entriesUnderRoot.length === 0) {
      return declined(
        selectedContentRejected(
          "SourceIneligible",
          `Declared payload root is empty for ${member.pluginId}.`
        )
      );
    }
    const entries: Array<
      Readonly<{
        relativePath: ReleaseRelativePath;
        entry: SelectedContentTreeEntry;
      }>
    > = [];
    for (const entry of entriesUnderRoot) {
      const relativePath = requireReleasePath(entry.path.slice(memberRoot.length + 1));
      uniqueBlobs.add(entry.objectId);
      entries.push(Object.freeze({ relativePath, entry }));
    }
    memberPayloads.push(
      Object.freeze({
        pluginId: member.pluginId,
        entries: Object.freeze(entries),
      })
    );
  }

  return admitted(
    Object.freeze({
      ...source,
      blobs: Object.freeze([...uniqueBlobs].sort(compareCanonicalText)),
      memberPayloads: Object.freeze(memberPayloads),
    })
  );
}

/** Classifies the exact payload blob batch and constructs verified payloads. */
export function classifySelectedContentChannelPayloads(
  plan: ChannelPayloadReadPlan,
  attempt: Result.Result<readonly GitBlobObservation[], ContentWorkspaceFailure>
): SelectedContentDecision<ChannelPayloadFacts> {
  if (attempt._tag === "Failure") {
    return declined(selectedContentResourceFailure(attempt.failure));
  }
  const bytesByBlob = new Map(
    attempt.success.map((observation) => [observation.blob, observation.bytes])
  );
  if (bytesByBlob.size !== plan.blobs.length) {
    return declined(
      selectedContentRejected(
        "SourceReadFailed",
        "Git batch omitted or duplicated a selected payload blob."
      )
    );
  }

  const payloads: Array<Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>> = [];
  for (const member of plan.memberPayloads) {
    const payloadEntries: Array<{
      path: ReleaseRelativePath;
      mode: SelectedContentTreeEntry["mode"];
      bytes: Uint8Array;
    }> = [];
    for (const { relativePath, entry } of member.entries) {
      const bytes = bytesByBlob.get(entry.objectId);
      if (bytes === undefined) {
        return declined(
          selectedContentRejected("SourceReadFailed", `Git batch omitted ${entry.path}.`)
        );
      }
      payloadEntries.push({ path: relativePath, mode: entry.mode, bytes });
    }
    const created = createAgentPluginPayload(payloadEntries);
    if (!created.ok) {
      return declined(
        selectedContentRejected(
          "SourceIneligible",
          `Payload construction failed for ${member.pluginId}: ${created.issues
            .map((issue) => issue.code)
            .join(",")}.`
        )
      );
    }
    payloads.push(Object.freeze({ pluginId: member.pluginId, payload: created.value }));
  }
  if (!totalReleaseSetPayloadBytes(payloads).ok) {
    return declined(
      selectedContentRejected(
        "SourceIneligible",
        `Selected payloads exceed ${MAX_RELEASE_SET_PAYLOAD_BYTES} decoded bytes.`
      )
    );
  }
  return admitted(Object.freeze({ ...plan, payloads: Object.freeze(payloads) }));
}

/** Classifies the closing selected-ref observation against its opening fact. */
export function classifyClosingSelectedContentChannel(
  opening: ChannelAnchorFacts,
  attempt: Result.Result<GitRefObservation, ContentWorkspaceFailure>
): SelectedContentDecision<true> {
  if (attempt._tag === "Failure") {
    return declined(selectedContentResourceFailure(attempt.failure));
  }
  return sameRefObservation(opening.observation, attempt.success)
    ? admitted(true)
    : declined(
        selectedContentRejected(
          "SelectionMismatch",
          "Selected Git tag changed while its content was read."
        )
      );
}

/**
 * Classifies the provider-native interface tree without performing resource work.
 *
 * @remarks
 * The operation handler owns the Git read. This policy admits only canonical,
 * collision-free paths and returns the two required native manifest entries.
 */
export function classifySelectedContentInterfaceTree(
  attempt: Result.Result<readonly ContentTreeEntry[], ContentWorkspaceFailure>
): SelectedContentDecision<SelectedContentInterfaceFacts> {
  const interpreted = classifySelectedContentTree(attempt);
  if (!interpreted.ok) return interpreted;
  const entryByPath = new Map(interpreted.value.map((entry) => [entry.path, entry]));
  const manifestEntries = requiredManifestEntries(entryByPath);
  return manifestEntries.ok
    ? admitted(
        Object.freeze({
          manifestEntries: Object.freeze(
            manifestEntries.value.map(({ mode, objectId, path }) =>
              Object.freeze({ mode, objectId, path })
            )
          ),
        })
      )
    : manifestEntries;
}

/** Classifies one bounded native marketplace manifest blob read. */
export function classifySelectedContentManifestBlob(
  path: ReleaseRelativePath,
  attempt: Result.Result<Uint8Array, ContentWorkspaceFailure>
): SelectedContentDecision<Uint8Array> {
  if (attempt._tag === "Failure") {
    return declined(selectedContentResourceFailure(attempt.failure));
  }
  if (
    attempt.success.byteLength === 0 ||
    attempt.success.byteLength > MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES
  ) {
    return declined(
      selectedContentRejected(
        attempt.success.byteLength === 0 ? "SourceIneligible" : "SourceReadFailed",
        attempt.success.byteLength === 0
          ? `Native marketplace manifest ${path} is empty.`
          : `Git blob exceeds its bound: ${path}.`
      )
    );
  }
  return admitted(attempt.success);
}

/** Validates the two provider-native manifests against one release input. */
export function validateSelectedNativeMarketplaces(
  releaseInput: ContentWorkspaceSnapshot["releaseInput"],
  manifests: ReadonlyMap<ReleaseRelativePath, Uint8Array>
): Extract<SelectedContentResolution, { kind: "Rejected" }> | undefined {
  const codexBytes = manifests.get(CODEX_MARKETPLACE_MANIFEST);
  const claudeBytes = manifests.get(CLAUDE_MARKETPLACE_MANIFEST);
  if (codexBytes === undefined || claudeBytes === undefined) {
    return selectedContentRejected(
      "SourceIneligible",
      "Selected content does not contain both native marketplace manifests."
    );
  }
  const validated = validateNativeMarketplaces({
    releaseInput,
    codexBytes,
    claudeBytes,
  });
  return validated.ok ? undefined : selectedContentRejected("SourceIneligible", validated.detail);
}

/**
 * Builds the exact marketplace plan for a caller-root-bounded disposable source.
 *
 * @remarks
 * Both native manifests describe the complete catalog, so targeted tests still
 * materialize every declared payload root. The selected subset remains a
 * native-operation concern and cannot make the marketplace internally partial.
 */
export function planDisposableSelectedContentMarketplace(
  snapshot: ContentWorkspaceSnapshot,
  selectedInterface: SelectedContentInterfaceFacts,
  manifests: ReadonlyMap<ReleaseRelativePath, Uint8Array>
): SelectedContentDecision<readonly DisposableContentTreeEntry[]> {
  const entries: DisposableContentTreeEntry[] = [];
  for (const manifest of selectedInterface.manifestEntries) {
    const bytes = manifests.get(manifest.path);
    if (bytes === undefined) {
      return declined(
        selectedContentRejected(
          "SourceIneligible",
          `Selected content is missing native marketplace bytes for ${manifest.path}.`
        )
      );
    }
    entries.push(
      Object.freeze({
        path: manifest.path,
        mode: disposableContentMode(manifest.mode),
        bytes: new Uint8Array(bytes),
      })
    );
  }

  const bindingByPath = new Map(snapshot.objectBindings.map((binding) => [binding.path, binding]));
  for (const declared of snapshot.payloads) {
    for (const payloadEntry of declared.payload.entries) {
      const path = requireReleasePath(
        `${SELECTED_CONTENT_PLUGIN_ROOT}/${declared.pluginId}/${payloadEntry.path}`
      );
      const binding = bindingByPath.get(path);
      if (binding === undefined || binding.mode !== payloadEntry.mode) {
        return declined(
          selectedContentRejected(
            "SourceIneligible",
            `Selected payload does not retain an exact Git object binding for ${path}.`
          )
        );
      }
      entries.push(
        Object.freeze({
          path,
          mode: disposableContentMode(payloadEntry.mode),
          bytes: payloadEntryBytes(payloadEntry),
        })
      );
    }
  }

  return admitted(
    Object.freeze(entries.sort((left, right) => compareCanonicalText(left.path, right.path)))
  );
}

/** Compares two ordered disposable marketplace plans by exact path, mode, and bytes. */
export function sameDisposableSelectedContentMarketplace(
  left: readonly DisposableContentTreeEntry[],
  right: readonly DisposableContentTreeEntry[]
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => {
      const candidate = right[index];
      return (
        candidate !== undefined &&
        entry.path === candidate.path &&
        entry.mode === candidate.mode &&
        entry.bytes.byteLength === candidate.bytes.byteLength &&
        entry.bytes.every((byte, byteIndex) => byte === candidate.bytes[byteIndex])
      );
    })
  );
}

/** Classifies disposable marketplace materialization without adding state authority. */
export function classifyDisposableSelectedContentMarketplace(
  attempt: Result.Result<MaterializedContentTree, ContentWorkspaceFailure>,
  expectedRoot: string
): SelectedContentDecision<MaterializedContentTree> {
  if (attempt._tag === "Failure") return declined(selectedContentResourceFailure(attempt.failure));
  return attempt.success.root === expectedRoot
    ? admitted(attempt.success)
    : declined(
        selectedContentRejected(
          "SourceReadFailed",
          "Content workspace returned a different disposable marketplace root."
        )
      );
}

function classifySelectedContentTree(
  attempt: Result.Result<readonly ContentTreeEntry[], ContentWorkspaceFailure>
): SelectedContentDecision<readonly SelectedContentTreeEntry[]> {
  if (attempt._tag === "Failure") {
    return declined(selectedContentResourceFailure(attempt.failure));
  }
  const entries: SelectedContentTreeEntry[] = [];
  const exactPaths = new Set<string>();
  const portablePaths = new Set<string>();
  for (const observed of attempt.success) {
    const parsedPath = parseReleaseRelativePath(observed.path, "selectedContent.tree.path");
    if (!parsedPath.ok) {
      return declined(
        selectedContentRejected(
          "SourceIneligible",
          `Selected Git tree contains a noncanonical release path: ${observed.path}.`
        )
      );
    }
    const portablePath = parsedPath.value.normalize("NFC").toLowerCase();
    if (exactPaths.has(parsedPath.value) || portablePaths.has(portablePath)) {
      return declined(
        selectedContentRejected(
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
  return admitted(Object.freeze(entries));
}

function requiredManifestEntries(
  entryByPath: ReadonlyMap<ReleaseRelativePath, SelectedContentTreeEntry>
): SelectedContentDecision<readonly SelectedContentTreeEntry[]> {
  const manifestEntries: SelectedContentTreeEntry[] = [];
  for (const path of NATIVE_MARKETPLACE_MANIFESTS) {
    const entry = entryByPath.get(path);
    if (entry === undefined) {
      return declined(
        selectedContentRejected(
          "SourceIneligible",
          `Selected tree is missing native marketplace manifest ${path}.`
        )
      );
    }
    manifestEntries.push(entry);
  }
  return admitted(Object.freeze(manifestEntries));
}

function admitted<T>(value: T): SelectedContentDecision<T> {
  return Object.freeze({ ok: true, value });
}

function declined(
  result: Extract<SelectedContentResolution, { kind: "Rejected" }>
): SelectedContentDecision<never> {
  return Object.freeze({ ok: false, result });
}

function selectedContentResourceFailure(
  failure: ContentWorkspaceFailure
): Extract<SelectedContentResolution, { kind: "Rejected" }> {
  const code =
    failure.operation === "read-git-tree" &&
    (failure.reason === "UnsupportedEntry" || failure.reason === "LimitExceeded")
      ? "SourceIneligible"
      : "SourceReadFailed";
  return selectedContentRejected(code, failure.detail);
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

function requireReleasePath(value: string): ReleaseRelativePath {
  const parsed = parseReleaseRelativePath(value, "selectedContent.path");
  if (!parsed.ok) throw new Error(`Compiled selected-content path is invalid: ${value}`);
  return parsed.value;
}

function disposableContentMode(mode: 0o644 | 0o755): DisposableContentTreeEntry["mode"] {
  return mode === 0o755 ? "100755" : "100644";
}
