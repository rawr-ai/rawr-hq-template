import type { SupportTriageClient } from "@rawr/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";

type ListTriageJobsInput = Parameters<SupportTriageClient["listTriageJobs"]>[0];
type ListTriageJobsOutput = Awaited<ReturnType<SupportTriageClient["listTriageJobs"]>>;

type ListTriageJobsHandlerArgs<Context extends SupportTriageApiContext> = {
  context: Context;
  input: ListTriageJobsInput;
};

export function createListTriageJobsHandler<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return ({ context, input }: ListTriageJobsHandlerArgs<Context>): Promise<ListTriageJobsOutput> =>
    deps.resolveClient(context).listTriageJobs(input);
}
