import type { SupportTriageClient } from "../../../../../packages/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";

type StartTriageJobInput = Parameters<SupportTriageClient["startTriageJob"]>[0];
type StartTriageJobOutput = Awaited<ReturnType<SupportTriageClient["startTriageJob"]>>;
type StartTriageJobHandlerArgs<Context extends SupportTriageApiContext> = {
  context: Context;
  input: StartTriageJobInput;
};

export function startTriageJobOperation<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
  context: Context,
  input: StartTriageJobInput,
): Promise<StartTriageJobOutput> {
  return deps.resolveClient(context).startTriageJob(input);
}

export function bindStartTriageJobOperation<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return ({ context, input }: StartTriageJobHandlerArgs<Context>): Promise<StartTriageJobOutput> =>
    startTriageJobOperation(deps, context, input);
}
