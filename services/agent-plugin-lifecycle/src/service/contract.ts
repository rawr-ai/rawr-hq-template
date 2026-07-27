import { eoc } from "effect-orpc";

import { contract as governance } from "./modules/governance/contract";
import { contract as packaging } from "./modules/packaging/contract";
import { contract as providers } from "./modules/providers/contract";
import { contract as releases } from "./modules/releases/contract";
import { contract as vendors } from "./modules/vendors/contract";

/** Composes the five lifecycle capability contracts into the service boundary. */
export const contract = eoc.router({
  releases,
  vendors,
  packaging,
  providers,
  governance,
});

/** Type-safe caller contract exposed through the package's client face. */
export type Contract = typeof contract;
