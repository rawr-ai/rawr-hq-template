import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const startTriageJob = os.supportTriage.startTriageJob.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).startTriageJob(input);
});
