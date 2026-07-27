import { ReadonlyObject, type Static, Type } from "typebox";

import {
  MAX_OWNERSHIP_CLAIMS,
  OWNERSHIP_INDEX_SCHEMA_VERSION,
  OwnershipIdentitySchema,
  PluginIdSchema,
} from "../../shared/release/primitives";

declare const distributionOwnershipIndexBrand: unique symbol;

/** Enumerates every ownership namespace represented in a derived release index. */
export const OwnershipClaimKindSchema = Type.Union([
  Type.Literal("plugin"),
  Type.Literal("skill"),
  Type.Literal("alias"),
  Type.Literal("provider-identity"),
  Type.Literal("destination"),
]);

/** Admits only claim kinds a content repository may declare directly. */
export const DeclaredOwnershipClaimKindSchema = Type.Union([
  Type.Literal("skill"),
  Type.Literal("alias"),
  Type.Literal("provider-identity"),
  Type.Literal("destination"),
]);

/** Describes one structurally valid claim in a derived distribution index. */
export const OwnershipClaimSchema = ReadonlyObject(
  Type.Object({
    kind: OwnershipClaimKindSchema,
    identity: OwnershipIdentitySchema,
    ownerPluginId: PluginIdSchema,
  }),
  { additionalProperties: false }
);

/** Describes one content-declared claim; plugin claims remain service-derived. */
export const DeclaredOwnershipClaimSchema = ReadonlyObject(
  Type.Object({
    kind: DeclaredOwnershipClaimKindSchema,
    identity: OwnershipIdentitySchema,
    ownerPluginId: PluginIdSchema,
  }),
  { additionalProperties: false }
);

/** Bounds the full claim inventory before ownership semantics are evaluated. */
export const OwnershipClaimsSchema = ReadonlyObject(Type.Array(OwnershipClaimSchema), {
  maxItems: MAX_OWNERSHIP_CLAIMS,
});

/** Bounds content-declared claims without admitting derived plugin claims. */
export const DeclaredOwnershipClaimsSchema = ReadonlyObject(
  Type.Array(DeclaredOwnershipClaimSchema),
  { maxItems: MAX_OWNERSHIP_CLAIMS }
);

/** Owns the closed wire shape of a version-one distribution ownership index. */
export const DistributionOwnershipIndexRecordSchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(OWNERSHIP_INDEX_SCHEMA_VERSION),
    claims: OwnershipClaimsSchema,
  }),
  { additionalProperties: false }
);

/** TypeBox-derived namespace kind carried by any ownership claim. */
export type OwnershipClaimKind = Static<typeof OwnershipClaimKindSchema>;

/** TypeBox-derived namespace kind a content repository may declare. */
export type DeclaredOwnershipClaimKind = Static<typeof DeclaredOwnershipClaimKindSchema>;

/** TypeBox-derived claim represented in a complete distribution index. */
export type OwnershipClaim = Static<typeof OwnershipClaimSchema>;

/** TypeBox-derived non-plugin claim supplied by reviewed content. */
export type DeclaredOwnershipClaim = Static<typeof DeclaredOwnershipClaimSchema>;

/** TypeBox-derived wire record for a distribution ownership index. */
export type DistributionOwnershipIndexRecord = Static<
  typeof DistributionOwnershipIndexRecordSchema
>;

/** Branded ownership index admitted by distribution-ownership policy. */
export type DistributionOwnershipIndex = DistributionOwnershipIndexRecord &
  Readonly<{
    [distributionOwnershipIndexBrand]: "DistributionOwnershipIndex";
  }>;
