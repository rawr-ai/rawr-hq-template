import type { CurrentMainSelectionLocator } from "../../../../model/dto/current-main-selection";
import { isCanonicalAbsolutePath } from "../../../../model/dto/structural";
import type { GitLocator } from "./git";
import { parseRepository } from "./primitives";

export type GitLocatorInput = CurrentMainSelectionLocator;

export type GovernanceBoundaryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

export function decodeGitLocator(input: GitLocatorInput): GovernanceBoundaryResult<GitLocator> {
  if (!isCanonicalAbsolutePath(input.workspacePath)) {
    return {
      ok: false,
      reason: "locator.workspacePath must be a canonical non-root absolute path",
    };
  }
  const repository = parseRepository(
    input.expectedRepositoryIdentity,
    "locator.expectedRepositoryIdentity"
  );
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
