import { oc } from "@orpc/contract";
import { contract as catalog } from "./modules/catalog/contract";

/** Root Habitat semantic contract composed from the catalog module. */
export const contract = oc.router({ catalog });

/** Caller contract type re-exported by the public client face. */
export type Contract = typeof contract;
