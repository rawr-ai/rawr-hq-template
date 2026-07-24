import { isAbsolute } from "node:path";
import { URL } from "node:url";

import type {
  ContentWorkspaceFailure,
  ContentWorkspaceGitReadAsyncPort,
} from "@rawr/resource-content-workspace";

import {
  createExactGitBlobPointer,
  type GitBlobSelection,
  type GitLocator,
} from "../dto/current-main-git";
import {
  type CanonicalRef,
  parseCommit,
  parseRepository,
  parseTree,
} from "../dto/current-main-primitives";
import type {
  ExactGitReader,
  GitBlobReadResult,
  GitReadFailureCode,
  RepositoryInspection,
} from "./current-main-exact-git";

const MAX_GIT_BLOB_BYTES = 128 * 1024 * 1024;
export type ResourceExactGitReadPort = Pick<
  ContentWorkspaceGitReadAsyncPort,
  "inspectGitRef" | "readGitBlobAtPath" | "isLocalGitAncestor"
>;

/** Projects exact local Git mechanics into the shared current-main reader. */
export function createResourceExactGitReader(
  binding: Readonly<{
    contentWorkspace: ResourceExactGitReadPort;
  }>
): ExactGitReader {
  const reader: ExactGitReader = {
    inspect: (locator, canonicalRef) => inspect(binding.contentWorkspace, locator, canonicalRef),
    readFileAtRevision: (locator, selection) =>
      readFileAtRevision(binding.contentWorkspace, locator, selection),
    isAncestor: (locator, ancestorCommit, descendantCommit) =>
      binding.contentWorkspace.isLocalGitAncestor({
        root: locator.workspacePath,
        ancestorCommit,
        descendantCommit,
      }),
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
    const observed = await port.inspectGitRef({
      locator: locator.workspacePath,
      remoteSelection: { kind: "All" },
      refName: canonicalRef,
    });
    const repositoryIdentity = exactRepositoryIdentity(
      observed.remoteUrls,
      locator.expectedRepositoryIdentity
    );
    if (repositoryIdentity !== locator.expectedRepositoryIdentity) {
      return {
        kind: "WrongRepository",
        actualRepositoryIdentity: repositoryIdentity,
      };
    }
    if (observed.refName !== canonicalRef) {
      return {
        kind: "UnreachableRepository",
        reason: "Git provider observed another canonical ref",
      };
    }
    const headCommit = parseCommit(observed.commit, "inspection.headCommit");
    const headTree = parseTree(observed.tree, "inspection.headTree");
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
    return {
      kind: "UnreachableRepository",
      reason: resourceFailureMessage(error),
    };
  }
}

async function readFileAtRevision(
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
    const observedRef = await port.inspectGitRef({
      locator: locator.workspacePath,
      remoteSelection: { kind: "All" },
      refName: selection.ref,
    });
    if (
      exactRepositoryIdentity(observedRef.remoteUrls, selection.repositoryIdentity) !==
      selection.repositoryIdentity
    ) {
      return readFailure(
        "WrongObject",
        "Git object selection belongs to another repository identity"
      );
    }
    const observed = await port.readGitBlobAtPath({
      root: observedRef.root,
      refName: selection.ref,
      commit: selection.commit,
      tree: selection.tree,
      path: selection.path,
      maxBytes: MAX_GIT_BLOB_BYTES,
    });
    if (observed.refCommit !== selection.commit) {
      return readFailure("WrongObject", "Selected Git ref resolves to another commit");
    }
    if (observed.commit !== selection.commit || observed.tree !== selection.tree) {
      return readFailure("WrongObject", "Git provider returned bytes for another commit or tree");
    }
    const pointer = createExactGitBlobPointer({
      ...selection,
      blob: observed.blob,
    });
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

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
