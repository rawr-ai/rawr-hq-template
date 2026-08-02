import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import {
  RepositoryCheckInputSchema,
  RepositoryCheckResultSchema,
} from "../model/dto/release-lifecycle";

/** Defines the clean or staged repository eligibility boundary for release input. */
export const checkRepository = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      audit: "full",
      entity: "releases",
    })
  )
  .input(standard(RepositoryCheckInputSchema))
  .output(standard(RepositoryCheckResultSchema));
