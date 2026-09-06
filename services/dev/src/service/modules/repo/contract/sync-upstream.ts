import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";
import { RepoSyncInputSchema, RepoSyncResultSchema } from "../model/dto";

/** Plans or admits one native fast-forward-only update. */
export const syncUpstream = oc
  .meta(procedureMetadata({ idempotent: false, entity: "repo", audit: "full" }))
  .input(standard(RepoSyncInputSchema))
  .output(standard(RepoSyncResultSchema));
