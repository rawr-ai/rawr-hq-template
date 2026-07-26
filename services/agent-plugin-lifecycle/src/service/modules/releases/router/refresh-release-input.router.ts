import { Effect } from "effect";

import type { ReleaseInputRefreshRequest } from "../model/dto/release-lifecycle";
import {
  classifyReleaseInputRefreshObservation,
  classifyReleaseInputRefreshObservationFailure,
  planReleaseInputRefreshObservation,
} from "../model/policy/staged-content-workspace";
import { module } from "../module";

export const refreshReleaseInput = module.refreshReleaseInput.effect(function* ({
  context,
  input,
}) {
  const request = snapshotRefreshRequest(input);
  const plan = planReleaseInputRefreshObservation(request);
  if (plan.kind !== "Ready") return plan;
  const observation = yield* Effect.result(
    context.stagedContentWorkspace.observeGitStagedIndex(plan.observationRequest)
  );
  return observation._tag === "Failure"
    ? classifyReleaseInputRefreshObservationFailure(observation.failure)
    : classifyReleaseInputRefreshObservation(request, plan.memberRoots, observation.success);
});

function snapshotRefreshRequest(input: ReleaseInputRefreshRequest): ReleaseInputRefreshRequest {
  return Object.freeze({
    contentWorkspace: Object.freeze({ ...input.contentWorkspace }),
    memberIds: Object.freeze([...input.memberIds]),
  });
}
