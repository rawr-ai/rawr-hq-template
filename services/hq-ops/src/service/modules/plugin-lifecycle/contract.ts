import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import {
  DecideMergePolicyInputSchema,
  DecideMergePolicyResultSchema,
  EvaluateLifecycleCompletenessInputSchema,
  LifecycleCheckDataSchema,
  ResolveLifecycleTargetInputSchema,
  ResolveLifecycleTargetResultSchema,
  ScratchPolicyCheckInputSchema,
  ScratchPolicyCheckSchema,
} from "./schemas";

export const contract = {
  resolveLifecycleTarget: ocBase
    .meta({ idempotent: true, entity: "pluginLifecycle" })
    .input(schema(ResolveLifecycleTargetInputSchema))
    .output(schema(ResolveLifecycleTargetResultSchema)),
  evaluateLifecycleCompleteness: ocBase
    .meta({ idempotent: true, entity: "pluginLifecycle" })
    .input(schema(EvaluateLifecycleCompletenessInputSchema))
    .output(schema(LifecycleCheckDataSchema)),
  checkScratchPolicy: ocBase
    .meta({ idempotent: true, entity: "pluginLifecycle" })
    .input(schema(ScratchPolicyCheckInputSchema))
    .output(schema(ScratchPolicyCheckSchema)),
  decideMergePolicy: ocBase
    .meta({ idempotent: true, entity: "pluginLifecycle" })
    .input(schema(DecideMergePolicyInputSchema))
    .output(schema(DecideMergePolicyResultSchema)),
};

export type PluginLifecycleModuleContract = typeof contract;
