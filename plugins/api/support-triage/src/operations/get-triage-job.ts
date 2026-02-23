import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const getTriageJob = os.supportTriage.getTriageJob.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).getTriageJob(input);
});
