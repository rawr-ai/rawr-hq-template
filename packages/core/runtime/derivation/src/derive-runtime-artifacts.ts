import type { AgentToolPluginDefinition } from "../../definition/src/agent";
import type { AppRole, Entrypoint } from "../../definition/src/app";
import type {
  AsyncConsumerPluginDefinition,
  AsyncSchedulePluginDefinition,
  AsyncWorkflowPluginDefinition,
} from "../../definition/src/async-plugin";
import type { CliTopicPluginDefinition } from "../../definition/src/cli";
import type { DesktopBackgroundPluginDefinition } from "../../definition/src/desktop";
import { readExecutionProjection } from "../../definition/src/execution";
import type { PluginDefinition, WebAppPluginDefinition } from "../../definition/src/plugin";
import type { ProviderSelection as AuthoredProviderSelection } from "../../definition/src/profile";
import type { RuntimeProvider } from "../../definition/src/provider";
import type {
  ResourceRequirement as AuthoredResourceRequirement,
  RuntimeResource,
} from "../../definition/src/resource";
import {
  readServiceUse,
  type ServiceDefinition,
  type ServiceDependencyDeclaration,
  type ServiceRuntimeExport,
} from "../../definition/src/service";
import type { RuntimeAsyncDescriptorReference, RuntimeAsyncSource } from "./async-source";
import type { RuntimeDerivationHandoffCarrier } from "./derivation-carrier";
import { attachRuntimeDerivationHandoff } from "./derivation-handoff";
import {
  type AsyncStepDescriptorOccurrence,
  createExecutionDescriptorTable,
  deriveAsyncExecutionEntry,
  deriveCommandExecutionEntry,
  deriveDesktopBackgroundExecutionEntry,
  deriveToolExecutionEntry,
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
import { readServerSource } from "./server-source";
import type { NormalizedRuntimeConfigRef, ServiceBindingPlan } from "./service-binding-plan";
import { assertSurfaceReferenceRelation } from "./surface-reference-policy";
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

export interface RuntimeDerivationResult extends RuntimeDerivationHandoffCarrier {
  readonly topology: NormalizedRuntimeTopology;
  readonly graph: NormalizedAuthoringGraph;
  readonly executionDescriptorTable: ExecutionDescriptorTable;
  readonly webRouteModuleTable: WebRouteModuleTable;
  /** Cold native discovery inventory, never serialized or executable callback authority. */
  readonly cliCommandSources: readonly {
    readonly ref: Extract<ExecutionDescriptorRef, { readonly boundary: "plugin.cli-command" }>;
    readonly source: unknown;
  }[];
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
  readonly serviceBindings: { readonly localName: string; readonly bindingId: string }[];
  readonly resourceRequirementIds: string[];
  readonly executionEntries: ReturnType<typeof deriveAsyncExecutionEntry>[];
  readonly webEntries: WebRouteModuleTableEntry[];
  asyncSource?: RuntimeAsyncSource;
  workflowDispatcher?: WorkflowDispatcherDescriptor;
}

interface BindingContext {
  readonly role: AppRole;
  readonly sources: readonly NormalizedRuntimeConfigSource[];
  readonly serviceExports: Map<string, ServiceRuntimeExport>;
  readonly serviceDependencies: Map<string, NormalizedServiceDependency>;
  readonly semanticDependencies: Map<string, NormalizedSemanticDependency>;
  readonly resourceRequirements: Map<string, ResourceRequirement>;
  readonly serviceRequirementOrigins: Map<string, string>;
  readonly plansByIdentity: Map<string, ServiceBindingPlan>;
  readonly plansByRequest: Map<string, ServiceBindingPlan>;
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

function registerServiceExport(
  service: ServiceRuntimeExport,
  serviceExports: Map<string, ServiceRuntimeExport>
): ServiceDefinition {
  if (
    service.kind !== "service.runtime-export" ||
    service.definition.kind !== "service.definition" ||
    typeof service.construct !== "function"
  ) {
    throw new TypeError("A selected service requires its complete cold export.");
  }
  const definition = service.definition;
  const existing = serviceExports.get(definition.id);
  if (existing !== undefined && existing !== service) {
    throw new TypeError("One service id resolved to divergent complete exports.");
  }
  serviceExports.set(definition.id, service);
  return definition;
}

function normalizeServiceRelations(
  service: ServiceRuntimeExport,
  serviceExports: Map<string, ServiceRuntimeExport>,
  serviceDependencies: Map<string, NormalizedServiceDependency>,
  semanticDependencies: Map<string, NormalizedSemanticDependency>,
  visited: Set<string>
): void {
  const definition = registerServiceExport(service, serviceExports);
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
          dependencyServiceId: dependency.service.definition.id,
        });
        const normalized = Object.freeze({
          kind: "normalized.service-dependency" as const,
          dependencyId,
          serviceId: definition.id,
          localName,
          dependencyServiceId: dependency.service.definition.id,
        });
        const existing = serviceDependencies.get(dependencyId);
        if (existing !== undefined && canonicalJson(existing) !== canonicalJson(normalized)) {
          throw new TypeError("A service dependency identity collided.");
        }
        serviceDependencies.set(dependencyId, normalized);
        normalizeServiceRelations(
          dependency.service,
          serviceExports,
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
  readonly service: ServiceRuntimeExport;
  readonly instance?: string;
  readonly node?: RootBindingInput | DependencyBindingInput;
  readonly inheritedScope?: NormalizedRuntimeConfigRef;
  readonly inheritedConfig?: NormalizedRuntimeConfigRef;
  readonly context: BindingContext;
}): ServiceBindingPlan {
  const { context, node } = input;
  const definition = registerServiceExport(input.service, context.serviceExports);
  if (
    input.instance !== undefined &&
    (typeof input.instance !== "string" || input.instance.length === 0)
  ) {
    throw new TypeError("A service instance must be a nonempty string.");
  }
  const activeKey = canonicalJson([context.role, definition.id, input.instance ?? ""]);
  if (context.active.has(activeKey)) throw new TypeError("Service bindings must be acyclic.");
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
  // Reuse a complete incoming request before descending through equal diamonds.
  // Path-local overrides remain in the key so reuse cannot hide a divergent leaf.
  const requestKey = canonicalJson([
    activeKey,
    scopeRef ?? null,
    configRef ?? null,
    node?.dependencies ?? {},
  ]);
  const reused = context.plansByRequest.get(requestKey);
  if (reused !== undefined) return reused;
  context.active.add(activeKey);
  try {
    const overrides = bindingNodeDependencies(node, definition);
    const resourceRequirementIds: string[] = [];
    const serviceDependencies: { readonly localName: string; readonly bindingId: string }[] = [];
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
            service: dependency.service,
            ...(override?.instance === undefined ? {} : { instance: override.instance }),
            ...(override === undefined ? {} : { node: override }),
            ...(scopeRef === undefined ? {} : { inheritedScope: scopeRef }),
            ...(configRef === undefined ? {} : { inheritedConfig: configRef }),
            context,
          });
          serviceDependencies.push(Object.freeze({ localName, bindingId: child.bindingId }));
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
      serviceDependencies: Object.freeze(serviceDependencies),
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
      context.plansByRequest.set(requestKey, existingIdentity);
      return existingIdentity;
    }
    const existingId = context.plansById.get(bindingId);
    if (existingId !== undefined && canonicalJson(existingId) !== canonicalJson(plan)) {
      throw new TypeError("A service binding identity collided.");
    }
    context.plansByIdentity.set(activeKey, plan);
    context.plansByRequest.set(requestKey, plan);
    context.plansById.set(bindingId, plan);
    return plan;
  } finally {
    context.active.delete(activeKey);
  }
}

function normalizeProviderSelections(
  entrypoint: Entrypoint,
  sources: readonly NormalizedRuntimeConfigSource[],
  resourceRequirements: Map<string, ResourceRequirement>,
  providerReferences: Map<string, RuntimeProvider>,
  resourceReferences: Map<string, AuthoredResourceRequirement>
): readonly ProviderSelection[] {
  const selections = new Map<string, ProviderSelection>();
  const providersById = new Map<string, RuntimeProvider>();
  const providerRequirementOrigins = new Map<string, string>();
  const candidatesByResource = new Map<string, AuthoredProviderSelection[]>();

  for (const candidate of entrypoint.profile.providers) {
    if (!isProviderSelection(candidate)) {
      throw new TypeError("Runtime profiles must contain provider selections.");
    }
    if (candidate.resource !== candidate.provider.provides) {
      throw new TypeError("A provider selection must use the provider's exact resource.");
    }
    const resource = assertResourceIdentityInput({
      resource: candidate.resource,
      ...(candidate.lifetime === undefined ? {} : { lifetime: candidate.lifetime }),
      ...(candidate.role === undefined ? {} : { role: candidate.role }),
      ...(candidate.instance === undefined ? {} : { instance: candidate.instance }),
      reason: "provider selection",
    });
    const key = canonicalJson(resource);
    const candidates = candidatesByResource.get(key) ?? [];
    candidates.push(candidate);
    candidatesByResource.set(key, candidates);
  }

  // Only reached selections contribute config refs and transitive requirements.
  const pending = [...resourceRequirements.values()];
  const selectedResources = new Set<string>();
  for (let index = 0; index < pending.length; index += 1) {
    const requested = pending[index]!;
    const resource = requested.resource;
    const key = canonicalJson(resource);
    const candidates = candidatesByResource.get(key) ?? [];
    if (candidates.length > 1) throw new TypeError("Resource provider coverage is ambiguous.");
    const authored = candidates[0];
    if (authored === undefined || selectedResources.has(key)) continue;
    selectedResources.add(key);
    const priorProvider = providersById.get(authored.provider.id);
    if (priorProvider !== undefined && priorProvider !== authored.provider) {
      throw new TypeError("One provider id resolved to divergent provider definitions.");
    }
    providersById.set(authored.provider.id, authored.provider);

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
    providerReferences.set(selectionId, authored.provider);

    for (
      let dependencyIndex = 0;
      dependencyIndex < authored.provider.requires.length;
      dependencyIndex += 1
    ) {
      const requirement = normalizedRequirement(authored.provider.requires[dependencyIndex]!, {
        kind: "provider",
        providerId: authored.provider.id,
      });
      const origin = `${authored.provider.id}\u0000${dependencyIndex}`;
      const existing = resourceRequirements.get(requirement.requirementId);
      const priorOrigin = providerRequirementOrigins.get(requirement.requirementId);
      if (
        existing !== undefined &&
        (priorOrigin !== origin || canonicalJson(existing) !== canonicalJson(requirement))
      ) {
        throw new TypeError("A provider resource requirement identity is duplicated.");
      }
      resourceRequirements.set(requirement.requirementId, requirement);
      resourceReferences.set(
        requirement.requirementId,
        authored.provider.requires[dependencyIndex]!
      );
      providerRequirementOrigins.set(requirement.requirementId, origin);
      if (existing === undefined) pending.push(requirement);
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
  selections: readonly ProviderSelection[],
  resourceBindings: Map<string, string>
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
    resourceBindings.set(requirement.requirementId, matching[0]!.selectionId);
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

function isAgentToolPlugin(plugin: PluginDefinition): plugin is AgentToolPluginDefinition {
  return plugin.role === "agent" && plugin.surface === "agent/tools" && "tools" in plugin;
}

function isDesktopBackgroundPlugin(
  plugin: PluginDefinition
): plugin is DesktopBackgroundPluginDefinition {
  return (
    plugin.role === "desktop" && plugin.surface === "desktop/background" && "backgrounds" in plugin
  );
}

function collectExecutionEntries(state: PluginDerivationState, appId: string): void {
  const plugin = state.definition;
  if (isCliTopicPlugin(plugin)) {
    for (const command of plugin.commands) {
      state.executionEntries.push(deriveCommandExecutionEntry(state.ownerId, command));
    }
    return;
  }
  if (isAgentToolPlugin(plugin)) {
    for (const tool of plugin.tools) {
      state.executionEntries.push(deriveToolExecutionEntry(state.ownerId, tool));
    }
    return;
  }
  if (isDesktopBackgroundPlugin(plugin)) {
    for (const background of plugin.backgrounds) {
      state.executionEntries.push(deriveDesktopBackgroundExecutionEntry(state.ownerId, background));
    }
    return;
  }
  const add = (occurrence: AsyncStepDescriptorOccurrence): RuntimeAsyncDescriptorReference => {
    const entry = deriveAsyncExecutionEntry(occurrence);
    state.executionEntries.push(entry);
    if (entry[0].boundary !== "plugin.async-step")
      throw new TypeError("An async source requires its own step occurrence reference.");
    return Object.freeze([occurrence.descriptor, entry[0]]);
  };

  if (isAsyncWorkflowPlugin(plugin)) {
    const workflowIds = sortedUnique(
      plugin.workflows.map((workflow) => workflow.id),
      "workflow id"
    );
    state.asyncSource = Object.freeze({
      kind: "async/workflow",
      declarations: Object.freeze(
        plugin.workflows.map((workflow) =>
          Object.freeze({
            kind: workflow.kind,
            id: workflow.id,
            eventName: workflow.eventName,
            inputSchema: workflow.inputSchema,
            run: workflow.run,
            ...(workflow.options === undefined ? {} : { options: workflow.options }),
            descriptorReferences: Object.freeze(
              workflow.steps.map((descriptor) =>
                add({ ownerId: state.ownerId, owner: { workflowId: workflow.id }, descriptor })
              )
            ),
          })
        )
      ),
    });
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
    state.asyncSource = Object.freeze({
      kind: "async/schedule",
      declarations: Object.freeze(
        plugin.schedules.map((schedule) =>
          Object.freeze({
            kind: schedule.kind,
            id: schedule.id,
            cron: schedule.cron,
            run: schedule.run,
            ...(schedule.options === undefined ? {} : { options: schedule.options }),
            descriptorReferences: Object.freeze(
              schedule.steps.map((descriptor) =>
                add({ ownerId: state.ownerId, owner: { scheduleId: schedule.id }, descriptor })
              )
            ),
          })
        )
      ),
    });
    return;
  }
  if (isAsyncConsumerPlugin(plugin)) {
    sortedUnique(
      plugin.consumers.map((consumer) => consumer.id),
      "consumer id"
    );
    state.asyncSource = Object.freeze({
      kind: "async/consumer",
      declarations: Object.freeze(
        plugin.consumers.map((consumer) =>
          Object.freeze({
            kind: consumer.kind,
            id: consumer.id,
            eventName: consumer.eventName,
            eventSchema: consumer.eventSchema,
            run: consumer.run,
            ...(consumer.options === undefined ? {} : { options: consumer.options }),
            descriptorReferences: Object.freeze(
              consumer.steps.map((descriptor) =>
                add({ ownerId: state.ownerId, owner: { consumerId: consumer.id }, descriptor })
              )
            ),
          })
        )
      ),
    });
  }
}

function isCliTopicPlugin(plugin: PluginDefinition): plugin is CliTopicPluginDefinition {
  return plugin.role === "cli" && plugin.surface === "cli/commands" && "commands" in plugin;
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
  const selectedExecutionRefs = executionRefs.filter((ref) => ref.ownerId === state.ownerId);
  const selectedWebRefs = webRefs.filter((ref) => ref.ownerId === state.ownerId);
  for (const ref of selectedExecutionRefs) assertSurfaceReferenceRelation(plugin, ref);
  for (const ref of selectedWebRefs) assertSurfaceReferenceRelation(plugin, ref);
  return Object.freeze({
    kind: "surface.runtime-plan",
    surfacePlanId: id,
    pluginOwnerId: state.ownerId,
    role: plugin.role,
    surface: plugin.surface,
    capability: plugin.capability,
    serviceBindings: Object.freeze(
      [...state.serviceBindings].sort((left, right) =>
        compareTuples([left.localName, left.bindingId], [right.localName, right.bindingId])
      )
    ),
    resourceRequirementIds: sortedUnique(
      state.resourceRequirementIds,
      "surface resource requirement id"
    ),
    workflowDispatcherDescriptorIds: dispatcherIds,
    executionDescriptorRefs: Object.freeze(selectedExecutionRefs.map(copyExecutionRef)),
    webRouteModuleRefs: Object.freeze(selectedWebRefs.map(copyWebRef)),
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
  const serviceExports = new Map<string, ServiceRuntimeExport>();
  const serviceDependencies = new Map<string, NormalizedServiceDependency>();
  const semanticDependencies = new Map<string, NormalizedSemanticDependency>();
  const resourceRequirements = new Map<string, ResourceRequirement>();
  const resourceReferences = new Map<string, AuthoredResourceRequirement>();
  const serviceRequirementOrigins = new Map<string, string>();
  const plansByIdentity = new Map<string, ServiceBindingPlan>();
  const plansByRequest = new Map<string, ServiceBindingPlan>();
  const plansById = new Map<string, ServiceBindingPlan>();
  const providerReferences = new Map<string, RuntimeProvider>();
  const resourceBindings = new Map<string, string>();
  const serviceUses = new Map<string, NormalizedServiceUse>();
  const pluginStates: PluginDerivationState[] = [];
  const visitedRelations = new Set<string>();
  const roles = new Set(topology.roleRequirements);

  for (const definition of entrypoint.app.plugins) {
    if (!roles.has(definition.role)) continue;
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
      serviceBindings: [],
      resourceRequirementIds: [],
      executionEntries: [],
      webEntries: [],
    };

    for (const localName of Object.keys(definition.services).sort(compareStrings)) {
      const serviceUse = definition.services[localName];
      if (serviceUse === undefined) throw new TypeError("A plugin service use is absent.");
      const carrier = readServiceUse(serviceUse);
      if (carrier === undefined || serviceUse.serviceId !== carrier.service.definition.id) {
        throw new TypeError("A service-use carrier disagrees with its public relation.");
      }
      normalizeServiceRelations(
        carrier.service,
        serviceExports,
        serviceDependencies,
        semanticDependencies,
        visitedRelations
      );
      const useId = serviceUseId({
        pluginOwnerId: ownerId,
        localName,
        serviceId: carrier.service.definition.id,
        ...(serviceUse.serviceInstance === undefined
          ? {}
          : { serviceInstance: serviceUse.serviceInstance }),
      });
      const normalizedUse: NormalizedServiceUse = Object.freeze({
        kind: "normalized.service-use",
        useId,
        pluginOwnerId: ownerId,
        localName,
        serviceId: carrier.service.definition.id,
        ...(serviceUse.serviceInstance === undefined
          ? {}
          : { serviceInstance: serviceUse.serviceInstance }),
      });
      insertUnique(serviceUses, useId, normalizedUse, "service use identity");
      state.serviceUseIds.push(useId);

      const bindingContext: BindingContext = {
        role: definition.role,
        sources,
        serviceExports,
        serviceDependencies,
        semanticDependencies,
        resourceRequirements,
        serviceRequirementOrigins,
        plansByIdentity,
        plansByRequest,
        plansById,
        active: new Set<string>(),
      };
      if (carrier.binding !== undefined && !rootBindingHasEffect(carrier.binding)) {
        throw new TypeError("A service-use binding must affect a reachable binding lane.");
      }
      const rootPlan = deriveBindingPlan({
        service: carrier.service,
        ...(serviceUse.serviceInstance === undefined
          ? {}
          : { instance: serviceUse.serviceInstance }),
        ...(carrier.binding === undefined ? {} : { node: carrier.binding }),
        context: bindingContext,
      });
      state.serviceBindings.push(Object.freeze({ localName, bindingId: rootPlan.bindingId }));
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
      resourceReferences.set(requirement.requirementId, authored);
    }
    collectExecutionEntries(state, entrypoint.app.id);
    collectWebEntries(state);
    pluginStates.push(state);
  }

  const providerSelections = normalizeProviderSelections(
    entrypoint,
    sources,
    resourceRequirements,
    providerReferences,
    resourceReferences
  );
  const sortedResourceRequirements = Object.freeze(
    [...resourceRequirements.values()].sort((left, right) =>
      compareStrings(left.requirementId, right.requirementId)
    )
  );
  const findings = validateCoverage(
    sortedResourceRequirements,
    providerSelections,
    resourceBindings
  );

  const executionDescriptorTable = createExecutionDescriptorTable(
    pluginStates.flatMap((state) => state.executionEntries)
  );
  const executionDescriptorRefs = Object.freeze(
    executionDescriptorTable.entries().map(([ref]) => copyExecutionRef(ref))
  );
  const cliCommandSources = Object.freeze(
    executionDescriptorTable.entries().flatMap(([ref, descriptor]) => {
      if (ref.boundary !== "plugin.cli-command") return [];
      const projection = readExecutionProjection(descriptor);
      if (projection?.kind !== "cli.command")
        throw new TypeError("CLI command has no native source contribution.");
      return [Object.freeze({ ref, source: projection.source })];
    })
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
  const serverSources = Object.freeze(
    pluginStates
      .flatMap((state) => {
        const source = readServerSource(state.definition);
        if (source === undefined) return [];
        const id = surfacePlanId({
          pluginOwnerId: state.ownerId,
          role: state.definition.role,
          surface: state.definition.surface,
          capability: state.definition.capability,
        });
        return [Object.freeze([id, source] as const)];
      })
      .sort(([left], [right]) => compareStrings(left, right))
  );
  const asyncSources = Object.freeze(
    pluginStates
      .flatMap((state) => {
        if (state.asyncSource === undefined) return [];
        const id = surfacePlanId({
          pluginOwnerId: state.ownerId,
          role: state.definition.role,
          surface: state.definition.surface,
          capability: state.definition.capability,
        });
        return [Object.freeze([id, state.asyncSource] as const)];
      })
      .sort(([left], [right]) => compareStrings(left, right))
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
  const harnessIds = new Set(harnesses);
  if (entrypoint.process.harness !== undefined) harnessIds.add(entrypoint.process.harness);
  const selectedHarnessIds = Object.freeze([...harnessIds].sort(compareStrings));
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
  return attachRuntimeDerivationHandoff(
    {
      topology,
      graph,
      executionDescriptorTable,
      webRouteModuleTable,
      cliCommandSources,
      portableArtifact,
    },
    {
      graph,
      identity: topology.identity,
      profileId: topology.profileId,
      roles: topology.roleRequirements,
      harnessIds: selectedHarnessIds,
      providers: Object.freeze(
        [...providerReferences]
          .sort(([left], [right]) => compareStrings(left, right))
          .map(([id, provider]) => Object.freeze([id, provider] as const))
      ),
      services: Object.freeze(
        graph.serviceBindingPlans.map((plan) => {
          const service = serviceExports.get(plan.serviceId);
          if (service === undefined)
            throw new TypeError("A binding lost its complete service export.");
          return Object.freeze([plan.bindingId, service] as const);
        })
      ),
      resourceBindings: Object.freeze(
        [...resourceBindings]
          .sort(([left], [right]) => compareStrings(left, right))
          .map(([requirementId, selectionId]) =>
            Object.freeze([requirementId, selectionId] as const)
          )
      ),
      resourceReferences: Object.freeze(
        [...resourceReferences]
          .sort(([left], [right]) => compareStrings(left, right))
          .map(([id, requirement]) => Object.freeze([id, requirement] as const))
      ),
      serverSources,
      asyncSources,
      executionPolicies: Object.freeze(
        executionDescriptorTable
          .entries()
          .map(([ref, descriptor]) => Object.freeze([ref, descriptor.policy] as const))
      ),
    }
  );
}
