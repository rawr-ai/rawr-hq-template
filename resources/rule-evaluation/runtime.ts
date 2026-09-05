import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";
import type { RuleEvaluationResource } from "./contract.js";
export const RuleEvaluationRuntimeResource = defineRuntimeResource<
  "rule-evaluation",
  RuleEvaluationResource<never>
>({
  id: "rule-evaluation",
  title: "Rule evaluation",
  purpose: "Execute admitted exact-subject rule programs",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
});
