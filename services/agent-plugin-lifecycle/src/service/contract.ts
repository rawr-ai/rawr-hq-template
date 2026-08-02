import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { oc } from "@orpc/contract";

import { metadataDefaults } from "./model/policy/procedure-metadata";
import { contract as governance } from "./modules/governance/contract";
import { contract as packaging } from "./modules/packaging/contract";
import { contract as providers } from "./modules/providers/contract";
import { contract as releases } from "./modules/releases/contract";
import { contract as vendors } from "./modules/vendors/contract";

/** Composes the five lifecycle capability contracts beneath one metadata boundary. */
export const contract = oc.meta(procedureMetadata(metadataDefaults)).router({
  releases,
  vendors,
  packaging,
  providers,
  governance,
});

/** Type-safe caller contract exposed through the package's client face. */
export type Contract = typeof contract;
