import type { SupportTriageClient } from "@rawr/support-triage";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";

type RequestTriageJobInput = Parameters<SupportTriageClient["requestTriageJob"]>[0];
type RequestTriageJobOutput = Awaited<ReturnType<SupportTriageClient["requestTriageJob"]>>;

type RequestTriageJobHandlerArgs<Context extends SupportTriageApiContext> = {
  context: Context;
  input: RequestTriageJobInput;
};

export function createRequestTriageJobHandler<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return ({ context, input }: RequestTriageJobHandlerArgs<Context>): Promise<RequestTriageJobOutput> =>
    deps.resolveClient(context).requestTriageJob(input);
}
