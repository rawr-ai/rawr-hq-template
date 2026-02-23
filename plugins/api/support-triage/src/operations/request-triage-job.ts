import type { SupportTriageClient } from "../../../../../packages/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";

type RequestTriageJobInput = Parameters<SupportTriageClient["requestTriageJob"]>[0];
type RequestTriageJobOutput = Awaited<ReturnType<SupportTriageClient["requestTriageJob"]>>;
type RequestTriageJobHandlerArgs<Context extends SupportTriageApiContext> = {
  context: Context;
  input: RequestTriageJobInput;
};

export function requestTriageJobOperation<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
  context: Context,
  input: RequestTriageJobInput,
): Promise<RequestTriageJobOutput> {
  return deps.resolveClient(context).requestTriageJob(input);
}

export function bindRequestTriageJobOperation<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return ({ context, input }: RequestTriageJobHandlerArgs<Context>): Promise<RequestTriageJobOutput> =>
    requestTriageJobOperation(deps, context, input);
}
