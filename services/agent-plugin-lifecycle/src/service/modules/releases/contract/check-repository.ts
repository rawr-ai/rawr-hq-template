import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
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
