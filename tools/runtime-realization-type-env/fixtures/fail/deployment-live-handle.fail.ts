// @expected-error TS2353
import type { DeploymentRuntimeHandoff } from "../../src/mini-runtime/deployment-handoff";

export const BadDeploymentRuntimeHandoff = {
  kind: "deployment.runtime-handoff",
  appId: "hq",
  portableArtifact: {
    kind: "portable.runtime-plan-artifact",
    appId: "hq",
    executionDescriptorRefs: [],
    serviceBindingPlans: [],
    surfaceRuntimePlans: [],
    workflowDispatcherDescriptors: [],
    diagnostics: [],
  },
  compiledProcessPlan: {
    kind: "compiled.process-plan",
    appId: "hq",
    executionPlans: [],
  },
  liveRuntimeHandle() {
    return "not portable";
  },
} as const satisfies DeploymentRuntimeHandoff;
