import { standard, type TypeBoxStandardSchema } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { ResolveCatalogInputSchema, ResolveCatalogResultSchema } from "../model/dto/catalog.js";
import { CheckCatalogInputSchema, CheckCatalogResultSchema } from "../model/dto/check.js";

const resolveInput: TypeBoxStandardSchema<typeof ResolveCatalogInputSchema> =
  standard(ResolveCatalogInputSchema);
const resolveOutput: TypeBoxStandardSchema<typeof ResolveCatalogResultSchema> = standard(
  ResolveCatalogResultSchema
);
const checkInput: TypeBoxStandardSchema<typeof CheckCatalogInputSchema> =
  standard(CheckCatalogInputSchema);
const checkOutput: TypeBoxStandardSchema<typeof CheckCatalogResultSchema> =
  standard(CheckCatalogResultSchema);

/** Catalog procedure group exposed through the module contract face. */
export const catalog = {
  resolve: oc.input(resolveInput).output(resolveOutput),
  check: oc.input(checkInput).output(checkOutput),
};
