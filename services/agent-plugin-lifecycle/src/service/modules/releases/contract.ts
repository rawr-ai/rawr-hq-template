import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";

import {
  CheckInputSchema,
  CheckResultSchema,
  ReleaseInputRecordInputSchema,
  ReleaseInputRecordResultSchema,
  ReleaseInputRefreshInputSchema,
  ReleaseInputRefreshResultSchema,
  RepositoryCheckInputSchema,
  RepositoryCheckResultSchema,
} from "./model/dto/release-lifecycle";

/** Declares the TypeBox-backed release eligibility and release-input operation boundary. */
export const contract = {
  check: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        audit: "full",
        entity: "releases",
      })
    )
    .input(standard(CheckInputSchema))
    .output(standard(CheckResultSchema)),
  releaseInputRecord: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        audit: "full",
        entity: "releases",
      })
    )
    .input(standard(ReleaseInputRecordInputSchema))
    .output(standard(ReleaseInputRecordResultSchema)),
  refreshReleaseInput: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        audit: "full",
        entity: "releases",
      })
    )
    .input(standard(ReleaseInputRefreshInputSchema))
    .output(standard(ReleaseInputRefreshResultSchema)),
  checkRepository: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        audit: "full",
        entity: "releases",
      })
    )
    .input(standard(RepositoryCheckInputSchema))
    .output(standard(RepositoryCheckResultSchema)),
};
