import type { RequestTriageJobInput } from "@rawr/support-triage";
import { requestSupportTriageJob } from "@rawr/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";
import { throwSupportTriageDomainErrorAsBoundary } from "../errors";

export function createRequestTriageJobHandler<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return async ({ context, input }: { context: Context; input: RequestTriageJobInput }) => {
    try {
      return await requestSupportTriageJob(deps.resolveDeps(context), input);
    } catch (error) {
      throwSupportTriageDomainErrorAsBoundary(error);
    }
  };
}
