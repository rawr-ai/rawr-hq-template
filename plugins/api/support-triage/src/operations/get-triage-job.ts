import type { SupportTriageClient } from "@rawr/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";

type GetTriageJobInput = Parameters<SupportTriageClient["getTriageJob"]>[0];
type GetTriageJobOutput = Awaited<ReturnType<SupportTriageClient["getTriageJob"]>>;

type GetTriageJobHandlerArgs<Context extends SupportTriageApiContext> = {
  context: Context;
  input: GetTriageJobInput;
};

export function createGetTriageJobHandler<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return ({ context, input }: GetTriageJobHandlerArgs<Context>): Promise<GetTriageJobOutput> =>
    deps.resolveClient(context).getTriageJob(input);
}
