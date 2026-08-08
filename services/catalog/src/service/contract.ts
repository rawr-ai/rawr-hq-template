import { type AugmentedContractRouter, oc } from "@orpc/contract";
import { contract as catalog } from "./modules/catalog/contract/index.js";

const routes: { readonly catalog: typeof catalog } = { catalog };

/** Caller contract type re-exported by the public client face. */
export type Contract = AugmentedContractRouter<typeof routes, object>;

/** Root Habitat semantic contract composed from the catalog module. */
export const contract: Contract = oc.router(routes);
