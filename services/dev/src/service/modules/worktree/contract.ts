import { schema } from "@rawr/hq-sdk";
import {
  WorktreeCleanupInputSchema,
  WorktreeCleanupResultSchema,
} from "../../common/entities";
import { ocBase } from "../../base";

export const contract = {
  cleanup: ocBase
    .meta({ idempotent: false, entity: "worktree", audit: "full" })
    .input(schema(WorktreeCleanupInputSchema))
    .output(schema(WorktreeCleanupResultSchema)),
};
