import { type Static, Type } from "typebox";

export const VENDOR_SOURCE_PROTOCOL = "rawr-vendor-source@v1" as const;
export const VENDOR_PROVENANCE_PROTOCOL = "rawr-vendor-provenance@v1" as const;
export const VENDOR_LOCK_PROTOCOL = "rawr-vendor-lock@v1" as const;

export const GIT_OBJECT_ID_PATTERN = "^(?:[0-9a-f]{40}|[0-9a-f]{64})$";
export const SHA256_DIGEST_PATTERN = "^sha256_[0-9a-f]{64}$";
export const SOURCE_ID_PATTERN = "^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$";
export const PLUGIN_ID_PATTERN = "^[a-z0-9][a-z0-9._-]{0,127}$";
export const REPOSITORY_IDENTITY_PATTERN = "^[A-Za-z0-9][A-Za-z0-9._:@/+\\-]{0,511}$";
export const CONTENT_AUTHORITY_PATTERN = "^[a-z0-9][a-z0-9._-]{0,127}$";
export const QUALIFIED_HEAD_REF_PATTERN =
  "^refs/heads/(?![./])(?!.*(?:\\.\\.|@\\{|//|[~^:?*\\[\\]\\\\]))(?!.*[./]$)[A-Za-z0-9._/-]+$";
export const CANONICAL_ABSOLUTE_PATH_PATTERN =
  "^/(?!\\.\\.?$)(?!\\.\\.?/)(?!.*?/\\.\\.?(?:/|$))(?!.*//)(?!.*\\\\)[^/\\u0000]+(?:/[^/\\u0000]+)*$";
export const NORMALIZED_RELATIVE_PATH_PATTERN =
  "^(?!/)(?!-)(?!\\.\\.?$)(?!\\.\\.?/)(?!.*?/\\.\\.?(?:/|$))(?!.*//)(?!.*\\\\)[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*$";
export const SUPPORTED_BASELINE_PATTERN = "^[^\\u0000-\\u001f\\u007f]+$";
export const STRICT_UTC_RFC3339_PATTERN =
  "^[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$";

export const CanonicalAbsolutePathSchema = Type.String({
  minLength: 2,
  maxLength: 16_384,
  pattern: CANONICAL_ABSOLUTE_PATH_PATTERN,
});
export const RepositoryIdentitySchema = Type.String({
  minLength: 1,
  maxLength: 512,
  pattern: REPOSITORY_IDENTITY_PATTERN,
});
export const ContentAuthoritySchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: CONTENT_AUTHORITY_PATTERN,
});
export const QualifiedHeadRefSchema = Type.String({
  minLength: "refs/heads/a".length,
  maxLength: 512,
  pattern: QUALIFIED_HEAD_REF_PATTERN,
});
export const NormalizedRelativePathSchema = Type.String({
  minLength: 1,
  maxLength: 4_096,
  pattern: NORMALIZED_RELATIVE_PATH_PATTERN,
});
export const SourceIdSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: SOURCE_ID_PATTERN,
});
export const GitObjectIdSchema = Type.String({ pattern: GIT_OBJECT_ID_PATTERN });
export const Sha256DigestSchema = Type.String({ pattern: SHA256_DIGEST_PATTERN });
export const PluginIdSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: PLUGIN_ID_PATTERN,
});
export const PositiveCurationRevisionSchema = Type.Integer({
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER,
});
export const SupportedBaselineSchema = Type.String({
  minLength: 1,
  maxLength: 4_096,
  pattern: SUPPORTED_BASELINE_PATTERN,
});
export const StrictUtcRfc3339Schema = Type.String({
  minLength: "0000-00-00T00:00:00Z".length,
  maxLength: 40,
  pattern: STRICT_UTC_RFC3339_PATTERN,
});

export const VendorSourceIdentitySchema = Type.Object(
  {
    repositoryIdentity: RepositoryIdentitySchema,
    refName: QualifiedHeadRefSchema,
    sourceCommit: GitObjectIdSchema,
    sourceTree: GitObjectIdSchema,
    payloadDigest: Sha256DigestSchema,
  },
  { additionalProperties: false }
);

export const VendorRecordBindingSchema = Type.Object(
  {
    id: NormalizedRelativePathSchema,
    protocol: Type.Union([
      Type.Literal(VENDOR_SOURCE_PROTOCOL),
      Type.Literal(VENDOR_PROVENANCE_PROTOCOL),
      Type.Literal(VENDOR_LOCK_PROTOCOL),
    ]),
    contentDigest: Sha256DigestSchema,
  },
  { additionalProperties: false }
);

export const VendorSourceDeclarationSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    sourceId: SourceIdSchema,
    policy: Type.Union([Type.Literal("tracked"), Type.Literal("held")]),
    repositoryIdentity: RepositoryIdentitySchema,
    refName: QualifiedHeadRefSchema,
    sourcePath: NormalizedRelativePathSchema,
    destinationPath: NormalizedRelativePathSchema,
    provenancePath: NormalizedRelativePathSchema,
    lockPath: NormalizedRelativePathSchema,
    curationRevision: PositiveCurationRevisionSchema,
    supportedBaseline: SupportedBaselineSchema,
  },
  { additionalProperties: false }
);

export const VendorLockRecordSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    sourceId: SourceIdSchema,
    admitted: VendorSourceIdentitySchema,
  },
  { additionalProperties: false }
);

export const VendorProvenanceRecordSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    sourceId: SourceIdSchema,
    admitted: VendorSourceIdentitySchema,
    importedPayloadDigest: Sha256DigestSchema,
    curationRevision: PositiveCurationRevisionSchema,
    supportedBaseline: SupportedBaselineSchema,
    observedLatest: VendorSourceIdentitySchema,
    observedAt: StrictUtcRfc3339Schema,
    disposition: Type.Union([
      Type.Literal("admitted"),
      Type.Literal("held"),
      Type.Literal("review-required"),
    ]),
  },
  { additionalProperties: false }
);

export type VendorSourceIdentity = Readonly<Static<typeof VendorSourceIdentitySchema>>;
export type VendorRecordBinding = Readonly<Static<typeof VendorRecordBindingSchema>>;
export type VendorSourceDeclaration = Readonly<Static<typeof VendorSourceDeclarationSchema>>;
export type VendorLockRecord = Readonly<
  Omit<Static<typeof VendorLockRecordSchema>, "admitted"> & {
    readonly admitted: VendorSourceIdentity;
  }
>;
export type VendorProvenanceRecord = Readonly<
  Omit<Static<typeof VendorProvenanceRecordSchema>, "admitted" | "observedLatest"> & {
    readonly admitted: VendorSourceIdentity;
    readonly observedLatest: VendorSourceIdentity;
  }
>;
