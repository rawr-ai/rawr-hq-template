// @expected-error TS2353
import type { PortableRuntimePlanArtifact } from "@rawr/sdk/spine";

export const BadPortableArtifact = {
  kind: "portable.runtime-plan-artifact",
  appId: "hq",
  executionDescriptorRefs: [],
  serviceBindingPlans: [],
  surfaceRuntimePlans: [],
  serverRouteDescriptors: [],
  workflowDispatcherDescriptors: [],
  diagnostics: [],
  descriptorTable: {
    kind: "execution.descriptor-table",
  },
} as const satisfies PortableRuntimePlanArtifact;
