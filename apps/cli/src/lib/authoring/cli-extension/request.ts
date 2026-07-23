import path from "node:path";

import {
  isExternalExtensionIdentityIssue,
  parseExternalExtensionIdentity,
  type ExternalExtensionIdentity,
  type ExternalExtensionIdentityIssue,
} from "./identity";

export type ExternalExtensionAuthoringRequest = Readonly<{
  extensionId: ExternalExtensionIdentity;
  destination: string;
  operatorCwd: string;
  dryRun: boolean;
}>;

export type ExternalExtensionRequestResult =
  | Readonly<{ ok: true; value: ExternalExtensionAuthoringRequest }>
  | Readonly<{
      ok: false;
      issues: readonly [ExternalExtensionIdentityIssue, ...ExternalExtensionIdentityIssue[]];
    }>;

export function parseExternalExtensionAuthoringRequest(
  input: Readonly<{
    extensionId: unknown;
    destination: unknown;
    operatorCwd: unknown;
    dryRun: unknown;
  }>
): ExternalExtensionRequestResult {
  const extensionId = parseExternalExtensionIdentity(input.extensionId);
  const issues: ExternalExtensionIdentityIssue[] = [];
  if (isExternalExtensionIdentityIssue(extensionId)) issues.push(extensionId);
  if (typeof input.destination !== "string" || input.destination.length === 0) {
    issues.push(
      Object.freeze({
        path: "destination",
        message: "An explicit extension destination is required",
      })
    );
  }
  if (typeof input.operatorCwd !== "string" || input.operatorCwd.length === 0) {
    issues.push(Object.freeze({ path: "destination", message: "Operator cwd is required" }));
  }
  if (issues.length > 0 || isExternalExtensionIdentityIssue(extensionId)) {
    return Object.freeze({
      ok: false,
      issues: Object.freeze(issues) as readonly [
        ExternalExtensionIdentityIssue,
        ...ExternalExtensionIdentityIssue[],
      ],
    });
  }
  const destination = path.resolve(input.operatorCwd as string, input.destination as string);
  if (destination === path.parse(destination).root) {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([
        Object.freeze({
          path: "destination",
          message: "Filesystem root is not an extension destination",
        }),
      ]) as readonly [ExternalExtensionIdentityIssue],
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      extensionId,
      destination,
      operatorCwd: path.resolve(input.operatorCwd as string),
      dryRun: input.dryRun === true,
    }),
  });
}
