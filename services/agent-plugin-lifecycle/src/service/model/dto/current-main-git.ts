import { ReadonlyObject, type Static, Type } from "typebox";
import { CanonicalAbsoluteLocatorSchema } from "./content-workspace";
import {
  GitCommitIdSchema,
  GitObjectIdSchema,
  GitTreeIdSchema,
  ReleaseRelativePathSchema,
  RepositoryIdentitySchema,
} from "./release-identity";

declare const canonicalRefBrand: unique symbol;
declare const gitBlobIdBrand: unique symbol;

type CanonicalRefBrand = string & {
  readonly [canonicalRefBrand]: "CanonicalRef";
};
type GitBlobIdBrand = string & { readonly [gitBlobIdBrand]: "GitBlobId" };

/** Identifies one qualified canonical branch or tag ref used by current-main selection. */
export const CanonicalRefSchema = Type.String({
  pattern: "^refs/(?:heads|tags)/[^\\u0000-\\u0020~^:?*\\\\[]+$",
});

/** Identifies the exact Git blob object read for a current-main selection. */
export const GitBlobIdSchema = GitObjectIdSchema;

/** Locates the expected logical repository behind one local content workspace. */
export const GitLocatorSchema = ReadonlyObject(
  Type.Object({
    workspacePath: CanonicalAbsoluteLocatorSchema,
    expectedRepositoryIdentity: RepositoryIdentitySchema,
  }),
  { additionalProperties: false }
);

/** Selects one exact path from a qualified Git ref, commit, and tree. */
export const GitBlobSelectionSchema = ReadonlyObject(
  Type.Object({
    repositoryIdentity: RepositoryIdentitySchema,
    ref: CanonicalRefSchema,
    commit: GitCommitIdSchema,
    tree: GitTreeIdSchema,
    path: ReleaseRelativePathSchema,
  }),
  { additionalProperties: false }
);

/** Binds one selected Git path to its exact blob object. */
export const ExactGitBlobPointerSchema = ReadonlyObject(
  Type.Object({
    ...GitBlobSelectionSchema.properties,
    blob: GitBlobIdSchema,
  }),
  { additionalProperties: false }
);

/** TypeBox-derived qualified canonical branch or tag ref. */
export type CanonicalRef = Static<typeof CanonicalRefSchema> & CanonicalRefBrand;

/** TypeBox-derived exact Git blob object identity. */
export type GitBlobId = Static<typeof GitBlobIdSchema> & GitBlobIdBrand;

/** TypeBox-derived content-workspace locator and expected repository identity. */
export type GitLocator = Static<typeof GitLocatorSchema>;

/** TypeBox-derived exact path selection from one Git ref, commit, and tree. */
export type GitBlobSelection = Static<typeof GitBlobSelectionSchema>;

/** TypeBox-derived selected Git path bound to its exact blob object. */
export type ExactGitBlobPointer = Static<typeof ExactGitBlobPointerSchema>;
