import { isAbsolute } from "node:path";
import { URL } from "node:url";

import type {
  ContentWorkspaceFailure,
  ContentWorkspaceGitReadAsyncPort,
  GitWorkspaceAnchor,
} from "@rawr/resource-content-workspace";

import {
  createExactGitBlobPointer,
  type GitBlobSelection,
  type GitLocator,
} from "../model/dto/git";
import {
  parseCommit,
  parseRepository,
  parseTree,
  type CanonicalRef,
  type GitCommitId,
} from "../model/dto/primitives";
import type {
  ExactGitReader,
  GitBlobReadResult,
  GitBooleanReadResult,
  GitReadFailureCode,
  RepositoryInspection,
} from "../model/repositories/exact-git";

const MAX_GIT_BLOB_BYTES = 128 * 1024 * 1024;
const MAX_GIT_EVIDENCE_BYTES = 64 * 1024 * 1024;
export type ResourceExactGitReadPort = Pick<
  ContentWorkspaceGitReadAsyncPort,
  "inspectGitWorkspace" | "captureGitWorkspaceEvidence" | "readGitBlobAtPath" | "isLocalGitAncestor"
>;

/** Projects exact local Git mechanics into the governance module's semantic reader. */
export function createResourceExactGitReader(
  binding: Readonly<{
    contentWorkspace: ResourceExactGitReadPort;
  }>
): ExactGitReader {
  const reader: ExactGitReader = {
    inspect: (locator, canonicalRef) => inspect(binding.contentWorkspace, locator, canonicalRef),
    readBlob: (locator, selection) => readBlob(binding.contentWorkspace, locator, selection),
    isAncestor: (locator, ancestor, descendant) =>
      isAncestor(binding.contentWorkspace, locator, ancestor, descendant),
  };
  return Object.freeze(reader);
}

async function inspect(
  port: ResourceExactGitReadPort,
  locator: GitLocator,
  canonicalRef: CanonicalRef
): Promise<RepositoryInspection> {
  if (!isAbsolute(locator.workspacePath)) {
    return {
      kind: "UnreachableRepository",
      reason: "Git locator must be an explicit absolute workspace path",
    };
  }
  try {
    const anchor = await port.inspectGitWorkspace({
      locator: locator.workspacePath,
      remoteSelection: { kind: "All" },
      refName: canonicalRef,
    });
    const repositoryIdentity = exactRepositoryIdentity(
      anchor.remoteUrls,
      locator.expectedRepositoryIdentity
    );
    if (repositoryIdentity !== locator.expectedRepositoryIdentity) {
      return { kind: "WrongRepository", actualRepositoryIdentity: repositoryIdentity };
    }
    if (anchor.refName !== canonicalRef || anchor.refCommit !== anchor.commit) {
      return {
        kind: "UnreachableRepository",
        reason: "Workspace HEAD does not select the requested canonical ref",
      };
    }
    const evidence = await port.captureGitWorkspaceEvidence({
      root: anchor.root,
      remoteSelection: { kind: "All" },
      refName: canonicalRef,
      admittedPaths: [],
      consumedRoots: [],
      objectFormat: anchor.objectFormat,
      maxPaths: 1,
      maxWorktreeFileBytes: MAX_GIT_EVIDENCE_BYTES,
      maxWorktreeBytes: MAX_GIT_EVIDENCE_BYTES,
      maxBytes: MAX_GIT_EVIDENCE_BYTES,
    });
    if (
      !sameAnchor(anchor, evidence.openingAnchor) ||
      !sameAnchor(evidence.openingAnchor, evidence.closingAnchor) ||
      !equalBytes(evidence.openingStatus, evidence.closingStatus) ||
      !equalBytes(evidence.openingTrackedFlags, evidence.closingTrackedFlags)
    ) {
      return { kind: "UnreachableRepository", reason: "Repository changed during inspection" };
    }
    if (hasDirtyStatus(evidence.closingStatus)) return { kind: "DirtyRepository" };
    const headCommit = parseCommit(anchor.commit, "inspection.headCommit");
    const headTree = parseTree(anchor.tree, "inspection.headTree");
    if (!headCommit.ok || !headTree.ok) {
      return {
        kind: "UnreachableRepository",
        reason: "Git provider returned noncanonical object identities",
      };
    }
    return {
      kind: "Ready",
      repositoryIdentity: locator.expectedRepositoryIdentity,
      canonicalRef,
      headCommit: headCommit.value,
      headTree: headTree.value,
    };
  } catch (error) {
    return { kind: "UnreachableRepository", reason: resourceFailureMessage(error) };
  }
}

async function readBlob(
  port: ResourceExactGitReadPort,
  locator: GitLocator,
  selection: GitBlobSelection
): Promise<GitBlobReadResult> {
  if (!isAbsolute(locator.workspacePath)) {
    return readFailure("ReadFailed", "Git locator must be an explicit absolute workspace path");
  }
  if (selection.repositoryIdentity !== locator.expectedRepositoryIdentity) {
    return readFailure(
      "WrongObject",
      "Git object selection does not belong to the explicit repository locator"
    );
  }
  try {
    const anchor = await port.inspectGitWorkspace({
      locator: locator.workspacePath,
      remoteSelection: { kind: "All" },
      refName: selection.ref,
    });
    if (anchor.refName !== selection.ref) {
      return readFailure(
        "UnreachableObject",
        "Workspace HEAD does not select the requested Git ref"
      );
    }
    if (
      exactRepositoryIdentity(anchor.remoteUrls, selection.repositoryIdentity) !==
      selection.repositoryIdentity
    ) {
      return readFailure(
        "WrongObject",
        "Git object selection belongs to another repository identity"
      );
    }
    const observed = await port.readGitBlobAtPath({
      root: anchor.root,
      refName: selection.ref,
      commit: selection.commit,
      tree: selection.tree,
      path: selection.path,
      maxBytes: MAX_GIT_BLOB_BYTES,
    });
    if (observed.refCommit !== anchor.refCommit) {
      return readFailure("UnreachableObject", "Selected Git ref changed during object observation");
    }
    if (observed.commit !== selection.commit || observed.tree !== selection.tree) {
      return readFailure("WrongObject", "Git provider returned bytes for another commit or tree");
    }
    const pointer = createExactGitBlobPointer({ ...selection, blob: observed.blob });
    if (!pointer.ok)
      return readFailure("WrongObject", "Git provider returned a noncanonical blob identity");
    if (observed.bytes.byteLength > MAX_GIT_BLOB_BYTES) {
      return readFailure("ObjectTooLarge", "Git blob exceeds the governance read bound");
    }
    return {
      ok: true,
      observation: Object.freeze({
        pointer: pointer.value,
        bytes: new Uint8Array(observed.bytes),
      }),
    };
  } catch (error) {
    return readFailure(resourceFailureCode(error), resourceFailureMessage(error));
  }
}

async function isAncestor(
  port: ResourceExactGitReadPort,
  locator: GitLocator,
  ancestor: GitCommitId,
  descendant: GitCommitId
): Promise<GitBooleanReadResult> {
  if (!isAbsolute(locator.workspacePath)) {
    return booleanFailure("Git locator must be an explicit absolute workspace path");
  }
  try {
    return {
      ok: true,
      value: await port.isLocalGitAncestor({
        root: locator.workspacePath,
        ancestorCommit: ancestor,
        descendantCommit: descendant,
      }),
    };
  } catch (error) {
    return booleanFailure(resourceFailureMessage(error));
  }
}

function exactRepositoryIdentity(remoteUrls: readonly string[], expected: string): string {
  const observed = remoteUrls.map(
    (remoteUrl) => repositoryIdentityFromRemote(remoteUrl) ?? remoteUrl
  );
  if (observed.includes(expected)) return expected;
  const unique = [...new Set(observed)].sort(compareText);
  return unique.length === 1 ? unique[0]! : "unresolved:multiple-or-missing-remotes";
}

function repositoryIdentityFromRemote(remoteUrl: string): string | undefined {
  if (remoteUrl.startsWith("git:") && !remoteUrl.startsWith("git://")) {
    const parsed = parseRepository(remoteUrl, "remoteUrl");
    return parsed.ok ? parsed.value : undefined;
  }

  const scp = /^(?:[^@/:]+@)?([a-z0-9.-]+):([a-z0-9][a-z0-9._~/-]*)$/iu.exec(remoteUrl);
  if (scp !== null) return canonicalGitRepositoryIdentity(scp[1]!, scp[2]!);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(remoteUrl);
  } catch {
    return undefined;
  }
  if (
    !["git:", "http:", "https:", "ssh:"].includes(parsedUrl.protocol) ||
    parsedUrl.hostname.length === 0 ||
    parsedUrl.password.length > 0 ||
    parsedUrl.port.length > 0 ||
    parsedUrl.search.length > 0 ||
    parsedUrl.hash.length > 0
  ) {
    return undefined;
  }
  return canonicalGitRepositoryIdentity(parsedUrl.hostname, parsedUrl.pathname);
}

function canonicalGitRepositoryIdentity(host: string, rawPath: string): string | undefined {
  const path = rawPath.replace(/^\/+|\/+$/gu, "").replace(/\.git$/u, "");
  if (path.length === 0) return undefined;
  const parsed = parseRepository(`git:${host.toLowerCase()}/${path}`, "remoteUrl");
  return parsed.ok ? parsed.value : undefined;
}

function hasDirtyStatus(bytes: Uint8Array): boolean {
  return decodeNul(bytes).some(
    (record) =>
      record.startsWith("1 ") ||
      record.startsWith("2 ") ||
      record.startsWith("u ") ||
      record.startsWith("? ")
  );
}

function sameAnchor(left: GitWorkspaceAnchor, right: GitWorkspaceAnchor): boolean {
  return (
    left.root === right.root &&
    left.rootDevice === right.rootDevice &&
    left.rootInode === right.rootInode &&
    left.objectFormat === right.objectFormat &&
    left.refName === right.refName &&
    left.commit === right.commit &&
    left.refCommit === right.refCommit &&
    left.tree === right.tree &&
    left.remoteUrls.length === right.remoteUrls.length &&
    left.remoteUrls.every((url, index) => url === right.remoteUrls[index])
  );
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

function decodeNul(bytes: Uint8Array): readonly string[] {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const values: string[] = [];
  let start = 0;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (bytes[index] !== 0) continue;
    if (index > start) values.push(decoder.decode(bytes.slice(start, index)));
    start = index + 1;
  }
  if (start !== bytes.byteLength) throw new Error("Git -z output lacks a trailing NUL");
  return Object.freeze(values);
}

function resourceFailureCode(error: unknown): GitReadFailureCode {
  if (!isContentWorkspaceFailure(error)) return "ReadFailed";
  if (error.reason === "Missing") return "MissingObject";
  if (error.reason === "LimitExceeded") return "ObjectTooLarge";
  if (error.reason === "IdentityChanged") return "WrongObject";
  return "ReadFailed";
}

function resourceFailureMessage(error: unknown): string {
  return isContentWorkspaceFailure(error)
    ? error.detail
    : error instanceof Error
      ? error.message
      : String(error);
}

function isContentWorkspaceFailure(error: unknown): error is ContentWorkspaceFailure {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    error._tag === "ContentWorkspaceFailure"
  );
}

function readFailure(code: GitReadFailureCode, message: string): GitBlobReadResult {
  return { ok: false, failure: { code, message } };
}

function booleanFailure(message: string): GitBooleanReadResult {
  return { ok: false, failure: { code: "ReadFailed", message } };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
