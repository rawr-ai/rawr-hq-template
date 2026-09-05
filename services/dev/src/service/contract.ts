import { procedureMetadata } from "@habitat-ai/sdk/service";
import { oc } from "@orpc/contract";
import { contract as repo } from "./modules/repo/contract";
import { contract as stack } from "./modules/stack/contract";
import { contract as worktree } from "./modules/worktree/contract";

/** Composes only the four supported development operations. */
export const contract = oc
  .meta(
    procedureMetadata({ idempotent: true, domain: "dev", audience: "internal", audit: "basic" })
  )
  .router({ repo, stack, worktree });

/** Public development capability contract. */
export type Contract = typeof contract;
