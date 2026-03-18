import { startSupportTriageJob } from "@rawr/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";
import { throwSupportTriageDomainErrorAsBoundary } from "../errors";

export function createStartTriageJobHandler<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return async ({ context, input }: { context: Context; input: { jobId: string } }) => {
    try {
      return await startSupportTriageJob(deps.resolveDeps(context), input);
    } catch (error) {
      throwSupportTriageDomainErrorAsBoundary(error);
    }
  };
}
