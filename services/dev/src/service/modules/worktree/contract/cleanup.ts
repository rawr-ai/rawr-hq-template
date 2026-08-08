import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";
import {
  WorktreeCleanupInputSchema,
  WorktreeCleanupResultSchema,
} from "../model/dto/worktree-operations.dto";

/** Declares mutating worktree cleanup with full audit metadata. */
export const cleanup = oc
  .meta(procedureMetadata({ idempotent: false, entity: "worktree", audit: "full" }))
  .input(standard(WorktreeCleanupInputSchema))
  .output(standard(WorktreeCleanupResultSchema));
