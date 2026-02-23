import type { SupportTriageClient } from "../../../../../packages/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";

type CompleteTriageJobInput = Parameters<SupportTriageClient["completeTriageJob"]>[0];
type CompleteTriageJobOutput = Awaited<ReturnType<SupportTriageClient["completeTriageJob"]>>;
type CompleteTriageJobHandlerArgs<Context extends SupportTriageApiContext> = {
  context: Context;
  input: CompleteTriageJobInput;
};

export function completeTriageJobOperation<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
  context: Context,
  input: CompleteTriageJobInput,
): Promise<CompleteTriageJobOutput> {
  return deps.resolveClient(context).completeTriageJob(input);
}

export function bindCompleteTriageJobOperation<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return ({ context, input }: CompleteTriageJobHandlerArgs<Context>): Promise<CompleteTriageJobOutput> =>
    completeTriageJobOperation(deps, context, input);
}
