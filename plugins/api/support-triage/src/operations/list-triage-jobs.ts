import type { ListTriageJobsInput } from "@rawr/support-triage";
import { listSupportTriageJobs } from "@rawr/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";
import { throwSupportTriageDomainErrorAsBoundary } from "../errors";

export function createListTriageJobsHandler<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return async ({ context, input }: { context: Context; input: ListTriageJobsInput }) => {
    try {
      return await listSupportTriageJobs(deps.resolveDeps(context), input);
    } catch (error) {
      throwSupportTriageDomainErrorAsBoundary(error);
    }
  };
}
