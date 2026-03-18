import { implement } from "@orpc/server";
import { supportTriageApiContract } from "./contract";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "./context";
import { createCompleteTriageJobHandler } from "./operations/complete-triage-job";
import { createGetTriageJobHandler } from "./operations/get-triage-job";
import { createListTriageJobsHandler } from "./operations/list-triage-jobs";
import { createRequestTriageJobHandler } from "./operations/request-triage-job";
import { createStartTriageJobHandler } from "./operations/start-triage-job";

export function createSupportTriageApiRouter<Context extends SupportTriageApiContext = SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  const os = implement<typeof supportTriageApiContract, Context>(supportTriageApiContract);

  return os.router({
    supportTriage: os.supportTriage.router({
      requestTriageJob: os.supportTriage.requestTriageJob.handler(createRequestTriageJobHandler(deps)),
      listTriageJobs: os.supportTriage.listTriageJobs.handler(createListTriageJobsHandler(deps)),
      getTriageJob: os.supportTriage.getTriageJob.handler(createGetTriageJobHandler(deps)),
      startTriageJob: os.supportTriage.startTriageJob.handler(createStartTriageJobHandler(deps)),
      completeTriageJob: os.supportTriage.completeTriageJob.handler(createCompleteTriageJobHandler(deps)),
    }),
  });
}

export type SupportTriageApiRouter = ReturnType<typeof createSupportTriageApiRouter>;
