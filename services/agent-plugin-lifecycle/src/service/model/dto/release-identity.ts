import { type Static, Type } from "typebox";

declare const contentAuthorityBrand: unique symbol;
declare const repositoryIdentityBrand: unique symbol;
declare const gitCommitIdBrand: unique symbol;
declare const gitTreeIdBrand: unique symbol;
declare const pluginIdBrand: unique symbol;
declare const ownershipIdentityBrand: unique symbol;
declare const releaseRelativePathBrand: unique symbol;

type ContentAuthorityBrand = string & { readonly [contentAuthorityBrand]: "ContentAuthority" };
type RepositoryIdentityBrand = string & {
  readonly [repositoryIdentityBrand]: "RepositoryIdentity";
};
type GitCommitIdBrand = string & { readonly [gitCommitIdBrand]: "GitCommitId" };
type GitTreeIdBrand = string & { readonly [gitTreeIdBrand]: "GitTreeId" };
type PluginIdBrand = string & { readonly [pluginIdBrand]: "PluginId" };
type OwnershipIdentityBrand = string & {
  readonly [ownershipIdentityBrand]: "OwnershipIdentity";
};
type ReleaseRelativePathBrand = string & {
  readonly [releaseRelativePathBrand]: "ReleaseRelativePath";
};

/** Bounds canonical identities before any release policy consumes them. */
export const MAX_CANONICAL_ID_BYTES = 512;

/** Bounds one canonical relative path carried by release-owned content. */
export const MAX_RELEASE_RELATIVE_PATH_BYTES = 1_024;

/** Identifies the curated content authority that owns one release input. */
export const ContentAuthoritySchema = Type.String({
  minLength: 1,
  maxLength: MAX_CANONICAL_ID_BYTES,
  pattern: "^[a-z0-9][a-z0-9._:-]*$",
});

/** Identifies a logical source repository without treating a local path as identity. */
export const RepositoryIdentitySchema = Type.String({
  minLength: 3,
  maxLength: MAX_CANONICAL_ID_BYTES,
  pattern:
    "^(?!file:)[a-z][a-z0-9+.-]*:[a-z0-9][a-z0-9._~-]*(?:/(?!\\.{1,2}(?:/|$))[a-z0-9._~-]+)*$",
});

/** Identifies one lowercase SHA-1 or SHA-256 Git object. */
export const GitObjectIdSchema = Type.String({
  minLength: 40,
  maxLength: 64,
  pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$",
});

/** Identifies the exact source commit admitted to release construction. */
export const GitCommitIdSchema = GitObjectIdSchema;

/** Identifies the exact source tree admitted to release construction. */
export const GitTreeIdSchema = GitObjectIdSchema;

/** Identifies one curated agent-plugin release member. */
export const PluginIdSchema = Type.String({
  minLength: 1,
  maxLength: MAX_CANONICAL_ID_BYTES,
  pattern: "^[a-z0-9][a-z0-9._-]*$",
});

/** Identifies one plugin, skill, or other declared ownership claim. */
export const OwnershipIdentitySchema = Type.String({
  minLength: 1,
  maxLength: MAX_CANONICAL_ID_BYTES,
  pattern: "^[a-z0-9@][a-z0-9@._:-]*(?:/(?!\\.{1,2}(?:/|$))[a-z0-9@._:-]+)*$",
});

/** Identifies one canonical POSIX path inside release-owned content. */
export const ReleaseRelativePathSchema = Type.String({
  minLength: 1,
  maxLength: MAX_RELEASE_RELATIVE_PATH_BYTES,
  pattern: "^(?!/)(?!.*(?:^|/)\\.{1,2}(?:/|$))(?!.*[\\\\:\\u0000-\\u001f\\u007f])[^/]+(?:/[^/]+)*$",
});

/** TypeBox-derived curated content-authority identity. */
export type ContentAuthority = Static<typeof ContentAuthoritySchema> & ContentAuthorityBrand;

/** TypeBox-derived logical repository identity. */
export type RepositoryIdentity = Static<typeof RepositoryIdentitySchema> & RepositoryIdentityBrand;

/** TypeBox-derived exact Git commit identity. */
export type GitCommitId = Static<typeof GitCommitIdSchema> & GitCommitIdBrand;

/** TypeBox-derived exact Git tree identity. */
export type GitTreeId = Static<typeof GitTreeIdSchema> & GitTreeIdBrand;

/** TypeBox-derived curated plugin identity. */
export type PluginId = Static<typeof PluginIdSchema> & PluginIdBrand;

/** TypeBox-derived distribution ownership identity. */
export type OwnershipIdentity = Static<typeof OwnershipIdentitySchema> & OwnershipIdentityBrand;

/** TypeBox-derived canonical release-relative path. */
export type ReleaseRelativePath = Static<typeof ReleaseRelativePathSchema> &
  ReleaseRelativePathBrand;
