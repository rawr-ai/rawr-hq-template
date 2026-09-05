import type { PluginDefinition } from "../../definition/src/plugin";
import type {
  WorkflowAdmissionDefinition,
  WorkflowDispatcherTarget,
} from "../../definition/src/workflow-admission";
import type {
  WorkflowDispatcherClientRequirement,
  WorkflowDispatcherUse,
  WorkflowDispatcherUses,
} from "../../definition/src/workflow-dispatcher-use";

export type RuntimeWorkflowAdmissionCaller = PluginDefinition<
  "server",
  "server/api" | "server/internal"
> & {
  readonly workflows: WorkflowDispatcherUses;
};

/** Selected admission references do not select the target's native execution surface. */
export interface RuntimeWorkflowAdmissionSource {
  readonly caller: RuntimeWorkflowAdmissionCaller;
  readonly useName: string;
  readonly use: WorkflowDispatcherUse;
  readonly target: WorkflowDispatcherTarget;
  readonly workflows: readonly WorkflowAdmissionDefinition[];
  readonly client: WorkflowDispatcherClientRequirement;
  readonly descriptorId: string;
  readonly clientRequirementId: string;
}

export type RuntimeWorkflowAdmissionEntries = readonly (readonly [
  surfacePlanId: string,
  admissions: readonly RuntimeWorkflowAdmissionSource[],
])[];
