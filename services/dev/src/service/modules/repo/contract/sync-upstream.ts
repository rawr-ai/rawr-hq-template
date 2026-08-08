import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";
import {
  RepoSyncUpstreamInputSchema,
  RepoSyncUpstreamResultSchema,
} from "../model/dto/repo-operations.dto";

/** Declares mutating upstream synchronization with full audit metadata. */
export const syncUpstream = oc
  .meta(procedureMetadata({ idempotent: false, entity: "repo", audit: "full" }))
  .input(standard(RepoSyncUpstreamInputSchema))
  .output(standard(RepoSyncUpstreamResultSchema));
