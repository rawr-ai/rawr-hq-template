import type { Static } from "typebox";

import {
  type DeclaredOwnershipClaim,
  DeclaredOwnershipClaimSchema,
  type DistributionOwnershipIndex,
  type DistributionOwnershipIndexRecord,
  type OwnershipClaim,
  OwnershipClaimSchema,
} from "../../src/service/model/dto/distribution-ownership";
import { createDistributionOwnershipIndex } from "../../src/service/model/policy/distribution-ownership";
import type { OwnershipIdentity, PluginId } from "../../src/service/shared/release/primitives";

declare const identity: OwnershipIdentity;
declare const pluginId: PluginId;
declare const fullClaims: readonly OwnershipClaim[];
declare const record: DistributionOwnershipIndexRecord;

const declaredClaim: DeclaredOwnershipClaim = {
  kind: "skill",
  identity,
  ownerPluginId: pluginId,
};
const fullClaim: OwnershipClaim = declaredClaim;

const declaredSchemaValue: Static<typeof DeclaredOwnershipClaimSchema> = declaredClaim;
const fullSchemaValue: Static<typeof OwnershipClaimSchema> = fullClaim;

void declaredSchemaValue;
void fullSchemaValue;

const invalidDeclaredClaim: DeclaredOwnershipClaim = {
  // @ts-expect-error Plugin claims are service-derived and cannot enter release-input declarations.
  kind: "plugin",
  identity,
  ownerPluginId: pluginId,
};
void invalidDeclaredClaim;

// @ts-expect-error Structurally valid wire data is not a semantically validated ownership index.
const trustedIndex: DistributionOwnershipIndex = record;
void trustedIndex;

// @ts-expect-error The constructor accepts only content-declared, non-plugin claims.
createDistributionOwnershipIndex([pluginId], fullClaims);
