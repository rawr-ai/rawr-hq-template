import type { CompiledProcessPlan } from "../../../runtime/compiler/src/index";
import type { RuntimeObservationSeed } from "../../../runtime/observation/src/index";

/** Adapt selected facts only; live status comes from the owner that performs the work. */
export function selectedObservationSeed(plan: CompiledProcessPlan): RuntimeObservationSeed {
  return {
    identity: plan.identity,
    profileId: plan.profileId,
    roles: plan.roles,
    derivedAuthoring: {
      pluginOwnerIds: [...new Set(plan.surfaces.map((surface) => surface.pluginOwnerId))],
      serviceIds: [...new Set(plan.serviceBindings.map((binding) => binding.serviceId))],
    },
    resources: plan.resourceRequirements.map(({ requirementId, resource, optional }) => ({
      requirementId,
      resourceId: resource.resourceId,
      optional,
      lifetime: resource.lifetime,
      ...(resource.role === undefined ? {} : { role: resource.role }),
      ...(resource.instance === undefined ? {} : { instance: resource.instance }),
    })),
    providers: plan.compiledResources.map(
      ({ selectionId, providerId, resource, requirementIds }) => ({
        selectionId,
        providerId,
        resourceId: resource.resourceId,
        requirementIds,
      })
    ),
    providerDependencyGraph: {
      nodes: plan.providerDependencyGraph.nodes.map((node) => node.selectionId),
      edges: plan.providerDependencyGraph.edges,
      closure: plan.providerDependencyGraph.closure,
    },
    plugins: plan.surfaces.map(({ pluginOwnerId, role, surface, capability, instance }) => ({
      pluginOwnerId,
      role,
      surface,
      capability,
      ...(instance === undefined ? {} : { instance }),
    })),
    serviceAttachments: plan.serviceBindings.map((binding) => ({
      bindingId: binding.bindingId,
      serviceId: binding.serviceId,
      role: binding.role,
      ...(binding.serviceInstance === undefined ? {} : { instance: binding.serviceInstance }),
      dependencyBindingIds: binding.serviceDependencies.map((dependency) => dependency.bindingId),
    })),
    workflowDispatchers: plan.workflowDispatchers.map(({ descriptorId }) => ({
      dispatcherId: descriptorId,
    })),
    executionPlans: plan.executionPlans.map(({ ref }) => ({
      executionId: ref.executionId,
      ownerId: ref.ownerId,
      boundary: ref.boundary,
    })),
    executionRegistry: {
      executionIds: plan.executionRegistryInput.boundaries.map(({ executionId }) => executionId),
    },
    surfaces: plan.surfaces.map((surface) => ({
      surfacePlanId: surface.surfacePlanId,
      pluginOwnerId: surface.pluginOwnerId,
      role: surface.role,
      surface: surface.surface,
      capability: surface.capability,
      ...(surface.instance === undefined ? {} : { instance: surface.instance }),
      bindingIds: surface.serviceBindings.map(({ bindingId }) => bindingId),
      executionIds: surface.executionDescriptorRefs.map(({ executionId }) => executionId),
    })),
    harnesses: plan.harnesses.map(({ harnessId }) => ({ harnessId })),
  };
}
