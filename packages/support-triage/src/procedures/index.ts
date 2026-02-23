import { completeJobProcedure } from "./complete-job";
import { getJobProcedure } from "./get-job";
import { listJobsProcedure } from "./list-jobs";
import { requestJobProcedure } from "./request-job";
import { startJobProcedure } from "./start-job";

export const procedures = {
  requestJob: requestJobProcedure,
  listJobs: listJobsProcedure,
  getJob: getJobProcedure,
  startJob: startJobProcedure,
  completeJob: completeJobProcedure,
} as const;
