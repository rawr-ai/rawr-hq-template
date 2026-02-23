import { os } from "../orpc";
import { requireSupportTriageClient } from "../require-client";

export const listTriageJobs = os.supportTriage.listTriageJobs.handler(async ({ context, input }) => {
  return requireSupportTriageClient(context).listTriageJobs(input);
});
