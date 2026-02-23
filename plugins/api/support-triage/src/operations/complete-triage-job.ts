import type { SupportTriageClient } from "@rawr/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";

type CompleteTriageJobInput = Parameters<SupportTriageClient["completeTriageJob"]>[0];
type CompleteTriageJobOutput = Awaited<ReturnType<SupportTriageClient["completeTriageJob"]>>;

type CompleteTriageJobHandlerArgs<Context extends SupportTriageApiContext> = {
  context: Context;
  input: CompleteTriageJobInput;
};

export function createCompleteTriageJobHandler<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return ({ context, input }: CompleteTriageJobHandlerArgs<Context>): Promise<CompleteTriageJobOutput> =>
    deps.resolveClient(context).completeTriageJob(input);
}
