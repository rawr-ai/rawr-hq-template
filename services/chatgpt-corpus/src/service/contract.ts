import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { oc } from "@orpc/contract";
import { contract as corpusArtifacts } from "./modules/corpus-artifacts/contract";
import { contract as sourceMaterials } from "./modules/source-materials/contract";
import { contract as workspace } from "./modules/workspace/contract";

export const metadataDefaults = {
  idempotent: true,
  domain: "chatgpt-corpus",
  audience: "internal",
  entity: "chatgpt-corpus",
} as const;

export const contract = oc.meta(procedureMetadata(metadataDefaults)).router({
  workspace,
  sourceMaterials,
  corpusArtifacts,
});

export type Contract = typeof contract;
