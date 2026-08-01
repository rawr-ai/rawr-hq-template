import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import {
  ReleaseInputRefreshInputSchema,
  ReleaseInputRefreshResultSchema,
} from "../model/dto/release-lifecycle";

/** Defines the boundary for refreshing a release input from one staged snapshot. */
export const refreshReleaseInput = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      audit: "full",
      entity: "releases",
    })
  )
  .input(standard(ReleaseInputRefreshInputSchema))
  .output(standard(ReleaseInputRefreshResultSchema));
