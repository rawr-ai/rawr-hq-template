import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";
import {
  RepoSyncUpstreamInputSchema,
  RepoSyncUpstreamResultSchema,
} from "../model/dto/repo-operations.dto";

/** Declares mutating upstream synchronization with full audit metadata. */
export const syncUpstream = oc
  .meta(procedureMetadata({ idempotent: false, entity: "repo", audit: "full" }))
  .input(standard(RepoSyncUpstreamInputSchema))
  .output(standard(RepoSyncUpstreamResultSchema));
