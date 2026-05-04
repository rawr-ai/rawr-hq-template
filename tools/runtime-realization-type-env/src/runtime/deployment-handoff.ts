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

const FORBIDDEN_HANDOFF_KEYS =
  /descriptorTable|descriptor$|^run$|runtimeAccess|liveRuntimeHandle|managedRuntime|effectRuntime|rawSecret|secret|token|password|credential|api[-_]?key|private[-_]?key/i;

function assertDeploymentHandoffSerializable(
  value: unknown,
  path: string,
  seen: WeakSet<object> = new WeakSet(),
): void {
  if (typeof value === "function" || typeof value === "symbol") {
    throw new Error(`deployment handoff rejects live handle at ${path}`);
  }

  if (value === null || typeof value !== "object") return;

  if (seen.has(value)) {
    throw new Error(`deployment handoff rejects cyclic value at ${path}`);
  }
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertDeploymentHandoffSerializable(entry, `${path}[${index}]`, seen),
    );
    seen.delete(value);
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_HANDOFF_KEYS.test(key)) {
      throw new Error(`deployment handoff rejects forbidden field at ${childPath}`);
    }
    assertDeploymentHandoffSerializable(entry, childPath, seen);
  }
  seen.delete(value);
}

export function createDeploymentRuntimeHandoff(input: {
  readonly portableArtifact: PortableRuntimePlanArtifact;
  readonly compiledProcessPlan: CompiledProcessPlan;
}): DeploymentRuntimeHandoff {
  if (input.portableArtifact.appId !== input.compiledProcessPlan.appId) {
    throw new Error(
      `deployment handoff appId mismatch: portable artifact ${input.portableArtifact.appId} does not match compiled process plan ${input.compiledProcessPlan.appId}`,
    );
  }

  assertDeploymentHandoffSerializable(
    input.portableArtifact,
    "portableArtifact",
  );
  assertDeploymentHandoffSerializable(
    input.compiledProcessPlan,
    "compiledProcessPlan",
  );

  return {
    kind: "deployment.runtime-handoff",
    appId: input.portableArtifact.appId,
    portableArtifact: input.portableArtifact,
    compiledProcessPlan: input.compiledProcessPlan,
  };
}
