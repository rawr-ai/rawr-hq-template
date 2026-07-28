import { oc } from "@orpc/contract";
import { type BaseMetadata, procedureMetadata } from "@rawr/hq-sdk";

import { contract as governance } from "./modules/governance/contract";
import { contract as packaging } from "./modules/packaging/contract";
import { contract as providers } from "./modules/providers/contract";
import { contract as releases } from "./modules/releases/contract";
import { contract as vendors } from "./modules/vendors/contract";

/** Service metadata inherited by every lifecycle operation contract. */
export const metadataDefaults = {
  idempotent: true,
  domain: "agent-plugin-lifecycle",
  audience: "internal",
  audit: "basic",
  entity: "service",
} satisfies BaseMetadata;

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
