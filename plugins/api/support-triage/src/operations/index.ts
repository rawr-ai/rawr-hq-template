import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "../context";
import { bindCompleteTriageJobOperation } from "./complete-triage-job";
import { bindGetTriageJobOperation } from "./get-triage-job";
import { bindListTriageJobsOperation } from "./list-triage-jobs";
import { bindRequestTriageJobOperation } from "./request-triage-job";
import { bindStartTriageJobOperation } from "./start-triage-job";

export function createSupportTriageApiOperationHandlers<Context extends SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return {
    requestTriageJob: bindRequestTriageJobOperation(deps),
    listTriageJobs: bindListTriageJobsOperation(deps),
    getTriageJob: bindGetTriageJobOperation(deps),
    startTriageJob: bindStartTriageJobOperation(deps),
    completeTriageJob: bindCompleteTriageJobOperation(deps),
  };
}
