import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const completeJob = os.supportTriage.completeJob.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).completeJob(input);
});
