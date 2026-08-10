import type {
  AppRole,
  AsyncConsumerPluginDefinition,
  AsyncSchedulePluginDefinition,
  AsyncWorkflowPluginDefinition,
  ProviderSelection as AuthoredProviderSelection,
  ResourceRequirement as AuthoredResourceRequirement,
  Entrypoint,
  PluginDefinition,
  RuntimeProvider,
  RuntimeResource,
  ServiceDefinition,
  ServiceDependencyDeclaration,
  WebAppPluginDefinition,
} from "../../definition/src/index";
import { readServiceUse } from "../../definition/src/index";
import {
  type AsyncStepDescriptorOccurrence,
  createExecutionDescriptorTable,
  deriveAsyncExecutionEntry,
  type ExecutionDescriptorTable,
} from "./derive-execution-descriptor-table";
import type { ExecutionDescriptorRef } from "./execution-descriptor-ref";
import { executionDescriptorRefTuple } from "./execution-descriptor-ref";
import {
  canonicalJson,
  pluginOwnerId,
  providerSelectionId,
  resourceRequirementId,
  semanticDependencyId,
  serviceBindingId,
  serviceDependencyId,
  serviceUseId,
  surfacePlanId,
  workflowDispatcherId,
} from "./identity-policy";
import {
  copyProcessDefaults,
  type DerivationFinding,
  type DerivedRoleSurfaceIndexEntry,
  expandConfigRef,
  type NormalizedAuthoringGraph,
  NormalizedAuthoringGraphRuntimeSchema,
  type NormalizedPluginDefinition,
  type NormalizedRuntimeConfigSource,
  type NormalizedSemanticDependency,
  type NormalizedServiceDependency,
  type NormalizedServiceUse,
  normalizeConfigSources,
  type ProviderSelection,
  type ResourceRequirement,
  type ResourceRequirementOwner,
} from "./normalized-authoring-graph";
import {
  deriveNormalizedRuntimeTopology,
  type NormalizedPluginIdentity,
  type NormalizedResourceRequirementIdentity,
  type NormalizedRuntimeTopology,
} from "./normalized-runtime-topology";
import {
  buildPortableRuntimePlanArtifact,
  type PortableRuntimePlanArtifact,
} from "./portable-runtime-plan-artifact";
import type { NormalizedRuntimeConfigRef, ServiceBindingPlan } from "./service-binding-plan";
import type { SurfaceRuntimePlan } from "./surface-runtime-plan";
import {
  createWebRouteModuleTable,
  type WebRouteModuleRef,
  type WebRouteModuleTable,
  type WebRouteModuleTableEntry,
} from "./web-route-module-table";
import type { WorkflowDispatcherDescriptor } from "./workflow-dispatcher-descriptor";

export interface RuntimeDerivationInput {
  readonly entrypoint: Entrypoint;
  readonly profileId: string;
}

export interface RuntimeDerivationResult {
  readonly topology: NormalizedRuntimeTopology;
  readonly graph: NormalizedAuthoringGraph;
  readonly executionDescriptorTable: ExecutionDescriptorTable;
  readonly webRouteModuleTable: WebRouteModuleTable;
  readonly portableArtifact: PortableRuntimePlanArtifact;
}

interface RuntimeConfigRefInput {
  readonly kind: "runtime.config";
  readonly key: string;
}

interface DependencyBindingInput {
  readonly instance?: string;
  readonly scope?: RuntimeConfigRefInput;
  readonly config?: RuntimeConfigRefInput;
  readonly dependencies?: Readonly<Record<string, DependencyBindingInput>>;
}

interface RootBindingInput {
  readonly scope?: RuntimeConfigRefInput;
  readonly config?: RuntimeConfigRefInput;
  readonly dependencies?: Readonly<Record<string, DependencyBindingInput>>;
}

interface PluginDerivationState {
  readonly definition: PluginDefinition;
  readonly identity: NormalizedPluginIdentity;
  readonly ownerId: string;
  readonly serviceUseIds: string[];
  readonly rootBindingIds: string[];
  readonly resourceRequirementIds: string[];
  readonly executionEntries: ReturnType<typeof deriveAsyncExecutionEntry>[];
  readonly webEntries: WebRouteModuleTableEntry[];
  workflowDispatcher?: WorkflowDispatcherDescriptor;
}

interface BindingContext {
  readonly role: AppRole;
  readonly sources: readonly NormalizedRuntimeConfigSource[];
  readonly serviceDefinitions: Map<string, ServiceDefinition>;
  readonly serviceDependencies: Map<string, NormalizedServiceDependency>;
  readonly semanticDependencies: Map<string, NormalizedSemanticDependency>;
  readonly resourceRequirements: Map<string, ResourceRequirement>;
  readonly serviceRequirementOrigins: Map<string, string>;
  readonly plansByIdentity: Map<string, ServiceBindingPlan>;
  readonly plansById: Map<string, ServiceBindingPlan>;
  readonly active: Set<string>;
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

function sortedUnique(values: readonly string[], label: string): readonly string[] {
  const sorted = [...values].sort(compareStrings);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index - 1] === sorted[index]) throw new TypeError(`Duplicate ${label}.`);
  }
  return Object.freeze(sorted);
}

function sortedSet(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort(compareStrings));
}

function copyResourceIdentity(
  resource: NormalizedResourceRequirementIdentity
): NormalizedResourceRequirementIdentity {
  return Object.freeze({
    resourceId: resource.resourceId,
    lifetime: resource.lifetime,
    ...(resource.role === undefined ? {} : { role: resource.role }),
    ...(resource.instance === undefined ? {} : { instance: resource.instance }),
  });
}

function copyConfigRef(ref: NormalizedRuntimeConfigRef): NormalizedRuntimeConfigRef {
  return Object.freeze({
    kind: "runtime.config-ref",
    key: ref.key,
    sources: Object.freeze(
      ref.sources.map((source) => {
        switch (source.kind) {
          case "runtime.config.env":
            return Object.freeze({
              kind: source.kind,
              key: source.key,
              name: source.name,
            });
          case "runtime.config.dotenv":
          case "runtime.config.file":
            return Object.freeze({
              kind: source.kind,
              key: source.key,
              path: source.path,
              optional: source.optional,
            });
          case "runtime.config.memory":
          case "runtime.config.test":
            return Object.freeze({ kind: source.kind, key: source.key });
        }
      })
    ),
  });
}

function copyExecutionRef(ref: ExecutionDescriptorRef): ExecutionDescriptorRef {
  switch (ref.boundary) {
    case "plugin.async-step":
      if ("workflowId" in ref) {
        return Object.freeze({
          kind: ref.kind,
          executionId: ref.executionId,
          ownerId: ref.ownerId,
          boundary: ref.boundary,
          workflowId: ref.workflowId,
          stepId: ref.stepId,
        });
      }
      if ("scheduleId" in ref) {
        return Object.freeze({
          kind: ref.kind,
          executionId: ref.executionId,
          ownerId: ref.ownerId,
          boundary: ref.boundary,
          scheduleId: ref.scheduleId,
          stepId: ref.stepId,
        });
      }
      return Object.freeze({
        kind: ref.kind,
        executionId: ref.executionId,
        ownerId: ref.ownerId,
        boundary: ref.boundary,
        consumerId: ref.consumerId,
        stepId: ref.stepId,
      });
    case "plugin.cli-command":
      return Object.freeze({
        kind: ref.kind,
        executionId: ref.executionId,
        ownerId: ref.ownerId,
        boundary: ref.boundary,
        commandId: ref.commandId,
      });
    case "plugin.web-surface":
      return Object.freeze({
        kind: ref.kind,
        executionId: ref.executionId,
        ownerId: ref.ownerId,
        boundary: ref.boundary,
        surfaceId: ref.surfaceId,
      });
    case "plugin.agent-tool":
      return Object.freeze({
        kind: ref.kind,
        executionId: ref.executionId,
        ownerId: ref.ownerId,
        boundary: ref.boundary,
        toolId: ref.toolId,
      });
    case "plugin.desktop-background":
      return Object.freeze({
        kind: ref.kind,
        executionId: ref.executionId,
        ownerId: ref.ownerId,
        boundary: ref.boundary,
        backgroundId: ref.backgroundId,
      });
  }
}

function copyWebRef(ref: WebRouteModuleRef): WebRouteModuleRef {
  return Object.freeze({
    kind: "web.route-module-ref",
    ownerId: ref.ownerId,
    routeId: ref.routeId,
    path: ref.path,
  });
}

function isRuntimeProvider(value: unknown): value is RuntimeProvider {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "runtime.provider" &&
    "id" in value &&
    typeof value.id === "string" &&
    "provides" in value &&
    isRuntimeResource(value.provides) &&
    "requires" in value &&
    Array.isArray(value.requires)
  );
}

function isRuntimeResource(value: unknown): value is RuntimeResource {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "runtime.resource" &&
    "id" in value &&
    typeof value.id === "string" &&
    "defaultLifetime" in value &&
    (value.defaultLifetime === "process" || value.defaultLifetime === "role") &&
    "allowedLifetimes" in value &&
    Array.isArray(value.allowedLifetimes) &&
    value.allowedLifetimes.every((lifetime) => lifetime === "process" || lifetime === "role") &&
    value.allowedLifetimes.includes(value.defaultLifetime)
  );
}

function isProviderSelection(value: unknown): value is AuthoredProviderSelection {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const allowed = new Set(["provider", "resource", "lifetime", "role", "instance", "config"]);
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !allowed.has(key))) {
    return false;
  }
  if (
    "config" in value &&
    value.config !== undefined &&
    !(
      typeof value.config === "object" &&
      value.config !== null &&
      !Array.isArray(value.config) &&
      Reflect.ownKeys(value.config).length === 2 &&
      "kind" in value.config &&
      value.config.kind === "runtime.config" &&
      "key" in value.config &&
      typeof value.config.key === "string" &&
      value.config.key.length > 0
    )
  ) {
    return false;
  }
  return (
    "provider" in value &&
    isRuntimeProvider(value.provider) &&
    "resource" in value &&
    isRuntimeResource(value.resource)
  );
}

function assertResourceIdentityInput(
  requirement: AuthoredResourceRequirement
): NormalizedResourceRequirementIdentity {
  if (!isRuntimeResource(requirement.resource)) {
    throw new TypeError("A resource requirement must reference a runtime resource.");
  }
  const lifetime = requirement.lifetime ?? requirement.resource.defaultLifetime;
  if (!requirement.resource.allowedLifetimes.includes(lifetime)) {
    throw new TypeError("A resource requirement selected an incompatible lifetime.");
  }
  if (requirement.role !== undefined && !isAppRole(requirement.role)) {
    throw new TypeError("A resource requirement has an invalid role.");
  }
  if (requirement.instance !== undefined && typeof requirement.instance !== "string") {
    throw new TypeError("A resource requirement instance must be a string.");
  }

  return Object.freeze({
    resourceId: requirement.resource.id,
    lifetime,
    ...(requirement.role === undefined ? {} : { role: requirement.role }),
    ...(requirement.instance === undefined ? {} : { instance: requirement.instance }),
  });
}

function isAppRole(value: unknown): value is AppRole {
  return ["server", "async", "cli", "web", "agent", "desktop"].includes(
    typeof value === "string" ? value : ""
  );
}

function normalizedRequirement(
  authored: AuthoredResourceRequirement,
  owner: ResourceRequirementOwner
): ResourceRequirement {
  if (typeof authored.reason !== "string") {
    throw new TypeError("A resource requirement reason must be a string.");
  }
  if (authored.optional !== undefined && typeof authored.optional !== "boolean") {
    throw new TypeError("A resource requirement optional flag must be boolean.");
  }
  const resource = assertResourceIdentityInput(authored);
  const optional = authored.optional ?? false;
  const requirementId = resourceRequirementId({ owner, resource, optional });
  return Object.freeze({
    kind: "normalized.resource-requirement",
    requirementId,
    owner: Object.freeze({ ...owner }),
    resource: copyResourceIdentity(resource),
    optional,
    reason: authored.reason,
  });
}

function insertUnique<T>(map: Map<string, T>, id: string, value: T, label: string): void {
  if (map.has(id)) throw new TypeError(`Duplicate ${label}.`);
  map.set(id, value);
}

function registerServiceDefinition(
  definition: ServiceDefinition,
  serviceDefinitions: Map<string, ServiceDefinition>
): void {
  const existing = serviceDefinitions.get(definition.id);
  if (existing !== undefined && existing !== definition) {
    throw new TypeError("One service id resolved to divergent definitions.");
  }
  serviceDefinitions.set(definition.id, definition);
}

function normalizeServiceRelations(
  definition: ServiceDefinition,
  serviceDefinitions: Map<string, ServiceDefinition>,
  serviceDependencies: Map<string, NormalizedServiceDependency>,
  semanticDependencies: Map<string, NormalizedSemanticDependency>,
  visited: Set<string>
): void {
  registerServiceDefinition(definition, serviceDefinitions);
  if (visited.has(definition.id)) return;
  visited.add(definition.id);

  for (const localName of Object.keys(definition.deps).sort(compareStrings)) {
    const dependency = definition.deps[localName];
    if (dependency === undefined) throw new TypeError("A service dependency is absent.");
    switch (dependency.kind) {
      case "service.dependency.service": {
        const dependencyId = serviceDependencyId({
          serviceId: definition.id,
          localName,
          dependencyServiceId: dependency.service.id,
        });
        const normalized = Object.freeze({
          kind: "normalized.service-dependency" as const,
          dependencyId,
          serviceId: definition.id,
          localName,
          dependencyServiceId: dependency.service.id,
        });
        const existing = serviceDependencies.get(dependencyId);
        if (existing !== undefined && canonicalJson(existing) !== canonicalJson(normalized)) {
          throw new TypeError("A service dependency identity collided.");
        }
        serviceDependencies.set(dependencyId, normalized);
        normalizeServiceRelations(
          dependency.service,
          serviceDefinitions,
          serviceDependencies,
          semanticDependencies,
          visited
        );
        break;
      }
      case "service.dependency.semantic": {
        const dependencyId = semanticDependencyId({
          serviceId: definition.id,
          localName,
          adapterId: dependency.adapterId,
        });
        const normalized = Object.freeze({
          kind: "normalized.semantic-dependency" as const,
          dependencyId,
          serviceId: definition.id,
          localName,
          adapterId: dependency.adapterId,
        });
        const existing = semanticDependencies.get(dependencyId);
        if (existing !== undefined && canonicalJson(existing) !== canonicalJson(normalized)) {
          throw new TypeError("A semantic dependency identity collided.");
        }
        semanticDependencies.set(dependencyId, normalized);
        break;
      }
      case "service.dependency.resource":
        break;
    }
  }
}

function bindingNodeDependencies(
  node: RootBindingInput | DependencyBindingInput | undefined,
  definition: ServiceDefinition
): Readonly<Record<string, DependencyBindingInput>> {
  const dependencies = node?.dependencies ?? {};
  for (const key of Reflect.ownKeys(dependencies)) {
    if (typeof key !== "string") throw new TypeError("Binding dependency keys must be strings.");
    const declaration = definition.deps[key];
    if (declaration?.kind !== "service.dependency.service") {
      throw new TypeError("Binding overrides may target only immediate service dependencies.");
    }
    const override = dependencies[key];
    if (override === undefined || !bindingOverrideHasEffect(override)) {
      throw new TypeError("A service dependency binding override must be used.");
    }
  }
  return dependencies;
}

function bindingOverrideHasEffect(node: DependencyBindingInput): boolean {
  if (node.instance !== undefined || node.scope !== undefined || node.config !== undefined) {
    return true;
  }
  return Object.values(node.dependencies ?? {}).some(bindingOverrideHasEffect);
}

function rootBindingHasEffect(node: RootBindingInput): boolean {
  if (node.scope !== undefined || node.config !== undefined) return true;
  return Object.values(node.dependencies ?? {}).some(bindingOverrideHasEffect);
}

function effectiveLaneRef(
  hasSchema: boolean,
  authored: RuntimeConfigRefInput | undefined,
  inherited: NormalizedRuntimeConfigRef | undefined,
  sources: readonly NormalizedRuntimeConfigSource[]
): NormalizedRuntimeConfigRef | undefined {
  if (!hasSchema) {
    if (authored !== undefined) throw new TypeError("A schema-free service lane forbids a ref.");
    return undefined;
  }
  if (authored !== undefined) return expandConfigRef(authored.key, sources);
  if (inherited !== undefined) return copyConfigRef(inherited);
  throw new TypeError("A schema-backed service lane requires a config ref.");
}

function serviceOwnedRequirement(
  definition: ServiceDefinition,
  localName: string,
  dependency: Extract<
    ServiceDependencyDeclaration,
    { readonly kind: "service.dependency.resource" }
  >,
  role: AppRole
): ResourceRequirement {
  if (!isRuntimeResource(dependency.resource)) {
    throw new TypeError("A service resource dependency is invalid.");
  }
  const owner = Object.freeze({
    kind: "service" as const,
    serviceId: definition.id,
    localName,
  });
  const resource = Object.freeze({
    resourceId: dependency.resource.id,
    lifetime: dependency.resource.defaultLifetime,
    ...(dependency.resource.defaultLifetime === "role" ? { role } : {}),
  });
  const requirementId = resourceRequirementId({ owner, resource, optional: false });
  return Object.freeze({
    kind: "normalized.resource-requirement",
    requirementId,
    owner,
    resource,
    optional: false,
    reason: localName,
  });
}

function deriveBindingPlan(input: {
  readonly definition: ServiceDefinition;
  readonly instance?: string;
  readonly node?: RootBindingInput | DependencyBindingInput;
  readonly inheritedScope?: NormalizedRuntimeConfigRef;
  readonly inheritedConfig?: NormalizedRuntimeConfigRef;
  readonly context: BindingContext;
}): ServiceBindingPlan {
  const { context, definition, node } = input;
  registerServiceDefinition(definition, context.serviceDefinitions);
  const activeKey = canonicalJson([context.role, definition.id, input.instance ?? ""]);
  if (context.active.has(activeKey)) throw new TypeError("Service bindings must be acyclic.");
  context.active.add(activeKey);
  try {
    const scopeRef = effectiveLaneRef(
      definition.scope !== undefined,
      node?.scope,
      input.inheritedScope,
      context.sources
    );
    const configRef = effectiveLaneRef(
      definition.config !== undefined,
      node?.config,
      input.inheritedConfig,
      context.sources
    );
    const overrides = bindingNodeDependencies(node, definition);
    const resourceRequirementIds: string[] = [];
    const serviceBindingIds: string[] = [];
    const semanticDependencyIds: string[] = [];

    for (const localName of Object.keys(definition.deps).sort(compareStrings)) {
      const dependency = definition.deps[localName];
      if (dependency === undefined) throw new TypeError("A service dependency is absent.");
      switch (dependency.kind) {
        case "service.dependency.resource": {
          const requirement = serviceOwnedRequirement(
            definition,
            localName,
            dependency,
            context.role
          );
          const origin = `${definition.id}\u0000${localName}`;
          const existing = context.resourceRequirements.get(requirement.requirementId);
          const existingOrigin = context.serviceRequirementOrigins.get(requirement.requirementId);
          if (
            existing !== undefined &&
            (existingOrigin !== origin || canonicalJson(existing) !== canonicalJson(requirement))
          ) {
            throw new TypeError("A service resource requirement identity collided.");
          }
          context.resourceRequirements.set(requirement.requirementId, requirement);
          context.serviceRequirementOrigins.set(requirement.requirementId, origin);
          resourceRequirementIds.push(requirement.requirementId);
          break;
        }
        case "service.dependency.service": {
          const override = overrides[localName];
          const child = deriveBindingPlan({
            definition: dependency.service,
            ...(override?.instance === undefined ? {} : { instance: override.instance }),
            ...(override === undefined ? {} : { node: override }),
            ...(scopeRef === undefined ? {} : { inheritedScope: scopeRef }),
            ...(configRef === undefined ? {} : { inheritedConfig: configRef }),
            context,
          });
          serviceBindingIds.push(child.bindingId);
          break;
        }
        case "service.dependency.semantic":
          semanticDependencyIds.push(
            semanticDependencyId({
              serviceId: definition.id,
              localName,
              adapterId: dependency.adapterId,
            })
          );
          break;
      }
    }

    const identityInput = {
      role: context.role,
      serviceId: definition.id,
      ...(input.instance === undefined ? {} : { serviceInstance: input.instance }),
      ...(scopeRef === undefined ? {} : { scopeRef: copyConfigRef(scopeRef) }),
      ...(configRef === undefined ? {} : { configRef: copyConfigRef(configRef) }),
      resourceRequirementIds: sortedUnique(resourceRequirementIds, "binding resource id"),
      serviceBindingIds: sortedSet(serviceBindingIds),
      semanticDependencyIds: sortedUnique(semanticDependencyIds, "semantic dependency id"),
    };
    const bindingId = serviceBindingId(identityInput);
    const plan: ServiceBindingPlan = Object.freeze({
      kind: "service.binding-plan",
      bindingId,
      ...identityInput,
    });

    const existingIdentity = context.plansByIdentity.get(activeKey);
    if (existingIdentity !== undefined) {
      if (canonicalJson(existingIdentity) !== canonicalJson(plan)) {
        throw new TypeError("A service binding diamond diverged.");
      }
      return existingIdentity;
    }
    const existingId = context.plansById.get(bindingId);
    if (existingId !== undefined && canonicalJson(existingId) !== canonicalJson(plan)) {
      throw new TypeError("A service binding identity collided.");
    }
    context.plansByIdentity.set(activeKey, plan);
    context.plansById.set(bindingId, plan);
    return plan;
  } finally {
    context.active.delete(activeKey);
  }
}

function normalizeProviderSelections(
  entrypoint: Entrypoint,
  sources: readonly NormalizedRuntimeConfigSource[],
  resourceRequirements: Map<string, ResourceRequirement>
): readonly ProviderSelection[] {
  const selections = new Map<string, ProviderSelection>();
  const providersById = new Map<string, RuntimeProvider>();
  const providerRequirementOrigins = new Map<string, string>();

  for (const candidate of entrypoint.profile.providers) {
    if (!isProviderSelection(candidate)) {
      throw new TypeError("Runtime profiles must contain provider selections.");
    }
    const authored = candidate;
    if (authored.resource !== authored.provider.provides) {
      throw new TypeError("A provider selection must use the provider's exact resource.");
    }
    const priorProvider = providersById.get(authored.provider.id);
    if (priorProvider !== undefined && priorProvider !== authored.provider) {
      throw new TypeError("One provider id resolved to divergent provider definitions.");
    }
    providersById.set(authored.provider.id, authored.provider);

    const resource = assertResourceIdentityInput({
      resource: authored.resource,
      ...(authored.lifetime === undefined ? {} : { lifetime: authored.lifetime }),
      ...(authored.role === undefined ? {} : { role: authored.role }),
      ...(authored.instance === undefined ? {} : { instance: authored.instance }),
      reason: "provider selection",
    });
    let configRef: NormalizedRuntimeConfigRef | undefined;
    if (authored.provider.configSchema !== undefined) {
      const key = authored.config?.key ?? authored.provider.defaultConfigKey;
      if (typeof key !== "string" || key.length === 0) {
        throw new TypeError("A schema-backed provider selection requires a config key.");
      }
      configRef = expandConfigRef(key, sources);
    } else {
      if (authored.config !== undefined || authored.provider.defaultConfigKey !== undefined) {
        throw new TypeError("A schema-free provider forbids config keys.");
      }
    }

    const selectionId = providerSelectionId({
      providerId: authored.provider.id,
      resource,
      ...(configRef === undefined ? {} : { configRef }),
    });
    const selection: ProviderSelection = Object.freeze({
      kind: "normalized.provider-selection",
      selectionId,
      providerId: authored.provider.id,
      resource: copyResourceIdentity(resource),
      ...(configRef === undefined ? {} : { configRef: copyConfigRef(configRef) }),
    });
    insertUnique(selections, selectionId, selection, "provider selection identity");

    for (let index = 0; index < authored.provider.requires.length; index += 1) {
      const requirement = normalizedRequirement(authored.provider.requires[index]!, {
        kind: "provider",
        providerId: authored.provider.id,
      });
      const origin = `${authored.provider.id}\u0000${index}`;
      const existing = resourceRequirements.get(requirement.requirementId);
      const priorOrigin = providerRequirementOrigins.get(requirement.requirementId);
      if (
        existing !== undefined &&
        (priorOrigin !== origin || canonicalJson(existing) !== canonicalJson(requirement))
      ) {
        throw new TypeError("A provider resource requirement identity is duplicated.");
      }
      resourceRequirements.set(requirement.requirementId, requirement);
      providerRequirementOrigins.set(requirement.requirementId, origin);
    }
  }

  return Object.freeze(
    [...selections.values()].sort((left, right) =>
      compareStrings(left.selectionId, right.selectionId)
    )
  );
}

function validateCoverage(
  requirements: readonly ResourceRequirement[],
  selections: readonly ProviderSelection[]
): readonly DerivationFinding[] {
  const selectionsByResource = new Map<string, ProviderSelection[]>();
  const selectedResourceKeys = new Set<string>();
  for (const selection of selections) {
    const key = canonicalJson(selection.resource);
    const matching = selectionsByResource.get(key) ?? [];
    matching.push(selection);
    selectionsByResource.set(key, matching);
  }

  const findings: DerivationFinding[] = [];
  for (const requirement of requirements) {
    const key = canonicalJson(requirement.resource);
    const matching = selectionsByResource.get(key) ?? [];
    if (matching.length > 1) throw new TypeError("Resource provider coverage is ambiguous.");
    if (matching.length === 0) {
      if (!requirement.optional) throw new TypeError("A required resource has no provider.");
      findings.push(
        Object.freeze({
          kind: "derivation.finding",
          code: "provider-selection.optional-missing",
          requirementId: requirement.requirementId,
          resource: copyResourceIdentity(requirement.resource),
        })
      );
      continue;
    }
    selectedResourceKeys.add(key);
  }

  for (const key of selectionsByResource.keys()) {
    if (!selectedResourceKeys.has(key)) {
      throw new TypeError("A provider selection does not cover a resource requirement.");
    }
  }

  findings.sort((left, right) =>
    compareTuples(
      [
        left.code,
        left.requirementId,
        left.resource.resourceId,
        left.resource.lifetime,
        left.resource.role ?? "",
        left.resource.instance ?? "",
      ],
      [
        right.code,
        right.requirementId,
        right.resource.resourceId,
        right.resource.lifetime,
        right.resource.role ?? "",
        right.resource.instance ?? "",
      ]
    )
  );
  return Object.freeze(findings);
}

function isAsyncWorkflowPlugin(plugin: PluginDefinition): plugin is AsyncWorkflowPluginDefinition {
  return plugin.role === "async" && plugin.surface === "async/workflow" && "workflows" in plugin;
}

function isAsyncSchedulePlugin(plugin: PluginDefinition): plugin is AsyncSchedulePluginDefinition {
  return plugin.role === "async" && plugin.surface === "async/schedule" && "schedules" in plugin;
}

function isAsyncConsumerPlugin(plugin: PluginDefinition): plugin is AsyncConsumerPluginDefinition {
  return plugin.role === "async" && plugin.surface === "async/consumer" && "consumers" in plugin;
}

function isWebPlugin(plugin: PluginDefinition): plugin is WebAppPluginDefinition {
  return plugin.role === "web" && plugin.surface === "web/app" && "routes" in plugin;
}

function collectAsyncEntries(state: PluginDerivationState, appId: string): void {
  const plugin = state.definition;
  const add = (occurrence: AsyncStepDescriptorOccurrence) => {
    state.executionEntries.push(deriveAsyncExecutionEntry(occurrence));
  };

  if (isAsyncWorkflowPlugin(plugin)) {
    const workflowIds = sortedUnique(
      plugin.workflows.map((workflow) => workflow.id),
      "workflow id"
    );
    for (const workflow of plugin.workflows) {
      for (const descriptor of workflow.steps) {
        add({ ownerId: state.ownerId, owner: { workflowId: workflow.id }, descriptor });
      }
    }
    const descriptorId = workflowDispatcherId({
      appId,
      pluginOwnerId: state.ownerId,
      role: "async",
      surface: "async/workflow",
      capability: plugin.capability,
      workflowIds,
    });
    state.workflowDispatcher = Object.freeze({
      kind: "workflow.dispatcher-descriptor",
      descriptorId,
      appId,
      pluginOwnerId: state.ownerId,
      role: "async",
      surface: "async/workflow",
      capability: plugin.capability,
      workflowIds,
    });
    return;
  }
  if (isAsyncSchedulePlugin(plugin)) {
    sortedUnique(
      plugin.schedules.map((schedule) => schedule.id),
      "schedule id"
    );
    for (const schedule of plugin.schedules) {
      for (const descriptor of schedule.steps) {
        add({ ownerId: state.ownerId, owner: { scheduleId: schedule.id }, descriptor });
      }
    }
    return;
  }
  if (isAsyncConsumerPlugin(plugin)) {
    sortedUnique(
      plugin.consumers.map((consumer) => consumer.id),
      "consumer id"
    );
    for (const consumer of plugin.consumers) {
      for (const descriptor of consumer.steps) {
        add({ ownerId: state.ownerId, owner: { consumerId: consumer.id }, descriptor });
      }
    }
  }
}

function collectWebEntries(state: PluginDerivationState): void {
  if (!isWebPlugin(state.definition)) return;
  for (const route of state.definition.routes) {
    if (typeof route.module !== "function") throw new TypeError("A web route requires a loader.");
    state.webEntries.push(
      Object.freeze({
        ref: Object.freeze({
          kind: "web.route-module-ref",
          ownerId: state.ownerId,
          routeId: route.id,
          path: route.path,
        }),
        load: route.module,
      })
    );
  }
}

function buildSurfacePlan(
  state: PluginDerivationState,
  executionRefs: readonly ExecutionDescriptorRef[],
  webRefs: readonly WebRouteModuleRef[]
): SurfaceRuntimePlan {
  const plugin = state.definition;
  const id = surfacePlanId({
    pluginOwnerId: state.ownerId,
    role: plugin.role,
    surface: plugin.surface,
    capability: plugin.capability,
  });
  const dispatcherIds =
    state.workflowDispatcher === undefined
      ? Object.freeze([])
      : Object.freeze([state.workflowDispatcher.descriptorId]);
  return Object.freeze({
    kind: "surface.runtime-plan",
    surfacePlanId: id,
    pluginOwnerId: state.ownerId,
    role: plugin.role,
    surface: plugin.surface,
    capability: plugin.capability,
    serviceBindingIds: sortedSet(state.rootBindingIds),
    resourceRequirementIds: sortedUnique(
      state.resourceRequirementIds,
      "surface resource requirement id"
    ),
    workflowDispatcherDescriptorIds: dispatcherIds,
    executionDescriptorRefs: Object.freeze(
      executionRefs.filter((ref) => ref.ownerId === state.ownerId).map(copyExecutionRef)
    ),
    webRouteModuleRefs: Object.freeze(
      webRefs.filter((ref) => ref.ownerId === state.ownerId).map(copyWebRef)
    ),
  });
}

function buildRoleSurfaceIndex(
  plans: readonly SurfaceRuntimePlan[]
): readonly DerivedRoleSurfaceIndexEntry[] {
  const grouped = new Map<string, { role: AppRole; surface: string; ids: string[] }>();
  for (const plan of plans) {
    const key = canonicalJson([plan.role, plan.surface]);
    const group = grouped.get(key) ?? { role: plan.role, surface: plan.surface, ids: [] };
    group.ids.push(plan.surfacePlanId);
    grouped.set(key, group);
  }
  return Object.freeze(
    [...grouped.values()]
      .sort((left, right) => compareTuples([left.role, left.surface], [right.role, right.surface]))
      .map((group) =>
        Object.freeze({
          role: group.role,
          surface: group.surface,
          surfacePlanIds: sortedUnique(group.ids, "role/surface plan id"),
        })
      )
  );
}

export function deriveRuntimeArtifacts(input: RuntimeDerivationInput): RuntimeDerivationResult {
  const topology = deriveNormalizedRuntimeTopology({
    entrypoint: input.entrypoint,
    profileId: input.profileId,
  });
  const { entrypoint } = input;
  const sources = normalizeConfigSources(entrypoint.profile.configSources);
  const serviceDefinitions = new Map<string, ServiceDefinition>();
  const serviceDependencies = new Map<string, NormalizedServiceDependency>();
  const semanticDependencies = new Map<string, NormalizedSemanticDependency>();
  const resourceRequirements = new Map<string, ResourceRequirement>();
  const serviceRequirementOrigins = new Map<string, string>();
  const plansByIdentity = new Map<string, ServiceBindingPlan>();
  const plansById = new Map<string, ServiceBindingPlan>();
  const serviceUses = new Map<string, NormalizedServiceUse>();
  const pluginStates: PluginDerivationState[] = [];

  for (const definition of entrypoint.app.plugins) {
    const identity = Object.freeze({
      pluginId: definition.id,
      ...(definition.instance === undefined ? {} : { instance: definition.instance }),
    });
    const ownerId = pluginOwnerId(identity);
    const state: PluginDerivationState = {
      definition,
      identity,
      ownerId,
      serviceUseIds: [],
      rootBindingIds: [],
      resourceRequirementIds: [],
      executionEntries: [],
      webEntries: [],
    };

    const visitedRelations = new Set<string>();
    for (const localName of Object.keys(definition.services).sort(compareStrings)) {
      const serviceUse = definition.services[localName];
      if (serviceUse === undefined) throw new TypeError("A plugin service use is absent.");
      const carrier = readServiceUse(serviceUse);
      if (carrier === undefined || serviceUse.serviceId !== carrier.definition.id) {
        throw new TypeError("A service-use carrier disagrees with its public relation.");
      }
      normalizeServiceRelations(
        carrier.definition,
        serviceDefinitions,
        serviceDependencies,
        semanticDependencies,
        visitedRelations
      );
      const useId = serviceUseId({
        pluginOwnerId: ownerId,
        localName,
        serviceId: carrier.definition.id,
        ...(serviceUse.serviceInstance === undefined
          ? {}
          : { serviceInstance: serviceUse.serviceInstance }),
      });
      const normalizedUse: NormalizedServiceUse = Object.freeze({
        kind: "normalized.service-use",
        useId,
        pluginOwnerId: ownerId,
        localName,
        serviceId: carrier.definition.id,
        ...(serviceUse.serviceInstance === undefined
          ? {}
          : { serviceInstance: serviceUse.serviceInstance }),
      });
      insertUnique(serviceUses, useId, normalizedUse, "service use identity");
      state.serviceUseIds.push(useId);

      const bindingContext: BindingContext = {
        role: definition.role,
        sources,
        serviceDefinitions,
        serviceDependencies,
        semanticDependencies,
        resourceRequirements,
        serviceRequirementOrigins,
        plansByIdentity,
        plansById,
        active: new Set<string>(),
      };
      if (carrier.binding !== undefined && !rootBindingHasEffect(carrier.binding)) {
        throw new TypeError("A service-use binding must affect a reachable binding lane.");
      }
      const rootPlan = deriveBindingPlan({
        definition: carrier.definition,
        ...(serviceUse.serviceInstance === undefined
          ? {}
          : { instance: serviceUse.serviceInstance }),
        ...(carrier.binding === undefined ? {} : { node: carrier.binding }),
        context: bindingContext,
      });
      state.rootBindingIds.push(rootPlan.bindingId);
    }

    for (const authored of definition.resourceRequirements) {
      const requirement = normalizedRequirement(authored, {
        kind: "plugin",
        pluginOwnerId: ownerId,
      });
      insertUnique(
        resourceRequirements,
        requirement.requirementId,
        requirement,
        "plugin resource requirement identity"
      );
      state.resourceRequirementIds.push(requirement.requirementId);
    }
    collectAsyncEntries(state, entrypoint.app.id);
    collectWebEntries(state);
    pluginStates.push(state);
  }

  const providerSelections = normalizeProviderSelections(entrypoint, sources, resourceRequirements);
  const sortedResourceRequirements = Object.freeze(
    [...resourceRequirements.values()].sort((left, right) =>
      compareStrings(left.requirementId, right.requirementId)
    )
  );
  const findings = validateCoverage(sortedResourceRequirements, providerSelections);

  const executionDescriptorTable = createExecutionDescriptorTable(
    pluginStates.flatMap((state) => state.executionEntries)
  );
  const executionDescriptorRefs = Object.freeze(
    executionDescriptorTable.entries().map(([ref]) => copyExecutionRef(ref))
  );
  const webRouteModuleTable = createWebRouteModuleTable(
    pluginStates.flatMap((state) => state.webEntries)
  );
  const webRouteModuleRefs = Object.freeze(
    webRouteModuleTable.entries().map((entry) => copyWebRef(entry.ref))
  );

  const surfaceRuntimePlans = Object.freeze(
    pluginStates
      .map((state) => buildSurfacePlan(state, executionDescriptorRefs, webRouteModuleRefs))
      .sort((left, right) => compareStrings(left.surfacePlanId, right.surfacePlanId))
  );
  const workflowDispatcherDescriptors = Object.freeze(
    pluginStates
      .flatMap((state) =>
        state.workflowDispatcher === undefined ? [] : [state.workflowDispatcher]
      )
      .sort((left, right) => compareStrings(left.descriptorId, right.descriptorId))
  );
  for (let index = 1; index < workflowDispatcherDescriptors.length; index += 1) {
    if (
      workflowDispatcherDescriptors[index - 1]!.descriptorId ===
      workflowDispatcherDescriptors[index]!.descriptorId
    ) {
      throw new TypeError("Duplicate workflow dispatcher identity.");
    }
  }

  const plugins: readonly NormalizedPluginDefinition[] = Object.freeze(
    pluginStates
      .map((state) =>
        Object.freeze({
          kind: "normalized.plugin-definition" as const,
          ownerId: state.ownerId,
          plugin: Object.freeze({
            pluginId: state.identity.pluginId,
            ...(state.identity.instance === undefined ? {} : { instance: state.identity.instance }),
          }),
          role: state.definition.role,
          surface: state.definition.surface,
          capability: state.definition.capability,
          serviceUseIds: sortedUnique(state.serviceUseIds, "plugin service-use id"),
          resourceRequirementIds: sortedUnique(
            state.resourceRequirementIds,
            "plugin resource-requirement id"
          ),
        })
      )
      .sort((left, right) => compareStrings(left.ownerId, right.ownerId))
  );
  const harnesses = sortedUnique(entrypoint.profile.harnesses ?? [], "profile harness");
  const roleSurfaceEntries = buildRoleSurfaceIndex(surfaceRuntimePlans);
  const graph: NormalizedAuthoringGraph = Object.freeze({
    kind: "normalized.authoring-graph",
    topology,
    app: Object.freeze({
      kind: "normalized.app-definition",
      appId: entrypoint.app.id,
      pluginOwnerIds: sortedUnique(
        pluginStates.map((state) => state.ownerId),
        "app plugin-owner id"
      ),
    }),
    plugins,
    roleSurfaceIndex: Object.freeze({
      kind: "derived.role-surface-index",
      entries: roleSurfaceEntries,
    }),
    serviceUses: Object.freeze(
      [...serviceUses.values()].sort((left, right) => compareStrings(left.useId, right.useId))
    ),
    serviceDependencies: Object.freeze(
      [...serviceDependencies.values()].sort((left, right) =>
        compareStrings(left.dependencyId, right.dependencyId)
      )
    ),
    semanticDependencies: Object.freeze(
      [...semanticDependencies.values()].sort((left, right) =>
        compareStrings(left.dependencyId, right.dependencyId)
      )
    ),
    resourceRequirements: sortedResourceRequirements,
    profile: Object.freeze({
      kind: "normalized.runtime-profile",
      profileId: entrypoint.profile.id,
      providerSelections,
      configSources: sources,
      ...(entrypoint.profile.processDefaults === undefined
        ? {}
        : { processDefaults: copyProcessDefaults(entrypoint.profile.processDefaults) }),
      harnesses,
    }),
    serviceBindingPlans: Object.freeze(
      [...plansById.values()].sort((left, right) => compareStrings(left.bindingId, right.bindingId))
    ),
    surfaceRuntimePlans,
    workflowDispatcherDescriptors,
    executionDescriptorRefs: Object.freeze(executionDescriptorRefs.map(copyExecutionRef)),
    webRouteModuleRefs: Object.freeze(webRouteModuleRefs.map(copyWebRef)),
    findings,
  });
  const decodedGraph = NormalizedAuthoringGraphRuntimeSchema.decode(graph);
  if (!decodedGraph.success)
    throw new TypeError("Complete runtime derivation emitted an invalid graph.");

  const portableArtifact = buildPortableRuntimePlanArtifact(
    topology,
    graph.executionDescriptorRefs
  );
  return Object.freeze({
    topology,
    graph,
    executionDescriptorTable,
    webRouteModuleTable,
    portableArtifact,
  });
}
