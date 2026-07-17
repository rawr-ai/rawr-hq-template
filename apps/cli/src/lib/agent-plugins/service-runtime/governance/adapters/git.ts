import { isAbsolute } from "node:path";

import {
  createExactGitBlobPointer,
  sameGitSelection,
  type GitBlobSelection,
  type GitLocator,
} from "@rawr/agent-plugin-lifecycle/ports/governance";
import {
  parseCanonicalRef,
  parseCommit,
  parseRelativePath,
  parseRepository,
  parseTree,
  sortCanonical,
} from "@rawr/agent-plugin-lifecycle/ports/governance";
import type {
  ExactGitReader,
  GitBlobReadResult,
  GitBooleanReadResult,
  GitChangedPathsResult,
  RepositoryInspection,
} from "@rawr/agent-plugin-lifecycle/ports/governance";

export interface ReadOnlyGitBackend {
  readonly inspect: (
    workspacePath: string,
    canonicalRef: string,
    expectedRepositoryIdentity: string,
  ) => Promise<unknown>;
  readonly readBlob: (workspacePath: string, selection: GitBlobSelection) => Promise<unknown>;
  readonly isAncestor: (workspacePath: string, ancestor: string, descendant: string) => Promise<unknown>;
  readonly listChangedPaths: (workspacePath: string, from: string, to: string) => Promise<unknown>;
}

const MAX_GIT_BLOB_BYTES = 128 * 1024 * 1024;
const MAX_CHANGED_PATHS = 65_536;

export function createReadOnlyGitAdapter(backend: ReadOnlyGitBackend): ExactGitReader {
  const reader: ExactGitReader = {
    inspect: async (locator, canonicalRef) => {
      const locatorFailure = validateLocator(locator);
      if (locatorFailure !== undefined) return locatorFailure;
      try {
        return parseInspection(
          await backend.inspect(locator.workspacePath, canonicalRef, locator.expectedRepositoryIdentity),
          locator,
          canonicalRef,
        );
      } catch (error) {
        return { kind: "UnreachableRepository", reason: errorMessage(error) };
      }
    },
    readBlob: async (locator, selection) => {
      const locatorFailure = validateLocator(locator);
      if (locatorFailure !== undefined) {
        return readFailure("ReadFailed", `Invalid explicit Git locator: ${locatorFailure.kind}`);
      }
      try {
        return parseBlobObservation(await backend.readBlob(locator.workspacePath, selection), selection);
      } catch (error) {
        return readFailure("ReadFailed", errorMessage(error));
      }
    },
    isAncestor: async (locator, ancestor, descendant) => {
      const locatorFailure = validateLocator(locator);
      if (locatorFailure !== undefined) return booleanFailure(`Invalid explicit Git locator: ${locatorFailure.kind}`);
      try {
        const value = await backend.isAncestor(locator.workspacePath, ancestor, descendant);
        return typeof value === "boolean"
          ? { ok: true, value }
          : booleanFailure("Git backend returned a non-boolean reachability result");
      } catch (error) {
        return booleanFailure(errorMessage(error));
      }
    },
    listChangedPaths: async (locator, from, to) => {
      const locatorFailure = validateLocator(locator);
      if (locatorFailure !== undefined) return changedPathsFailure(`Invalid explicit Git locator: ${locatorFailure.kind}`);
      try {
        return parseChangedPaths(await backend.listChangedPaths(locator.workspacePath, from, to));
      } catch (error) {
        return changedPathsFailure(errorMessage(error));
      }
    },
  };
  return Object.freeze(reader);
}

function parseInspection(
  input: unknown,
  locator: GitLocator,
  expectedRef: string,
): RepositoryInspection {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { kind: "UnreachableRepository", reason: "Git backend returned an invalid inspection" };
  }
  const record = input as Record<string, unknown>;
  if (record.kind === "DirtyRepository" && exactKeys(record, ["kind"])) return { kind: "DirtyRepository" };
  if (
    record.kind === "WrongRepository"
    && exactKeys(record, ["actualRepositoryIdentity", "kind"])
    && typeof record.actualRepositoryIdentity === "string"
  ) {
    return { kind: "WrongRepository", actualRepositoryIdentity: record.actualRepositoryIdentity };
  }
  if (
    record.kind === "UnreachableRepository"
    && exactKeys(record, ["kind", "reason"])
    && typeof record.reason === "string"
  ) {
    return { kind: "UnreachableRepository", reason: record.reason };
  }
  if (!exactKeys(record, ["canonicalRef", "headCommit", "headTree", "kind", "repositoryIdentity"]) || record.kind !== "Ready") {
    return { kind: "UnreachableRepository", reason: "Git backend returned an invalid ready inspection" };
  }
  const repositoryIdentity = parseRepository(record.repositoryIdentity, "inspection.repositoryIdentity");
  const canonicalRef = parseCanonicalRef(record.canonicalRef, "inspection.canonicalRef");
  const headCommit = parseCommit(record.headCommit, "inspection.headCommit");
  const headTree = parseTree(record.headTree, "inspection.headTree");
  if (!repositoryIdentity.ok || !canonicalRef.ok || !headCommit.ok || !headTree.ok) {
    return { kind: "UnreachableRepository", reason: "Git backend returned noncanonical repository identities" };
  }
  if (repositoryIdentity.value !== locator.expectedRepositoryIdentity) {
    return { kind: "WrongRepository", actualRepositoryIdentity: repositoryIdentity.value };
  }
  if (canonicalRef.value !== expectedRef) {
    return { kind: "UnreachableRepository", reason: "Git backend resolved another canonical ref" };
  }
  return {
    kind: "Ready",
    repositoryIdentity: repositoryIdentity.value,
    canonicalRef: canonicalRef.value,
    headCommit: headCommit.value,
    headTree: headTree.value,
  };
}

function parseBlobObservation(input: unknown, selection: GitBlobSelection): GitBlobReadResult {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return readFailure("ReadFailed", "Git backend returned an invalid blob observation");
  }
  const record = input as Record<string, unknown>;
  if (!exactKeys(record, ["bytes", "pointer"]) || !(record.bytes instanceof Uint8Array)) {
    return readFailure("ReadFailed", "Git backend blob observation must contain exact pointer and bytes");
  }
  if (record.bytes.byteLength > MAX_GIT_BLOB_BYTES) {
    return readFailure("ObjectTooLarge", "Git blob exceeds the promotion verifier bound");
  }
  const pointer = createExactGitBlobPointer(record.pointer);
  if (!pointer.ok) return readFailure("WrongObject", "Git backend returned a noncanonical object identity");
  if (!sameGitSelection(pointer.value, selection)) {
    return readFailure("WrongObject", "Git backend returned bytes for another repository/ref/commit/tree/path");
  }
  return {
    ok: true,
    observation: Object.freeze({ pointer: pointer.value, bytes: new Uint8Array(record.bytes) }),
  };
}

function parseChangedPaths(input: unknown): GitChangedPathsResult {
  if (!Array.isArray(input)) return changedPathsFailure("Git backend returned a non-array changed-path result");
  if (input.length > MAX_CHANGED_PATHS) return changedPathsFailure("Changed-path result exceeds its protocol bound");
  const parsed = input.map((value, index) => parseRelativePath(value, `changedPaths[${index}]`));
  if (parsed.some((result) => !result.ok)) return changedPathsFailure("Changed-path result contains a noncanonical path");
  const paths = sortCanonical(parsed.flatMap((result) => result.ok ? [result.value] : []), (value) => value);
  if (paths.some((value, index) => index > 0 && value === paths[index - 1])) {
    return changedPathsFailure("Changed-path result contains duplicate identities");
  }
  return { ok: true, paths };
}

function validateLocator(locator: GitLocator): RepositoryInspection | undefined {
  if (!isAbsolute(locator.workspacePath)) {
    return { kind: "UnreachableRepository", reason: "Git locator must be an explicit absolute workspace path" };
  }
  return undefined;
}

function exactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function readFailure(code: "ObjectTooLarge" | "ReadFailed" | "WrongObject", message: string): GitBlobReadResult {
  return { ok: false, failure: { code, message } };
}

function booleanFailure(message: string): GitBooleanReadResult {
  return { ok: false, failure: { code: "ReadFailed", message } };
}

function changedPathsFailure(message: string): GitChangedPathsResult {
  return { ok: false, failure: { code: "ReadFailed", message } };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
