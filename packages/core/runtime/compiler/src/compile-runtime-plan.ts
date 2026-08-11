import { Check } from "typebox/value";

import type {
  AppRole,
  EffectExecutionPolicy,
  Entrypoint,
  RuntimeProvider,
  ServiceDefinition,
} from "../../definition/src/index";
import { readServiceUse } from "../../definition/src/index";
import {
  type ExecutionDescriptorRef,
  executionDescriptorIdentityInput,
  executionDescriptorRefTuple,
} from "../../derivation/src/execution-descriptor-ref";
import {
  canonicalJson,
  executionDescriptorId,
  pluginOwnerId,
  providerSelectionId,
  resourceRequirementId,
  semanticDependencyId,
  serviceBindingId,
  serviceDependencyId,
  serviceUseId,
  surfacePlanId,
  workflowDispatcherId,
} from "../../derivation/src/identity-policy";
import {
  copyProcessDefaults,
  type DerivationFinding,
  type NormalizedAuthoringGraph,
  NormalizedAuthoringGraphRuntimeSchema,
  type NormalizedRuntimeConfigSource,
  normalizeConfigSources,
  type ProviderSelection,
  type ResourceRequirement,
} from "../../derivation/src/normalized-authoring-graph";
import type {
  NormalizedResourceRequirementIdentity,
  NormalizedRuntimeTopologyEdge,
} from "../../derivation/src/normalized-runtime-topology";
import type {
  NormalizedRuntimeConfigRef,
  ServiceBindingPlan,
} from "../../derivation/src/service-binding-plan";
import type { SurfaceRuntimePlan } from "../../derivation/src/surface-runtime-plan";
import type { WebRouteModuleRef } from "../../derivation/src/web-route-module-table";
import type { WorkflowDispatcherDescriptor } from "../../derivation/src/workflow-dispatcher-descriptor";
import {
  type CompilationObservationSeed,
  CompilationObservationSeedSchema,
  type CompiledExecutionPlan,
  type CompiledProcessPlan,
  CompiledProcessPlanSchema,
  type CompiledResourceBinding,
  type ProviderDependencyEdge,
  type ProviderDependencyNode,
} from "./compiled-process-plan";
import {
  createRuntimeCompilationReferenceTable,
  type RuntimeCompilationReferenceTable,
} from "./runtime-compilation-reference-table";

export interface RuntimeCompilationInput {
  readonly entrypoint: Entrypoint;
  readonly graph: NormalizedAuthoringGraph;
}

export interface RuntimeCompilationResult {
  readonly plan: CompiledProcessPlan;
  readonly references: RuntimeCompilationReferenceTable;
  readonly observationSeed: CompilationObservationSeed;
}

type ColdPlugin = Entrypoint["app"]["plugins"][number];

interface RuntimeConfigRefInput {
  readonly kind: "runtime.config";
  readonly key: string;
}

interface BindingNode {
  readonly instance?: string;
  readonly scope?: RuntimeConfigRefInput;
  readonly config?: RuntimeConfigRefInput;
  readonly dependencies?: Readonly<Record<string, BindingNode>>;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareTuples(left: readonly string[], right: readonly string[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const order = compareStrings(left[index] ?? "", right[index] ?? "");
    if (order !== 0) return order;
  }
  return 0;
}

function refuse(reason: string): never {
  throw new TypeError(`Runtime compilation refused: ${reason}.`);
}

function copyAndFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => copyAndFreeze(item))) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyAndFreeze(item)]))
    ) as T;
  }
  return value;
}

function assertEqual(left: unknown, right: unknown, label: string): void {
  if (left === undefined || right === undefined) {
    if (left !== right) refuse(`${label} mismatch`);
    return;
  }
  if (canonicalJson(left) !== canonicalJson(right)) refuse(`${label} mismatch`);
}

function assertSortedUnique<T>(
  values: readonly T[],
  tuple: (value: T) => readonly string[],
  label: string
): void {
  for (let index = 1; index < values.length; index += 1) {
    const order = compareTuples(tuple(values[index - 1]!), tuple(values[index]!));
    if (order === 0) refuse(`duplicate ${label}`);
    if (order > 0) refuse(`noncanonical ${label}`);
  }
}

function indexBy<T>(
  values: readonly T[],
  key: (value: T) => string,
  label: string
): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    const id = key(value);
    if (result.has(id)) refuse(`duplicate ${label}`);
    result.set(id, value);
  }
  return result;
}

function assertEntrypointAgreement(entrypoint: Entrypoint, graph: NormalizedAuthoringGraph): void {
  if (
    entrypoint.kind !== "app.entrypoint" ||
    entrypoint.app.kind !== "app.definition" ||
    entrypoint.profile.kind !== "runtime.profile" ||
    !Array.isArray(entrypoint.app.plugins) ||
    !Array.isArray(entrypoint.profile.providers) ||
    !Array.isArray(entrypoint.process.roles)
  ) {
    refuse("unsupported entrypoint");
  }
  if (
    entrypoint.id !== entrypoint.identity.entrypoint ||
    entrypoint.app.id !== entrypoint.identity.app ||
    entrypoint.process.id !== entrypoint.identity.process ||
    graph.app.appId !== entrypoint.app.id ||
    graph.profile.profileId !== entrypoint.profile.id ||
    graph.topology.profileId !== entrypoint.profile.id
  ) {
    refuse("entrypoint identity agreement");
  }
  assertEqual(graph.topology.identity, entrypoint.identity, "launch identity");
}

function canonicalRoles(entrypoint: Entrypoint): readonly AppRole[] {
  const roles = [...entrypoint.process.roles].sort(compareStrings);
  for (let index = 1; index < roles.length; index += 1) {
    if (roles[index - 1] === roles[index]) refuse("duplicate process role");
  }
  return Object.freeze(roles);
}

function resourceKey(resource: NormalizedResourceRequirementIdentity): string {
  return canonicalJson(resource);
}

function authoredResourceIdentity(input: {
  readonly resource: { readonly id: string; readonly defaultLifetime: "process" | "role" };
  readonly lifetime?: "process" | "role";
  readonly role?: AppRole;
  readonly instance?: string;
}): NormalizedResourceRequirementIdentity {
  return {
    resourceId: input.resource.id,
    lifetime: input.lifetime ?? input.resource.defaultLifetime,
    ...(input.role === undefined ? {} : { role: input.role }),
    ...(input.instance === undefined ? {} : { instance: input.instance }),
  };
}

function expectedConfigRef(
  key: string,
  sources: readonly NormalizedRuntimeConfigSource[]
): NormalizedRuntimeConfigRef {
  return {
    kind: "runtime.config-ref",
    key,
    sources: sources.map((source) => {
      switch (source.kind) {
        case "env":
          return { kind: "runtime.config.env", key, name: `${source.prefix}${key}` };
        case "dotenv":
          return {
            kind: "runtime.config.dotenv",
            key,
            path: source.path,
            optional: source.optional,
          };
        case "file":
          return {
            kind: "runtime.config.file",
            key,
            path: source.path,
            optional: source.optional,
          };
        case "memory":
          return { kind: "runtime.config.memory", key };
        case "test":
          return { kind: "runtime.config.test", key };
      }
    }),
  };
}

function isProviderSelection(value: unknown): value is {
  readonly provider: RuntimeProvider;
  readonly resource: RuntimeProvider["provides"];
  readonly lifetime?: "process" | "role";
  readonly role?: AppRole;
  readonly instance?: string;
  readonly config?: { readonly kind: "runtime.config"; readonly key: string };
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "provider" in value &&
    typeof value.provider === "object" &&
    value.provider !== null &&
    "kind" in value.provider &&
    value.provider.kind === "runtime.provider" &&
    "resource" in value &&
    typeof value.resource === "object" &&
    value.resource !== null
  );
}

function recoverProvider(
  entrypoint: Entrypoint,
  graph: NormalizedAuthoringGraph,
  selection: ProviderSelection
): RuntimeProvider {
  const matches: RuntimeProvider[] = [];
  for (const candidate of entrypoint.profile.providers) {
    if (!isProviderSelection(candidate)) continue;
    if (
      candidate.provider.id !== selection.providerId ||
      candidate.provider.provides !== candidate.resource
    ) {
      continue;
    }
    const resource = authoredResourceIdentity(candidate);
    if (resourceKey(resource) !== resourceKey(selection.resource)) continue;

    const configKey =
      candidate.provider.configSchema === undefined
        ? undefined
        : (candidate.config?.key ?? candidate.provider.defaultConfigKey);
    if (candidate.provider.configSchema === undefined) {
      if (
        candidate.config !== undefined ||
        candidate.provider.defaultConfigKey !== undefined ||
        selection.configRef !== undefined
      ) {
        continue;
      }
    } else {
      if (typeof configKey !== "string" || selection.configRef === undefined) continue;
      assertEqual(
        selection.configRef,
        expectedConfigRef(configKey, graph.profile.configSources),
        "provider config reference"
      );
    }

    const recomputed = providerSelectionId({
      providerId: candidate.provider.id,
      resource,
      ...(selection.configRef === undefined ? {} : { configRef: selection.configRef }),
    });
    if (recomputed !== selection.selectionId) continue;
    matches.push(candidate.provider);
  }
  if (matches.length !== 1) refuse("provider reference agreement");
  return matches[0]!;
}

function assertProviderRequirements(
  provider: RuntimeProvider,
  graph: NormalizedAuthoringGraph
): void {
  const expected = provider.requires
    .map((authored) => {
      const resource = authoredResourceIdentity(authored);
      if (!authored.resource.allowedLifetimes.includes(resource.lifetime)) {
        refuse("provider dependency lifetime");
      }
      const owner = { kind: "provider" as const, providerId: provider.id };
      const optional = authored.optional ?? false;
      return {
        kind: "normalized.resource-requirement" as const,
        requirementId: resourceRequirementId({ owner, resource, optional }),
        owner,
        resource,
        optional,
        reason: authored.reason,
      };
    })
    .sort((left, right) => compareStrings(left.requirementId, right.requirementId));
  const actual = graph.resourceRequirements.filter(
    (requirement) =>
      requirement.owner.kind === "provider" && requirement.owner.providerId === provider.id
  );
  assertEqual(actual, expected, "provider dependency declarations");
}

function coldPlugins(entrypoint: Entrypoint): Map<string, ColdPlugin> {
  const result = new Map<string, ColdPlugin>();
  for (const plugin of entrypoint.app.plugins) {
    const ownerId = pluginOwnerId({
      pluginId: plugin.id,
      ...(plugin.instance === undefined ? {} : { instance: plugin.instance }),
    });
    if (result.has(ownerId)) refuse("duplicate plugin owner");
    result.set(ownerId, plugin);
  }
  return result;
}

function topologyEdgeTuple(edge: NormalizedRuntimeTopologyEdge): readonly string[] {
  switch (edge.kind) {
    case "app.plugin":
      return [edge.kind, edge.appId, edge.plugin.pluginId, edge.plugin.instance ?? ""];
    case "plugin.resource":
      return [
        edge.kind,
        edge.plugin.pluginId,
        edge.plugin.instance ?? "",
        edge.resource.resourceId,
        edge.resource.lifetime,
        edge.resource.role ?? "",
        edge.resource.instance ?? "",
      ];
    case "service.service":
      return [edge.kind, edge.serviceId, edge.dependencyServiceId];
    case "service.resource":
      return [edge.kind, edge.serviceId, edge.resourceId];
    case "service.semantic":
      return [edge.kind, edge.serviceId, edge.adapterId];
  }
}

function assertColdGraphRelations(
  entrypoint: Entrypoint,
  graph: NormalizedAuthoringGraph,
  plugins: ReadonlyMap<string, ColdPlugin>
): void {
  const pluginEntries = [...plugins]
    .map(([ownerId, plugin]) => ({ ownerId, plugin }))
    .sort((left, right) => compareStrings(left.ownerId, right.ownerId));
  assertEqual(
    graph.app.pluginOwnerIds,
    pluginEntries.map(({ ownerId }) => ownerId),
    "app plugin owner inventory"
  );

  const pluginIdentities = pluginEntries
    .map(({ plugin }) => ({
      pluginId: plugin.id,
      ...(plugin.instance === undefined ? {} : { instance: plugin.instance }),
    }))
    .sort((left, right) =>
      compareTuples([left.pluginId, left.instance ?? ""], [right.pluginId, right.instance ?? ""])
    );
  assertEqual(graph.topology.pluginIdentities, pluginIdentities, "topology plugin identities");

  const surfaceRequirements = pluginEntries
    .map(({ plugin }) => ({
      plugin: {
        pluginId: plugin.id,
        ...(plugin.instance === undefined ? {} : { instance: plugin.instance }),
      },
      role: plugin.role,
      surface: plugin.surface,
      capability: plugin.capability,
    }))
    .sort((left, right) =>
      compareTuples(
        [
          left.plugin.pluginId,
          left.plugin.instance ?? "",
          left.role,
          left.surface,
          left.capability,
        ],
        [
          right.plugin.pluginId,
          right.plugin.instance ?? "",
          right.role,
          right.surface,
          right.capability,
        ]
      )
    );
  assertEqual(
    graph.topology.surfaceRequirements,
    surfaceRequirements,
    "topology surface requirements"
  );

  const appEdges: NormalizedRuntimeTopologyEdge[] = pluginEntries
    .map(({ plugin }) => ({
      kind: "app.plugin" as const,
      appId: entrypoint.app.id,
      plugin: {
        pluginId: plugin.id,
        ...(plugin.instance === undefined ? {} : { instance: plugin.instance }),
      },
    }))
    .sort((left, right) => compareTuples(topologyEdgeTuple(left), topologyEdgeTuple(right)));
  assertEqual(
    graph.topology.edges.filter((edge) => edge.kind === "app.plugin"),
    appEdges,
    "topology app/plugin edges"
  );

  const pluginResourceEdges: NormalizedRuntimeTopologyEdge[] = [];
  for (const { plugin } of pluginEntries) {
    const identity = {
      pluginId: plugin.id,
      ...(plugin.instance === undefined ? {} : { instance: plugin.instance }),
    };
    for (const requirement of plugin.resourceRequirements) {
      const resource = authoredResourceIdentity(requirement);
      if (!requirement.resource.allowedLifetimes.includes(resource.lifetime)) {
        refuse("topology plugin resource lifetime");
      }
      pluginResourceEdges.push({ kind: "plugin.resource", plugin: identity, resource });
    }
  }
  pluginResourceEdges.sort((left, right) =>
    compareTuples(topologyEdgeTuple(left), topologyEdgeTuple(right))
  );
  assertSortedUnique(pluginResourceEdges, topologyEdgeTuple, "topology plugin resource edge");
  assertEqual(
    graph.topology.edges.filter((edge) => edge.kind === "plugin.resource"),
    pluginResourceEdges,
    "topology plugin/resource edges"
  );

  const resourceIdentities = [
    ...new Map(
      pluginResourceEdges.map((edge) => {
        if (edge.kind !== "plugin.resource") refuse("plugin resource edge");
        return [resourceKey(edge.resource), edge.resource] as const;
      })
    ).values(),
  ].sort((left, right) =>
    compareTuples(
      [left.resourceId, left.lifetime, left.role ?? "", left.instance ?? ""],
      [right.resourceId, right.lifetime, right.role ?? "", right.instance ?? ""]
    )
  );
  assertEqual(
    graph.topology.resourceRequirementIdentities,
    resourceIdentities,
    "topology resource identities"
  );

  const roleSurfaceGroups = new Map<
    string,
    { readonly role: AppRole; readonly surface: string; readonly ids: string[] }
  >();
  for (const plan of graph.surfaceRuntimePlans) {
    const key = canonicalJson([plan.role, plan.surface]);
    const group = roleSurfaceGroups.get(key) ?? {
      role: plan.role,
      surface: plan.surface,
      ids: [],
    };
    group.ids.push(plan.surfacePlanId);
    roleSurfaceGroups.set(key, group);
  }
  const roleSurfaceEntries = [...roleSurfaceGroups.values()]
    .sort((left, right) => compareTuples([left.role, left.surface], [right.role, right.surface]))
    .map((group) => ({
      role: group.role,
      surface: group.surface,
      surfacePlanIds: group.ids.sort(compareStrings),
    }));
  assertEqual(
    graph.roleSurfaceIndex,
    { kind: "derived.role-surface-index", entries: roleSurfaceEntries },
    "role/surface index"
  );
}

function assertSelectedServiceTopology(
  graph: NormalizedAuthoringGraph,
  definitions: ReadonlyMap<string, ServiceDefinition>
): void {
  const selectedServiceIds = new Set(definitions.keys());
  const expected: NormalizedRuntimeTopologyEdge[] = [];
  for (const definition of definitions.values()) {
    for (const dependency of Object.values(definition.deps)) {
      switch (dependency.kind) {
        case "service.dependency.service":
          expected.push({
            kind: "service.service",
            serviceId: definition.id,
            dependencyServiceId: dependency.service.id,
          });
          break;
        case "service.dependency.resource":
          expected.push({
            kind: "service.resource",
            serviceId: definition.id,
            resourceId: dependency.resource.id,
          });
          break;
        case "service.dependency.semantic":
          expected.push({
            kind: "service.semantic",
            serviceId: definition.id,
            adapterId: dependency.adapterId,
          });
          break;
      }
    }
  }
  expected.sort((left, right) => compareTuples(topologyEdgeTuple(left), topologyEdgeTuple(right)));
  assertSortedUnique(expected, topologyEdgeTuple, "selected service topology edge");
  const actual = graph.topology.edges.filter(
    (edge) =>
      (edge.kind === "service.service" ||
        edge.kind === "service.resource" ||
        edge.kind === "service.semantic") &&
      selectedServiceIds.has(edge.serviceId)
  );
  assertEqual(actual, expected, "selected service topology edges");
}

function registerServiceTree(
  definition: ServiceDefinition,
  services: Map<string, ServiceDefinition>,
  active: Set<ServiceDefinition>
): void {
  const prior = services.get(definition.id);
  if (prior !== undefined && prior !== definition) refuse("divergent service definition");
  services.set(definition.id, definition);
  if (active.has(definition)) refuse("cyclic cold service definition");
  active.add(definition);
  try {
    for (const dependency of Object.values(definition.deps)) {
      if (dependency.kind === "service.dependency.service") {
        registerServiceTree(dependency.service, services, active);
      }
    }
  } finally {
    active.delete(definition);
  }
}

function laneRef(input: {
  readonly hasSchema: boolean;
  readonly authored?: RuntimeConfigRefInput;
  readonly inherited?: NormalizedRuntimeConfigRef;
  readonly sources: readonly NormalizedRuntimeConfigSource[];
}): NormalizedRuntimeConfigRef | undefined {
  if (!input.hasSchema) {
    if (input.authored !== undefined) refuse("schema-free service lane reference");
    return undefined;
  }
  if (input.authored !== undefined) return expectedConfigRef(input.authored.key, input.sources);
  if (input.inherited !== undefined) return input.inherited;
  refuse("missing schema-backed service lane reference");
}

function bindingOverrideHasEffect(node: BindingNode): boolean {
  return (
    node.instance !== undefined ||
    node.scope !== undefined ||
    node.config !== undefined ||
    Object.values(node.dependencies ?? {}).some(bindingOverrideHasEffect)
  );
}

function rootBindingHasEffect(node: BindingNode): boolean {
  return (
    node.scope !== undefined ||
    node.config !== undefined ||
    Object.values(node.dependencies ?? {}).some(bindingOverrideHasEffect)
  );
}

function expectedBindingPlan(input: {
  readonly definition: ServiceDefinition;
  readonly role: AppRole;
  readonly instance?: string;
  readonly node?: BindingNode;
  readonly inheritedScope?: NormalizedRuntimeConfigRef;
  readonly inheritedConfig?: NormalizedRuntimeConfigRef;
  readonly graph: NormalizedAuthoringGraph;
  readonly graphBindings: ReadonlyMap<string, ServiceBindingPlan>;
  readonly graphRequirements: ReadonlyMap<string, ResourceRequirement>;
  readonly definitions: Map<string, ServiceDefinition>;
  readonly expectedBindings: Map<string, ServiceBindingPlan>;
  readonly expectedIdentities: Map<string, ServiceBindingPlan>;
  readonly active: Set<string>;
}): ServiceBindingPlan {
  const activeKey = canonicalJson([input.role, input.definition.id, input.instance ?? ""]);
  if (input.active.has(activeKey)) refuse("cyclic service binding");
  input.active.add(activeKey);
  try {
    const scopeRef = laneRef({
      hasSchema: input.definition.scope !== undefined,
      authored: input.node?.scope,
      inherited: input.inheritedScope,
      sources: input.graph.profile.configSources,
    });
    const configRef = laneRef({
      hasSchema: input.definition.config !== undefined,
      authored: input.node?.config,
      inherited: input.inheritedConfig,
      sources: input.graph.profile.configSources,
    });
    const overrides = input.node?.dependencies ?? {};
    for (const [localName, override] of Object.entries(overrides)) {
      if (input.definition.deps[localName]?.kind !== "service.dependency.service") {
        refuse("binding override target");
      }
      if (!bindingOverrideHasEffect(override)) refuse("unused binding override");
    }

    const resourceRequirementIds: string[] = [];
    const serviceBindingIds: string[] = [];
    const semanticDependencyIds: string[] = [];
    for (const localName of Object.keys(input.definition.deps).sort(compareStrings)) {
      const dependency = input.definition.deps[localName]!;
      switch (dependency.kind) {
        case "service.dependency.resource": {
          const resource = authoredResourceIdentity({
            resource: dependency.resource,
            ...(dependency.resource.defaultLifetime === "role" ? { role: input.role } : {}),
          });
          const owner = {
            kind: "service" as const,
            serviceId: input.definition.id,
            localName,
          };
          const requirementId = resourceRequirementId({ owner, resource, optional: false });
          assertEqual(
            input.graphRequirements.get(requirementId),
            {
              kind: "normalized.resource-requirement",
              requirementId,
              owner,
              resource,
              optional: false,
              reason: localName,
            },
            "service resource declaration"
          );
          resourceRequirementIds.push(requirementId);
          break;
        }
        case "service.dependency.service": {
          registerServiceTree(dependency.service, input.definitions, new Set());
          const override = overrides[localName];
          const child = expectedBindingPlan({
            definition: dependency.service,
            role: input.role,
            ...(override?.instance === undefined ? {} : { instance: override.instance }),
            ...(override === undefined ? {} : { node: override }),
            ...(scopeRef === undefined ? {} : { inheritedScope: scopeRef }),
            ...(configRef === undefined ? {} : { inheritedConfig: configRef }),
            graph: input.graph,
            graphBindings: input.graphBindings,
            graphRequirements: input.graphRequirements,
            definitions: input.definitions,
            expectedBindings: input.expectedBindings,
            expectedIdentities: input.expectedIdentities,
            active: input.active,
          });
          serviceBindingIds.push(child.bindingId);
          break;
        }
        case "service.dependency.semantic":
          semanticDependencyIds.push(
            semanticDependencyId({
              serviceId: input.definition.id,
              localName,
              adapterId: dependency.adapterId,
            })
          );
          break;
      }
    }

    const identity = {
      role: input.role,
      serviceId: input.definition.id,
      ...(input.instance === undefined ? {} : { serviceInstance: input.instance }),
      ...(scopeRef === undefined ? {} : { scopeRef }),
      ...(configRef === undefined ? {} : { configRef }),
      resourceRequirementIds: resourceRequirementIds.sort(compareStrings),
      serviceBindingIds: [...new Set(serviceBindingIds)].sort(compareStrings),
      semanticDependencyIds: semanticDependencyIds.sort(compareStrings),
    };
    const bindingId = serviceBindingId(identity);
    const expected: ServiceBindingPlan = {
      kind: "service.binding-plan",
      bindingId,
      ...identity,
    };
    const priorIdentity = input.expectedIdentities.get(activeKey);
    if (priorIdentity !== undefined) {
      assertEqual(priorIdentity, expected, "service binding identity agreement");
      return priorIdentity;
    }
    const prior = input.expectedBindings.get(bindingId);
    if (prior !== undefined) {
      assertEqual(prior, expected, "service binding diamond");
      return prior;
    }
    assertEqual(input.graphBindings.get(bindingId), expected, "service binding plan");
    input.expectedIdentities.set(activeKey, expected);
    input.expectedBindings.set(bindingId, expected);
    return expected;
  } finally {
    input.active.delete(activeKey);
  }
}

function coldExecutionRefs(plugin: ColdPlugin, ownerId: string): readonly ExecutionDescriptorRef[] {
  const refs: ExecutionDescriptorRef[] = [];
  const append = (
    collectionName: "workflows" | "schedules" | "consumers",
    parentField: "workflowId" | "scheduleId" | "consumerId"
  ): void => {
    const collection = Reflect.get(plugin, collectionName);
    if (!Array.isArray(collection)) return;
    for (const parent of collection) {
      if (
        typeof parent !== "object" ||
        parent === null ||
        !("id" in parent) ||
        typeof parent.id !== "string" ||
        !("steps" in parent) ||
        !Array.isArray(parent.steps)
      ) {
        refuse("cold execution occurrence owner");
      }
      for (const step of parent.steps) {
        if (
          typeof step !== "object" ||
          step === null ||
          !("kind" in step) ||
          step.kind !== "async.step-effect" ||
          !("id" in step) ||
          typeof step.id !== "string"
        ) {
          refuse("cold execution occurrence");
        }
        const identity = {
          boundary: "plugin.async-step" as const,
          ownerId,
          [parentField]: parent.id,
          stepId: step.id,
        } as ReturnType<typeof executionDescriptorIdentityInput>;
        refs.push({
          kind: "execution.descriptor-ref",
          executionId: executionDescriptorId(identity),
          ...identity,
        } as ExecutionDescriptorRef);
      }
    }
  };
  append("workflows", "workflowId");
  append("schedules", "scheduleId");
  append("consumers", "consumerId");
  refs.sort((left, right) =>
    compareTuples(executionDescriptorRefTuple(left), executionDescriptorRefTuple(right))
  );
  assertSortedUnique(refs, executionDescriptorRefTuple, "cold execution occurrence");
  return refs;
}

function coldWebRefs(plugin: ColdPlugin, ownerId: string): readonly WebRouteModuleRef[] {
  const routes = Reflect.get(plugin, "routes");
  if (!Array.isArray(routes)) return [];
  const refs = routes.map((route): WebRouteModuleRef => {
    if (
      typeof route !== "object" ||
      route === null ||
      !("id" in route) ||
      typeof route.id !== "string" ||
      !("path" in route) ||
      typeof route.path !== "string" ||
      !("module" in route) ||
      typeof route.module !== "function"
    ) {
      refuse("cold web route");
    }
    return { kind: "web.route-module-ref", ownerId, routeId: route.id, path: route.path };
  });
  refs.sort((left, right) =>
    compareTuples(
      [left.ownerId, left.routeId, left.path],
      [right.ownerId, right.routeId, right.path]
    )
  );
  assertSortedUnique(refs, (ref) => [ref.ownerId, ref.routeId, ref.path], "cold web route");
  return refs;
}

function recoverServices(input: {
  readonly entrypoint: Entrypoint;
  readonly graph: NormalizedAuthoringGraph;
  readonly surfaces: readonly SurfaceRuntimePlan[];
  readonly reachedBindings: ReadonlyMap<string, ServiceBindingPlan>;
  readonly plugins: ReadonlyMap<string, ColdPlugin>;
}): Map<string, ServiceDefinition> {
  const definitions = new Map<string, ServiceDefinition>();
  const uses = indexBy(input.graph.serviceUses, (use) => use.useId, "service use");
  const normalizedPlugins = indexBy(input.graph.plugins, (plugin) => plugin.ownerId, "plugin");
  const graphBindings = indexBy(
    input.graph.serviceBindingPlans,
    (binding) => binding.bindingId,
    "binding"
  );
  const graphRequirements = indexBy(
    input.graph.resourceRequirements,
    (requirement) => requirement.requirementId,
    "requirement"
  );
  const expectedBindings = new Map<string, ServiceBindingPlan>();
  const expectedIdentities = new Map<string, ServiceBindingPlan>();

  for (const surface of input.surfaces) {
    const plugin = input.plugins.get(surface.pluginOwnerId);
    if (plugin === undefined) refuse("surface plugin reference");
    if (
      plugin.role !== surface.role ||
      plugin.surface !== surface.surface ||
      plugin.capability !== surface.capability ||
      surfacePlanId({
        pluginOwnerId: surface.pluginOwnerId,
        role: surface.role,
        surface: surface.surface,
        capability: surface.capability,
      }) !== surface.surfacePlanId
    ) {
      refuse("surface cold identity agreement");
    }

    const expectedServiceUseIds: string[] = [];
    const expectedRootBindingIds: string[] = [];
    const expectedRequirements = plugin.resourceRequirements
      .map((authored) => {
        const resource = authoredResourceIdentity(authored);
        if (!authored.resource.allowedLifetimes.includes(resource.lifetime)) {
          refuse("plugin resource lifetime");
        }
        const owner = { kind: "plugin" as const, pluginOwnerId: surface.pluginOwnerId };
        const optional = authored.optional ?? false;
        return {
          kind: "normalized.resource-requirement" as const,
          requirementId: resourceRequirementId({ owner, resource, optional }),
          owner,
          resource,
          optional,
          reason: authored.reason,
        };
      })
      .sort((left, right) => compareStrings(left.requirementId, right.requirementId));
    const actualRequirements = surface.resourceRequirementIds.map((requirementId) => {
      const requirement = input.graph.resourceRequirements.find(
        (candidate) => candidate.requirementId === requirementId
      );
      if (requirement === undefined) refuse("surface resource requirement");
      return requirement;
    });
    assertEqual(actualRequirements, expectedRequirements, "plugin resource declarations");

    for (const localName of Object.keys(plugin.services).sort(compareStrings)) {
      const serviceUse = plugin.services[localName];
      if (serviceUse === undefined) refuse("cold service use");
      const carrier = readServiceUse(serviceUse);
      if (carrier.definition.id !== serviceUse.serviceId) refuse("service-use carrier agreement");
      if (carrier.binding !== undefined && !rootBindingHasEffect(carrier.binding as BindingNode)) {
        refuse("unused root service binding");
      }
      const useId = serviceUseId({
        pluginOwnerId: surface.pluginOwnerId,
        localName,
        serviceId: serviceUse.serviceId,
        ...(serviceUse.serviceInstance === undefined
          ? {}
          : { serviceInstance: serviceUse.serviceInstance }),
      });
      const normalized = uses.get(useId);
      if (
        normalized === undefined ||
        normalized.pluginOwnerId !== surface.pluginOwnerId ||
        normalized.localName !== localName ||
        normalized.serviceId !== serviceUse.serviceId ||
        normalized.serviceInstance !== serviceUse.serviceInstance
      ) {
        refuse("normalized service-use agreement");
      }
      registerServiceTree(carrier.definition, definitions, new Set());
      expectedServiceUseIds.push(useId);
      const rootBinding = expectedBindingPlan({
        definition: carrier.definition,
        role: plugin.role,
        ...(serviceUse.serviceInstance === undefined
          ? {}
          : { instance: serviceUse.serviceInstance }),
        ...(carrier.binding === undefined ? {} : { node: carrier.binding as BindingNode }),
        graph: input.graph,
        graphBindings,
        graphRequirements,
        definitions,
        expectedBindings,
        expectedIdentities,
        active: new Set(),
      });
      expectedRootBindingIds.push(rootBinding.bindingId);
    }

    expectedServiceUseIds.sort(compareStrings);
    const normalizedPlugin = normalizedPlugins.get(surface.pluginOwnerId);
    if (normalizedPlugin === undefined) refuse("normalized plugin reference");
    assertEqual(
      normalizedPlugin,
      {
        kind: "normalized.plugin-definition",
        ownerId: surface.pluginOwnerId,
        plugin: {
          pluginId: plugin.id,
          ...(plugin.instance === undefined ? {} : { instance: plugin.instance }),
        },
        role: plugin.role,
        surface: plugin.surface,
        capability: plugin.capability,
        serviceUseIds: expectedServiceUseIds,
        resourceRequirementIds: expectedRequirements.map(({ requirementId }) => requirementId),
      },
      "normalized plugin"
    );
    assertEqual(
      surface.serviceBindingIds,
      [...new Set(expectedRootBindingIds)].sort(compareStrings),
      "surface service bindings"
    );

    const workflows = Reflect.get(plugin, "workflows");
    const workflowIds = Array.isArray(workflows)
      ? workflows
          .map((workflow) => {
            if (
              typeof workflow !== "object" ||
              workflow === null ||
              !("id" in workflow) ||
              typeof workflow.id !== "string"
            ) {
              refuse("cold workflow");
            }
            return workflow.id;
          })
          .sort(compareStrings)
      : [];
    assertSortedUnique(workflowIds, (id) => [id], "cold workflow id");
    const expectedWorkflowDescriptorIds =
      plugin.role === "async" && plugin.surface === "async/workflow"
        ? [
            workflowDispatcherId({
              appId: input.entrypoint.app.id,
              pluginOwnerId: surface.pluginOwnerId,
              role: "async",
              surface: "async/workflow",
              capability: plugin.capability,
              workflowIds,
            }),
          ]
        : [];
    assertEqual(
      surface.workflowDispatcherDescriptorIds,
      expectedWorkflowDescriptorIds,
      "surface workflow descriptors"
    );
    assertEqual(
      surface.executionDescriptorRefs,
      coldExecutionRefs(plugin, surface.pluginOwnerId),
      "surface execution references"
    );
    assertEqual(
      surface.webRouteModuleRefs,
      coldWebRefs(plugin, surface.pluginOwnerId),
      "surface web references"
    );
  }
  assertEqual(
    [...input.reachedBindings.keys()].sort(compareStrings),
    [...expectedBindings.keys()].sort(compareStrings),
    "selected service binding closure"
  );
  return definitions;
}

function executionPolicy(plugin: ColdPlugin, ref: ExecutionDescriptorRef): EffectExecutionPolicy {
  if (ref.boundary !== "plugin.async-step") refuse("unsupported execution reference");
  const collectionName =
    "workflowId" in ref ? "workflows" : "scheduleId" in ref ? "schedules" : "consumers";
  const parentId =
    "workflowId" in ref ? ref.workflowId : "scheduleId" in ref ? ref.scheduleId : ref.consumerId;
  const collection = Reflect.get(plugin, collectionName);
  if (!Array.isArray(collection)) refuse("execution occurrence owner");
  const parent = collection.find(
    (candidate): candidate is { readonly id: string; readonly steps: readonly unknown[] } =>
      typeof candidate === "object" &&
      candidate !== null &&
      "id" in candidate &&
      candidate.id === parentId &&
      "steps" in candidate &&
      Array.isArray(candidate.steps)
  );
  const descriptor = parent?.steps.find(
    (
      candidate
    ): candidate is {
      readonly kind: string;
      readonly id: string;
      readonly policy: EffectExecutionPolicy;
    } =>
      typeof candidate === "object" &&
      candidate !== null &&
      "kind" in candidate &&
      candidate.kind === "async.step-effect" &&
      "id" in candidate &&
      candidate.id === ref.stepId &&
      "policy" in candidate &&
      typeof candidate.policy === "object" &&
      candidate.policy !== null
  );
  if (descriptor === undefined) refuse("execution occurrence reference");
  if (executionDescriptorId(executionDescriptorIdentityInput(ref)) !== ref.executionId) {
    refuse("execution identity");
  }
  return descriptor.policy;
}

function assertWebReference(plugin: ColdPlugin, ref: WebRouteModuleRef): void {
  const routes = Reflect.get(plugin, "routes");
  if (!Array.isArray(routes)) refuse("web route owner");
  const match = routes.find(
    (route) =>
      typeof route === "object" &&
      route !== null &&
      "id" in route &&
      route.id === ref.routeId &&
      "path" in route &&
      route.path === ref.path &&
      "module" in route &&
      typeof route.module === "function"
  );
  if (match === undefined) refuse("web route reference");
}

function requirementSelection(
  requirement: ResourceRequirement,
  selectionsByResource: ReadonlyMap<string, readonly ProviderSelection[]>,
  findingsByRequirement: ReadonlyMap<string, DerivationFinding>
): ProviderSelection | undefined {
  const matching = selectionsByResource.get(resourceKey(requirement.resource)) ?? [];
  if (matching.length > 1) refuse("ambiguous provider selection");
  const selection = matching[0];
  if (selection !== undefined) {
    if (findingsByRequirement.has(requirement.requirementId)) {
      refuse("spurious optional provider finding");
    }
    return selection;
  }
  if (!requirement.optional) refuse("required provider selection");
  const finding = findingsByRequirement.get(requirement.requirementId);
  if (
    finding === undefined ||
    finding.code !== "provider-selection.optional-missing" ||
    resourceKey(finding.resource) !== resourceKey(requirement.resource)
  ) {
    refuse("optional provider finding");
  }
  return undefined;
}

function dependencyClosure(
  nodes: readonly ProviderDependencyNode[],
  edges: readonly ProviderDependencyEdge[]
): readonly { readonly selectionId: string; readonly reachableSelectionIds: readonly string[] }[] {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = outgoing.get(edge.fromSelectionId) ?? [];
    targets.push(edge.toSelectionId);
    outgoing.set(edge.fromSelectionId, targets);
  }
  return nodes.map((node) => {
    const reachable = new Set<string>();
    const active = new Set<string>();
    const visited = new Set<string>();
    const visit = (selectionId: string): void => {
      if (active.has(selectionId)) refuse("provider dependency cycle");
      if (visited.has(selectionId)) return;
      active.add(selectionId);
      for (const target of outgoing.get(selectionId) ?? []) {
        if (target === node.selectionId) refuse("provider dependency cycle");
        visit(target);
        reachable.add(target);
      }
      active.delete(selectionId);
      visited.add(selectionId);
    };
    visit(node.selectionId);
    return {
      selectionId: node.selectionId,
      reachableSelectionIds: [...reachable].sort(compareStrings),
    };
  });
}

export function compileRuntimePlan(input: RuntimeCompilationInput): RuntimeCompilationResult {
  const decoded = NormalizedAuthoringGraphRuntimeSchema.decode(input.graph);
  if (!decoded.success) refuse("closed normalized graph admission");
  const graph = decoded.value;
  assertEntrypointAgreement(input.entrypoint, graph);
  const coldConfigSources = normalizeConfigSources(input.entrypoint.profile.configSources);
  assertEqual(graph.profile.configSources, coldConfigSources, "profile config sources");
  const coldProcessDefaults =
    input.entrypoint.profile.processDefaults === undefined
      ? undefined
      : copyProcessDefaults(input.entrypoint.profile.processDefaults);
  assertEqual(graph.profile.processDefaults, coldProcessDefaults, "profile process defaults");
  if (graph.profile.providerSelections.length !== input.entrypoint.profile.providers.length) {
    refuse("profile provider selection inventory");
  }
  const coldProvidersBySelection = new Map<string, RuntimeProvider>();
  const coldProvidersById = new Map<string, RuntimeProvider>();
  for (const selection of graph.profile.providerSelections) {
    const provider = recoverProvider(input.entrypoint, graph, selection);
    const priorProvider = coldProvidersById.get(provider.id);
    if (priorProvider !== undefined && priorProvider !== provider) {
      refuse("divergent cold provider definition");
    }
    coldProvidersById.set(provider.id, provider);
    coldProvidersBySelection.set(selection.selectionId, provider);
    assertProviderRequirements(provider, graph);
  }

  const roles = canonicalRoles(input.entrypoint);
  assertEqual(graph.topology.roleRequirements, roles, "selected roles");

  assertSortedUnique(graph.topology.edges, topologyEdgeTuple, "topology edge");
  assertSortedUnique(graph.plugins, (value) => [value.ownerId], "plugin");
  assertSortedUnique(graph.serviceUses, (value) => [value.useId], "service use");
  assertSortedUnique(
    graph.serviceDependencies,
    (value) => [value.dependencyId],
    "service dependency"
  );
  assertSortedUnique(
    graph.semanticDependencies,
    (value) => [value.dependencyId],
    "semantic dependency"
  );
  assertSortedUnique(graph.resourceRequirements, (value) => [value.requirementId], "requirement");
  assertSortedUnique(
    graph.profile.providerSelections,
    (value) => [value.selectionId],
    "provider selection"
  );
  assertSortedUnique(graph.profile.harnesses, (harnessId) => [harnessId], "profile harness");
  assertSortedUnique(graph.serviceBindingPlans, (value) => [value.bindingId], "service binding");
  assertSortedUnique(graph.surfaceRuntimePlans, (value) => [value.surfacePlanId], "surface plan");
  assertSortedUnique(
    graph.workflowDispatcherDescriptors,
    (value) => [value.descriptorId],
    "workflow descriptor"
  );
  assertSortedUnique(graph.executionDescriptorRefs, executionDescriptorRefTuple, "execution ref");
  assertSortedUnique(
    graph.webRouteModuleRefs,
    (value) => [value.ownerId, value.routeId, value.path],
    "web ref"
  );
  assertSortedUnique(
    graph.findings,
    (value) => [
      value.code,
      value.requirementId,
      value.resource.resourceId,
      value.resource.lifetime,
      value.resource.role ?? "",
      value.resource.instance ?? "",
    ],
    "finding"
  );

  const requirements = indexBy(
    graph.resourceRequirements,
    (requirement) => requirement.requirementId,
    "requirement"
  );
  const bindings = indexBy(graph.serviceBindingPlans, (binding) => binding.bindingId, "binding");
  const workflows = indexBy(
    graph.workflowDispatcherDescriptors,
    (descriptor) => descriptor.descriptorId,
    "workflow descriptor"
  );
  const executions = new Map(
    graph.executionDescriptorRefs.map((ref) => [canonicalJson(ref), ref] as const)
  );
  const webRefs = new Map(
    graph.webRouteModuleRefs.map((ref) => [canonicalJson(ref), ref] as const)
  );
  const findings = indexBy(graph.findings, (finding) => finding.requirementId, "finding");
  const selectedRoleSet = new Set<AppRole>(roles);
  const surfaces = graph.surfaceRuntimePlans.filter((surface) => selectedRoleSet.has(surface.role));

  const reachedBindings = new Map<string, ServiceBindingPlan>();
  const reachedRequirementIds = new Set<string>();
  const reachedWorkflowIds = new Set<string>();
  const reachedExecutionRefs = new Map<string, ExecutionDescriptorRef>();
  const reachedWebRefs = new Map<string, WebRouteModuleRef>();
  const pendingBindings = surfaces.flatMap((surface) => [...surface.serviceBindingIds]);
  for (const surface of surfaces) {
    for (const id of surface.resourceRequirementIds) reachedRequirementIds.add(id);
    for (const id of surface.workflowDispatcherDescriptorIds) reachedWorkflowIds.add(id);
    for (const ref of surface.executionDescriptorRefs) {
      const canonical = executions.get(canonicalJson(ref));
      if (canonical === undefined) refuse("surface execution reference");
      reachedExecutionRefs.set(canonicalJson(canonical), canonical);
    }
    for (const ref of surface.webRouteModuleRefs) {
      const canonical = webRefs.get(canonicalJson(ref));
      if (canonical === undefined) refuse("surface web reference");
      reachedWebRefs.set(canonicalJson(canonical), canonical);
    }
  }
  while (pendingBindings.length > 0) {
    const bindingId = pendingBindings.pop()!;
    if (reachedBindings.has(bindingId)) continue;
    const binding = bindings.get(bindingId);
    if (binding === undefined) refuse("service binding reference");
    reachedBindings.set(bindingId, binding);
    for (const child of binding.serviceBindingIds) pendingBindings.push(child);
    for (const requirementId of binding.resourceRequirementIds) {
      reachedRequirementIds.add(requirementId);
    }
  }

  const plugins = coldPlugins(input.entrypoint);
  assertColdGraphRelations(input.entrypoint, graph, plugins);
  const expectedSurfacePlanIds = input.entrypoint.app.plugins
    .filter((plugin) => selectedRoleSet.has(plugin.role))
    .map((plugin) => {
      const ownerId = pluginOwnerId({
        pluginId: plugin.id,
        ...(plugin.instance === undefined ? {} : { instance: plugin.instance }),
      });
      return surfacePlanId({
        pluginOwnerId: ownerId,
        role: plugin.role,
        surface: plugin.surface,
        capability: plugin.capability,
      });
    })
    .sort(compareStrings);
  assertSortedUnique(expectedSurfacePlanIds, (surfaceId) => [surfaceId], "cold surface root");
  assertEqual(
    surfaces.map(({ surfacePlanId: id }) => id),
    expectedSurfacePlanIds,
    "selected surface roots"
  );
  const coldServices = recoverServices({
    entrypoint: input.entrypoint,
    graph,
    surfaces,
    reachedBindings,
    plugins,
  });
  assertSelectedServiceTopology(graph, coldServices);
  const semanticDependencies = indexBy(
    graph.semanticDependencies,
    (dependency) => dependency.dependencyId,
    "semantic dependency"
  );
  const serviceDependencies = indexBy(
    graph.serviceDependencies,
    (dependency) => dependency.dependencyId,
    "service dependency"
  );

  for (const binding of reachedBindings.values()) {
    const definition = coldServices.get(binding.serviceId);
    if (definition === undefined) refuse("service definition reference");
    assertSortedUnique(
      binding.resourceRequirementIds,
      (requirementId) => [requirementId],
      "binding resource requirement"
    );
    assertSortedUnique(
      binding.serviceBindingIds,
      (bindingId) => [bindingId],
      "child service binding"
    );
    assertSortedUnique(
      binding.semanticDependencyIds,
      (dependencyId) => [dependencyId],
      "binding semantic dependency"
    );
    if (
      serviceBindingId({
        role: binding.role,
        serviceId: binding.serviceId,
        ...(binding.serviceInstance === undefined
          ? {}
          : { serviceInstance: binding.serviceInstance }),
        ...(binding.scopeRef === undefined ? {} : { scopeRef: binding.scopeRef }),
        ...(binding.configRef === undefined ? {} : { configRef: binding.configRef }),
        resourceRequirementIds: binding.resourceRequirementIds,
        serviceBindingIds: binding.serviceBindingIds,
        semanticDependencyIds: binding.semanticDependencyIds,
      }) !== binding.bindingId
    ) {
      refuse("service binding identity");
    }
    const expectedChildServiceIds = new Set<string>();
    const expectedSemanticIds: string[] = [];
    for (const localName of Object.keys(definition.deps).sort(compareStrings)) {
      const dependency = definition.deps[localName]!;
      switch (dependency.kind) {
        case "service.dependency.service": {
          expectedChildServiceIds.add(dependency.service.id);
          const dependencyId = serviceDependencyId({
            serviceId: definition.id,
            localName,
            dependencyServiceId: dependency.service.id,
          });
          const normalized = serviceDependencies.get(dependencyId);
          if (
            normalized === undefined ||
            normalized.serviceId !== definition.id ||
            normalized.localName !== localName ||
            normalized.dependencyServiceId !== dependency.service.id ||
            !binding.serviceBindingIds.some(
              (id) => reachedBindings.get(id)?.serviceId === dependency.service.id
            )
          ) {
            refuse("service dependency agreement");
          }
          break;
        }
        case "service.dependency.semantic": {
          const dependencyId = semanticDependencyId({
            serviceId: definition.id,
            localName,
            adapterId: dependency.adapterId,
          });
          const normalized = semanticDependencies.get(dependencyId);
          if (
            normalized === undefined ||
            normalized.serviceId !== definition.id ||
            normalized.localName !== localName ||
            normalized.adapterId !== dependency.adapterId ||
            !binding.semanticDependencyIds.includes(dependencyId)
          ) {
            refuse("semantic dependency agreement");
          }
          expectedSemanticIds.push(dependencyId);
          break;
        }
        case "service.dependency.resource": {
          const resource = authoredResourceIdentity({
            resource: dependency.resource,
            ...(dependency.resource.defaultLifetime === "role" ? { role: binding.role } : {}),
          });
          const requirementId = resourceRequirementId({
            owner: { kind: "service", serviceId: definition.id, localName },
            resource,
            optional: false,
          });
          if (!binding.resourceRequirementIds.includes(requirementId)) {
            refuse("service resource agreement");
          }
          const normalized = requirements.get(requirementId);
          assertEqual(
            normalized,
            {
              kind: "normalized.resource-requirement",
              requirementId,
              owner: { kind: "service", serviceId: definition.id, localName },
              resource,
              optional: false,
              reason: localName,
            },
            "service resource declaration"
          );
          break;
        }
      }
    }
    for (const childId of binding.serviceBindingIds) {
      const child = reachedBindings.get(childId);
      if (child === undefined || !expectedChildServiceIds.has(child.serviceId)) {
        refuse("unexpected service dependency binding");
      }
    }
    assertEqual(
      binding.semanticDependencyIds,
      expectedSemanticIds.sort(compareStrings),
      "service semantic dependency inventory"
    );
  }

  const selectionsByResource = new Map<string, ProviderSelection[]>();
  for (const selection of graph.profile.providerSelections) {
    const matches = selectionsByResource.get(resourceKey(selection.resource)) ?? [];
    matches.push(selection);
    selectionsByResource.set(resourceKey(selection.resource), matches);
  }

  const selected = new Map<string, ProviderSelection>();
  const requirementBindings = new Map<string, ProviderSelection>();
  const pendingRequirements = [...reachedRequirementIds];
  while (pendingRequirements.length > 0) {
    const requirementId = pendingRequirements.pop()!;
    const requirement = requirements.get(requirementId);
    if (requirement === undefined) refuse("resource requirement reference");
    const selection = requirementSelection(requirement, selectionsByResource, findings);
    if (selection === undefined) continue;
    requirementBindings.set(requirementId, selection);
    if (selected.has(selection.selectionId)) continue;
    selected.set(selection.selectionId, selection);
    for (const dependency of graph.resourceRequirements) {
      if (
        dependency.owner.kind === "provider" &&
        dependency.owner.providerId === selection.providerId
      ) {
        if (!reachedRequirementIds.has(dependency.requirementId)) {
          reachedRequirementIds.add(dependency.requirementId);
          pendingRequirements.push(dependency.requirementId);
        }
      }
    }
  }

  const selectedValues = [...selected.values()].sort((left, right) =>
    compareStrings(left.selectionId, right.selectionId)
  );
  const providerNodes: ProviderDependencyNode[] = selectedValues.map((selection) => ({
    selectionId: selection.selectionId,
    providerId: selection.providerId,
    resource: selection.resource,
  }));
  const providerEdges: ProviderDependencyEdge[] = [];
  for (const source of selectedValues) {
    for (const requirement of graph.resourceRequirements) {
      if (
        !reachedRequirementIds.has(requirement.requirementId) ||
        requirement.owner.kind !== "provider" ||
        requirement.owner.providerId !== source.providerId
      ) {
        continue;
      }
      const target = requirementBindings.get(requirement.requirementId);
      if (target !== undefined) {
        providerEdges.push({
          fromSelectionId: source.selectionId,
          requirementId: requirement.requirementId,
          toSelectionId: target.selectionId,
        });
      }
    }
  }
  providerEdges.sort((left, right) =>
    compareTuples(
      [left.fromSelectionId, left.requirementId, left.toSelectionId],
      [right.fromSelectionId, right.requirementId, right.toSelectionId]
    )
  );
  assertSortedUnique(
    providerEdges,
    (edge) => [edge.fromSelectionId, edge.requirementId, edge.toSelectionId],
    "provider dependency edge"
  );
  const providerClosure = dependencyClosure(providerNodes, providerEdges);

  const providerReferences = selectedValues.map((selection) => {
    const provider = coldProvidersBySelection.get(selection.selectionId);
    if (provider === undefined) refuse("selected cold provider reference");
    return [selection.selectionId, provider] as const;
  });
  for (const [selectionId, provider] of providerReferences) {
    const selection = selected.get(selectionId)!;
    if (
      provider.id !== selection.providerId ||
      provider.provides.id !== selection.resource.resourceId ||
      !provider.provides.allowedLifetimes.includes(selection.resource.lifetime)
    ) {
      refuse("provider resource reference");
    }
    assertProviderRequirements(provider, graph);
  }

  const resourceBinding = (requirementId: string): CompiledResourceBinding | undefined => {
    const selection = requirementBindings.get(requirementId);
    return selection === undefined
      ? undefined
      : { requirementId, selectionId: selection.selectionId };
  };
  const compiledServices = [...reachedBindings.values()]
    .sort((left, right) => compareStrings(left.bindingId, right.bindingId))
    .map((binding) => ({
      kind: "compiled.service-binding-plan" as const,
      bindingId: binding.bindingId,
      role: binding.role,
      serviceId: binding.serviceId,
      ...(binding.serviceInstance === undefined
        ? {}
        : { serviceInstance: binding.serviceInstance }),
      ...(binding.scopeRef === undefined ? {} : { scopeRef: binding.scopeRef }),
      ...(binding.configRef === undefined ? {} : { configRef: binding.configRef }),
      resources: binding.resourceRequirementIds
        .map(resourceBinding)
        .filter((value): value is CompiledResourceBinding => value !== undefined)
        .sort((left, right) =>
          compareTuples(
            [left.requirementId, left.selectionId],
            [right.requirementId, right.selectionId]
          )
        ),
      serviceBindingIds: binding.serviceBindingIds,
      semanticDependencyIds: binding.semanticDependencyIds,
    }));

  const compiledSurfaces = surfaces
    .map((surface) => {
      assertSortedUnique(
        surface.serviceBindingIds,
        (bindingId) => [bindingId],
        "surface service binding"
      );
      assertSortedUnique(
        surface.resourceRequirementIds,
        (requirementId) => [requirementId],
        "surface resource requirement"
      );
      assertSortedUnique(
        surface.workflowDispatcherDescriptorIds,
        (descriptorId) => [descriptorId],
        "surface workflow descriptor"
      );
      assertSortedUnique(
        surface.executionDescriptorRefs,
        executionDescriptorRefTuple,
        "surface execution ref"
      );
      assertSortedUnique(
        surface.webRouteModuleRefs,
        (ref) => [ref.ownerId, ref.routeId, ref.path],
        "surface web ref"
      );
      return {
        kind: "compiled.surface-plan" as const,
        surfacePlanId: surface.surfacePlanId,
        pluginOwnerId: surface.pluginOwnerId,
        role: surface.role,
        surface: surface.surface,
        capability: surface.capability,
        serviceBindingIds: surface.serviceBindingIds,
        resources: surface.resourceRequirementIds
          .map(resourceBinding)
          .filter((value): value is CompiledResourceBinding => value !== undefined)
          .sort((left, right) =>
            compareTuples(
              [left.requirementId, left.selectionId],
              [right.requirementId, right.selectionId]
            )
          ),
        workflowDispatcherIds: surface.workflowDispatcherDescriptorIds,
        executionDescriptorRefs: surface.executionDescriptorRefs,
        webRouteModuleRefs: surface.webRouteModuleRefs,
      };
    })
    .sort((left, right) => compareStrings(left.surfacePlanId, right.surfacePlanId));

  const compiledWorkflows = [...reachedWorkflowIds]
    .map((id): WorkflowDispatcherDescriptor => {
      const descriptor = workflows.get(id);
      if (descriptor === undefined) refuse("workflow descriptor reference");
      if (
        descriptor.appId !== graph.app.appId ||
        workflowDispatcherId({
          appId: descriptor.appId,
          pluginOwnerId: descriptor.pluginOwnerId,
          role: descriptor.role,
          surface: descriptor.surface,
          capability: descriptor.capability,
          workflowIds: descriptor.workflowIds,
        }) !== descriptor.descriptorId ||
        !surfaces.some(
          (surface) =>
            surface.pluginOwnerId === descriptor.pluginOwnerId &&
            surface.role === descriptor.role &&
            surface.surface === descriptor.surface &&
            surface.capability === descriptor.capability
        )
      ) {
        refuse("workflow descriptor agreement");
      }
      assertSortedUnique(descriptor.workflowIds, (workflowId) => [workflowId], "workflow id");
      return descriptor;
    })
    .sort((left, right) => compareStrings(left.descriptorId, right.descriptorId))
    .map((descriptor) => ({
      kind: "compiled.workflow-dispatcher-plan" as const,
      descriptorId: descriptor.descriptorId,
      appId: descriptor.appId,
      pluginOwnerId: descriptor.pluginOwnerId,
      role: descriptor.role,
      surface: descriptor.surface,
      capability: descriptor.capability,
      workflowIds: descriptor.workflowIds,
    }));

  const compiledExecutions: CompiledExecutionPlan[] = [...reachedExecutionRefs.values()]
    .sort((left, right) =>
      compareTuples(executionDescriptorRefTuple(left), executionDescriptorRefTuple(right))
    )
    .map((ref) => {
      const plugin = plugins.get(ref.ownerId);
      if (plugin === undefined) refuse("execution plugin reference");
      return {
        kind: "compiled.execution-plan",
        ref,
        policy: executionPolicy(plugin, ref),
      };
    });
  for (const ref of reachedWebRefs.values()) {
    const plugin = plugins.get(ref.ownerId);
    if (plugin === undefined) refuse("web plugin reference");
    assertWebReference(plugin, ref);
  }

  const harnessIds = [...graph.profile.harnesses];
  assertEqual(
    graph.profile.harnesses,
    [...(input.entrypoint.profile.harnesses ?? [])].sort(compareStrings),
    "profile harnesses"
  );
  if (input.entrypoint.process.harness !== undefined)
    harnessIds.push(input.entrypoint.process.harness);
  const selectedHarnessIds = [...new Set(harnessIds)].sort(compareStrings);

  const reachedRequirements = [...reachedRequirementIds]
    .map((id) => {
      const requirement = requirements.get(id);
      if (requirement === undefined) refuse("resource requirement reference");
      if (
        resourceRequirementId({
          owner: requirement.owner,
          resource: requirement.resource,
          optional: requirement.optional,
        }) !== requirement.requirementId
      ) {
        refuse("resource requirement identity");
      }
      return requirement;
    })
    .sort((left, right) => compareStrings(left.requirementId, right.requirementId));

  const compiledResources = selectedValues.map((selection) => ({
    kind: "compiled.resource-plan" as const,
    selectionId: selection.selectionId,
    providerId: selection.providerId,
    resource: selection.resource,
    ...(selection.configRef === undefined ? {} : { configRef: selection.configRef }),
    requirementIds: [...requirementBindings]
      .filter(([, candidate]) => candidate.selectionId === selection.selectionId)
      .map(([requirementId]) => requirementId)
      .sort(compareStrings),
    dependencyRequirementIds: reachedRequirements
      .filter(
        (requirement) =>
          requirement.owner.kind === "provider" &&
          requirement.owner.providerId === selection.providerId
      )
      .map((requirement) => requirement.requirementId)
      .sort(compareStrings),
  }));

  const plan: CompiledProcessPlan = copyAndFreeze({
    kind: "compiled.process-plan",
    identity: graph.topology.identity,
    profileId: graph.profile.profileId,
    roles,
    resourceRequirements: reachedRequirements,
    providerSelections: selectedValues,
    providerDependencyGraph: {
      kind: "provider.dependency-graph",
      nodes: providerNodes,
      edges: providerEdges,
      closure: providerClosure,
    },
    compiledResources,
    serviceBindings: compiledServices,
    surfaces: compiledSurfaces,
    workflowDispatchers: compiledWorkflows,
    harnesses: selectedHarnessIds.map((harnessId) => ({
      kind: "compiled.harness-plan",
      harnessId,
    })),
    executionPlans: compiledExecutions,
    executionRegistryInput: {
      kind: "compiled.execution-registry-input",
      boundaries: compiledExecutions.map(({ ref }) => ({ executionId: ref.executionId, ref })),
    },
    bootgraphInput: {
      kind: "bootgraph.input",
      nodes: providerNodes,
      edges: providerEdges,
    },
  });
  const observationSeed: CompilationObservationSeed = copyAndFreeze({
    kind: "compilation.observation-seed",
    identity: graph.topology.identity,
    profileId: graph.profile.profileId,
    roles,
  });
  if (
    !Check(CompiledProcessPlanSchema, plan) ||
    !Check(CompilationObservationSeedSchema, observationSeed)
  ) {
    refuse("closed compiler DTO admission");
  }

  const references = createRuntimeCompilationReferenceTable({
    providers: providerReferences,
    services: compiledServices.map(
      (binding) => [binding.bindingId, coldServices.get(binding.serviceId)!] as const
    ),
  });
  return Object.freeze({ plan, references, observationSeed });
}
