import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";
import { WorktreeCleanupInputSchema, WorktreeCleanupResultSchema } from "../../common/entities";

export const contract = {
  cleanup: oc
    .meta(procedureMetadata({ idempotent: false, entity: "worktree", audit: "full" }))
    .input(standard(WorktreeCleanupInputSchema))
    .output(standard(WorktreeCleanupResultSchema)),
};
