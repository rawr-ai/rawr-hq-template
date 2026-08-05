import type { GitLocator } from "../dto/current-main-git";
import type { CurrentMainSelectionLocator } from "../dto/current-main-selection";
import { MAX_CANONICAL_ABSOLUTE_PATH_BYTES } from "../dto/structural";
import { parseRepositoryIdentity } from "./release-identity";

const encoder = new TextEncoder();
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

export type GovernanceBoundaryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

export function decodeGitLocator(
  input: CurrentMainSelectionLocator
): GovernanceBoundaryResult<GitLocator> {
  if (!isCanonicalAbsolutePath(input.workspacePath)) {
    return {
      ok: false,
      reason: "locator.workspacePath must be a canonical non-root absolute path",
    };
  }
  const repository = parseRepositoryIdentity(
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

function isCanonicalAbsolutePath(value: string): boolean {
  return (
    value !== "/" &&
    value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.includes("//") &&
    !value.includes("\\") &&
    value.normalize("NFC") === value &&
    !CONTROL_CHARACTER_PATTERN.test(value) &&
    !value.split("/").some((segment) => segment === "." || segment === "..") &&
    encoder.encode(value).byteLength <= MAX_CANONICAL_ABSOLUTE_PATH_BYTES
  );
}
