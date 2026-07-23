import { posix } from "node:path";
import { Effect } from "effect";
import type { DigestIdentity } from "../../contracts/index.js";
import type {
  ArtifactPathMapping,
  ArtifactPathRule,
  ExactGitRevision,
  GitPatchSubstrateIdentity,
  PatchDescriptor,
} from "./contracts.js";
import {
  canonicalGitCanonicalization,
  decodeGitText,
  type OwnedGitContext,
  readOwnedGitText,
  requireEqualDigest,
  runOwnedGitChecked,
  trySynchronous,
} from "./git-repository.js";
import {
  type GitBunError,
  identityMismatch,
  invalidInput,
  sha256Digest,
  stableJson,
} from "./internal.js";

const textEncoder = new TextEncoder();

interface ChangedPath {
  readonly status: string;
  readonly path: string;
}

interface IndexedEntry {
  readonly mode: string;
  readonly path: string;
}

export function comparePathRules(left: ArtifactPathRule, right: ArtifactPathRule): number {
  const leftKey = `${left.kind}\0${left.path}`;
  const rightKey = `${right.kind}\0${right.path}`;
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

export function validatePathMapping(mapping: ArtifactPathMapping): void {
  for (const rule of [...mapping.submit, ...mapping.ignore]) {
    validatePathRule(rule);
  }
}

export function stageBaseline(
  context: OwnedGitContext,
  expectedTree: string
): Effect.Effect<string, GitBunError> {
  return Effect.gen(function* () {
    yield* runOwnedGitChecked(context, ["read-tree", expectedTree], "loadBaselineIndex");
    yield* runOwnedGitChecked(context, ["update-index", "--refresh"], "refreshBaselineIndex");
    yield* requireWorktreeMatchesIndex(context, "stageBaseline");
    const tree = yield* writeProductTree(context);
    if (tree !== expectedTree) {
      return yield* Effect.fail(
        identityMismatch(
          "stageBaseline",
          "History-free materialization did not reconstruct the exact baseline tree."
        )
      );
    }
    return tree;
  });
}

export function stageProductTree(context: OwnedGitContext): Effect.Effect<void, GitBunError> {
  return Effect.asVoid(
    runOwnedGitChecked(context, canonicalGitCanonicalization.stageArguments, "stageProductTree")
  );
}

export function enforcePathMapping(
  context: OwnedGitContext,
  baselineTree: string,
  mapping: ArtifactPathMapping
): Effect.Effect<void, GitBunError> {
  return Effect.gen(function* () {
    const changes = yield* changedPaths(context, baselineTree);
    const ignored: string[] = [];
    for (const change of changes) {
      const submits = mapping.submit.some((rule) => matchesRule(rule, change.path));
      const ignores = mapping.ignore.some((rule) => matchesRule(rule, change.path));
      if (submits && ignores) {
        return yield* Effect.fail(
          invalidInput("enforcePathMapping", `Path mapping is ambiguous for ${change.path}.`)
        );
      }
      if (ignores) {
        ignored.push(change.path);
      } else if (!submits) {
        return yield* Effect.fail(
          identityMismatch(
            "enforcePathMapping",
            `Terminal product changed protected path ${change.path}.`
          )
        );
      }
    }
    if (ignored.length > 0) {
      yield* runOwnedGitChecked(
        context,
        ["reset", "--quiet", baselineTree, "--pathspec-from-file=-", "--pathspec-file-nul"],
        "restoreIgnoredPaths",
        nulJoin(ignored)
      );
    }
    const finalChanges = yield* changedPaths(context, baselineTree);
    for (const change of finalChanges) {
      if (!mapping.submit.some((rule) => matchesRule(rule, change.path))) {
        return yield* Effect.fail(
          identityMismatch(
            "enforcePathMapping",
            `Canonical patch retained non-submitted path ${change.path}.`
          )
        );
      }
    }
  });
}

export function verifyMappedPatch(
  context: OwnedGitContext,
  baselineTree: string,
  mapping: ArtifactPathMapping
): Effect.Effect<void, GitBunError> {
  return Effect.gen(function* () {
    const changes = yield* changedPaths(context, baselineTree);
    for (const change of changes) {
      const submitted = mapping.submit.some((rule) => matchesRule(rule, change.path));
      const ignored = mapping.ignore.some((rule) => matchesRule(rule, change.path));
      if (!submitted || ignored) {
        return yield* Effect.fail(
          identityMismatch(
            "applyAndRegenerate",
            `Canonical patch changes an inadmissible path: ${change.path}`
          )
        );
      }
    }
  });
}

export function changedPaths(
  context: OwnedGitContext,
  baselineTree: string
): Effect.Effect<readonly ChangedPath[], GitBunError> {
  return Effect.gen(function* () {
    const result = yield* runOwnedGitChecked(
      context,
      ["diff", "--cached", "--name-status", "-z", "--no-renames", baselineTree, "--"],
      "readChangedPaths"
    );
    return yield* trySynchronous("readChangedPaths", () => parseNameStatus(result.stdout));
  });
}

export function validateSubmittedModes(
  context: OwnedGitContext,
  changes: readonly ChangedPath[],
  operation: "applyAndRegenerate" | "capturePatch"
): Effect.Effect<void, GitBunError> {
  return Effect.gen(function* () {
    const livePaths = changes
      .filter((change) => change.status !== "D")
      .map((change) => change.path);
    if (livePaths.length === 0) {
      return;
    }
    const result = yield* runOwnedGitChecked(
      context,
      ["ls-files", "--stage", "-z", "--", ...livePaths],
      "readSubmittedModes"
    );
    const entries = yield* trySynchronous("readSubmittedModes", () =>
      parseIndexedEntries(result.stdout)
    );
    for (const entry of entries) {
      if (entry.mode === "120000") {
        return yield* Effect.fail(
          identityMismatch(operation, `Submitted path ${entry.path} is a symbolic link.`)
        );
      }
      if (entry.mode !== "100644" && entry.mode !== "100755") {
        return yield* Effect.fail(
          identityMismatch(
            operation,
            `Submitted path ${entry.path} has unsupported Git mode ${entry.mode}.`
          )
        );
      }
    }
  });
}

export function canonicalPatch(
  context: OwnedGitContext,
  baselineTree: string
): Effect.Effect<Uint8Array, GitBunError> {
  return Effect.map(
    runOwnedGitChecked(
      context,
      ["diff", "--cached", ...canonicalGitCanonicalization.diffArguments, baselineTree, "--"],
      "generateCanonicalPatch"
    ),
    (result) => new Uint8Array(result.stdout)
  );
}

export function applyPatch(
  context: OwnedGitContext,
  patchBytes: Uint8Array
): Effect.Effect<void, GitBunError> {
  return Effect.gen(function* () {
    const arguments_ = canonicalGitCanonicalization.applyArguments;
    yield* runOwnedGitChecked(
      context,
      [arguments_[0] ?? "apply", "--check", ...arguments_.slice(1)],
      "applyCheck",
      patchBytes
    );
    yield* runOwnedGitChecked(context, arguments_, "applyPatch", patchBytes);
  });
}

export function requireWorktreeMatchesIndex(
  context: OwnedGitContext,
  operation: string,
  mapping?: ArtifactPathMapping
): Effect.Effect<void, GitBunError> {
  return Effect.gen(function* () {
    const diff = yield* runOwnedGitChecked(
      context,
      ["diff-files", "--name-only", "-z", "--no-ext-diff", "--"],
      "compareWorktreeToIndex"
    );
    const differingPaths = yield* trySynchronous("compareWorktreeToIndex", () =>
      splitNul(diff.stdout).map((entry) => decodeGitText(entry, "compareWorktreeToIndex"))
    );
    if (!allPathsIgnored(differingPaths, mapping)) {
      return yield* Effect.fail(
        identityMismatch(
          operation,
          "Reconstructed product bytes differ from the indexed patch result."
        )
      );
    }
    const untracked = yield* runOwnedGitChecked(
      context,
      ["ls-files", "--others", "--directory", "-z"],
      "readUntrackedProductPaths"
    );
    const untrackedPaths = yield* trySynchronous("readUntrackedProductPaths", () =>
      splitNul(untracked.stdout).map((entry) => decodeGitText(entry, "readUntrackedProductPaths"))
    );
    if (!allPathsIgnored(untrackedPaths, mapping)) {
      return yield* Effect.fail(
        identityMismatch(operation, "Reconstructed product contains untracked paths.")
      );
    }
  });
}

export function writeProductTree(context: OwnedGitContext): Effect.Effect<string, GitBunError> {
  return readOwnedGitText(context, ["write-tree"], "writeProductTree");
}

export function verifyPatchBytes(descriptor: PatchDescriptor, bytes: Uint8Array): void {
  if (descriptor.kind === "Empty") {
    if (bytes.byteLength !== 0) {
      throw identityMismatch("applyAndRegenerate", "Empty patch descriptor has bytes.");
    }
    return;
  }
  if (bytes.byteLength !== descriptor.byteLength) {
    throw identityMismatch("applyAndRegenerate", "Patch byte length differs.");
  }
  requireEqualDigest(
    descriptor.patchDigest,
    sha256Digest("research-sdk.git-patch.v1", bytes),
    "applyAndRegenerate",
    "patch"
  );
}

export function requireEqualSubstrate(
  left: GitPatchSubstrateIdentity,
  right: GitPatchSubstrateIdentity
): void {
  if (stableJson(left) !== stableJson(right)) {
    throw identityMismatch("applyAndRegenerate", "Artifact substrate identity differs.");
  }
}

export function requireEqualRevision(left: ExactGitRevision, right: ExactGitRevision): void {
  if (stableJson(left) !== stableJson(right)) {
    throw identityMismatch("applyAndRegenerate", "Baseline revision identity differs.");
  }
}

function validatePathRule(rule: ArtifactPathRule): void {
  const normalized = posix.normalize(rule.path);
  if (
    rule.path.includes("\\") ||
    rule.path.includes("\0") ||
    posix.isAbsolute(rule.path) ||
    normalized !== rule.path ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.split("/").includes(".git") ||
    (normalized === "." && rule.kind !== "Tree")
  ) {
    throw invalidInput("pathMapping", `Invalid ${rule.kind} path rule: ${rule.path}`);
  }
}

function matchesRule(rule: ArtifactPathRule, path: string): boolean {
  return rule.kind === "Exact"
    ? rule.path === path
    : rule.path === "." || path === rule.path || path.startsWith(`${rule.path}/`);
}

function parseNameStatus(bytes: Uint8Array): readonly ChangedPath[] {
  const fields = splitNul(bytes);
  if (fields.length % 2 !== 0) {
    throw identityMismatch("readChangedPaths", "Malformed NUL-delimited Git status.");
  }
  const changes: ChangedPath[] = [];
  for (let index = 0; index < fields.length; index += 2) {
    const status = decodeGitText(fields[index] ?? new Uint8Array(), "readChangedPaths");
    const path = decodeGitText(fields[index + 1] ?? new Uint8Array(), "readChangedPaths");
    if (!/^[ADMT]$/u.test(status) || path.length === 0 || path.includes("\0")) {
      throw identityMismatch("readChangedPaths", "Unsupported Git status entry.");
    }
    changes.push({ path, status });
  }
  return changes;
}

function parseIndexedEntries(bytes: Uint8Array): readonly IndexedEntry[] {
  return splitNul(bytes).map((field) => {
    const value = decodeGitText(field, "readIndexedTree");
    const tab = value.indexOf("\t");
    const header = tab < 0 ? "" : value.slice(0, tab);
    const path = tab < 0 ? "" : value.slice(tab + 1);
    const match = /^(\d{6}) ([a-f0-9]{40}|[a-f0-9]{64}) 0$/u.exec(header);
    if (match === null || path.length === 0) {
      throw identityMismatch("readIndexedTree", "Malformed Git index entry.");
    }
    return { mode: match[1] ?? "", path };
  });
}

function splitNul(bytes: Uint8Array): readonly Uint8Array[] {
  if (bytes.byteLength === 0) {
    return [];
  }
  if (bytes[bytes.byteLength - 1] !== 0) {
    throw identityMismatch("parseGitOutput", "NUL-delimited Git output is truncated.");
  }
  const fields: Uint8Array[] = [];
  let start = 0;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (bytes[index] === 0) {
      fields.push(bytes.slice(start, index));
      start = index + 1;
    }
  }
  return fields;
}

function nulJoin(paths: readonly string[]): Uint8Array {
  const encoded = paths.map((path) => textEncoder.encode(path));
  const length = encoded.reduce((sum, entry) => sum + entry.byteLength + 1, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const entry of encoded) {
    result.set(entry, offset);
    offset += entry.byteLength + 1;
  }
  return result;
}

function allPathsIgnored(
  paths: readonly string[],
  mapping: ArtifactPathMapping | undefined
): boolean {
  return (
    paths.length === 0 ||
    (mapping !== undefined &&
      paths.every((path) => mapping.ignore.some((rule) => matchesRule(rule, path))))
  );
}
