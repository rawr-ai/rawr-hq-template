import type { ContentTreeEntry, ContentWorkspaceFailure } from "@rawr/resource-content-workspace";
import type { Result } from "effect";
import type { ContentWorkspaceSnapshot } from "#agent-plugin-lifecycle-service/model/dto/content-workspace";
import {
  parseRelativePath,
  type ReleaseRelativePath,
} from "#agent-plugin-lifecycle-service/model/dto/current-main-primitives";
import type { SelectedContentResolution } from "../dto/selected-content";
import { validateNativeMarketplaces } from "./native-marketplace";
import { selectedContentRejected } from "./selected-content";

/** Maximum bytes accepted from either provider-native marketplace manifest. */
export const MAX_NATIVE_MARKETPLACE_MANIFEST_BYTES = 2 * 1024 * 1024;

/** Fixed release-input path admitted by disposable Provider testing. */
export const SELECTED_CONTENT_RELEASE_INPUT_PATH = requireReleasePath(".rawr/release-input.json");
/** Fixed agent-plugin source root admitted by disposable Provider testing. */
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

interface SelectedContentInterfaceEntry {
  readonly objectId: string;
  readonly path: ReleaseRelativePath;
}

interface SelectedContentInterfaceFacts {
  readonly manifestEntries: readonly SelectedContentInterfaceEntry[];
}

type SelectedContentDecision<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{
      ok: false;
      result: Extract<SelectedContentResolution, { kind: "Rejected" }>;
    }>;

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
  if (attempt._tag === "Failure") {
    return declined(selectedContentResourceFailure(attempt.failure));
  }
  const entries: SelectedContentInterfaceEntry[] = [];
  const exactPaths = new Set<string>();
  const portablePaths = new Set<string>();
  for (const observed of attempt.success) {
    const parsedPath = parseRelativePath(observed.path, "selectedContent.tree.path");
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
        objectId: observed.blob,
        path: parsedPath.value,
      })
    );
  }
  const entryByPath = new Map(entries.map((entry) => [entry.path, entry]));
  const manifestEntries: SelectedContentInterfaceEntry[] = [];
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
  return admitted(
    Object.freeze({
      manifestEntries: Object.freeze(manifestEntries),
    })
  );
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
  const validated = validateNativeMarketplaces({ releaseInput, codexBytes, claudeBytes });
  return validated.ok ? undefined : selectedContentRejected("SourceIneligible", validated.detail);
}

/** Classifies one local manifest reread against its selected Git bytes. */
export function classifyLocalSelectedContentManifest(
  path: ReleaseRelativePath,
  expected: Uint8Array,
  attempt: Result.Result<Uint8Array, ContentWorkspaceFailure>
): SelectedContentDecision<true> {
  if (attempt._tag === "Failure") {
    return declined(selectedContentResourceFailure(attempt.failure));
  }
  if (!equalBytes(attempt.success, expected)) {
    return declined(
      selectedContentRejected(
        "SourceIneligible",
        `Local native marketplace manifest differs from Git: ${path}.`
      )
    );
  }
  return admitted(true);
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

function requireReleasePath(value: string): ReleaseRelativePath {
  const parsed = parseRelativePath(value, "selectedContent.path");
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
