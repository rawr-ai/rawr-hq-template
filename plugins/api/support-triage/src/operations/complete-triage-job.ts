import type { CompleteTriageJobInput } from "@rawr/support-triage";
import { completeSupportTriageJob } from "@rawr/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";
import { throwSupportTriageDomainErrorAsBoundary } from "../errors";

export function createCompleteTriageJobHandler<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return async ({ context, input }: { context: Context; input: CompleteTriageJobInput }) => {
    try {
      return await completeSupportTriageJob(deps.resolveDeps(context), input);
    } catch (error) {
      throwSupportTriageDomainErrorAsBoundary(error);
    }
  };
}
