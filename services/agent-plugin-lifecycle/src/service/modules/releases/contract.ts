import { schema } from "@rawr/hq-sdk";

import { ocBase } from "../../base";
import {
  BuildInputSchema,
  BuildResultSchema,
  CheckInputSchema,
  CheckResultSchema,
  PlanRetentionInputSchema,
  PlanRetentionResultSchema,
  RepositoryCheckInputSchema,
  RepositoryCheckResultSchema,
} from "./schemas";

export const contract = {
  check: ocBase
    .meta({ idempotent: true, audit: "full", entity: "releases" })
    .input(schema(CheckInputSchema))
    .output(schema(CheckResultSchema)),
  checkRepository: ocBase
    .meta({ idempotent: true, audit: "full", entity: "releases" })
    .input(schema(RepositoryCheckInputSchema))
    .output(schema(RepositoryCheckResultSchema)),
  build: ocBase
    .meta({ idempotent: true, audit: "full", entity: "releases" })
    .input(schema(BuildInputSchema))
    .output(schema(BuildResultSchema)),
  planRetention: ocBase
    .meta({ idempotent: true, audit: "full", entity: "releases" })
    .input(schema(PlanRetentionInputSchema))
    .output(schema(PlanRetentionResultSchema)),
};
