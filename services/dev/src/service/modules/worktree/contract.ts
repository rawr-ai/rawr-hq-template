import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import { WorktreeCleanupInputSchema, WorktreeCleanupResultSchema } from "../../common/entities";

export const contract = {
  cleanup: ocBase
    .meta({ idempotent: false, entity: "worktree", audit: "full" })
    .input(schema(WorktreeCleanupInputSchema))
    .output(schema(WorktreeCleanupResultSchema)),
};
