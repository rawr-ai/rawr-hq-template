import { ReadonlyObject, type Static, Type } from "typebox";
import { GitLocatorSchema } from "./current-main-git";
import { ReleaseInputDigestSchema } from "./release-digest";
import {
  ContentAuthoritySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  RepositoryIdentitySchema,
} from "./release-identity";

export const CURRENT_MAIN_V3_SCHEMA_VERSION = 3 as const;
export const CURRENT_MAIN_V3_CHANNEL = "current-main" as const;
export const MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH = 4_096;

/** The explicit content workspace and repository identity inspected for current-main. */
export const CurrentMainSelectionLocatorSchema = GitLocatorSchema;

/** The complete repository-owned current-main channel selection. */
export const CanonicalChannelSelectionSchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(CURRENT_MAIN_V3_SCHEMA_VERSION),
    channel: Type.Literal(CURRENT_MAIN_V3_CHANNEL),
    contentAuthority: ContentAuthoritySchema,
    sourceRepositoryIdentity: RepositoryIdentitySchema,
    sourceRepositoryUrl: Type.String({
      minLength: 14,
      maxLength: 2_048,
      pattern: "^https://[^/?#]+/[^?#]+\\.git$",
    }),
    sourceRef: Type.String({
      minLength: "refs/tags/a".length,
      maxLength: 1_024,
      pattern: "^refs/tags/",
    }),
    contentCommit: GitCommitIdSchema,
    contentTree: GitTreeIdSchema,
    releaseInputDigest: ReleaseInputDigestSchema,
  }),
  { additionalProperties: false }
);

const selectionFailure = <const TKind extends string>(kind: TKind) =>
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal(kind),
      reason: Type.String({
        minLength: 1,
        maxLength: MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH,
      }),
    }),
    { additionalProperties: false }
  );

export const CurrentMainSelectionResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("CURRENT_ELIGIBLE"),
      selection: CanonicalChannelSelectionSchema,
    }),
    { additionalProperties: false }
  ),
  selectionFailure("WRONG_REPOSITORY"),
  selectionFailure("UNREACHABLE_REPOSITORY"),
  selectionFailure("STALE_RECORD"),
  selectionFailure("FORGED_RECORD"),
]);

/** TypeBox-derived content workspace and repository identity inspected for current-main. */
export type CurrentMainSelectionLocator = Static<typeof CurrentMainSelectionLocatorSchema>;

/** Governance-verified channel data consumed by lifecycle operations. */
export type CanonicalChannelSelection = Static<typeof CanonicalChannelSelectionSchema>;

export type CurrentMainSelectionResult = Static<typeof CurrentMainSelectionResultSchema>;

export type CurrentMainSelectionFailureKind = Exclude<
  CurrentMainSelectionResult["kind"],
  "CURRENT_ELIGIBLE"
>;
