import { getSupportTriageJob } from "@rawr/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";
import { throwSupportTriageDomainErrorAsBoundary } from "../errors";

export function createGetTriageJobHandler<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return async ({ context, input }: { context: Context; input: { jobId: string } }) => {
    try {
      return await getSupportTriageJob(deps.resolveDeps(context), input);
    } catch (error) {
      throwSupportTriageDomainErrorAsBoundary(error);
    }
  };
}
