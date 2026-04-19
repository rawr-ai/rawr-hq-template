import type { HqOpsResources } from "../../shared/ports/resources";
import {
  checkScratchPolicy,
  decideMergePolicy,
  evaluateLifecycleCompleteness,
  resolveLifecycleTarget,
  type DecideMergePolicyInput,
  type EvaluateLifecycleCompletenessInput,
  type ResolveLifecycleTargetInput,
  type ScratchPolicyCheckInput,
} from "./model";

export function createRepository(resources: HqOpsResources, repoRoot: string) {
  return {
    resolveLifecycleTarget(input: ResolveLifecycleTargetInput) {
      return resolveLifecycleTarget(input, resources.path, repoRoot);
    },
    evaluateLifecycleCompleteness(input: EvaluateLifecycleCompletenessInput) {
      return evaluateLifecycleCompleteness(input, resources.path, repoRoot);
    },
    checkScratchPolicy(input: ScratchPolicyCheckInput) {
      return checkScratchPolicy(input);
    },
    decideMergePolicy(input: DecideMergePolicyInput) {
      return decideMergePolicy(input);
    },
  };
}
