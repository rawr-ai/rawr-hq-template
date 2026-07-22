import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import { RepoSyncUpstreamInputSchema, RepoSyncUpstreamResultSchema } from "../../common/entities";

export const contract = {
  syncUpstream: ocBase
    .meta({ idempotent: false, entity: "repo", audit: "full" })
    .input(schema(RepoSyncUpstreamInputSchema))
    .output(schema(RepoSyncUpstreamResultSchema)),
};
