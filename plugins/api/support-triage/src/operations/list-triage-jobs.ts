import type { SupportTriageClient } from "../../../../../packages/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";

type ListTriageJobsInput = Parameters<SupportTriageClient["listTriageJobs"]>[0];
type ListTriageJobsOutput = Awaited<ReturnType<SupportTriageClient["listTriageJobs"]>>;
type ListTriageJobsHandlerArgs<Context extends SupportTriageApiContext> = {
  context: Context;
  input: ListTriageJobsInput;
};

export function listTriageJobsOperation<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
  context: Context,
  input: ListTriageJobsInput,
): Promise<ListTriageJobsOutput> {
  return deps.resolveClient(context).listTriageJobs(input);
}

export function bindListTriageJobsOperation<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return ({ context, input }: ListTriageJobsHandlerArgs<Context>): Promise<ListTriageJobsOutput> =>
    listTriageJobsOperation(deps, context, input);
}
