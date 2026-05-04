// @expected-error TS2353
import type { CompiledExecutionPlan } from "@rawr/sdk/spine";
import { CreateWorkItemRef } from "../positive/app-and-plan-artifacts";

export const BadPlan = {
  kind: "compiled.execution-plan",
  ref: CreateWorkItemRef,
  mode: "provider.acquire",
} as const satisfies CompiledExecutionPlan;
