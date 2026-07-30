import { Effect } from "effect";

import {
  classifyReleaseInputRefreshObservation,
  classifyReleaseInputRefreshObservationFailure,
  planReleaseInputRefreshObservation,
} from "../model/policy/staged-content-workspace";
import { module } from "../module";

/** Refreshes the canonical release input from one immutable staged observation request. */
export const refreshReleaseInput = module.refreshReleaseInput.effect(function* ({
  context,
  input,
}) {
  const request = Object.freeze({
    contentWorkspace: Object.freeze({ ...input.contentWorkspace }),
    memberIds: Object.freeze([...input.memberIds]),
  });
  const plan = planReleaseInputRefreshObservation(request);
  if (plan.kind !== "Ready") return plan;
  const observation = yield* Effect.result(
    context.contentWorkspace.observeGitStagedIndex(plan.observationRequest)
  );
  return observation._tag === "Failure"
    ? classifyReleaseInputRefreshObservationFailure(observation.failure)
    : classifyReleaseInputRefreshObservation(request, plan.memberRoots, observation.success);
});
