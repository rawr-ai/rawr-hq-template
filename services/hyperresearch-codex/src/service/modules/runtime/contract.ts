/**
 * @fileoverview Runtime module contract for Hyperresearch Codex orchestration.
 */
import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import {
  HyperresearchRunnerResultSchema,
  RunSyntheticSliceInputSchema,
  type HyperresearchRunnerResult,
  type RunSyntheticSliceInput,
} from "./entities";

export type { HyperresearchRunnerResult, RunSyntheticSliceInput } from "./entities";

export const contract = {
  runSyntheticSlice: ocBase
    .meta({ idempotent: false, entity: "runtime" })
    .input(schema(RunSyntheticSliceInputSchema))
    .output(schema(HyperresearchRunnerResultSchema)),
};
