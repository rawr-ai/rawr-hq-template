import type { ReleaseInputRefreshRequest } from "../model/dto/release-lifecycle";
import {
  classifyReleaseInputRefreshObservation,
  planReleaseInputRefreshObservation,
} from "../model/policy/staged-content-workspace";
import { module } from "../module";

export const refreshReleaseInput = module.refreshReleaseInput.handler(
  async ({ context, input }) => {
    const request = snapshotRefreshRequest(input);
    const plan = planReleaseInputRefreshObservation(request);
    if (plan.kind !== "Ready") return plan;
    const observation = await context.stagedSource.observe(plan.observationRequest);
    return classifyReleaseInputRefreshObservation(request, plan.memberRoots, observation);
  }
);

function snapshotRefreshRequest(input: ReleaseInputRefreshRequest): ReleaseInputRefreshRequest {
  return Object.freeze({
    contentWorkspace: Object.freeze({ ...input.contentWorkspace }),
    memberIds: Object.freeze([...input.memberIds]),
  });
}
