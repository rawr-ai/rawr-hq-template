import { oc } from "@orpc/contract";
import { standard } from "@rawr/typebox-adapter";
import { ResolveCatalogInputSchema, ResolveCatalogResultSchema } from "../model/dto/catalog";
import { CheckCatalogInputSchema, CheckCatalogResultSchema } from "../model/dto/check";

/** Catalog procedure group exposed through the module contract face. */
export const catalog = {
  resolve: oc
    .input(standard(ResolveCatalogInputSchema))
    .output(standard(ResolveCatalogResultSchema)),
  check: oc.input(standard(CheckCatalogInputSchema)).output(standard(CheckCatalogResultSchema)),
};
