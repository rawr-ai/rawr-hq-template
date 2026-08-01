import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { CheckInputSchema, CheckResultSchema } from "../model/dto/release-lifecycle";

/** Defines the release eligibility boundary that precedes package construction. */
export const check = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      audit: "full",
      entity: "releases",
    })
  )
  .input(standard(CheckInputSchema))
  .output(standard(CheckResultSchema));
