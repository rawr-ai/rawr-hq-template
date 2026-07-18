import {
  createExactGitBlobPointer,
  type ExactGitBlobPointer,
  type GitLocator,
} from "./git";
import { parseRepository } from "./primitives";

export interface GitLocatorInput {
  readonly workspacePath: string;
  readonly expectedRepositoryIdentity: string;
}

export interface ExactGitBlobPointerInput {
  readonly repositoryIdentity: string;
  readonly ref: string;
  readonly commit: string;
  readonly tree: string;
  readonly path: string;
  readonly blob: string;
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

export function decodeAcceptancePointers(input: Readonly<{
  locator: GitLocatorInput;
  policyObject: ExactGitBlobPointerInput;
  requestObject: ExactGitBlobPointerInput;
  acceptanceObject: ExactGitBlobPointerInput;
}>): GovernanceBoundaryResult<Readonly<{
  locator: GitLocator;
  policyObject: ExactGitBlobPointer;
  requestObject: ExactGitBlobPointer;
  acceptanceObject: ExactGitBlobPointer;
}>> {
  const locator = decodeGitLocator(input.locator);
  const policyObject = decodeGitPointer(input.policyObject);
  const requestObject = decodeGitPointer(input.requestObject);
  const acceptanceObject = decodeGitPointer(input.acceptanceObject);
  if (!locator.ok || !policyObject.ok || !requestObject.ok || !acceptanceObject.ok) {
    const reasons: string[] = [];
    if (!locator.ok) reasons.push(locator.reason);
    if (!policyObject.ok) reasons.push(policyObject.reason);
    if (!requestObject.ok) reasons.push(requestObject.reason);
    if (!acceptanceObject.ok) reasons.push(acceptanceObject.reason);
    return { ok: false, reason: reasons.join("; ") };
  }
  return {
    ok: true,
    value: Object.freeze({
      locator: locator.value,
      policyObject: policyObject.value,
      requestObject: requestObject.value,
      acceptanceObject: acceptanceObject.value,
    }),
  };
}
