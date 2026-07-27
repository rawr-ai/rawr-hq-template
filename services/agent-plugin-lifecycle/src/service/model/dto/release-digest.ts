import { type Static, Type } from "typebox";

declare const contentDigestBrand: unique symbol;
declare const releaseInputDigestBrand: unique symbol;
declare const payloadDigestBrand: unique symbol;
declare const releaseDigestBrand: unique symbol;
declare const releaseSetDigestBrand: unique symbol;

type ContentDigestBrand = string & { readonly [contentDigestBrand]: "ContentDigest" };
type ReleaseInputDigestBrand = string & {
  readonly [releaseInputDigestBrand]: "ReleaseInputDigest";
};
type PayloadDigestBrand = string & { readonly [payloadDigestBrand]: "PayloadDigest" };
type ReleaseDigestBrand = string & { readonly [releaseDigestBrand]: "ReleaseDigest" };
type ReleaseSetDigestBrand = string & {
  readonly [releaseSetDigestBrand]: "ReleaseSetDigest";
};

/** Defines the SHA-256 identity of exact content bytes. */
export const ContentDigestSchema = Type.Unsafe<ContentDigestBrand>(
  Type.String({ pattern: "^sha256_[0-9a-f]{64}$" })
);

/** Defines the verification identity of one canonical digest-free release-input body. */
export const ReleaseInputDigestSchema = Type.Unsafe<ReleaseInputDigestBrand>(
  Type.String({ pattern: "^ri1_[0-9a-f]{64}$" })
);

/** Defines the verification identity of canonical plugin payload-entry bytes. */
export const PayloadDigestSchema = Type.Unsafe<PayloadDigestBrand>(
  Type.String({ pattern: "^pd1_[0-9a-f]{64}$" })
);

/** Defines the verification identity of one canonical digest-free release body. */
export const ReleaseDigestSchema = Type.Unsafe<ReleaseDigestBrand>(
  Type.String({ pattern: "^rd1_[0-9a-f]{64}$" })
);

/** Defines the verification identity of one canonical digest-free complete-set body. */
export const ReleaseSetDigestSchema = Type.Unsafe<ReleaseSetDigestBrand>(
  Type.String({ pattern: "^rs1_[0-9a-f]{64}$" })
);

/** SHA-256 identity of exact content bytes. */
export type ContentDigest = Static<typeof ContentDigestSchema>;

/** Verification identity of one canonical digest-free release-input body. */
export type ReleaseInputDigest = Static<typeof ReleaseInputDigestSchema>;

/** Verification identity of canonical plugin payload-entry bytes. */
export type PayloadDigest = Static<typeof PayloadDigestSchema>;

/** Verification identity of one canonical digest-free release body. */
export type ReleaseDigest = Static<typeof ReleaseDigestSchema>;

/** Verification identity of one canonical digest-free complete-set body. */
export type ReleaseSetDigest = Static<typeof ReleaseSetDigestSchema>;
