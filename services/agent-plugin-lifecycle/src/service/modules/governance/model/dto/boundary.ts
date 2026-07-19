import type { GitLocator } from "./git";
import { parseRepository } from "./primitives";

export interface GitLocatorInput {
  readonly workspacePath: string;
  readonly expectedRepositoryIdentity: string;
}

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
