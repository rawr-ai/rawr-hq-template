import { ReadonlyObject, Refine, type Static, Type } from "typebox";

import {
  type AgentPluginPayload,
  type AgentPluginReleaseInput,
  type ContentAuthority,
  ContentAuthoritySchema,
  type GitCommitId,
  GitCommitIdSchema,
  type GitTreeId,
  GitTreeIdSchema,
  type PluginId,
  type ReleaseRelativePath,
  ReleaseRelativePathSchema,
  type RepositoryIdentity,
  RepositoryIdentitySchema,
} from "../../../shared/release";

export const MAX_SOURCE_ELIGIBILITY_ISSUE_DETAIL_LENGTH = 4_096;

const TRUNCATED_SOURCE_ELIGIBILITY_DETAIL_SUFFIX = "...[truncated]";

export const CanonicalAbsoluteLocatorSchema = Refine(
  Type.String({
    minLength: 2,
    maxLength: 16_384,
    pattern:
      "^/(?!.*//)(?!.*(?:/\\.{1,2})(?:/|$))(?!.*\\\\)(?!.*[\\u0000-\\u001f\\u007f])[^/]+(?:/[^/]+)*$",
  }),
  isCanonicalAbsoluteLocator,
  () => "Expected a canonical non-root absolute workspace locator"
);

export const RemoteNameSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$",
});

export const RemoteUrlSchema = Type.String({
  minLength: 1,
  maxLength: 512,
  pattern: "^[^\\u0000-\\u001f\\u007f]+$",
});

export const QualifiedHeadRefSchema = Refine(
  Type.String({
    minLength: "refs/heads/a".length,
    maxLength: 512,
    pattern: "^refs/heads/[^\\u0000-\\u0020~^:?*\\\\[]+$",
  }),
  isCanonicalHeadRef,
  () => "Expected a canonical fully qualified branch ref"
);

export const ContentWorkspacePolicySchema = ReadonlyObject(
  Type.Object({
    locator: CanonicalAbsoluteLocatorSchema,
    repositoryIdentity: RepositoryIdentitySchema,
    contentAuthority: ContentAuthoritySchema,
    remoteName: RemoteNameSchema,
    remoteUrl: RemoteUrlSchema,
    refName: QualifiedHeadRefSchema,
    sourceCommit: GitCommitIdSchema,
    sourceTree: GitTreeIdSchema,
    releaseInputPath: ReleaseRelativePathSchema,
    pluginRoot: ReleaseRelativePathSchema,
  }),
  { additionalProperties: false }
);

export type ContentWorkspacePolicy = Static<typeof ContentWorkspacePolicySchema>;

export type StagedGitObjectFormat = "sha1" | "sha256";

export interface StagedWorkspaceAnchorObservation {
  readonly root: string;
  readonly rootDevice: string;
  readonly rootInode: string;
  readonly refName: string;
  readonly commit: string;
  readonly refCommit: string;
  readonly tree: string;
  readonly objectFormat: StagedGitObjectFormat;
  readonly remoteUrls: readonly string[];
}

export interface StagedIndexBindingObservation {
  readonly anchor: StagedWorkspaceAnchorObservation;
  readonly indexEntries: Uint8Array;
}

export interface StagedBlobObservation {
  readonly objectId: string;
  readonly bytes: Uint8Array;
}

export interface StagedIndexObservation {
  readonly opening: StagedIndexBindingObservation;
  readonly blobs: readonly StagedBlobObservation[];
  readonly closing: StagedIndexBindingObservation;
}

export interface StagedIndexObservationRequest {
  readonly locator: string;
  readonly remoteName: string;
  readonly refName: string;
  readonly materializedPaths: readonly string[];
  readonly materializedRoots: readonly string[];
  readonly maxEntries: number;
  readonly maxIndexBytes: number;
  readonly maxBlobBytes: number;
}

export type StagedObservationFailureReason =
  | "Aliased"
  | "InvalidInput"
  | "LimitExceeded"
  | "Unavailable";

export type StagedIndexObservationResult =
  | Readonly<{
      kind: "Observed";
      observation: StagedIndexObservation;
    }>
  | Readonly<{
      kind: "Failed";
      reason: StagedObservationFailureReason;
      detail: string;
    }>;

export interface ContentWorkspaceSnapshot {
  readonly repositoryIdentity: RepositoryIdentity;
  readonly sourceCommit: GitCommitId;
  readonly sourceTree: GitTreeId;
  readonly releaseInput: AgentPluginReleaseInput;
  readonly payloads: readonly Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>[];
  readonly objectBindings: readonly Readonly<{
    path: ReleaseRelativePath;
    objectId: string;
    mode: number;
  }>[];
  readonly eligibilityBinding: string;
}

export const SourceEligibilityIssueCodeSchema = Type.Union([
  Type.Literal("AliasedLocator"),
  Type.Literal("WrongRepository"),
  Type.Literal("WrongRef"),
  Type.Literal("WrongCommit"),
  Type.Literal("WrongTree"),
  Type.Literal("DirtyTrackedWorktree"),
  Type.Literal("DirtyIndex"),
  Type.Literal("UntrackedConsumedPath"),
  Type.Literal("IgnoredConsumedPath"),
  Type.Literal("InvalidTree"),
  Type.Literal("MissingReleaseInput"),
  Type.Literal("ReleaseInputMismatch"),
  Type.Literal("PayloadMismatch"),
  Type.Literal("GitFailure"),
  Type.Literal("SourceChanged"),
]);

export const SourceEligibilityIssueSchema = ReadonlyObject(
  Type.Object({
    code: SourceEligibilityIssueCodeSchema,
    detail: Type.String({
      minLength: 1,
      maxLength: MAX_SOURCE_ELIGIBILITY_ISSUE_DETAIL_LENGTH,
    }),
  }),
  { additionalProperties: false }
);

export type SourceEligibilityIssueCode = Static<typeof SourceEligibilityIssueCodeSchema>;
export type SourceEligibilityIssue = Static<typeof SourceEligibilityIssueSchema>;

export function sourceEligibilityIssue(
  code: SourceEligibilityIssueCode,
  detail: string
): SourceEligibilityIssue {
  const boundedDetail =
    detail.length <= MAX_SOURCE_ELIGIBILITY_ISSUE_DETAIL_LENGTH
      ? detail
      : `${detail.slice(
          0,
          MAX_SOURCE_ELIGIBILITY_ISSUE_DETAIL_LENGTH -
            TRUNCATED_SOURCE_ELIGIBILITY_DETAIL_SUFFIX.length
        )}${TRUNCATED_SOURCE_ELIGIBILITY_DETAIL_SUFFIX}`;
  return Object.freeze({ code, detail: boundedDetail });
}

export type ContentWorkspaceInspection =
  | Readonly<{ kind: "Eligible"; snapshot: ContentWorkspaceSnapshot }>
  | Readonly<{
      kind: "Ineligible";
      issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]];
    }>;

function isCanonicalAbsoluteLocator(value: string): boolean {
  if (
    value.length < 2 ||
    !value.startsWith("/") ||
    value.endsWith("/") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value)
  )
    return false;
  return value
    .split("/")
    .slice(1)
    .every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function isCanonicalHeadRef(value: string): boolean {
  return (
    value.startsWith("refs/heads/") &&
    value.length <= 512 &&
    !/[\u0000-\u0020~^:?*\\[]/u.test(value) &&
    !value.includes("..") &&
    !value.includes("@{") &&
    !value.endsWith("/") &&
    !value.endsWith(".") &&
    value
      .split("/")
      .every((part) => part !== "" && !part.startsWith(".") && !part.endsWith(".lock"))
  );
}
