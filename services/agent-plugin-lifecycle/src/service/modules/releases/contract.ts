import { schema } from "@rawr/hq-sdk";

import { ocBase } from "../../base";
import {
  CheckInputSchema,
  CheckResultSchema,
  ReleaseInputRecordInputSchema,
  ReleaseInputRecordResultSchema,
  ReleaseInputRefreshInputSchema,
  ReleaseInputRefreshResultSchema,
  RepositoryCheckInputSchema,
  RepositoryCheckResultSchema,
} from "./schemas";

export const contract = {
  check: ocBase
    .meta({ idempotent: true, audit: "full", entity: "releases" })
    .input(schema(CheckInputSchema))
    .output(schema(CheckResultSchema)),
  releaseInputRecord: ocBase
    .meta({ idempotent: true, audit: "full", entity: "releases" })
    .input(schema(ReleaseInputRecordInputSchema))
    .output(schema(ReleaseInputRecordResultSchema)),
  refreshReleaseInput: ocBase
    .meta({ idempotent: true, audit: "full", entity: "releases" })
    .input(schema(ReleaseInputRefreshInputSchema))
    .output(schema(ReleaseInputRefreshResultSchema)),
  checkRepository: ocBase
    .meta({ idempotent: true, audit: "full", entity: "releases" })
    .input(schema(RepositoryCheckInputSchema))
    .output(schema(RepositoryCheckResultSchema)),
};
