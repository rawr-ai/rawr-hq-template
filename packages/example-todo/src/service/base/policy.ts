import type { BasePolicyProfile } from "../../orpc-sdk";

/**
 * Baseline policy profile for the todo service.
 *
 * @remarks
 * This is the stable service-level slot for baseline policy naming and related
 * policy observer wiring. Enforcement middleware can remain elsewhere when it
 * has richer behavior than this profile needs to express.
 */
export const policy: BasePolicyProfile = {
  events: {
    readOnlyRejected: "todo.policy.read_only_rejected",
    assignmentLimitReached: "todo.policy.assignment_limit_reached",
  },
};
