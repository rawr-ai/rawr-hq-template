import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { contract as repo } from "./modules/repo/contract";
import { contract as scratchPolicy } from "./modules/scratch-policy/contract";
import { contract as stack } from "./modules/stack/contract";
import { contract as worktree } from "./modules/worktree/contract";

export const metadataDefaults = {
  idempotent: true,
  domain: "dev",
  audience: "internal",
  audit: "basic",
  entity: "service",
} as const;

export const contract = oc.meta(procedureMetadata(metadataDefaults)).router({
  stack,
  repo,
  worktree,
  scratchPolicy,
});

export type Contract = typeof contract;
