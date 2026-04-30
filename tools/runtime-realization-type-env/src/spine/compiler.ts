import { createExecutionDescriptorTable } from "../mini-runtime/process-runtime";
import { deriveProviderDependencyGraph } from "./derive";
import type {
  BootResourceModule,
  CompiledExecutionPlan,
  RuntimeBootgraphInputPlaceholder,
  RuntimeDiagnostic,
  RuntimeHarnessKind,
  RuntimeHarnessPlanPlaceholder,
  RuntimeSpineCompilation,
  RuntimeSpineDerivation,
} from "./artifacts";

function harnessKindFor(input: {
  readonly role: RuntimeHarnessPlanPlaceholder["role"];
  readonly surface: string;
}): RuntimeHarnessKind {
  if (input.role === "agent" && input.surface === "desktop") return "desktop";
  return input.role;
}

function compileHarnessPlaceholders(
  derivation: RuntimeSpineDerivation,
): readonly RuntimeHarnessPlanPlaceholder[] {
  return derivation.surfaceRuntimePlans.map((surfacePlan) => ({
    kind: "harness.plan-placeholder",
    harness: harnessKindFor(surfacePlan),
    role: surfacePlan.role,
    surface: surfacePlan.surface,
    executableBoundaryRefs: surfacePlan.executableBoundaryRefs,
    diagnostics: [
      {
        code: "runtime.harness.mounting-placeholder",
        message:
          "harness plan is a compile-time placeholder only; real host mounting remains out of scope for this lab slice",
      },
    ],
  }));
}

function uniqueResourceModules(
  providerDependencyGraph: RuntimeSpineCompilation["providerDependencyGraph"],
): readonly BootResourceModule[] {
  const modules = new Map<string, BootResourceModule>();

  for (const node of providerDependencyGraph?.nodes ?? []) {
    const key = JSON.stringify({
      instance: node.instance ?? null,
      lifetime: node.lifetime,
      providerId: node.providerId,
      resourceId: node.resourceId,
      role: node.role ?? null,
    });
    if (!modules.has(key)) {
      modules.set(key, {
        kind: "boot.resource-module",
        resourceId: node.resourceId,
        providerId: node.providerId,
        lifetime: node.lifetime,
        role: node.role,
        instance: node.instance,
      });
    }
  }

  return [...modules.values()];
}

function compileBootgraphPlaceholder(
  derivation: RuntimeSpineDerivation,
  providerDependencyGraph: RuntimeSpineCompilation["providerDependencyGraph"],
): RuntimeBootgraphInputPlaceholder {
  const diagnostics: RuntimeDiagnostic[] = [
    {
      code: "runtime.bootgraph.placeholder",
      message:
        "bootgraph input is a placeholder; provider acquisition, rollback, and finalization are not executed here",
    },
  ];

  if (providerDependencyGraph) {
    diagnostics.push(
      {
        code: "runtime.provider-effect-plan.lowering-reserved",
        message:
          "provider module refs are recorded without lowering ProviderEffectPlan; provider lowering remains unresolved",
      },
      ...providerDependencyGraph.diagnostics,
    );
  }

  return {
    kind: "bootgraph.input-placeholder",
    appId: derivation.appId,
    resourceModules: uniqueResourceModules(providerDependencyGraph),
    providerDependencyGraph,
    diagnostics,
  };
}

function compileExecutionPlans(
  derivation: RuntimeSpineDerivation,
): readonly CompiledExecutionPlan[] {
  return derivation.executionPlanSeeds.map((seed) => ({
    kind: "compiled.execution-plan",
    ref: seed.ref,
    policy: seed.policy,
  }));
}

export function compileRuntimeSpine(
  derivation: RuntimeSpineDerivation,
): RuntimeSpineCompilation {
  const providerDependencyGraph = deriveProviderDependencyGraph(derivation.profile);
  const descriptorTable = createExecutionDescriptorTable(
    derivation.descriptorTableInput.entries,
  );
  const executionPlans = compileExecutionPlans(derivation);
  const harnessPlans = compileHarnessPlaceholders(derivation);
  const bootgraphInput = compileBootgraphPlaceholder(
    derivation,
    providerDependencyGraph,
  );
  const diagnostics = [
    ...derivation.diagnostics,
    ...harnessPlans.flatMap((plan) => plan.diagnostics),
    ...bootgraphInput.diagnostics,
  ];

  return {
    kind: "runtime.spine-compilation",
    appId: derivation.appId,
    portableArtifact: derivation.portableArtifact,
    compiledProcessPlan: {
      kind: "compiled.process-plan",
      appId: derivation.appId,
      executionPlans,
    },
    registryInput: {
      kind: "compiled.execution-registry-input",
      executionPlans,
      descriptorTable,
    },
    providerDependencyGraph,
    harnessPlans,
    bootgraphInput,
    diagnostics,
  };
}
