import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const requestJob = os.supportTriage.requestJob.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).requestJob(input);
});
