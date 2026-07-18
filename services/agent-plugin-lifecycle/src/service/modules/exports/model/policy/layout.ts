import { posix } from "node:path";

import {
  MAX_RELEASE_MEMBERS,
  MAX_RELEASE_SET_PAYLOAD_BYTES,
  contentDigest,
  compareCanonicalText,
  parseReleaseRelativePath,
  payloadEntryBytes,
  verifyCompleteReleaseSetGraph,
  type ArtifactRef,
  type ContentDigest,
  type NormalizedFileMode,
  type PayloadDigest,
  type PluginId,
  type ReleaseDigest,
  type ReleaseSetDigest,
  type ReleaseRelativePath,
  type VerifiedArtifactSnapshotV1,
  type VerifiedReleaseArtifactV1,
} from "../../../../shared/release/index";

import {
  CLAUDE_EXPORT_LAYOUT_V1,
  CODEX_EXPORT_LAYOUT_V1,
  type ExportFailure,
  type ExportLayoutV1,
  type ExportModeV1,
} from "../dto/export-lifecycle";
import { bytesEqual } from "../helpers/canonical";

export interface PlannedExportFile {
  readonly pluginId: PluginId;
  readonly releaseDigest: ReleaseDigest;
  readonly payloadDigest: PayloadDigest;
  readonly relativePath: ReleaseRelativePath;
  readonly mode: NormalizedFileMode;
  readonly contentDigest: ContentDigest;
  readonly bytes: Uint8Array;
}

export interface PlannedPluginScope {
  readonly pluginId: PluginId;
  readonly releaseDigest: ReleaseDigest;
  readonly payloadDigest: PayloadDigest;
  readonly files: readonly PlannedExportFile[];
  readonly directories: readonly ReleaseRelativePath[];
}

export const MAX_EXPORT_FILES = 65_536;
export const MAX_EXPORT_DIRECTORIES = 131_072;
export const MAX_EXPORT_PAYLOAD_BYTES = MAX_RELEASE_SET_PAYLOAD_BYTES;

export type RenderedExportSelection =
  | Readonly<{
    ok: true;
    mode: "targeted-release";
    scopes: readonly [PlannedPluginScope];
    releaseSetDigest: null;
  }>
  | Readonly<{
    ok: true;
    mode: "complete-set";
    scopes: readonly PlannedPluginScope[];
    releaseSetDigest: ReleaseSetDigest;
  }>
  | Readonly<{ ok: false; failure: ExportFailure }>;

export function renderExportSelection(
  ref: ArtifactRef,
  mode: ExportModeV1,
  layout: ExportLayoutV1,
  snapshot: VerifiedArtifactSnapshotV1,
): RenderedExportSelection {
  try {
    if (mode === "targeted-release") {
      if (ref.kind !== "release" || snapshot.kind !== "release") {
        return mismatch("Targeted mode requires one verified release artifact");
      }
      assertReleaseMatchesRef(snapshot, ref);
      const scope = renderScope(snapshot, layout);
      const bytes = scope.files.reduce((total, file) => total + file.bytes.byteLength, 0);
      if (scope.files.length > MAX_EXPORT_FILES || scope.directories.length > MAX_EXPORT_DIRECTORIES || bytes > MAX_EXPORT_PAYLOAD_BYTES) {
        return mismatch("Release artifact exceeds the practical export product bound");
      }
      return {
        ok: true,
        mode,
        scopes: [scope],
        releaseSetDigest: null,
      };
    }
    if (ref.kind !== "complete-set" || snapshot.kind !== "complete-set") {
      return mismatch("Complete-set mode requires one verified complete-set artifact");
    }
    if (snapshot.ref.releaseSetDigest !== ref.releaseSetDigest
      || snapshot.releaseSet.releaseSetDigest !== ref.releaseSetDigest) {
      return mismatch("Complete-set snapshot does not match the requested set digest");
    }
    const graph = verifyCompleteReleaseSetGraph(
      snapshot.releaseSet,
      snapshot.members.map((member) => member.release),
    );
    if (!graph.ok) return mismatch(`Complete artifact graph is invalid: ${graph.issues.map((issue) => issue.code).join(",")}`);
    if (snapshot.members.length > MAX_RELEASE_MEMBERS) return mismatch("Complete artifact exceeds the export scope bound");
    const scopes: PlannedPluginScope[] = [];
    let totalFiles = 0;
    let totalDirectories = 0;
    let totalBytes = 0;
    for (const member of snapshot.members) {
      const scope = renderScope(member, layout);
      totalFiles += scope.files.length;
      totalDirectories += scope.directories.length;
      for (const file of scope.files) totalBytes += file.bytes.byteLength;
      if (totalFiles > MAX_EXPORT_FILES || totalDirectories > MAX_EXPORT_DIRECTORIES || totalBytes > MAX_EXPORT_PAYLOAD_BYTES) {
        return mismatch("Complete artifact exceeds the practical export product bound");
      }
      scopes.push(scope);
    }
    const allPaths = scopes.flatMap((scope) => scope.files.map((file) => file.relativePath));
    if (new Set(allPaths).size !== allPaths.length) return mismatch("Complete layout contains a cross-scope path collision");
    const setIds = snapshot.releaseSet.body.members.map((member) => member.pluginId);
    const snapshotIds = scopes.map((scope) => scope.pluginId);
    if (setIds.length !== snapshotIds.length || setIds.some((id, index) => id !== snapshotIds[index])) {
      return mismatch("Complete-set snapshot member order differs from its verified envelope");
    }
    return {
      ok: true,
      mode,
      scopes: Object.freeze(scopes),
      releaseSetDigest: ref.releaseSetDigest,
    };
  } catch (error) {
    return mismatch(error instanceof Error ? error.message : String(error));
  }
}

function renderScope(snapshot: VerifiedReleaseArtifactV1, layout: ExportLayoutV1): PlannedPluginScope {
  assertReleaseMatchesRef(snapshot, snapshot.ref);
  const body = snapshot.release.artifactBody.releaseBody;
  const entries = snapshot.release.artifactBody.payloadEntries;
  if (entries.length !== snapshot.files.length) throw new Error("Snapshot file count differs from release payload entries");
  const files = snapshot.files.map((file, index) => {
    const entry = entries[index];
    if (
      entry === undefined
      || entry.path !== file.path
      || entry.mode !== file.mode
      || entry.contentDigest !== file.contentDigest
      || contentDigest(file.bytes) !== file.contentDigest
      || !bytesEqual(file.bytes, payloadEntryBytes(entry))
    ) throw new Error(`Snapshot payload differs at ${file.path}`);
    const prefix = layout === CODEX_EXPORT_LAYOUT_V1 ? "codex/plugins" : "claude/plugins";
    const relativePath = valueOf(parseReleaseRelativePath(posix.join(prefix, body.pluginId, file.path)));
    if (relativePath === undefined) throw new Error(`Rendered layout path is unsafe for ${file.path}`);
    return Object.freeze({
      pluginId: body.pluginId,
      releaseDigest: snapshot.release.releaseDigest,
      payloadDigest: body.payloadDigest,
      relativePath,
      mode: file.mode,
      contentDigest: file.contentDigest,
      bytes: new Uint8Array(file.bytes),
    });
  });
  files.sort((left, right) => compareCanonicalText(left.relativePath, right.relativePath));
  if (new Set(files.map((file) => file.relativePath)).size !== files.length) {
    throw new Error("Rendered layout contains a canonical path collision");
  }
  const directories = new Set<ReleaseRelativePath>();
  for (const file of files) {
    let current = posix.dirname(file.relativePath);
    while (current !== ".") {
      const parsed = valueOf(parseReleaseRelativePath(current));
      if (parsed === undefined) throw new Error(`Rendered directory path is unsafe for ${file.relativePath}`);
      directories.add(parsed);
      if (directories.size > MAX_EXPORT_DIRECTORIES) throw new Error("Rendered scope exceeds the export directory bound");
      current = posix.dirname(current);
    }
  }
  return Object.freeze({
    pluginId: body.pluginId,
    releaseDigest: snapshot.release.releaseDigest,
    payloadDigest: body.payloadDigest,
    files: Object.freeze(files),
    directories: Object.freeze([...directories].sort(compareCanonicalText)),
  });
}

function valueOf<T, E>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly E[] }): T | undefined {
  return result.ok ? result.value : undefined;
}

function assertReleaseMatchesRef(
  snapshot: VerifiedReleaseArtifactV1,
  ref: Extract<ArtifactRef, { kind: "release" }>,
): void {
  if (
    snapshot.kind !== "release"
    || snapshot.ref.kind !== "release"
    || snapshot.ref.releaseDigest !== ref.releaseDigest
    || snapshot.ref.artifactDigest !== ref.artifactDigest
    || snapshot.release.releaseDigest !== ref.releaseDigest
    || snapshot.release.artifactDigest !== ref.artifactDigest
  ) throw new Error("Release snapshot does not match the requested closed artifact reference");
}

function mismatch(message: string): RenderedExportSelection {
  return {
    ok: false,
    failure: Object.freeze({
      code: "ArtifactSnapshotMismatch",
      phase: "artifact-snapshot",
      message,
    }),
  };
}
