import type { RuntimeWorkflowAdmissionSource } from "../../derivation/src/workflow-admission-source";

/** Exact provisioned selection beside a caller-local admission capability, never portable data. */
export interface RuntimeCompiledWorkflowAdmission extends RuntimeWorkflowAdmissionSource {
  readonly clientSelectionId: string;
}

export type RuntimeCompiledWorkflowAdmissionEntries = readonly (readonly [
  surfacePlanId: string,
  admissions: readonly RuntimeCompiledWorkflowAdmission[],
])[];
