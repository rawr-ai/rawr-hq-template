import { oc } from "@orpc/contract";
import { standard } from "@rawr/typebox-adapter";
import { ResolveCatalogInputSchema, ResolveCatalogResultSchema } from "../model/dto/catalog";

/** Catalog procedure group exposed through the module contract face. */
export const catalog = {
  resolve: oc
    .input(standard(ResolveCatalogInputSchema))
    .output(standard(ResolveCatalogResultSchema)),
};
