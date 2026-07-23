import { ReadonlyObject, Refine, type Static, Type } from "typebox";

import {
  CanonicalAbsoluteLocatorSchema,
  ContentAuthoritySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  RepositoryIdentitySchema,
} from "./releases/content-workspace";

const RELEASE_INPUT_DIGEST_PATTERN = "^ri1_[0-9a-f]{64}$";

export const CURRENT_MAIN_V3_SCHEMA_VERSION = 3 as const;
export const CURRENT_MAIN_V3_CHANNEL = "current-main" as const;
export const MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH = 4_096;

export const CurrentMainSelectionLocatorSchema = ReadonlyObject(
  Type.Object({
    workspacePath: CanonicalAbsoluteLocatorSchema,
    expectedRepositoryIdentity: RepositoryIdentitySchema,
  }),
  { additionalProperties: false }
);

/** The complete repository-owned current-main channel selection. */
export const CanonicalChannelSelectionSchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(CURRENT_MAIN_V3_SCHEMA_VERSION),
    channel: Type.Literal(CURRENT_MAIN_V3_CHANNEL),
    contentAuthority: ContentAuthoritySchema,
    sourceRepositoryIdentity: RepositoryIdentitySchema,
    sourceRepositoryUrl: Refine(
      Type.String({ minLength: 14, maxLength: 2_048 }),
      isCanonicalHttpsGitUrl,
      () => "Expected a canonical HTTPS Git repository URL"
    ),
    sourceRef: Refine(
      Type.String({ minLength: "refs/tags/a".length, maxLength: 1_024 }),
      isCanonicalTagRef,
      () => "Expected a canonical fully qualified Git tag ref"
    ),
    contentCommit: GitCommitIdSchema,
    contentTree: GitTreeIdSchema,
    releaseInputDigest: Type.String({ pattern: RELEASE_INPUT_DIGEST_PATTERN }),
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

/** The explicit content workspace and repository identity inspected for current-main. */
export type CurrentMainSelectionLocator = Static<typeof CurrentMainSelectionLocatorSchema>;

/** Governance-verified channel data consumed by lifecycle operations. */
export type CanonicalChannelSelection = Static<typeof CanonicalChannelSelectionSchema>;

export type CurrentMainSelectionResult = Static<typeof CurrentMainSelectionResultSchema>;

export type CurrentMainSelectionFailureKind = Exclude<
  CurrentMainSelectionResult["kind"],
  "CURRENT_ELIGIBLE"
>;

function isCanonicalTagRef(value: string): boolean {
  return (
    value.startsWith("refs/tags/") &&
    value.length <= 1_024 &&
    !/[\u0000-\u0020~^:?*\\[]/u.test(value) &&
    !value.includes("..") &&
    !value.includes("@{") &&
    !value.includes("//") &&
    !value.endsWith("/") &&
    !value.endsWith(".") &&
    value
      .split("/")
      .every((part) => part !== "" && !part.startsWith(".") && !part.endsWith(".lock"))
  );
}

function isCanonicalHttpsGitUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.port === "" &&
    parsed.search === "" &&
    parsed.hash === "" &&
    parsed.hostname === parsed.hostname.toLowerCase() &&
    parsed.pathname.startsWith("/") &&
    parsed.pathname.endsWith(".git") &&
    !parsed.pathname.includes("//") &&
    !parsed.pathname.split("/").some((part) => part === "." || part === "..") &&
    parsed.toString() === value
  );
}
