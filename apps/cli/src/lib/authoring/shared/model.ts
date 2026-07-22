import path from "node:path";

declare const verifiedDestinationRootBrand: unique symbol;
declare const qualifiedRelativePathBrand: unique symbol;

export type VerifiedDestinationRoot = string & {
  readonly [verifiedDestinationRootBrand]: "VerifiedDestinationRoot";
};

export type QualifiedRelativePath = string & {
  readonly [qualifiedRelativePathBrand]: "QualifiedRelativePath";
};

export type QualifiedWrite = Readonly<{
  relativePath: QualifiedRelativePath;
  bytes: Uint8Array;
}>;

export type CompleteOrderedWritePlan = Readonly<{
  destinationRoot: VerifiedDestinationRoot;
  writes: readonly [QualifiedWrite, ...QualifiedWrite[]];
}>;

export type AuthoringPlanIssue = Readonly<{
  code:
    | "INVALID_DESTINATION"
    | "INVALID_PLAN"
    | "IDENTITY_COLLISION"
    | "PATH_COLLISION"
    | "PLAN_INSPECTION_FAILED";
  path: string;
  message: string;
}>;

export type NonEmptyAuthoringPlanIssues = readonly [AuthoringPlanIssue, ...AuthoringPlanIssue[]];

export type AuthoringWriteFailure = Readonly<{
  code: "PUBLICATION_FAILED" | "PUBLICATION_NOT_VERIFIED";
  path: QualifiedRelativePath;
  message: string;
}>;

export type NoAuthoringWrite = Readonly<{ kind: "NoWrite"; count: 0 }>;

export type AuthoringDryRun = Readonly<{
  kind: "AuthoringDryRun";
  plan: CompleteOrderedWritePlan;
  write: NoAuthoringWrite;
}>;

export type AuthoringConverged = Readonly<{
  kind: "AuthoringConverged";
  plan: CompleteOrderedWritePlan;
  write: NoAuthoringWrite;
}>;

export type AuthoringAuthored = Readonly<{
  kind: "AuthoringAuthored";
  plan: CompleteOrderedWritePlan;
  applied: readonly [QualifiedWrite, ...QualifiedWrite[]];
}>;

export type AuthoringFailed = Readonly<{
  kind: "AuthoringFailed";
  plan: CompleteOrderedWritePlan;
  applied: readonly [];
  failure: AuthoringWriteFailure;
}>;

export type AuthoringPartial = Readonly<{
  kind: "AuthoringPartial";
  plan: CompleteOrderedWritePlan;
  applied: readonly [QualifiedWrite, ...QualifiedWrite[]];
  failure: AuthoringWriteFailure;
}>;

export type AuthoringRejected = Readonly<{
  kind: "AuthoringRejected";
  issues: NonEmptyAuthoringPlanIssues;
  write: NoAuthoringWrite;
}>;

export type AuthoringExecutionResult =
  | AuthoringDryRun
  | AuthoringConverged
  | AuthoringAuthored
  | AuthoringFailed
  | AuthoringPartial
  | AuthoringRejected;

export const NO_AUTHORING_WRITE: NoAuthoringWrite = Object.freeze({ kind: "NoWrite", count: 0 });

export function verifiedDestinationRoot(root: string): VerifiedDestinationRoot {
  const resolved = path.resolve(root);
  if (!path.isAbsolute(root) || resolved !== root || resolved === path.parse(resolved).root) {
    throw new Error("Destination root must be a canonical absolute non-filesystem-root path");
  }
  return resolved as VerifiedDestinationRoot;
}

export function qualifiedRelativePath(input: string): QualifiedRelativePath {
  const normalized = path.posix.normalize(input);
  if (
    input.length === 0 ||
    input !== normalized ||
    input.startsWith("/") ||
    input.endsWith("/") ||
    input.includes("\\") ||
    input.split("/").some((segment) => segment === "" || segment === "." || segment === "..") ||
    /[\u0000-\u001f\u007f]/u.test(input)
  ) {
    throw new Error(`Authoring path is not a qualified relative path: ${input}`);
  }
  return input as QualifiedRelativePath;
}

export function qualifiedTextWrite(relativePath: string, text: string): QualifiedWrite {
  return qualifiedByteWrite(relativePath, new TextEncoder().encode(text));
}

export function qualifiedByteWrite(relativePath: string, bytes: Uint8Array): QualifiedWrite {
  return Object.freeze({
    relativePath: qualifiedRelativePath(relativePath),
    bytes: new Uint8Array(bytes),
  });
}

export function completeOrderedWritePlan(
  destinationRoot: VerifiedDestinationRoot,
  writes: readonly QualifiedWrite[]
): CompleteOrderedWritePlan {
  if (writes.length === 0) throw new Error("An authoring plan must contain at least one write");
  const ordered = [...writes].sort((left, right) =>
    left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0
  );
  const seen = new Set<string>();
  for (const write of ordered) {
    if (seen.has(write.relativePath))
      throw new Error(`Duplicate authoring path: ${write.relativePath}`);
    seen.add(write.relativePath);
  }
  return Object.freeze({
    destinationRoot,
    writes: Object.freeze(ordered) as readonly [QualifiedWrite, ...QualifiedWrite[]],
  });
}

export function rejectedAuthoringResult(issues: NonEmptyAuthoringPlanIssues): AuthoringRejected {
  return Object.freeze({
    kind: "AuthoringRejected",
    issues: Object.freeze([...issues]) as NonEmptyAuthoringPlanIssues,
    write: NO_AUTHORING_WRITE,
  });
}

export function authoringResultView(
  result: AuthoringExecutionResult
): Readonly<Record<string, unknown>> {
  if (result.kind === "AuthoringRejected") {
    return Object.freeze({ kind: result.kind, issues: result.issues, write: result.write });
  }
  const paths = result.plan.writes.map((write) => write.relativePath);
  if (result.kind === "AuthoringDryRun" || result.kind === "AuthoringConverged") {
    return Object.freeze({ kind: result.kind, paths, write: result.write });
  }
  const appliedPaths = result.applied.map((write) => write.relativePath);
  return result.kind === "AuthoringAuthored"
    ? Object.freeze({ kind: result.kind, paths, appliedPaths })
    : Object.freeze({ kind: result.kind, paths, appliedPaths, failure: result.failure });
}
