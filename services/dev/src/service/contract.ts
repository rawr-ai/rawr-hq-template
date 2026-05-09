import { contract as repo } from "./modules/repo/contract";
import { contract as scratchPolicy } from "./modules/scratch-policy/contract";
import { contract as stack } from "./modules/stack/contract";
import { contract as worktree } from "./modules/worktree/contract";

export const contract = {
  stack,
  repo,
  worktree,
  scratchPolicy,
};

export type Contract = typeof contract;
