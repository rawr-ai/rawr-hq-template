import { schema } from "@rawr/hq-sdk";

import { ocBase } from "../../base";
import {
  BuildInputSchema,
  BuildResultSchema,
  CheckInputSchema,
  CheckResultSchema,
} from "./schemas";

export const contract = {
  check: ocBase
    .meta({ idempotent: true, audit: "full", entity: "releases" })
    .input(schema(CheckInputSchema))
    .output(schema(CheckResultSchema)),
  build: ocBase
    .meta({ idempotent: true, audit: "full", entity: "releases" })
    .input(schema(BuildInputSchema))
    .output(schema(BuildResultSchema)),
};
