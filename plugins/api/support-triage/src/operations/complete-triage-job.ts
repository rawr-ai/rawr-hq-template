import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const completeTriageJob = os.supportTriage.completeTriageJob.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).completeTriageJob(input);
});
