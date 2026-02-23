import type { SupportTriageClient } from "../../../../../packages/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";

type GetTriageJobInput = Parameters<SupportTriageClient["getTriageJob"]>[0];
type GetTriageJobOutput = Awaited<ReturnType<SupportTriageClient["getTriageJob"]>>;
type GetTriageJobHandlerArgs<Context extends SupportTriageApiContext> = {
  context: Context;
  input: GetTriageJobInput;
};

export function getTriageJobOperation<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
  context: Context,
  input: GetTriageJobInput,
): Promise<GetTriageJobOutput> {
  return deps.resolveClient(context).getTriageJob(input);
}

export function bindGetTriageJobOperation<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return ({ context, input }: GetTriageJobHandlerArgs<Context>): Promise<GetTriageJobOutput> =>
    getTriageJobOperation(deps, context, input);
}
