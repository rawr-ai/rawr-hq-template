import { os } from "./orpc";
import { completeJob } from "./operations/complete-job";
import { getJob } from "./operations/get-job";
import { listJobs } from "./operations/list-jobs";
import { requestJob } from "./operations/request-job";
import { startJob } from "./operations/start-job";

export const supportTriageApiRouter = os.router({
  supportTriage: os.supportTriage.router({
    requestJob,
    listJobs,
    getJob,
    startJob,
    completeJob,
  }),
});

export type SupportTriageApiRouter = typeof supportTriageApiRouter;
