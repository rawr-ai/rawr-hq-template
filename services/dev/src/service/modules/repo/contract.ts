import { schema } from "@rawr/hq-sdk";
import { RepoSyncUpstreamInputSchema, RepoSyncUpstreamResultSchema } from "../../common/entities";
import { ocBase } from "../../base";

export const contract = {
  syncUpstream: ocBase
    .meta({ idempotent: false, entity: "repo", audit: "full" })
    .input(schema(RepoSyncUpstreamInputSchema))
    .output(schema(RepoSyncUpstreamResultSchema)),
};
