import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const getJob = os.supportTriage.getJob.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).getJob(input);
});
