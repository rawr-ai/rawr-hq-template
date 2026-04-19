import { contract as catalog } from "./modules/catalog/contract";
import { contract as search } from "./modules/search/contract";
import { contract as transcripts } from "./modules/transcripts/contract";

export const contract = {
  catalog,
  transcripts,
  search,
};

export type Contract = typeof contract;
