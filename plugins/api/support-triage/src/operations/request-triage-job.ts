import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const requestTriageJob = os.supportTriage.requestTriageJob.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).requestTriageJob(input);
});
