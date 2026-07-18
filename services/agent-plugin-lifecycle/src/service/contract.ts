import { contract as exports } from "./modules/exports/contract";
import { contract as governance } from "./modules/governance/contract";
import { contract as packaging } from "./modules/packaging/contract";
import { contract as providers } from "./modules/providers/contract";
import { contract as releases } from "./modules/releases/contract";
import { contract as vendors } from "./modules/vendors/contract";

export const contract = {
  releases,
  vendors,
  packaging,
  exports,
  providers,
  governance,
};

export type Contract = typeof contract;
