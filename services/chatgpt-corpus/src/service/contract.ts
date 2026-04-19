import { contract as corpusArtifacts } from "./modules/corpus-artifacts/contract";
import { contract as sourceMaterials } from "./modules/source-materials/contract";
import { contract as workspace } from "./modules/workspace/contract";

export const contract = {
  workspace,
  sourceMaterials,
  corpusArtifacts,
};

export type Contract = typeof contract;
