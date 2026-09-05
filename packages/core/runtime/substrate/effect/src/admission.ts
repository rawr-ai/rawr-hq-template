import { isDeepStrictEqual } from "node:util";
import { Check } from "typebox/value";

import { type Bootgraph, BootgraphSchema, orderBootgraph } from "../../../bootgraph/src/index";
import type { RuntimeCompilationResult } from "../../../compiler/src/compile-runtime-plan";
import { CompiledProcessPlanSchema } from "../../../compiler/src/compiled-process-plan";
import { readRuntimeCompilationResourceReferences } from "../../../compiler/src/runtime-compilation-reference-table";
import type { ResourceRequirement } from "../../../definition/src/resource";

type Plan = RuntimeCompilationResult["plan"];
type NormalizedRequirement = Plan["resourceRequirements"][number];
type ConfigRef = NonNullable<Plan["compiledResources"][number]["configRef"]>;

export interface AdmittedProvisioning {
  readonly compilation: RuntimeCompilationResult;
  readonly bootgraph: Bootgraph;
  readonly requirements: ReadonlyMap<string, ResourceRequirement>;
  readonly selections: ReadonlyMap<string, string>;
  readonly dependencies: ReadonlyMap<string, readonly (readonly [ResourceRequirement, string])[]>;
}

function refuse(): never {
  throw new TypeError("Provisioning artifacts disagree.");
}

function uniqueIndex<T>(values: readonly T[], key: (value: T) => string): Map<string, T> {
  const entries = new Map(values.map((value) => [key(value), value] as const));
  if (entries.size !== values.length) refuse();
  return entries;
}

function assertConfigRef(ref: ConfigRef | undefined, policy: Plan["configSources"]): void {
  if (ref === undefined) return;
  const expected = policy.map((source) => {
    switch (source.kind) {
      case "env":
        return { kind: "runtime.config.env", key: ref.key, name: source.prefix + ref.key };
      case "memory":
        return { kind: "runtime.config.memory", key: ref.key };
      case "test":
        return { kind: "runtime.config.test", key: ref.key };
      default:
        return {
          kind: `runtime.config.${source.kind}`,
          key: ref.key,
          path: source.path,
          optional: source.optional,
        };
    }
  });
  if (!isDeepStrictEqual(ref.sources, expected)) refuse();
}

function matchesRequirement(
  authored: ResourceRequirement,
  normalized: NormalizedRequirement
): boolean {
  return (
    authored.resource.id === normalized.resource.resourceId &&
    (authored.lifetime ?? authored.resource.defaultLifetime) === normalized.resource.lifetime &&
    authored.role === normalized.resource.role &&
    authored.instance === normalized.resource.instance &&
    (authored.optional ?? false) === normalized.optional
  );
}

export function admitProvisioning(
  compilation: RuntimeCompilationResult,
  bootgraph: Bootgraph
): AdmittedProvisioning {
  const { plan, references, observationSeed } = compilation;
  if (!Check(CompiledProcessPlanSchema, plan) || !Check(BootgraphSchema, bootgraph)) refuse();
  if (
    observationSeed.kind !== "compilation.observation-seed" ||
    !isDeepStrictEqual(observationSeed.identity, plan.identity) ||
    observationSeed.profileId !== plan.profileId ||
    !isDeepStrictEqual(observationSeed.roles, plan.roles) ||
    !isDeepStrictEqual(orderBootgraph(plan.bootgraphInput), bootgraph)
  )
    refuse();
  if (
    !isDeepStrictEqual(plan.bootgraphInput.nodes, plan.providerDependencyGraph.nodes) ||
    !isDeepStrictEqual(plan.bootgraphInput.edges, plan.providerDependencyGraph.edges)
  )
    refuse();

  const resources = uniqueIndex(plan.compiledResources, (resource) => resource.selectionId);
  const selected = uniqueIndex(plan.providerSelections, (resource) => resource.selectionId);
  const requirements = uniqueIndex(
    plan.resourceRequirements,
    (requirement) => requirement.requirementId
  );
  const providers = uniqueIndex(references.providerEntries(), ([id]) => id);
  const services = uniqueIndex(references.serviceEntries(), ([id]) => id);
  const bindings = uniqueIndex(plan.serviceBindings, (binding) => binding.bindingId);
  const modules = uniqueIndex(bootgraph.modules, (module) => module.key.selectionId);
  if (
    resources.size !== selected.size ||
    resources.size !== bootgraph.order.length ||
    providers.size !== resources.size ||
    services.size !== bindings.size
  )
    refuse();

  const exactEntries = readRuntimeCompilationResourceReferences(references);
  const exact = uniqueIndex(exactEntries, ([id]) => id);
  const authored = new Map<string, ResourceRequirement>();
  for (const requirement of requirements.values()) {
    if (requirement.owner.kind === "service") continue;
    const reference = exact.get(requirement.requirementId)?.[1];
    if (reference === undefined || !matchesRequirement(reference, requirement)) refuse();
    authored.set(requirement.requirementId, reference);
  }
  if (authored.size !== exact.size) refuse();

  const selections = new Map<string, string>();
  for (const key of bootgraph.order) {
    const resource = resources.get(key.selectionId);
    const selection = selected.get(key.selectionId);
    const provider = providers.get(key.selectionId)?.[1];
    if (
      resource === undefined ||
      selection === undefined ||
      provider === undefined ||
      provider !== references.getProvider(key.selectionId) ||
      provider.kind !== "runtime.provider" ||
      typeof provider.build !== "function" ||
      provider.id !== resource.providerId ||
      selection.providerId !== resource.providerId ||
      modules.get(key.selectionId)?.providerId !== provider.id ||
      provider.provides.id !== resource.resource.resourceId ||
      !isDeepStrictEqual(resource.resource, selection.resource) ||
      !isDeepStrictEqual(resource.configRef, selection.configRef) ||
      key.resourceId !== resource.resource.resourceId ||
      key.lifetime !== resource.resource.lifetime ||
      key.role !== resource.resource.role ||
      key.instance !== resource.resource.instance
    )
      refuse();
    assertConfigRef(resource.configRef, plan.configSources);
    if ((provider.configSchema === undefined) !== (resource.configRef === undefined)) refuse();
    for (const id of resource.requirementIds) {
      const requirement = requirements.get(id);
      if (
        requirement === undefined ||
        !isDeepStrictEqual(requirement.resource, resource.resource) ||
        selections.has(id)
      )
        refuse();
      selections.set(id, key.selectionId);
    }
  }
  for (const requirement of requirements.values()) {
    if (!requirement.optional && !selections.has(requirement.requirementId)) refuse();
  }

  const dependencies = new Map<string, readonly (readonly [ResourceRequirement, string])[]>();
  let edgeCount = 0;
  for (const [selectionId, [, provider]] of providers) {
    const resource = resources.get(selectionId);
    if (resource === undefined) refuse();
    const owned = [...requirements.values()].filter(
      (requirement) =>
        requirement.owner.kind === "provider" && requirement.owner.providerId === provider.id
    );
    if (
      owned.length !== provider.requires.length ||
      !isDeepStrictEqual(
        [...resource.dependencyRequirementIds].sort(),
        owned.map((requirement) => requirement.requirementId).sort()
      )
    )
      refuse();
    const ready: (readonly [ResourceRequirement, string])[] = [];
    for (const requirement of provider.requires) {
      const candidate = owned.find((entry) => authored.get(entry.requirementId) === requirement);
      if (candidate === undefined) refuse();
      const target = selections.get(candidate.requirementId);
      const edges = plan.providerDependencyGraph.edges.filter(
        (edge) =>
          edge.fromSelectionId === selectionId && edge.requirementId === candidate.requirementId
      );
      if (target === undefined) {
        if (!candidate.optional || edges.length !== 0) refuse();
      } else {
        if (edges.length !== 1 || edges[0]?.toSelectionId !== target) refuse();
        edgeCount++;
        ready.push(Object.freeze([requirement, target] as const));
      }
    }
    dependencies.set(selectionId, Object.freeze(ready));
  }
  if (edgeCount !== plan.providerDependencyGraph.edges.length) refuse();
  for (const binding of bindings.values()) {
    const service = services.get(binding.bindingId)?.[1];
    if (
      service === undefined ||
      service !== references.getService(binding.bindingId) ||
      service.kind !== "service.runtime-export" ||
      service.definition.id !== binding.serviceId ||
      typeof service.construct !== "function" ||
      (service.definition.scope === undefined) !== (binding.scopeRef === undefined) ||
      (service.definition.config === undefined) !== (binding.configRef === undefined)
    )
      refuse();
    assertConfigRef(binding.scopeRef, plan.configSources);
    assertConfigRef(binding.configRef, plan.configSources);
    for (const resource of binding.resources) {
      if (selections.get(resource.requirementId) !== resource.selectionId) refuse();
    }
  }
  return { compilation, bootgraph, requirements: authored, selections, dependencies };
}
