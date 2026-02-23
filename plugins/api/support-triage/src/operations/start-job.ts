import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const startJob = os.supportTriage.startJob.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).startJob(input);
});
