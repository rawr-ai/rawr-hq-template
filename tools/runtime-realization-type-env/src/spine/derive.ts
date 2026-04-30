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
  ServerRouteBoundaryKind,
  ServerRouteDeclaration,
  ServerRouteDerivationInput,
  ServerRouteDescriptor,
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

type AsyncDescriptorRef = Extract<
  ExecutionDescriptorRef,
  { boundary: "plugin.async-step" }
>;

type ServerDescriptorRef = Extract<
  ExecutionDescriptorRef,
  { boundary: "plugin.server-api" | "plugin.server-internal" }
>;

// Membership validation intentionally accepts widened refs so negative fixtures can
// exercise the one-owner lifecycle boundary after type erasure, without executing
// or interpreting the async step body.
function asyncOwnerEntries(ref: AsyncDescriptorRef): readonly {
  readonly kind: "workflow" | "schedule" | "consumer";
  readonly id: string;
}[] {
  const widened = ref as {
    readonly workflowId?: unknown;
    readonly scheduleId?: unknown;
    readonly consumerId?: unknown;
  };

  return [
    { kind: "workflow" as const, id: widened.workflowId },
    { kind: "schedule" as const, id: widened.scheduleId },
    { kind: "consumer" as const, id: widened.consumerId },
  ].filter(
    (entry): entry is {
      readonly kind: "workflow" | "schedule" | "consumer";
      readonly id: string;
    } => typeof entry.id === "string" && entry.id.length > 0,
  );
}

/**
 * Deterministic lab identity policy for portable descriptor refs. Production may
 * replace this naming scheme, but the semantic boundary should stay the same:
 * refs identify executable boundaries without carrying executable bodies.
 */
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

  // Service binding inputs are explicit lab materialization requests. This pass
  // dedupes construction-time identity only; it does not infer production
  // service topology or invocation-time cache membership.
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

function isServerRouteBoundary(
  boundary: unknown,
): boundary is ServerRouteBoundaryKind {
  return boundary === "plugin.server-api" || boundary === "plugin.server-internal";
}

function isServerDescriptorRef(ref: ExecutionDescriptorRef): ref is ServerDescriptorRef {
  return ref.boundary === "plugin.server-api" || ref.boundary === "plugin.server-internal";
}

function isValidRoutePath(routePath: unknown): routePath is readonly string[] {
  return (
    Array.isArray(routePath) &&
    routePath.length > 0 &&
    routePath.every((segment) => typeof segment === "string" && segment.length > 0)
  );
}

function routeDescriptorKey(input: {
  readonly boundary: ServerRouteBoundaryKind;
  readonly role: "server";
  readonly surface: string;
  readonly capability: string;
  readonly routePath: readonly string[];
}): string {
  return stableJson({
    boundary: input.boundary,
    capability: input.capability,
    role: input.role,
    routePath: input.routePath,
    surface: input.surface,
  });
}

function serverRouteExecutionId(input: {
  readonly appId: string;
  readonly identityPolicy: IdentityPolicy;
  readonly route: ServerRouteDeclaration;
}): string {
  if (input.route.executionId) return input.route.executionId;

  return input.identityPolicy.executionDescriptorId({
    appId: input.appId,
    boundary: input.route.boundary,
    role: input.route.role,
    surface: input.route.surface,
    capability: input.route.capability,
    routePath: input.route.routePath,
  });
}

function serverRouteMatchesRef(
  route: ServerRouteDeclaration,
  ref: ServerDescriptorRef,
): boolean {
  return (
    route.boundary === ref.boundary &&
    route.role === ref.role &&
    route.surface === ref.surface &&
    route.capability === ref.capability &&
    stableJson(route.routePath) === stableJson(ref.routePath)
  );
}

interface ServerRouteDerivationOutput {
  readonly refs: readonly ServerDescriptorRef[];
  readonly descriptorEntries: readonly ExecutionDescriptorTableEntry[];
  readonly executionPlanSeeds: readonly RuntimeSpineDerivation["executionPlanSeeds"][number][];
  readonly routeDescriptors: readonly ServerRouteDescriptor[];
}

function readServerRouteDeclarations(
  factory: ServerRouteDerivationInput,
  diagnostics: RuntimeDiagnostic[],
): readonly unknown[] {
  try {
    return factory.deriveRoutes();
  } catch (error) {
    diagnostics.push({
      code: "runtime.server-route-derivation.factory-failed",
      message: `server route factory ${factory.routeFactoryId} failed during cold derivation: ${error instanceof Error ? error.message : String(error)}`,
    });
    return [];
  }
}

function isServerRouteDeclaration(
  route: unknown,
  diagnostics: RuntimeDiagnostic[],
): route is ServerRouteDeclaration {
  const widened = route as {
    readonly boundary?: unknown;
    readonly importSafety?: unknown;
    readonly kind?: unknown;
    readonly role?: unknown;
    readonly routePath?: unknown;
  };

  if (widened.kind !== "server.route-declaration") {
    diagnostics.push({
      code: "runtime.server-route-derivation.invalid-declaration",
      message: "server route factory returned a non-route declaration",
    });
    return false;
  }

  if (!isServerRouteBoundary(widened.boundary) || widened.role !== "server") {
    diagnostics.push({
      code: "runtime.server-route-derivation.invalid-boundary",
      message: "server route derivation input must use a server API or server internal boundary",
    });
    return false;
  }

  if (!isValidRoutePath(widened.routePath)) {
    diagnostics.push({
      code: "runtime.server-route-derivation.invalid-route-path",
      message: "server route derivation input must include a non-empty routePath",
    });
    return false;
  }

  if (widened.importSafety !== "cold-declaration") {
    diagnostics.push({
      code: "runtime.server-route-derivation.import-unsafe",
      message:
        "server route derivation input must be marked as a cold declaration before route artifacts can be promoted",
    });
    return false;
  }

  return true;
}

function deriveServerRouteDescriptors(input: {
  readonly appId: string;
  readonly diagnostics: RuntimeDiagnostic[];
  readonly existingRefs: readonly ExecutionDescriptorRef[];
  readonly identityPolicy: IdentityPolicy;
  readonly seenExecutions: Set<string>;
  readonly serverRoutes?: readonly ServerRouteDerivationInput[];
}): ServerRouteDerivationOutput {
  const serverRefs = input.existingRefs.filter(isServerDescriptorRef);
  const serverRefsById = new Map(serverRefs.map((ref) => [ref.executionId, ref]));
  const matchedServerRefIds = new Set<string>();
  const seenRoutes = new Set<string>();
  const descriptorEntries: ExecutionDescriptorTableEntry[] = [];
  const executionPlanSeeds: RuntimeSpineDerivation["executionPlanSeeds"][number][] = [];
  const refs: ServerDescriptorRef[] = [];
  const routeDescriptors: ServerRouteDescriptor[] = [];

  // Route factories are the lab's import-safety boundary: derivation may call
  // the cold declaration factory, but must never execute route Effect bodies or
  // depend on native server adapter imports.
  for (const factory of input.serverRoutes ?? []) {
    for (const maybeRoute of readServerRouteDeclarations(factory, input.diagnostics)) {
      if (!isServerRouteDeclaration(maybeRoute, input.diagnostics)) continue;
      const route = maybeRoute;
      const routeKey = routeDescriptorKey(route);
      const routeDiagnostics: RuntimeDiagnostic[] = [];
      const executionId = serverRouteExecutionId({
        appId: input.appId,
        identityPolicy: input.identityPolicy,
        route,
      });

      if (seenRoutes.has(routeKey)) {
        routeDiagnostics.push({
          code: "runtime.server-route-derivation.duplicate-route",
          message: `duplicate server route derivation input for ${route.boundary}/${route.capability}/${joinPath(route.routePath)}`,
        });
      } else {
        seenRoutes.add(routeKey);
      }

      const matchedRef = serverRefsById.get(executionId);
      if (matchedRef) {
        if (!serverRouteMatchesRef(route, matchedRef)) {
          routeDiagnostics.push({
            code: "runtime.server-route-derivation.ref-mismatch",
            message: `server route ${executionId} does not match the derived server execution ref identity`,
          });
        } else {
          matchedServerRefIds.add(matchedRef.executionId);
        }
      } else {
        if (input.seenExecutions.has(executionId)) {
          routeDiagnostics.push({
            code: "runtime.server-route-derivation.duplicate-route",
            message: `server route ${executionId} duplicates an existing execution id`,
          });
        }

        if (routeDiagnostics.length === 0) {
          const ref = {
            kind: "execution.descriptor-ref",
            boundary: route.boundary,
            executionId,
            appId: input.appId,
            role: route.role,
            surface: route.surface,
            capability: route.capability,
            routePath: route.routePath,
          } as const satisfies ServerDescriptorRef;

          input.seenExecutions.add(executionId);
          refs.push(ref);
          matchedServerRefIds.add(ref.executionId);

          if (route.descriptor) {
            const descriptor = attachDerivedRef(route.descriptor, ref);
            descriptorEntries.push({ ref, descriptor });
            executionPlanSeeds.push({
              kind: "execution.plan-seed",
              ref,
              policy: route.policy,
            });
          }
        }
      }

      input.diagnostics.push(...routeDiagnostics);
      if (routeDiagnostics.length === 0) {
        routeDescriptors.push({
          kind: "server.route-descriptor",
          appId: input.appId,
          executionId,
          boundary: route.boundary,
          role: route.role,
          surface: route.surface,
          capability: route.capability,
          routePath: route.routePath,
          importSafety: route.importSafety,
          diagnostics: routeDiagnostics,
        });
      }
    }
  }

  // Explicit server refs stay as lab inventory unless a matching cold declaration
  // claims route authority; derivation does not infer server route descriptors from refs alone.
  for (const ref of serverRefs) {
    if (matchedServerRefIds.has(ref.executionId)) continue;
    input.diagnostics.push({
      code: "runtime.server-route-derivation.reserved",
      message: `server route ${ref.executionId} remains an explicit execution ref without a cold route derivation input`,
    });
  }

  return {
    refs,
    descriptorEntries,
    executionPlanSeeds,
    routeDescriptors,
  };
}

function deriveWorkflowDispatcherDescriptors(
  appId: string,
  dispatchers: readonly WorkflowDispatcherDerivationInput[],
): readonly WorkflowDispatcherDescriptor[] {
  return dispatchers.map((dispatcher) => {
    const workflowIds = new Set(dispatcher.workflowIds);
    const operations = dispatcher.operations ?? [];
    const diagnostics: RuntimeDiagnostic[] = [...(dispatcher.diagnostics ?? [])];

    // Workflow refs are only inventory until an operation declares dispatcher
    // authority; this keeps descriptor discovery from implying access.
    if (operations.length === 0) {
      diagnostics.push({
        code: "runtime.dispatcher-access.reserved",
        message:
          "dispatcher descriptor records operation inventory only; dispatcher access declaration remains unresolved",
      });
    }

    for (const operation of operations) {
      if (!workflowIds.has(operation.workflowId)) {
        diagnostics.push({
          code: "runtime.dispatcher-access.workflow-unlisted",
          message: `dispatcher operation ${operation.operation} targets undeclared workflow ${operation.workflowId}`,
        });
      }
    }

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
      operations,
      diagnostics,
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

function providerDependencyNode(input: {
  readonly resource: RuntimeResource<unknown>;
  readonly provider: { readonly id: string };
  readonly lifetime: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
}): ProviderDependencyGraphNode {
  return {
    kind: "provider.dependency-node",
    resourceId: input.resource.id,
    providerId: input.provider.id,
    lifetime: input.lifetime,
    role: input.role,
    instance: input.instance,
  };
}

function providerDependencyNodeKey(node: ProviderDependencyGraphNode): string {
  return stableJson({
    instance: node.instance ?? "default",
    lifetime: node.lifetime,
    providerId: node.providerId,
    resourceId: node.resourceId,
    role: node.role ?? "*",
  });
}

function providerDependencyNodeLabel(node: ProviderDependencyGraphNode): string {
  return `${node.providerId}:${node.resourceId}:${node.lifetime}:${node.role ?? "*"}:${node.instance ?? "default"}`;
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
  const labels = new Map<string, string>();

  for (const edge of edges) {
    if (!edge.matchedProviderKey) continue;
    const fromKey = providerDependencyNodeKey(edge.fromProviderKey);
    const matchedKey = providerDependencyNodeKey(edge.matchedProviderKey);
    const existing = dependencies.get(fromKey) ?? new Set<string>();
    existing.add(matchedKey);
    dependencies.set(fromKey, existing);
    labels.set(fromKey, providerDependencyNodeLabel(edge.fromProviderKey));
    labels.set(matchedKey, providerDependencyNodeLabel(edge.matchedProviderKey));
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
          message: `provider dependency cycle detected: ${cycle
            .map((nodeKey) => labels.get(nodeKey) ?? nodeKey)
            .join(" -> ")}`,
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

  // This graph is a profile-closure diagnostic boundary. It records selected
  // provider coverage and dependency edges before provisioning; acquisition,
  // release ordering, config precedence, and provider refresh policy belong to
  // later runtime/provisioning layers.
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

    nodes.push(providerDependencyNode(selection));
  }

  for (const selection of profile.providerSelections) {
    const fromProviderKey = providerDependencyNode(selection);
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
        fromProviderKey,
        toResourceId: requirement.resource.id,
        optional: requirement.optional ?? false,
        reason: requirement.reason,
        matchedProviderId: matchedSelection?.provider.id,
        matchedProviderKey: matchedSelection
          ? providerDependencyNode(matchedSelection)
          : undefined,
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
  // This is a lab-only membership diagnostic: it verifies that each async step
  // belongs to exactly one lifecycle owner, but does not lower, schedule, or
  // run the step.
  const seenAsyncMemberships = new Map<string, AsyncDescriptorRef>();

  for (const ref of refs) {
    if (ref.boundary !== "plugin.async-step") continue;

    const ownerEntries = asyncOwnerEntries(ref);
    if (ownerEntries.length !== 1) {
      diagnostics.push({
        code: "runtime.async-step-membership.invalid-owner",
        message: `async step ${ref.executionId} must declare exactly one workflow, schedule, or consumer owner`,
      });
      continue;
    }

    const [{ kind: ownerKind, id: ownerId }] = ownerEntries;
    const membershipKey = stableJson({
      ownerId,
      ownerKind,
      stepId: ref.stepId,
    });
    const existing = seenAsyncMemberships.get(membershipKey);

    if (existing) {
      diagnostics.push({
        code: "runtime.async-step-membership.duplicate",
        message: `duplicate async step membership for ${ownerKind} ${ownerId} step ${ref.stepId}`,
      });
      continue;
    }

    seenAsyncMemberships.set(membershipKey, ref);
  }

  return diagnostics;
}

export function deriveRuntimeSpine(
  input: RuntimeSpineDerivationInput,
): RuntimeSpineDerivation {
  // Derivation is the contained SDK-extraction substitute for this lab. It
  // accepts explicit declarations and cold route factories, then emits refs,
  // inventories, and table inputs without treating descriptor bodies as portable
  // or deciding final production authoring syntax.
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

  const serverRouteDerivation = deriveServerRouteDescriptors({
    appId: input.appId,
    diagnostics,
    existingRefs: executionDescriptorRefs,
    identityPolicy,
    seenExecutions,
    serverRoutes: input.serverRoutes,
  });
  executionDescriptorRefs.push(...serverRouteDerivation.refs);
  descriptorEntries.push(...serverRouteDerivation.descriptorEntries);
  executionPlanSeeds.push(...serverRouteDerivation.executionPlanSeeds);

  diagnostics.push(...deriveNegativeSpaceDiagnostics(executionDescriptorRefs));

  const serviceBindingPlans = deriveServiceBindingPlans(input, diagnostics);
  const surfaceRuntimePlans = deriveSurfaceRuntimePlans(executionDescriptorRefs);
  const serverRouteDescriptors = serverRouteDerivation.routeDescriptors;
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
    serverRouteDescriptors,
    workflowDispatcherDescriptors,
    diagnostics,
  };

  const portableArtifact: PortableRuntimePlanArtifact = {
    kind: "portable.runtime-plan-artifact",
    appId: input.appId,
    executionDescriptorRefs,
    serviceBindingPlans,
    surfaceRuntimePlans,
    serverRouteDescriptors,
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
    serverRouteDescriptors,
    workflowDispatcherDescriptors,
    portableArtifact,
    diagnostics,
  };
}
