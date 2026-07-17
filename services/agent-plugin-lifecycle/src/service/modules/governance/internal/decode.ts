import {
  createExactGitBlobPointer,
  type ExactGitBlobPointer,
  type GitLocator,
} from "./domain/git";
import { parseRepository } from "./domain/primitives";
import type { ExactGitBlobPointerInput, GitLocatorInput } from "../schemas";

export type GovernanceBoundaryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

export function decodeGitLocator(input: GitLocatorInput): GovernanceBoundaryResult<GitLocator> {
  const repository = parseRepository(input.expectedRepositoryIdentity, "locator.expectedRepositoryIdentity");
  if (!repository.ok) {
    return {
      ok: false,
      reason: repository.issues.map((entry) => entry.message).join("; "),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      workspacePath: input.workspacePath,
      expectedRepositoryIdentity: repository.value,
    }),
  };
}

export function decodeGitPointer(
  input: ExactGitBlobPointerInput,
): GovernanceBoundaryResult<ExactGitBlobPointer> {
  const pointer = createExactGitBlobPointer(input);
  return pointer.ok
    ? { ok: true, value: pointer.value }
    : {
        ok: false,
        reason: pointer.issues.map((entry) => entry.message).join("; "),
      };
}
