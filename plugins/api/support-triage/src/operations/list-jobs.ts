import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const listJobs = os.supportTriage.listJobs.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).listJobs(input);
});
