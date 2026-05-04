import type {
  CompiledProcessPlan,
  PortableRuntimePlanArtifact,
} from "../spine/artifacts";

export interface DeploymentRuntimeHandoff {
  readonly kind: "deployment.runtime-handoff";
  readonly appId: string;
  readonly portableArtifact: PortableRuntimePlanArtifact;
  readonly compiledProcessPlan: CompiledProcessPlan;
}

export function createDeploymentRuntimeHandoff(input: {
  readonly portableArtifact: PortableRuntimePlanArtifact;
  readonly compiledProcessPlan: CompiledProcessPlan;
}): DeploymentRuntimeHandoff {
  return {
    kind: "deployment.runtime-handoff",
    appId: input.portableArtifact.appId,
    portableArtifact: input.portableArtifact,
    compiledProcessPlan: input.compiledProcessPlan,
  };
}
