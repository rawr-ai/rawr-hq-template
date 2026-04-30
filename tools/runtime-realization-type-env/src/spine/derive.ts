import type {
  AppRole,
  ResourceLifetime,
  RuntimeResource,
} from "../sdk/runtime/resources";
import type {
  ExecutionDescriptor,
  ExecutionDescriptorIdentityInput,
  ExecutionDescriptorRef,
  ExecutionDescriptorTableEntry,
  IdentityPolicy,
  NormalizedAuthoringGraph,
  PortableRuntimePlanArtifact,
  ProviderDependencyGraph,
  ProviderDependencyGraphEdge,
  ProviderDependencyGraphNode,
  RuntimeDiagnostic,
  RuntimeExecutionDerivationInput,
  RuntimeSpineDerivation,
  RuntimeSpineDerivationInput,
  ServiceBindingPlan,
  SurfaceRuntimePlan,
  WorkflowDispatcherDescriptor,
  WorkflowDispatcherDerivationInput,
} from "./artifacts";

function joinPath(parts: readonly string[]): string {
  return parts.join(".");
}

function asyncOwnerId(input: Extract<
  ExecutionDescriptorIdentityInput,
  { boundary: "plugin.async-step" }
>): string {
  if (input.workflowId) return input.workflowId;
  if (input.scheduleId) return input.scheduleId;
  if (input.consumerId) return input.consumerId;
  throw new Error("async execution input must include workflowId, scheduleId, or consumerId");
}

export const defaultRuntimeSpineIdentityPolicy = {
  executionDescriptorId(input) {
    switch (input.boundary) {
      case "service.procedure":
        return `exec:service:${input.serviceId}:${joinPath(input.procedurePath)}`;
      case "plugin.server-api":
        return `exec:server:${input.capability}:${joinPath(input.routePath)}`;
      case "plugin.server-internal":
        return `exec:server-internal:${input.capability}:${joinPath(input.routePath)}`;
      case "plugin.async-step":
        return `exec:async:${asyncOwnerId(input)}:${input.stepId}`;
      case "plugin.cli-command":
        return `exec:cli:${input.capability}:${input.commandId}`;
      case "plugin.web-surface":
        return `exec:web:${input.capability}:${joinPath(input.routePath)}`;
      case "plugin.agent-tool":
        return `exec:agent:${input.capability}:${input.toolId}`;
      case "plugin.desktop-background":
        return `exec:desktop:${input.capability}:${input.backgroundId}`;
    }
  },
} satisfies IdentityPolicy;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(
        ([entryKey, entryValue]) =>
          `${JSON.stringify(entryKey)}:${stableJson(entryValue)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "undefined";
}

function assertSameExecutableRef(
  expected: ExecutionDescriptorRef,
  actual: ExecutionDescriptorRef,
  label: string,
): void {
  const expectedIdentity = stableJson(expected);
  const actualIdentity = stableJson(actual);

  if (expectedIdentity !== actualIdentity) {
    throw new Error(
      `${label} mismatch: expected ${expected.boundary}/${expected.executionId}, got ${actual.boundary}/${actual.executionId}`,
    );
  }
}

function isExecutionDescriptorRef(value: unknown): value is ExecutionDescriptorRef {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { readonly kind?: unknown }).kind === "execution.descriptor-ref"
  );
}

function attachDerivedRef(
  descriptor: ExecutionDescriptor<any, any, any, any, any>,
  ref: ExecutionDescriptorRef,
): ExecutionDescriptor<any, any, any, any, any> {
  const existingRef = (descriptor as { readonly ref?: unknown }).ref;

  if (existingRef !== undefined) {
    if (!isExecutionDescriptorRef(existingRef)) {
      throw new Error(
        `descriptor ref mismatch: invalid descriptor ref for ${ref.executionId}`,
      );
    }
    assertSameExecutableRef(ref, existingRef, "descriptor derivation");
  }

  return {
    ...descriptor,
    ref,
  };
}

function deriveRef(
  appId: string,
  execution: RuntimeExecutionDerivationInput,
  identityPolicy: IdentityPolicy,
): ExecutionDescriptorRef {
  const {
    kind: _kind,
    descriptor: _descriptor,
    policy: _policy,
    executionId,
    ...identityWithoutApp
  } = execution;
  const identity = {
    ...identityWithoutApp,
    appId,
  } as ExecutionDescriptorIdentityInput;

  return {
    kind: "execution.descriptor-ref",
    executionId: executionId ?? identityPolicy.executionDescriptorId(identity),
    ...identity,
  } as ExecutionDescriptorRef;
}

function deriveServiceBindingPlans(
  input: RuntimeSpineDerivationInput,
  diagnostics: RuntimeDiagnostic[],
): readonly ServiceBindingPlan[] {
  const plans: ServiceBindingPlan[] = [];
  const seen = new Set<string>();

  for (const serviceBinding of input.serviceBindings ?? []) {
    const key = stableJson({
      capability: serviceBinding.capability,
      configHash: serviceBinding.configHash,
      dependencyInstances: serviceBinding.dependencyInstances ?? [],
      role: serviceBinding.role,
      scopeHash: serviceBinding.scopeHash,
      serviceId: serviceBinding.serviceId,
      serviceInstance: serviceBinding.serviceInstance ?? "default",
      surface: serviceBinding.surface,
    });
    if (seen.has(key)) {
      diagnostics.push({
        code: "runtime.service-binding.duplicate",
        message: `duplicate service binding plan for ${serviceBinding.role}/${serviceBinding.surface}/${serviceBinding.capability}/${serviceBinding.serviceId}`,
      });
      continue;
    }

    seen.add(key);
    plans.push({
      kind: "service.binding-plan",
      serviceId: serviceBinding.serviceId,
      serviceInstance: serviceBinding.serviceInstance,
      role: serviceBinding.role,
      surface: serviceBinding.surface,
      capability: serviceBinding.capability,
      dependencyInstances: serviceBinding.dependencyInstances ?? [],
      scopeHash: serviceBinding.scopeHash,
      configHash: serviceBinding.configHash,
    });
  }

  return plans;
}

function deriveSurfaceRuntimePlans(
  refs: readonly ExecutionDescriptorRef[],
): readonly SurfaceRuntimePlan[] {
  const bySurface = new Map<
    string,
    {
      readonly role: AppRole;
      readonly surface: string;
      readonly refs: ExecutionDescriptorRef[];
    }
  >();

  for (const ref of refs) {
    const key = `${ref.role}:${ref.surface}`;
    let existing = bySurface.get(key);
    if (!existing) {
      existing = {
        role: ref.role,
        surface: ref.surface,
        refs: [],
      };
      bySurface.set(key, existing);
    }
    existing.refs.push(ref);
  }

  return [...bySurface.values()].map((surface) => ({
    kind: "surface.runtime-plan",
    role: surface.role,
    surface: surface.surface,
    executableBoundaryRefs: surface.refs,
  }));
}

function uniqueWorkflowRefs(workflowIds: readonly string[]) {
  return [...new Set(workflowIds)].map((workflowId) => ({ workflowId }));
}

function deriveWorkflowDispatcherDescriptors(
  appId: string,
  dispatchers: readonly WorkflowDispatcherDerivationInput[],
): readonly WorkflowDispatcherDescriptor[] {
  return dispatchers.map((dispatcher) => {
    const reservedDiagnostics: RuntimeDiagnostic[] = [
      {
        code: "runtime.dispatcher-access.reserved",
        message:
          "dispatcher descriptor records operation inventory only; dispatcher access declaration remains unresolved",
      },
      ...(dispatcher.diagnostics ?? []),
    ];

    return {
      kind: "workflow.dispatcher-descriptor",
      descriptorId:
        dispatcher.descriptorId ??
        `dispatcher:${dispatcher.capability}:${dispatcher.surface}`,
      appId,
      role: dispatcher.role,
      surface: dispatcher.surface,
      capability: dispatcher.capability,
      workflowRefs: uniqueWorkflowRefs(dispatcher.workflowIds),
      operations: dispatcher.operations ?? [],
      diagnostics: reservedDiagnostics,
    };
  });
}

function providerSelectionKey(input: {
  readonly resource: RuntimeResource<unknown>;
  readonly lifetime: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
}): string {
  return stableJson({
    instance: input.instance ?? "default",
    lifetime: input.lifetime,
    resourceId: input.resource.id,
    role: input.role ?? "*",
  });
}

function roleMatches(candidateRole: AppRole | undefined, expectedRole: AppRole | undefined) {
  if (expectedRole === undefined) return candidateRole === undefined;
  return candidateRole === expectedRole || candidateRole === undefined;
}

function lifetimeMatches(
  candidateLifetime: ResourceLifetime,
  expectedLifetime: ResourceLifetime | undefined,
): boolean {
  return expectedLifetime === undefined || candidateLifetime === expectedLifetime;
}

function instanceMatches(
  candidateInstance: string | undefined,
  expectedInstance: string | undefined,
): boolean {
  return expectedInstance === undefined
    ? candidateInstance === undefined
    : candidateInstance === expectedInstance;
}

function collectProviderCycles(
  edges: readonly ProviderDependencyGraphEdge[],
): readonly RuntimeDiagnostic[] {
  const dependencies = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!edge.matchedProviderId) continue;
    const existing = dependencies.get(edge.fromProviderId) ?? new Set<string>();
    existing.add(edge.matchedProviderId);
    dependencies.set(edge.fromProviderId, existing);
  }

  const diagnostics: RuntimeDiagnostic[] = [];
  const emittedCycles = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(providerId: string, path: readonly string[]): void {
    if (visiting.has(providerId)) {
      const cycleStart = path.indexOf(providerId);
      const cycle = [...path.slice(cycleStart), providerId];
      const key = cycle.join(" -> ");
      if (!emittedCycles.has(key)) {
        emittedCycles.add(key);
        diagnostics.push({
          code: "provider.dependency.cycle",
          message: `provider dependency cycle detected: ${key}`,
        });
      }
      return;
    }

    if (visited.has(providerId)) return;

    visiting.add(providerId);
    for (const dependencyId of dependencies.get(providerId) ?? []) {
      visit(dependencyId, [...path, providerId]);
    }
    visiting.delete(providerId);
    visited.add(providerId);
  }

  for (const providerId of dependencies.keys()) {
    visit(providerId, []);
  }

  return diagnostics;
}

export function deriveProviderDependencyGraph(
  profile: RuntimeSpineDerivationInput["profile"],
): ProviderDependencyGraph | undefined {
  if (!profile) return undefined;

  const diagnostics: RuntimeDiagnostic[] = [];
  const seenSelections = new Map<string, string>();
  const nodes: ProviderDependencyGraphNode[] = [];
  const edges: ProviderDependencyGraphEdge[] = [];

  for (const selection of profile.providerSelections) {
    const key = providerSelectionKey(selection);
    const existingProviderId = seenSelections.get(key);
    if (existingProviderId) {
      diagnostics.push({
        code: "provider.coverage.ambiguous",
        message: `resource ${selection.resource.id} has ambiguous provider coverage for role ${selection.role ?? "*"} lifetime ${selection.lifetime}`,
      });
    } else {
      seenSelections.set(key, selection.provider.id);
    }

    nodes.push({
      kind: "provider.dependency-node",
      resourceId: selection.resource.id,
      providerId: selection.provider.id,
      lifetime: selection.lifetime,
      role: selection.role,
      instance: selection.instance,
    });
  }

  for (const selection of profile.providerSelections) {
    for (const requirement of selection.provider.requires) {
      const expectedRole = requirement.role ?? selection.role;
      const matchedSelection = profile.providerSelections.find(
        (candidate) =>
          candidate.resource.id === requirement.resource.id &&
          roleMatches(candidate.role, expectedRole) &&
          lifetimeMatches(candidate.lifetime, requirement.lifetime) &&
          instanceMatches(candidate.instance, requirement.instance),
      );

      edges.push({
        kind: "provider.dependency-edge",
        fromProviderId: selection.provider.id,
        toResourceId: requirement.resource.id,
        optional: requirement.optional ?? false,
        reason: requirement.reason,
        matchedProviderId: matchedSelection?.provider.id,
      });

      if (!requirement.optional && !matchedSelection) {
        diagnostics.push({
          code: "provider.coverage.missing",
          message: `provider ${selection.provider.id} requires ${requirement.resource.id}, but the profile does not select a provider for it`,
        });
      }
    }
  }

  diagnostics.push(...collectProviderCycles(edges));

  return {
    kind: "provider.dependency-graph",
    profileId: profile.id,
    nodes,
    edges,
    diagnostics,
  };
}

function deriveNegativeSpaceDiagnostics(
  refs: readonly ExecutionDescriptorRef[],
): readonly RuntimeDiagnostic[] {
  const diagnostics: RuntimeDiagnostic[] = [];

  if (refs.some((ref) => ref.boundary === "plugin.async-step")) {
    diagnostics.push({
      code: "runtime.async-step-membership.reserved",
      message:
        "async step refs come only from explicit lab inputs; workflow membership derivation remains unresolved",
    });
  }

  if (
    refs.some(
      (ref) =>
        ref.boundary === "plugin.server-api" ||
        ref.boundary === "plugin.server-internal",
    )
  ) {
    diagnostics.push({
      code: "runtime.server-route-derivation.reserved",
      message:
        "server route paths are explicit lab inputs; cold route factory derivation remains unresolved",
    });
  }

  return diagnostics;
}

export function deriveRuntimeSpine(
  input: RuntimeSpineDerivationInput,
): RuntimeSpineDerivation {
  const identityPolicy = input.identityPolicy ?? defaultRuntimeSpineIdentityPolicy;
  const diagnostics: RuntimeDiagnostic[] = [];
  const executionDescriptorRefs: ExecutionDescriptorRef[] = [];
  const descriptorEntries: ExecutionDescriptorTableEntry[] = [];
  const executionPlanSeeds: RuntimeSpineDerivation["executionPlanSeeds"][number][] = [];
  const seenExecutions = new Set<string>();

  for (const execution of input.executions) {
    const ref = deriveRef(input.appId, execution, identityPolicy);

    if (seenExecutions.has(ref.executionId)) {
      throw new Error(`duplicate execution derivation: ${ref.executionId}`);
    }
    seenExecutions.add(ref.executionId);
    executionDescriptorRefs.push(ref);

    if (execution.descriptor) {
      const descriptor = attachDerivedRef(execution.descriptor, ref);
      descriptorEntries.push({ ref, descriptor });
      executionPlanSeeds.push({
        kind: "execution.plan-seed",
        ref,
        policy: execution.policy,
      });
    }
  }

  diagnostics.push(...deriveNegativeSpaceDiagnostics(executionDescriptorRefs));

  const serviceBindingPlans = deriveServiceBindingPlans(input, diagnostics);
  const surfaceRuntimePlans = deriveSurfaceRuntimePlans(executionDescriptorRefs);
  const workflowDispatcherDescriptors = deriveWorkflowDispatcherDescriptors(
    input.appId,
    input.dispatchers ?? [],
  );
  diagnostics.push(
    ...workflowDispatcherDescriptors.flatMap(
      (descriptor) => descriptor.diagnostics,
    ),
  );

  const normalizedGraph: NormalizedAuthoringGraph = {
    kind: "normalized.authoring-graph",
    appId: input.appId,
    executionDescriptorRefs,
    serviceBindingPlans,
    surfaceRuntimePlans,
    workflowDispatcherDescriptors,
    diagnostics,
  };

  const portableArtifact: PortableRuntimePlanArtifact = {
    kind: "portable.runtime-plan-artifact",
    appId: input.appId,
    executionDescriptorRefs,
    serviceBindingPlans,
    surfaceRuntimePlans,
    workflowDispatcherDescriptors,
    diagnostics,
  };

  return {
    kind: "runtime.spine-derivation",
    appId: input.appId,
    profile: input.profile,
    normalizedGraph,
    executionDescriptorRefs,
    descriptorTableInput: {
      kind: "execution.descriptor-table-input",
      entries: descriptorEntries,
    },
    executionPlanSeeds,
    serviceBindingPlans,
    surfaceRuntimePlans,
    workflowDispatcherDescriptors,
    portableArtifact,
    diagnostics,
  };
}
