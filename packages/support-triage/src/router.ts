import {
  completeTriageJobProcedure,
  getTriageJobProcedure,
  listTriageJobsProcedure,
  requestTriageJobProcedure,
  startTriageJobProcedure,
} from "./procedures";

export const supportTriageRouter = {
  requestTriageJob: requestTriageJobProcedure,
  listTriageJobs: listTriageJobsProcedure,
  getTriageJob: getTriageJobProcedure,
  startTriageJob: startTriageJobProcedure,
  completeTriageJob: completeTriageJobProcedure,
};

export type SupportTriageRouter = typeof supportTriageRouter;
