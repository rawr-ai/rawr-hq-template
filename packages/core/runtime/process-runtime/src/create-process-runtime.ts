import {
  type CompiledServiceBindingPlan,
  type CompiledSurfacePlan,
  type RuntimeCompilationResult,
  readRuntimeCompilationServerSources,
} from "../../compiler/src/index";
import type {
  ConstructionBoundServiceClient,
  RuntimeObservationPort,
  ServiceConstructorInput,
  ServiceDefinition,
  ServiceRuntimeExport,
} from "../../definition/src/index";
import type { ExecutionDescriptorTable } from "../../derivation/src/index";
import {
  type ProvisionedProcess,
  readProvisionedProcessHandoff,
} from "../../substrate/effect/src/index";
import { createExecutionRegistry, type ExecutionRegistry } from "./execution-registry";
import { createProcessExecutionRuntime, type ProcessExecutionRuntime } from "./execution-runtime";
import { createInvocationTracker } from "./invocation-tracker";
import {
  createMountPreparation,
  type MountReadyProcess,
  type PrepareMountsInput,
} from "./mount-ready-process";
import { createRuntimeAccess, type RuntimeAccess } from "./runtime-access";
import { createNativeServerRequestAssembly } from "./server-request";
import { createServiceBindingCache } from "./service-binding-cache";
import { createServiceClientAssembly } from "./service-client-assembly";
import type { AdapterLoweringResult, SurfaceAdapter } from "./surface-adapter";
import { createSurfaceCapabilities } from "./surface-capabilities";

export interface ProcessRuntime {
  readonly kind: "runtime.process";
  readonly access: RuntimeAccess;
  readonly registry: ExecutionRegistry;
  readonly execution: ProcessExecutionRuntime;
  binding<S extends ServiceRuntimeExport>(
    bindingId: string,
    service: S
  ): ReturnType<S["construct"]>;
  lower<T>(
    surface: CompiledSurfacePlan,
    adapter: SurfaceAdapter<CompiledSurfacePlan, T>
  ): AdapterLoweringResult<T>;
  prepareMounts<T>(input: PrepareMountsInput<T>): MountReadyProcess<T>;
  stop(): Promise<void>;
}

export interface CreateProcessRuntimeInput {
  readonly compilation: RuntimeCompilationResult;
  readonly provisioned: ProvisionedProcess;
  readonly descriptorTable: ExecutionDescriptorTable;
  readonly semanticAdapters?: ReadonlyMap<string, unknown>;
  readonly observation?: RuntimeObservationPort;
}

export async function createProcessRuntime(
  input: CreateProcessRuntimeInput
): Promise<ProcessRuntime> {
  const handoff = readProvisionedProcessHandoff(input.provisioned);
  if (handoff.compilation !== input.compilation)
    throw new TypeError("Process runtime requires its exact provisioned compilation.");
  // Only the matching, first assembly assumes cleanup responsibility, including failed assembly.
  handoff.claim();
  const admission = createInvocationTracker();
  const cache = createServiceBindingCache();
  const clients = createServiceClientAssembly(admission);
  let stopping: Promise<void> | undefined;
  function stop(): Promise<void> {
    stopping ??= admission.closeAndDrain().then(() => input.provisioned.managedRuntime.dispose());
    return stopping;
  }

  try {
    const { plan, references } = input.compilation;
    const serverSources = new Map(readRuntimeCompilationServerSources(references));
    const registry = createExecutionRegistry({
      processId: plan.identity.process,
      registryInput: plan.executionRegistryInput,
      executionPlans: plan.executionPlans,
      descriptorTable: input.descriptorTable,
      assertOpen: admission.assertOpen,
    });
    const bindings = new Map(plan.serviceBindings.map((binding) => [binding.bindingId, binding]));
    const requirements = new Map(
      plan.resourceRequirements.map((requirement) => [requirement.requirementId, requirement])
    );

    function construct(binding: CompiledServiceBindingPlan): ConstructionBoundServiceClient {
      return cache.getOrCreate({
        key: { identity: plan.identity, profileId: plan.profileId, bindingId: binding.bindingId },
        plan: binding,
        create() {
          const service = references.getService(binding.bindingId);
          if (service.definition.id !== binding.serviceId)
            throw new TypeError("Service export and compiled binding disagree.");
          const entries: [string, unknown][] = [];
          for (const resource of binding.resources) {
            const requirement = requirements.get(resource.requirementId);
            if (
              requirement?.owner.kind !== "service" ||
              requirement.owner.serviceId !== binding.serviceId
            ) {
              throw new TypeError("Compiled resource dependency belongs to another service.");
            }
            const declaration = service.definition.deps[requirement.owner.localName];
            if (
              declaration?.kind !== "service.dependency.resource" ||
              references.getProvider(resource.selectionId).provides.id !== declaration.resource.id
            ) {
              throw new TypeError("Compiled resource dependency and service export disagree.");
            }
            entries.push([requirement.owner.localName, handoff.values.get(resource.selectionId)]);
          }
          for (const dependency of binding.serviceDependencies) {
            const declaration = service.definition.deps[dependency.localName];
            const child = bindings.get(dependency.bindingId);
            if (
              declaration?.kind !== "service.dependency.service" ||
              child === undefined ||
              references.getService(child.bindingId) !== declaration.service
            ) {
              throw new TypeError("Compiled named dependency and service export disagree.");
            }
            entries.push([dependency.localName, construct(child)]);
          }
          for (const dependency of binding.semanticDependencies) {
            const declaration = service.definition.deps[dependency.localName];
            if (
              declaration?.kind !== "service.dependency.semantic" ||
              declaration.adapterId !== dependency.adapterId ||
              input.semanticAdapters?.has(dependency.adapterId) !== true
            ) {
              throw new TypeError("A declared semantic adapter is not ready.");
            }
            entries.push([dependency.localName, input.semanticAdapters.get(dependency.adapterId)]);
          }
          const deps = Object.freeze(Object.fromEntries(entries));
          if (
            new Set(entries.map(([name]) => name)).size !== entries.length ||
            Object.keys(service.definition.deps).length !== entries.length
          ) {
            throw new TypeError("Compiled service dependencies are incomplete or duplicated.");
          }
          // The exact schemas were preflighted before acquisition; this table erases their generic lanes.
          const constructorInput = {
            clients,
            deps,
            ...handoff.config.service(binding.bindingId),
          } as ServiceConstructorInput<ServiceDefinition>;
          const client = service.construct(constructorInput);
          if (
            client.kind !== "service.client.construction-bound" ||
            client.serviceId !== binding.serviceId ||
            typeof client.withInvocation !== "function"
          ) {
            throw new TypeError("Service constructor returned a mismatched callable boundary.");
          }
          return Object.freeze({
            kind: "service.client.construction-bound",
            serviceId: binding.serviceId,
            withInvocation(invocationInput: { readonly invocation?: unknown }) {
              admission.assertAdmission(admission.captureContinuation());
              const schema = service.definition.invocation;
              if (schema === undefined) {
                if (invocationInput.invocation !== undefined)
                  throw new TypeError("Service has no invocation lane.");
                return client.withInvocation({ invocation: undefined });
              }
              const validated = schema.validate(invocationInput.invocation);
              if (!validated.success)
                throw new TypeError("Service invocation failed its owning schema.");
              return client.withInvocation({ invocation: invocationInput.invocation });
            },
          });
        },
      });
    }

    const bound = new Map(
      plan.serviceBindings.map((binding) => [binding.bindingId, construct(binding)])
    );
    const execution = createProcessExecutionRuntime({
      ...input,
      registry,
      admission,
      surfaceCapabilities: (surface, continuation) =>
        createSurfaceCapabilities({
          compilation: input.compilation,
          surface,
          bindings: bound,
          values: handoff.values,
          admission,
          continuation,
        }),
    });
    const access = createRuntimeAccess(input.compilation, input.provisioned, () => {
      // Native stop may still need ready values after executable admission closes.
      if (stopping !== undefined) throw new TypeError("Process resource access is closed.");
    });
    function lower<T>(
      surface: CompiledSurfacePlan,
      adapter: SurfaceAdapter<CompiledSurfacePlan, T>
    ): AdapterLoweringResult<T> {
      admission.assertOpen();
      if (
        !plan.surfaces.includes(surface) ||
        adapter.role !== surface.role ||
        adapter.surface !== surface.surface ||
        adapter.harness.length === 0
      )
        throw new TypeError(
          "Adapter requires an exact selected compiled surface and matching identity."
        );
      const roleAccess = access.roles.get(surface.role);
      if (roleAccess === undefined) throw new TypeError("Adapter role is not selected.");
      const capabilities = createSurfaceCapabilities({
        compilation: input.compilation,
        surface,
        bindings: bound,
        values: handoff.values,
        admission,
      });
      const serverSource = serverSources.get(surface.surfacePlanId);
      return adapter.lower({
        plan: surface,
        processAccess: access.process,
        roleAccess,
        serviceBindings: capabilities.clients,
        resources: capabilities.resources,
        executionRegistry: registry,
        executionRuntime: execution,
        ...(serverSource === undefined
          ? {}
          : {
              nativeServer: {
                source: serverSource,
                requests: createNativeServerRequestAssembly({
                  identity: plan.identity,
                  surface,
                  admission,
                  capabilities: (continuation) =>
                    createSurfaceCapabilities({
                      compilation: input.compilation,
                      surface,
                      bindings: bound,
                      values: handoff.values,
                      admission,
                      continuation,
                    }),
                  observation: input.observation,
                }),
              },
            }),
      });
    }
    const prepareMounts = createMountPreparation({
      plan,
      processAccess: access.process,
      hasSelection: handoff.values.has,
      requiresHealth: (selectionId) =>
        references.getProvider(selectionId).health?.required === true,
      assertOpen: admission.assertOpen,
      lower,
      closeAdmission: () => {
        // Native stop may settle admitted work, so close now without awaiting its drain.
        void admission.closeAndDrain();
      },
      stop,
    });
    return Object.freeze({
      kind: "runtime.process",
      access,
      registry,
      execution,
      lower,
      prepareMounts,
      binding<S extends ServiceRuntimeExport>(
        bindingId: string,
        service: S
      ): ReturnType<S["construct"]> {
        admission.assertOpen();
        const client = bound.get(bindingId);
        if (client === undefined || references.getService(bindingId) !== service)
          throw new TypeError("Service binding is outside this process.");
        return client as ReturnType<S["construct"]>;
      },
      stop,
    });
  } catch (error) {
    try {
      await stop();
    } catch {
      /* Assembly failure remains primary. */
    }
    throw error;
  }
}
