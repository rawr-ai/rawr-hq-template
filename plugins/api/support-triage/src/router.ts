import { os } from "./orpc";
import { completeTriageJob } from "./operations/complete-triage-job";
import { getTriageJob } from "./operations/get-triage-job";
import { listTriageJobs } from "./operations/list-triage-jobs";
import { requestTriageJob } from "./operations/request-triage-job";
import { startTriageJob } from "./operations/start-triage-job";

export const supportTriageApiRouter = os.router({
  supportTriage: os.supportTriage.router({
    requestTriageJob,
    listTriageJobs,
    getTriageJob,
    startTriageJob,
    completeTriageJob,
  }),
});

export type SupportTriageApiRouter = typeof supportTriageApiRouter;

