import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";
import { WorktreeCleanupInputSchema, WorktreeCleanupResultSchema } from "../model/dto";

/** Plans or applies only policy-admitted native worktree removals. */
export const cleanup = oc
  .meta(procedureMetadata({ idempotent: false, entity: "worktree", audit: "full" }))
  .input(standard(WorktreeCleanupInputSchema))
  .output(standard(WorktreeCleanupResultSchema));
