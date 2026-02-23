import type { SupportTriageClient } from "@rawr/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";

type StartTriageJobInput = Parameters<SupportTriageClient["startTriageJob"]>[0];
type StartTriageJobOutput = Awaited<ReturnType<SupportTriageClient["startTriageJob"]>>;

type StartTriageJobHandlerArgs<Context extends SupportTriageApiContext> = {
  context: Context;
  input: StartTriageJobInput;
};

export function createStartTriageJobHandler<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return ({ context, input }: StartTriageJobHandlerArgs<Context>): Promise<StartTriageJobOutput> =>
    deps.resolveClient(context).startTriageJob(input);
}
