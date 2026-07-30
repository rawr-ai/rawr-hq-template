import { ReadonlyObject, Refine, type Static, Type } from "typebox";
import { NormalizedFileModeSchema } from "./agent-plugin-payload";
import { type ReleaseDerivationSource, ReleaseDerivationSourceSchema } from "./release-derivation";
import {
  ContentAuthoritySchema,
  GitCommitIdSchema,
  GitObjectIdSchema,
  GitTreeIdSchema,
  ReleaseRelativePathSchema,
  RepositoryIdentitySchema,
} from "./release-identity";
import { NonEmptyReadonlyArray } from "./structural";

/** Maximum detail length admitted for one clean-source eligibility issue. */
export const MAX_SOURCE_ELIGIBILITY_ISSUE_DETAIL_LENGTH = 4_096;

/** Maximum regular Git tree entries admitted into one clean content snapshot. */
export const MAX_CLEAN_CONTENT_TREE_ENTRIES = 200_000;

const TRUNCATED_SOURCE_ELIGIBILITY_DETAIL_SUFFIX = "...[truncated]";

/** Admits one canonical non-root absolute content-workspace locator. */
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

/** Admits one canonical Git remote name used by content-workspace policy. */
export const RemoteNameSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$",
});

/** Admits one bounded Git remote URL without control characters. */
export const RemoteUrlSchema = Type.String({
  minLength: 1,
  maxLength: 512,
  pattern: "^[^\\u0000-\\u001f\\u007f]+$",
});

/** Admits one canonical fully qualified Git branch ref. */
export const QualifiedHeadRefSchema = Refine(
  Type.String({
    minLength: "refs/heads/a".length,
    maxLength: 512,
    pattern: "^refs/heads/[^\\u0000-\\u0020~^:?*\\\\[]+$",
  }),
  isCanonicalHeadRef,
  () => "Expected a canonical fully qualified branch ref"
);

/** Admits one SHA-256 binding over an exact content-workspace observation. */
export const WorkspaceBindingSchema = Type.String({
  minLength: 64,
  maxLength: 64,
  pattern: "^[0-9a-f]{64}$",
});

/** Defines the caller-selected clean content-workspace policy. */
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

/** TypeBox-derived caller policy for one clean content workspace. */
export type ContentWorkspacePolicy = Static<typeof ContentWorkspacePolicySchema>;

/** Enumerates stable diagnostic codes emitted by clean content-workspace policy. */
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

/** Defines one bounded diagnostic emitted while inspecting a clean workspace. */
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

/** TypeBox-derived clean content-workspace diagnostic code. */
export type SourceEligibilityIssueCode = Static<typeof SourceEligibilityIssueCodeSchema>;

/** TypeBox-derived clean content-workspace diagnostic. */
export type SourceEligibilityIssue = Static<typeof SourceEligibilityIssueSchema>;

const SourceEligibilityIssuesSchema = NonEmptyReadonlyArray(SourceEligibilityIssueSchema, {
  maxItems: MAX_CLEAN_CONTENT_TREE_ENTRIES,
});

const ContentWorkspaceObjectBindingSchema = ReadonlyObject(
  Type.Object({
    path: ReleaseRelativePathSchema,
    objectId: GitObjectIdSchema,
    mode: NormalizedFileModeSchema,
  }),
  { additionalProperties: false }
);

/**
 * Defines an exact clean content snapshot shared by lifecycle capability modules.
 *
 * The release-derivation fields are reused directly so the snapshot cannot
 * drift from the source facts consumed by release construction.
 */
export const ContentWorkspaceSnapshotSchema = ReadonlyObject(
  Type.Object({
    ...ReleaseDerivationSourceSchema.properties,
    objectBindings: ReadonlyObject(Type.Array(ContentWorkspaceObjectBindingSchema), {
      maxItems: MAX_CLEAN_CONTENT_TREE_ENTRIES,
    }),
    eligibilityBinding: WorkspaceBindingSchema,
  }),
  { additionalProperties: false }
);

/** TypeBox-derived exact clean content-workspace snapshot. */
export type ContentWorkspaceSnapshot = Static<typeof ContentWorkspaceSnapshotSchema> &
  Pick<ReleaseDerivationSource, "releaseInput" | "payloads">;

/** Defines either an eligible clean snapshot or a nonempty list of bounded issues. */
export const ContentWorkspaceInspectionSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("Eligible"),
      snapshot: ContentWorkspaceSnapshotSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("Ineligible"),
      issues: SourceEligibilityIssuesSchema,
    }),
    { additionalProperties: false }
  ),
]);

type ContentWorkspaceInspectionShape = Static<typeof ContentWorkspaceInspectionSchema>;

/** TypeBox-derived result of one clean content-workspace inspection. */
export type ContentWorkspaceInspection =
  | (Extract<ContentWorkspaceInspectionShape, { readonly kind: "Eligible" }> &
      Readonly<{ snapshot: ContentWorkspaceSnapshot }>)
  | Extract<ContentWorkspaceInspectionShape, { readonly kind: "Ineligible" }>;

/** Constructs one bounded clean-source eligibility diagnostic. */
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
