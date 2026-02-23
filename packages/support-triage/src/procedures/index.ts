import { completeTriageJobProcedure } from "./complete-triage-job";
import { getTriageJobProcedure } from "./get-triage-job";
import { listTriageJobsProcedure } from "./list-triage-jobs";
import { requestTriageJobProcedure } from "./request-triage-job";
import { startTriageJobProcedure } from "./start-triage-job";

export const supportTriageProcedures = {
  requestTriageJob: requestTriageJobProcedure,
  listTriageJobs: listTriageJobsProcedure,
  getTriageJob: getTriageJobProcedure,
  startTriageJob: startTriageJobProcedure,
  completeTriageJob: completeTriageJobProcedure,
} as const;

