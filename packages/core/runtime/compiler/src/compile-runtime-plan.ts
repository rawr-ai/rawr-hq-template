import { Check } from "typebox/value";

import type { RuntimeProvider } from "../../definition/src/provider";
import type { ServiceRuntimeExport } from "../../definition/src/service";
import { readRuntimeDerivationHandoff } from "../../derivation/src/derivation-handoff";
import type { RuntimeDerivationResult } from "../../derivation/src/derive-runtime-artifacts";
import {
  executionDescriptorIdentityInput,
  executionDescriptorRefTuple,
} from "../../derivation/src/execution-descriptor-ref";
import {
  canonicalJson,
  executionDescriptorId,
  providerSelectionId,
  resourceRequirementId,
  semanticDependencyId,
  serviceBindingId,
  surfacePlanId,
} from "../../derivation/src/identity-policy";
import {
  NormalizedAuthoringGraphRuntimeSchema,
  type ResourceRequirement,
} from "../../derivation/src/normalized-authoring-graph";
import type { ServiceBindingPlan } from "../../derivation/src/service-binding-plan";
import { assertSurfaceReferenceRelation } from "../../derivation/src/surface-reference-policy";
import type { RuntimeCompilationReferenceTable } from "./compilation-reference-contract";
import { compileSurfaceWorkflowAdmissions } from "./compile-workflow-admissions";
import {
  type CompilationObservationSeed,
  CompilationObservationSeedSchema,
  CompiledExecutionPlanSchema,
  type CompiledProcessPlan,
  CompiledProcessPlanSchema,
  type CompiledResourceBinding,
  type ProviderDependencyEdge,
  type ProviderDependencyNode,
} from "./compiled-process-plan";
import { createRuntimeCompilationReferenceTable } from "./runtime-compilation-reference-table";
import type { RuntimeCompiledWorkflowAdmission } from "./runtime-workflow-admission";

export interface RuntimeCompilationInput {
  readonly derivation: RuntimeDerivationResult;
}

export interface RuntimeCompilationResult {
  readonly plan: CompiledProcessPlan;
  readonly references: RuntimeCompilationReferenceTable;
  readonly observationSeed: CompilationObservationSeed;
}

function refuse(reason: string): never {
  throw new TypeError(`Runtime compilation refused: ${reason}.`);
}

const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

function compareTuple(left: readonly string[], right: readonly string[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const order = compare(left[index] ?? "", right[index] ?? "");
    if (order !== 0) return order;
  }
  return 0;
}

function same(left: unknown, right: unknown, label: string): void {
  if (left === undefined || right === undefined) {
    if (left !== right) refuse(label);
  } else if (canonicalJson(left) !== canonicalJson(right)) {
    refuse(label);
  }
}

function sortedUnique<T>(
  values: readonly T[],
  tuple: (value: T) => readonly string[],
  label: string
): void {
  for (let index = 1; index < values.length; index += 1) {
    if (compareTuple(tuple(values[index - 1]!), tuple(values[index]!)) >= 0) refuse(label);
  }
}

function indexBy<T>(
  values: readonly T[],
  key: (value: T) => string,
  label: string
): Map<string, T> {
  sortedUnique(values, (value) => [key(value)], label);
  return new Map(values.map((value) => [key(value), value]));
}

function tupleIndex<T>(values: readonly (readonly [string, T])[], label: string): Map<string, T> {
  sortedUnique(values, ([key]) => [key], label);
  return new Map(values);
}

function required<T>(values: ReadonlyMap<string, T>, key: string, label: string): T {
  const value = values.get(key);
  if (value === undefined) refuse(label);
  return value;
}

function freezeData<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeData)) as T;
  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freezeData(item)]))
    ) as T;
  }
  return value;
}

function namedSlots(
  assignments: readonly { readonly localName: string; readonly bindingId: string }[]
): void {
  sortedUnique(assignments, ({ localName }) => [localName], "named binding slots");
}

function acyclic(ids: readonly string[], dependencies: (id: string) => readonly string[]): void {
  const active = new Set<string>();
  const complete = new Set<string>();
  const visit = (id: string): void => {
    if (active.has(id)) refuse("dependency cycle");
    if (complete.has(id)) return;
    active.add(id);
    for (const target of dependencies(id)) visit(target);
    active.delete(id);
    complete.add(id);
  };
  for (const id of ids) visit(id);
}

function providerClosure(
  nodes: readonly ProviderDependencyNode[],
  edges: readonly ProviderDependencyEdge[]
) {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = outgoing.get(edge.fromSelectionId) ?? [];
    targets.push(edge.toSelectionId);
    outgoing.set(edge.fromSelectionId, targets);
  }
  acyclic(
    nodes.map(({ selectionId }) => selectionId),
    (id) => outgoing.get(id) ?? []
  );
  return nodes.map(({ selectionId }) => {
    const reached = new Set<string>();
    const pending = [...(outgoing.get(selectionId) ?? [])];
    while (pending.length > 0) {
      const id = pending.pop()!;
      if (reached.has(id)) continue;
      reached.add(id);
      pending.push(...(outgoing.get(id) ?? []));
    }
    return { selectionId, reachableSelectionIds: [...reached].sort(compare) };
  });
}

function checkProviderRequirement(
  provider: RuntimeProvider,
  requirement: ResourceRequirement
): void {
  const matches = provider.requires.filter((declaration) => {
    const lifetime = declaration.lifetime ?? declaration.resource.defaultLifetime;
    return (
      declaration.resource.id === requirement.resource.resourceId &&
      lifetime === requirement.resource.lifetime &&
      declaration.role === requirement.resource.role &&
      declaration.instance === requirement.resource.instance &&
      (declaration.optional ?? false) === requirement.optional &&
      declaration.reason === requirement.reason
    );
  });
  if (matches.length !== 1) refuse("provider requirement reference agreement");
}

export function compileRuntimePlan(input: RuntimeCompilationInput): RuntimeCompilationResult {
  const handoff = readRuntimeDerivationHandoff(input.derivation);
  const decoded = NormalizedAuthoringGraphRuntimeSchema.decode(handoff.graph);
  if (!decoded.success) refuse("closed normalized graph admission");
  const graph = decoded.value;
  same(graph.topology.identity, handoff.identity, "launch identity");
  same(graph.topology.roleRequirements, handoff.roles, "selected roles");
  if (
    graph.app.appId !== handoff.identity.app ||
    graph.profile.profileId !== handoff.profileId ||
    graph.topology.profileId !== handoff.profileId
  )
    refuse("selection identity");
  sortedUnique(handoff.roles, (role) => [role], "selected roles");
  sortedUnique(handoff.harnessIds, (id) => [id], "selected harnesses");
  const roles = new Set(handoff.roles);

  const requirements = indexBy(
    graph.resourceRequirements,
    (value) => value.requirementId,
    "requirements"
  );
  const selections = indexBy(
    graph.profile.providerSelections,
    (value) => value.selectionId,
    "provider selections"
  );
  const bindings = indexBy(
    graph.serviceBindingPlans,
    (value) => value.bindingId,
    "service bindings"
  );
  const semantics = indexBy(
    graph.semanticDependencies,
    (value) => value.dependencyId,
    "semantic dependencies"
  );
  const uses = indexBy(graph.serviceUses, (value) => value.useId, "service uses");
  const plugins = indexBy(graph.plugins, (value) => value.ownerId, "plugins");
  const surfaces = indexBy(graph.surfaceRuntimePlans, (value) => value.surfacePlanId, "surfaces");
  const workflows = indexBy(
    graph.workflowDispatcherDescriptors,
    (value) => value.descriptorId,
    "workflows"
  );
  const findings = indexBy(graph.findings, (value) => value.requirementId, "optional findings");
  const providers = tupleIndex(handoff.providers, "provider reference entries");
  const services = tupleIndex(handoff.services, "service reference entries");
  const resourceBindings = tupleIndex(handoff.resourceBindings, "resource binding entries");
  const resourceReferences = tupleIndex(handoff.resourceReferences, "resource reference entries");
  const workflowAdmissions = tupleIndex(handoff.workflowAdmissions, "workflow admission entries");
  for (const [id, admissions] of workflowAdmissions) {
    required(surfaces, id, "workflow admission surface");
    if (!Object.isFrozen(admissions) || admissions.length === 0)
      refuse("selected workflow admission sources");
  }
  const serverSources = tupleIndex(handoff.serverSources, "native server source entries");
  for (const [id, source] of serverSources) {
    const surface = required(surfaces, id, "native server source surface");
    if (
      surface.role !== "server" ||
      surface.surface !== source.kind ||
      !["server/api", "server/internal"].includes(source.kind) ||
      typeof source.routeBase !== "string" ||
      !source.routeBase.startsWith("/") ||
      typeof source.createRouter !== "function"
    )
      refuse("native server source agreement");
  }
  sortedUnique(graph.executionDescriptorRefs, executionDescriptorRefTuple, "execution refs");
  sortedUnique(graph.webRouteModuleRefs, (ref) => [ref.ownerId, ref.routeId, ref.path], "web refs");
  sortedUnique(
    handoff.executionPolicies,
    ([ref]) => executionDescriptorRefTuple(ref),
    "execution policies"
  );
  const executionRefs = new Map(
    graph.executionDescriptorRefs.map((ref) => [canonicalJson(ref), ref])
  );
  const webRefs = new Set(graph.webRouteModuleRefs.map(canonicalJson));
  const executionPolicies = new Map(
    handoff.executionPolicies.map(([ref, policy]) => [canonicalJson(ref), policy])
  );
  const asyncSources = tupleIndex(handoff.asyncSources, "native async source entries");
  same(
    [...asyncSources.keys()],
    [...surfaces.values()]
      .filter(
        (surface) =>
          surface.role === "async" &&
          ["async/workflow", "async/schedule", "async/consumer"].includes(surface.surface)
      )
      .map((surface) => surface.surfacePlanId),
    "complete native async source references"
  );
  for (const [id, source] of asyncSources) {
    const surface = required(surfaces, id, "native async source surface");
    if (
      surface.role !== "async" ||
      surface.surface !== source.kind ||
      !["async/workflow", "async/schedule", "async/consumer"].includes(source.kind) ||
      !Object.isFrozen(source) ||
      !Object.isFrozen(source.declarations)
    )
      refuse("native async source agreement");
    const declarations = new Set<string>();
    const sourceRefs = new Set<string>();
    for (const declaration of source.declarations) {
      if (
        source.kind.replace("/", ".") !== declaration.kind ||
        typeof declaration.id !== "string" ||
        typeof declaration.run !== "function" ||
        declarations.has(declaration.id) ||
        !Object.isFrozen(declaration) ||
        !Object.isFrozen(declaration.descriptorReferences)
      )
        refuse("native async declaration agreement");
      declarations.add(declaration.id);
      if (declaration.options !== undefined) {
        if (!Object.isFrozen(declaration.options)) refuse("cold native async options");
        for (const key of ["id", "triggers", "run"] as const) {
          if (Object.hasOwn(declaration.options, key)) refuse("fixed native async declaration");
        }
        if (
          declaration.options.onFailure !== undefined &&
          typeof declaration.options.onFailure !== "function"
        )
          refuse("native async failure callback");
      }
      if (declaration.kind === "async.schedule") {
        if (typeof declaration.cron !== "string") refuse("native async schedule trigger");
      } else {
        const schema =
          declaration.kind === "async.workflow" ? declaration.inputSchema : declaration.eventSchema;
        if (
          typeof declaration.eventName !== "string" ||
          schema?.kind !== "runtime.schema" ||
          typeof schema.decode !== "function"
        )
          refuse("native async event trigger and schema");
      }
      const descriptors = new Set<object>();
      for (const [descriptor, ref] of declaration.descriptorReferences) {
        const refKey = canonicalJson(ref);
        required(executionRefs, refKey, "native async occurrence reference");
        const matchesDeclaration =
          declaration.kind === "async.workflow"
            ? "workflowId" in ref && ref.workflowId === declaration.id
            : declaration.kind === "async.schedule"
              ? "scheduleId" in ref && ref.scheduleId === declaration.id
              : "consumerId" in ref && ref.consumerId === declaration.id;
        if (
          ref.boundary !== "plugin.async-step" ||
          ref.ownerId !== surface.pluginOwnerId ||
          !matchesDeclaration ||
          descriptor.kind !== "async.step-effect" ||
          descriptor.id !== ref.stepId ||
          typeof descriptor.effect !== "function" ||
          !Object.isFrozen(descriptor) ||
          descriptor.policy !== executionPolicies.get(refKey) ||
          descriptors.has(descriptor) ||
          sourceRefs.has(refKey)
        )
          refuse("native async descriptor membership agreement");
        descriptors.add(descriptor);
        sourceRefs.add(refKey);
      }
    }
    same(
      [...sourceRefs].sort(compare),
      surface.executionDescriptorRefs.map(canonicalJson).sort(compare),
      "complete native async occurrence references"
    );
  }
  same([...providers.keys()], [...selections.keys()], "complete provider references");
  same([...services.keys()], [...bindings.keys()], "complete service references");
  same(
    [...executionPolicies.keys()],
    [...executionRefs.keys()],
    "complete execution policy references"
  );

  const requirementsByProvider = new Map<string, ResourceRequirement[]>();
  const satisfiedBySelection = new Map<string, string[]>();
  for (const requirement of requirements.values()) {
    if (
      resourceRequirementId({
        owner: requirement.owner,
        resource: requirement.resource,
        optional: requirement.optional,
      }) !== requirement.requirementId
    )
      refuse("requirement identity");
    if (requirement.owner.kind === "provider") {
      const owned = requirementsByProvider.get(requirement.owner.providerId) ?? [];
      owned.push(requirement);
      requirementsByProvider.set(requirement.owner.providerId, owned);
    }
    const selectionId = resourceBindings.get(requirement.requirementId);
    const finding = findings.get(requirement.requirementId);
    if (selectionId === undefined) {
      if (!requirement.optional || finding === undefined) refuse("unbound requirement");
      same(finding.resource, requirement.resource, "optional finding resource");
    } else {
      const selection = required(selections, selectionId, "resource selection target");
      same(selection.resource, requirement.resource, "resource binding identity");
      if (finding !== undefined) refuse("spurious optional finding");
      const satisfied = satisfiedBySelection.get(selectionId) ?? [];
      satisfied.push(requirement.requirementId);
      satisfiedBySelection.set(selectionId, satisfied);
    }
  }
  for (const id of resourceBindings.keys())
    required(requirements, id, "unreachable resource binding");
  for (const id of findings.keys()) required(requirements, id, "unreachable optional finding");

  const coldProviderIds = new Map<string, RuntimeProvider>();
  const selectedResourceIdentities = new Set<string>();
  for (const selection of selections.values()) {
    const provider = required(providers, selection.selectionId, "provider reference");
    if (
      provider.kind !== "runtime.provider" ||
      typeof provider.build !== "function" ||
      provider.id !== selection.providerId ||
      provider.provides.id !== selection.resource.resourceId ||
      !provider.provides.allowedLifetimes.includes(selection.resource.lifetime) ||
      (provider.configSchema !== undefined) !== (selection.configRef !== undefined)
    )
      refuse("provider reference identity");
    const prior = coldProviderIds.get(provider.id);
    if (prior !== undefined && prior !== provider) refuse("conflicting provider references");
    coldProviderIds.set(provider.id, provider);
    if (
      providerSelectionId({
        providerId: selection.providerId,
        resource: selection.resource,
        ...(selection.configRef === undefined ? {} : { configRef: selection.configRef }),
      }) !== selection.selectionId
    )
      refuse("provider selection identity");
    const resourceIdentity = canonicalJson(selection.resource);
    if (selectedResourceIdentities.has(resourceIdentity)) refuse("duplicate selected resource");
    selectedResourceIdentities.add(resourceIdentity);
    if (!satisfiedBySelection.has(selection.selectionId)) refuse("unreached provider selection");
    const dependencies = requirementsByProvider.get(provider.id) ?? [];
    if (dependencies.length !== provider.requires.length)
      refuse("provider dependency completeness");
    for (const requirement of dependencies) checkProviderRequirement(provider, requirement);
  }

  const coldServiceIds = new Map<string, ServiceRuntimeExport>();
  const constructionIdentities = new Set<string>();
  for (const binding of bindings.values()) {
    const service = required(services, binding.bindingId, "service reference");
    if (
      service.kind !== "service.runtime-export" ||
      typeof service.construct !== "function" ||
      service.definition.kind !== "service.definition" ||
      service.definition.id !== binding.serviceId ||
      service.contract === undefined
    )
      refuse("complete service reference");
    if (!roles.has(binding.role)) refuse("service role");
    if (
      (service.definition.scope !== undefined) !== (binding.scopeRef !== undefined) ||
      (service.definition.config !== undefined) !== (binding.configRef !== undefined)
    )
      refuse("service lane presence");
    const prior = coldServiceIds.get(binding.serviceId);
    if (prior !== undefined && prior !== service) refuse("conflicting service references");
    coldServiceIds.set(binding.serviceId, service);
    const constructionIdentity = canonicalJson([
      binding.role,
      binding.serviceId,
      binding.serviceInstance ?? null,
    ]);
    if (constructionIdentities.has(constructionIdentity)) refuse("divergent construction identity");
    constructionIdentities.add(constructionIdentity);
    const { kind: _kind, bindingId: _bindingId, ...identity } = binding;
    if (serviceBindingId(identity) !== binding.bindingId) refuse("service binding identity");
    namedSlots(binding.serviceDependencies);
    sortedUnique(binding.resourceRequirementIds, (id) => [id], "service resource requirements");
    sortedUnique(binding.semanticDependencyIds, (id) => [id], "service semantic requirements");
    const expectedServices: string[] = [];
    const expectedResources: string[] = [];
    const expectedSemantics: string[] = [];
    for (const [localName, dependency] of Object.entries(service.definition.deps)) {
      if (dependency.kind === "service.dependency.service") {
        expectedServices.push(localName);
        const assignment = binding.serviceDependencies.find((slot) => slot.localName === localName);
        if (assignment === undefined) refuse("missing service dependency slot");
        const child = required(bindings, assignment.bindingId, "child binding target");
        if (child.role !== binding.role || services.get(child.bindingId) !== dependency.service)
          refuse("child service reference");
      } else if (dependency.kind === "service.dependency.resource") {
        const owned = binding.resourceRequirementIds
          .map((id) => required(requirements, id, "service requirement target"))
          .filter(
            (requirement) =>
              requirement.owner.kind === "service" &&
              requirement.owner.serviceId === binding.serviceId &&
              requirement.owner.localName === localName
          );
        if (owned.length !== 1) refuse("missing resource dependency slot");
        const requirement = owned[0]!;
        if (
          requirement.optional ||
          requirement.resource.resourceId !== dependency.resource.id ||
          requirement.resource.lifetime !== dependency.resource.defaultLifetime ||
          requirement.resource.instance !== undefined ||
          requirement.reason !== localName ||
          requirement.resource.role !==
            (dependency.resource.defaultLifetime === "role" ? binding.role : undefined) ||
          !dependency.resource.allowedLifetimes.includes(requirement.resource.lifetime)
        )
          refuse("service resource reference");
        expectedResources.push(requirement.requirementId);
      } else {
        const id = semanticDependencyId({
          serviceId: binding.serviceId,
          localName,
          adapterId: dependency.adapterId,
        });
        const record = required(semantics, id, "semantic dependency target");
        if (
          record.serviceId !== binding.serviceId ||
          record.localName !== localName ||
          record.adapterId !== dependency.adapterId
        )
          refuse("semantic dependency reference");
        expectedSemantics.push(id);
      }
    }
    same(
      binding.serviceDependencies.map(({ localName }) => localName),
      expectedServices.sort(compare),
      "service slot completeness"
    );
    same(
      binding.resourceRequirementIds,
      expectedResources.sort(compare),
      "resource slot completeness"
    );
    same(
      binding.semanticDependencyIds,
      expectedSemantics.sort(compare),
      "semantic slot completeness"
    );
  }
  acyclic([...bindings.keys()], (id) =>
    required(bindings, id, "binding dependency").serviceDependencies.map(
      ({ bindingId }) => bindingId
    )
  );

  const reachedBindings = new Set<string>();
  const reachedRequirements = new Set<string>();
  const reachedExecutions = new Set<string>();
  const reachedWeb = new Set<string>();
  const reachedWorkflows = new Set<string>();
  const reachedUses = new Set<string>();
  const reachedPlugins = new Set<string>();
  const pendingBindings: string[] = [];
  const compiledWorkflowAdmissions: (readonly [
    string,
    readonly RuntimeCompiledWorkflowAdmission[],
  ])[] = [];
  for (const surface of surfaces.values()) {
    const plugin = required(plugins, surface.pluginOwnerId, "surface plugin");
    if (
      !roles.has(surface.role) ||
      plugin.role !== surface.role ||
      plugin.surface !== surface.surface ||
      plugin.capability !== surface.capability ||
      surfacePlanId({
        pluginOwnerId: surface.pluginOwnerId,
        role: surface.role,
        surface: surface.surface,
        capability: surface.capability,
      }) !== surface.surfacePlanId
    )
      refuse("surface identity");
    reachedPlugins.add(plugin.ownerId);
    namedSlots(surface.serviceBindings);
    const expectedNames = plugin.serviceUseIds.map((id) => {
      const use = required(uses, id, "surface service use");
      reachedUses.add(id);
      const assignment = surface.serviceBindings.find(
        ({ localName }) => localName === use.localName
      );
      if (assignment === undefined) refuse("missing surface service slot");
      const binding = required(bindings, assignment.bindingId, "surface binding target");
      if (
        use.pluginOwnerId !== plugin.ownerId ||
        use.serviceId !== binding.serviceId ||
        use.serviceInstance !== binding.serviceInstance ||
        binding.role !== surface.role
      )
        refuse("surface binding identity");
      pendingBindings.push(binding.bindingId);
      return use.localName;
    });
    same(
      surface.serviceBindings.map(({ localName }) => localName),
      expectedNames.sort(compare),
      "surface slot completeness"
    );
    same(
      surface.resourceRequirementIds,
      plugin.resourceRequirementIds,
      "surface resource completeness"
    );
    sortedUnique(surface.resourceRequirementIds, (id) => [id], "surface requirement order");
    for (const id of surface.resourceRequirementIds) {
      const requirement = required(requirements, id, "surface requirement");
      if (requirement.owner.kind !== "plugin" || requirement.owner.pluginOwnerId !== plugin.ownerId)
        refuse("surface requirement owner");
      reachedRequirements.add(id);
    }
    sortedUnique(
      surface.executionDescriptorRefs,
      executionDescriptorRefTuple,
      "surface execution order"
    );
    for (const ref of surface.executionDescriptorRefs) {
      assertSurfaceReferenceRelation(surface, ref);
      const key = canonicalJson(ref);
      if (ref.ownerId !== plugin.ownerId || !executionRefs.has(key))
        refuse("surface execution reference");
      reachedExecutions.add(key);
    }
    sortedUnique(
      surface.webRouteModuleRefs,
      (ref) => [ref.ownerId, ref.routeId, ref.path],
      "surface web order"
    );
    for (const ref of surface.webRouteModuleRefs) {
      assertSurfaceReferenceRelation(surface, ref);
      const key = canonicalJson(ref);
      if (ref.ownerId !== plugin.ownerId || !webRefs.has(key)) refuse("surface web reference");
      reachedWeb.add(key);
    }
    sortedUnique(surface.workflowDispatcherDescriptorIds, (id) => [id], "surface workflow order");
    const admissions = compileSurfaceWorkflowAdmissions({
      appId: graph.app.appId,
      surface,
      plugin,
      sources: workflowAdmissions.get(surface.surfacePlanId) ?? [],
      descriptors: workflows,
      requirements,
      resourceReferences,
      resourceBindings,
    });
    if (admissions.length > 0) {
      if (!serverSources.has(surface.surfacePlanId)) refuse("workflow admission server source");
      compiledWorkflowAdmissions.push(Object.freeze([surface.surfacePlanId, admissions]));
    }
    for (const id of surface.workflowDispatcherDescriptorIds) reachedWorkflows.add(id);
  }
  while (pendingBindings.length > 0) {
    const id = pendingBindings.pop()!;
    if (reachedBindings.has(id)) continue;
    reachedBindings.add(id);
    const binding = required(bindings, id, "binding closure");
    for (const child of binding.serviceDependencies) pendingBindings.push(child.bindingId);
    for (const requirementId of binding.resourceRequirementIds)
      reachedRequirements.add(requirementId);
  }
  const pendingRequirements = [...reachedRequirements];
  const reachedSelections = new Set<string>();
  while (pendingRequirements.length > 0) {
    const id = pendingRequirements.pop()!;
    const selectionId = resourceBindings.get(id);
    if (selectionId === undefined || reachedSelections.has(selectionId)) continue;
    reachedSelections.add(selectionId);
    const selection = required(selections, selectionId, "selected closure");
    for (const requirement of requirementsByProvider.get(selection.providerId) ?? []) {
      if (!reachedRequirements.has(requirement.requirementId)) {
        reachedRequirements.add(requirement.requirementId);
        pendingRequirements.push(requirement.requirementId);
      }
    }
  }
  const exactClosure = (
    reached: ReadonlySet<string>,
    available: Iterable<string>,
    label: string
  ): void => same([...reached].sort(compare), [...available].sort(compare), label);
  exactClosure(reachedBindings, bindings.keys(), "binding closure completeness");
  exactClosure(reachedRequirements, requirements.keys(), "requirement closure completeness");
  exactClosure(reachedSelections, selections.keys(), "provider closure completeness");
  exactClosure(reachedExecutions, executionRefs.keys(), "execution closure completeness");
  exactClosure(reachedWeb, webRefs, "web closure completeness");
  exactClosure(reachedWorkflows, workflows.keys(), "workflow closure completeness");
  exactClosure(reachedUses, uses.keys(), "service-use closure completeness");
  exactClosure(reachedPlugins, plugins.keys(), "plugin closure completeness");
  exactClosure(
    new Set(graph.serviceBindingPlans.flatMap((binding) => binding.semanticDependencyIds)),
    semantics.keys(),
    "semantic closure completeness"
  );

  const providerNodes = graph.profile.providerSelections.map(
    ({ selectionId, providerId, resource }) => ({ selectionId, providerId, resource })
  );
  const providerEdges: ProviderDependencyEdge[] = [];
  for (const selection of selections.values()) {
    for (const requirement of requirementsByProvider.get(selection.providerId) ?? []) {
      const toSelectionId = resourceBindings.get(requirement.requirementId);
      if (toSelectionId !== undefined)
        providerEdges.push({
          fromSelectionId: selection.selectionId,
          requirementId: requirement.requirementId,
          toSelectionId,
        });
    }
  }
  providerEdges.sort((left, right) =>
    compareTuple(
      [left.fromSelectionId, left.requirementId, left.toSelectionId],
      [right.fromSelectionId, right.requirementId, right.toSelectionId]
    )
  );
  sortedUnique(
    providerEdges,
    (edge) => [edge.fromSelectionId, edge.requirementId, edge.toSelectionId],
    "provider edges"
  );
  const closure = providerClosure(providerNodes, providerEdges);
  const lowerResourceBindings = (ids: readonly string[]): CompiledResourceBinding[] =>
    ids.flatMap((requirementId) => {
      const selectionId = resourceBindings.get(requirementId);
      return selectionId === undefined ? [] : [{ requirementId, selectionId }];
    });
  const compiledServices = graph.serviceBindingPlans.map((binding: ServiceBindingPlan) => ({
    kind: "compiled.service-binding-plan" as const,
    bindingId: binding.bindingId,
    role: binding.role,
    serviceId: binding.serviceId,
    ...(binding.serviceInstance === undefined ? {} : { serviceInstance: binding.serviceInstance }),
    ...(binding.scopeRef === undefined ? {} : { scopeRef: binding.scopeRef }),
    ...(binding.configRef === undefined ? {} : { configRef: binding.configRef }),
    resources: lowerResourceBindings(binding.resourceRequirementIds),
    serviceDependencies: binding.serviceDependencies,
    semanticDependencies: binding.semanticDependencyIds.map((id) =>
      required(semantics, id, "semantic lowering")
    ),
  }));
  const compiledExecutions = graph.executionDescriptorRefs.map((ref) => {
    if (executionDescriptorId(executionDescriptorIdentityInput(ref)) !== ref.executionId)
      refuse("execution identity");
    const execution = {
      kind: "compiled.execution-plan" as const,
      ref,
      policy: required(executionPolicies, canonicalJson(ref), "execution policy"),
    };
    if (!Check(CompiledExecutionPlanSchema, execution)) refuse("execution policy shape");
    return execution;
  });
  const plan: CompiledProcessPlan = freezeData({
    kind: "compiled.process-plan",
    identity: handoff.identity,
    profileId: handoff.profileId,
    configSources: graph.profile.configSources,
    roles: handoff.roles,
    resourceRequirements: graph.resourceRequirements,
    providerSelections: graph.profile.providerSelections,
    providerDependencyGraph: {
      kind: "provider.dependency-graph",
      nodes: providerNodes,
      edges: providerEdges,
      closure,
    },
    compiledResources: graph.profile.providerSelections.map((selection) => ({
      kind: "compiled.resource-plan",
      selectionId: selection.selectionId,
      providerId: selection.providerId,
      resource: selection.resource,
      ...(selection.configRef === undefined ? {} : { configRef: selection.configRef }),
      requirementIds: satisfiedBySelection.get(selection.selectionId)!,
      dependencyRequirementIds: (requirementsByProvider.get(selection.providerId) ?? []).map(
        ({ requirementId }) => requirementId
      ),
    })),
    serviceBindings: compiledServices,
    surfaces: graph.surfaceRuntimePlans.map((surface) => ({
      kind: "compiled.surface-plan",
      surfacePlanId: surface.surfacePlanId,
      pluginOwnerId: surface.pluginOwnerId,
      role: surface.role,
      surface: surface.surface,
      capability: surface.capability,
      ...(plugins.get(surface.pluginOwnerId)!.plugin.instance === undefined
        ? {}
        : { instance: plugins.get(surface.pluginOwnerId)!.plugin.instance }),
      serviceBindings: surface.serviceBindings,
      resources: lowerResourceBindings(surface.resourceRequirementIds),
      workflowDispatcherIds: surface.workflowDispatcherDescriptorIds,
      executionDescriptorRefs: surface.executionDescriptorRefs,
      webRouteModuleRefs: surface.webRouteModuleRefs,
    })),
    workflowDispatchers: graph.workflowDispatcherDescriptors.map((descriptor) => ({
      ...descriptor,
      kind: "compiled.workflow-dispatcher-plan",
    })),
    harnesses: handoff.harnessIds.map((harnessId) => ({
      kind: "compiled.harness-plan",
      harnessId,
    })),
    executionPlans: compiledExecutions,
    executionRegistryInput: {
      kind: "compiled.execution-registry-input",
      boundaries: compiledExecutions.map(({ ref }) => ({ executionId: ref.executionId, ref })),
    },
    bootgraphInput: { kind: "bootgraph.input", nodes: providerNodes, edges: providerEdges },
  });
  const observationSeed: CompilationObservationSeed = freezeData({
    kind: "compilation.observation-seed",
    identity: handoff.identity,
    profileId: handoff.profileId,
    roles: handoff.roles,
  });
  if (
    !Check(CompiledProcessPlanSchema, plan) ||
    !Check(CompilationObservationSeedSchema, observationSeed)
  )
    refuse("closed compiler output");
  const references = createRuntimeCompilationReferenceTable({
    providers: handoff.providers,
    services: handoff.services,
    resources: handoff.resourceReferences,
    serverSources: handoff.serverSources,
    asyncSources: handoff.asyncSources,
    workflowAdmissions: compiledWorkflowAdmissions,
  });
  return Object.freeze({ plan, references, observationSeed });
}
