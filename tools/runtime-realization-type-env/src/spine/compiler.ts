import { createExecutionDescriptorTable } from "../mini-runtime/process-runtime";
import { deriveProviderDependencyGraph } from "./derive";
import type {
  AsyncStepBridgePayload,
  BootResourceModule,
  CompiledExecutionPlan,
  RuntimeBootgraphInputPlaceholder,
  RuntimeAdapterLoweringPlan,
  RuntimeDiagnostic,
  RuntimeHarnessKind,
  RuntimeHarnessPlanPlaceholder,
  RuntimeSpineCompilation,
  RuntimeSpineDerivation,
  ServerAdapterCallbackPayload,
  ServerRouteDescriptor,
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
  // Harness plans are intentionally placeholders: the compiler groups executable
  // refs by role/surface, while real host mounting and native lifecycle policy
  // remain outside this contained spine slice.
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
  // The compiler emits bootgraph-shaped input for review and downstream mini
  // runtime experiments only. It must not be read as production bootgraph
  // authority or evidence that provider acquire/release has run.
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
          "compiled bootgraph input records provider module refs only; contained provider lowering is proven separately in the mini provisioning runtime",
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

function routePathMatches(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length && left.every((part, index) => part === right[index]);
}

function serverRouteMatchesRef(
  descriptor: ServerRouteDescriptor,
  ref: ServerAdapterCallbackPayload["ref"],
): boolean {
  return (
    descriptor.appId === ref.appId &&
    descriptor.executionId === ref.executionId &&
    descriptor.boundary === ref.boundary &&
    descriptor.role === ref.role &&
    descriptor.surface === ref.surface &&
    descriptor.capability === ref.capability &&
    routePathMatches(descriptor.routePath, ref.routePath)
  );
}

function isServerAdapterRef(
  ref: RuntimeSpineDerivation["executionDescriptorRefs"][number] | undefined,
): ref is ServerAdapterCallbackPayload["ref"] {
  return (
    !!ref &&
    (ref.boundary === "plugin.server-api" ||
      ref.boundary === "plugin.server-internal")
  );
}

function asyncOwnerEntries(ref: AsyncStepBridgePayload["ref"]) {
  const widened = ref as {
    readonly consumerId?: unknown;
    readonly scheduleId?: unknown;
    readonly workflowId?: unknown;
  };

  return [
    { kind: "workflow" as const, id: widened.workflowId },
    { kind: "schedule" as const, id: widened.scheduleId },
    { kind: "consumer" as const, id: widened.consumerId },
  ].filter(
    (entry): entry is AsyncStepBridgePayload["owner"] =>
      typeof entry.id === "string" && entry.id.length > 0,
  );
}

function compileAdapterLoweringPlan(
  derivation: RuntimeSpineDerivation,
): RuntimeAdapterLoweringPlan {
  const diagnostics: RuntimeDiagnostic[] = [];
  const payloads: (ServerAdapterCallbackPayload | AsyncStepBridgePayload)[] = [];
  const refsByExecutionId = new Map(
    derivation.executionDescriptorRefs.map((ref) => [ref.executionId, ref]),
  );

  // Adapter payloads are the last lab-only, pre-harness lowering point. They
  // preserve validated refs plus route/step identity for diagnostic/review
  // evidence, but they do not mount server hosts or decide durable async
  // runtime behavior.
  for (const routeDescriptor of derivation.serverRouteDescriptors) {
    const ref = refsByExecutionId.get(routeDescriptor.executionId);
    if (!isServerAdapterRef(ref)) {
      diagnostics.push({
        code: "runtime.adapter-lowering.server-ref-missing",
        message: `server adapter payload ${routeDescriptor.executionId} has no matching server execution ref`,
      });
      continue;
    }

    if (!serverRouteMatchesRef(routeDescriptor, ref)) {
      diagnostics.push({
        code: "runtime.adapter-lowering.server-route-mismatch",
        message: `server adapter payload ${routeDescriptor.executionId} route descriptor does not match its execution ref`,
      });
      continue;
    }

    payloads.push({
      kind: "adapter.server-callback-payload",
      ref,
      routeDescriptor,
      diagnostics: [],
    });
  }

  for (const ref of derivation.executionDescriptorRefs) {
    if (ref.boundary !== "plugin.async-step") continue;

    const owners = asyncOwnerEntries(ref);
    if (owners.length !== 1) {
      diagnostics.push({
        code: "runtime.adapter-lowering.async-owner-invalid",
        message: `async bridge payload ${ref.executionId} must declare exactly one workflow, schedule, or consumer owner`,
      });
      continue;
    }

    const owner = owners[0];
    if (!owner) continue;

    payloads.push({
      kind: "adapter.async-step-bridge-payload",
      ref,
      owner,
      stepId: ref.stepId,
      diagnostics: [],
    });
  }

  return {
    kind: "adapter.lowering-plan",
    payloads,
    diagnostics,
  };
}

export function compileRuntimeSpine(
  derivation: RuntimeSpineDerivation,
): RuntimeSpineCompilation {
  // Compilation stitches derived artifacts into runtime-shaped inputs for the
  // contained lab. The descriptor table is deliberately non-portable, and the
  // remaining outputs preserve unresolved host, provider, and bootgraph seams.
  const providerDependencyGraph = deriveProviderDependencyGraph(derivation.profile);
  const descriptorTable = createExecutionDescriptorTable(
    derivation.descriptorTableInput.entries,
  );
  const executionPlans = compileExecutionPlans(derivation);
  const harnessPlans = compileHarnessPlaceholders(derivation);
  const adapterLoweringPlan = compileAdapterLoweringPlan(derivation);
  const bootgraphInput = compileBootgraphPlaceholder(
    derivation,
    providerDependencyGraph,
  );
  const diagnostics = [
    ...derivation.diagnostics,
    ...harnessPlans.flatMap((plan) => plan.diagnostics),
    ...adapterLoweringPlan.diagnostics,
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
    adapterLoweringPlan,
    bootgraphInput,
    diagnostics,
  };
}
