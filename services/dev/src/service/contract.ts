import { procedureMetadata } from "@habitat-ai/sdk/service";
import { oc } from "@orpc/contract";
import { metadataDefaults } from "./model/policy/procedure-metadata";
import { contract as repo } from "./modules/repo/contract";
import { contract as scratchPolicy } from "./modules/scratch-policy/contract";
import { contract as stack } from "./modules/stack/contract";
import { contract as worktree } from "./modules/worktree/contract";

export const contract = oc.meta(procedureMetadata(metadataDefaults)).router({
  stack,
  repo,
  worktree,
  scratchPolicy,
});

export type Contract = typeof contract;
