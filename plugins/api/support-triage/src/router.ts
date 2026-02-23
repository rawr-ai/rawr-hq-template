import { implement } from "@orpc/server";
import { supportTriageApiContract } from "./contract";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "./context";
import { createSupportTriageApiOperationHandlers } from "./operations";

export function createSupportTriageApiRouter<Context extends SupportTriageApiContext = SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  const os = implement<typeof supportTriageApiContract, Context>(supportTriageApiContract);
  const handlers = createSupportTriageApiOperationHandlers(deps);

  return os.router({
    supportTriage: os.supportTriage.router({
      requestTriageJob: os.supportTriage.requestTriageJob.handler(handlers.requestTriageJob),
      listTriageJobs: os.supportTriage.listTriageJobs.handler(handlers.listTriageJobs),
      getTriageJob: os.supportTriage.getTriageJob.handler(handlers.getTriageJob),
      startTriageJob: os.supportTriage.startTriageJob.handler(handlers.startTriageJob),
      completeTriageJob: os.supportTriage.completeTriageJob.handler(handlers.completeTriageJob),
    }),
  });
}

export type SupportTriageApiRouter = ReturnType<typeof createSupportTriageApiRouter>;
