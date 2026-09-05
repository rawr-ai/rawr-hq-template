import {
  type CompiledSurfacePlan,
  type RuntimeCompilationResult,
  readRuntimeCompilationResourceReferences,
} from "../../compiler/src/index";
import type {
  ConstructionBoundServiceClient,
  ResourceRequirement,
  RuntimeResource,
  RuntimeResourceMap,
  RuntimeResourceValue,
} from "../../definition/src/index";
import type { Continuation, InvocationTracker } from "./invocation-tracker";
import type { BoundServiceBindingMap } from "./surface-adapter";

/** Join only this selected plugin's declared capabilities, including absent optional refs. */
export function createSurfaceCapabilities(input: {
  readonly compilation: RuntimeCompilationResult;
  readonly surface: CompiledSurfacePlan;
  readonly bindings: ReadonlyMap<string, ConstructionBoundServiceClient>;
  readonly values: { has(selectionId: string): boolean; get(selectionId: string): unknown };
  readonly admission: InvocationTracker;
  readonly continuation?: Continuation;
}): { readonly clients: BoundServiceBindingMap; readonly resources: RuntimeResourceMap } {
  const clients = Object.freeze(
    Object.fromEntries(
      input.surface.serviceBindings.map(({ localName, bindingId }) => {
        const client = input.bindings.get(bindingId);
        if (client === undefined) throw new TypeError("Surface service binding is not ready.");
        return [localName, client];
      })
    )
  );
  if (Object.keys(clients).length !== input.surface.serviceBindings.length)
    throw new TypeError("Surface service binding names are duplicated.");
  const references = new Map(
    readRuntimeCompilationResourceReferences(input.compilation.references)
  );
  const selections = new Map(
    input.surface.resources.map((item) => [item.requirementId, item.selectionId])
  );
  const declared = new Set<ResourceRequirement>();
  const values = new Map<ResourceRequirement, unknown>();
  for (const requirement of input.compilation.plan.resourceRequirements) {
    if (
      requirement.owner.kind !== "plugin" ||
      requirement.owner.pluginOwnerId !== input.surface.pluginOwnerId
    )
      continue;
    const reference = references.get(requirement.requirementId);
    if (reference === undefined) throw new TypeError("Surface lost a declared resource reference.");
    declared.add(reference);
    const selectionId = selections.get(requirement.requirementId);
    if (selectionId === undefined) {
      if (!requirement.optional) throw new TypeError("Surface required resource is not ready.");
    } else {
      if (!input.values.has(selectionId))
        throw new TypeError("Surface resource value is not ready.");
      values.set(reference, input.values.get(selectionId));
    }
  }
  function assertDeclared(requirement: ResourceRequirement): void {
    input.admission.assertAdmission(input.continuation ?? input.admission.captureContinuation());
    if (!declared.has(requirement))
      throw new TypeError("Resource reference is outside this selected plugin.");
  }
  const resources: RuntimeResourceMap = Object.freeze({
    has(requirement: ResourceRequirement): boolean {
      assertDeclared(requirement);
      return values.has(requirement);
    },
    get<R extends RuntimeResource>(requirement: ResourceRequirement<R>): RuntimeResourceValue<R> {
      assertDeclared(requirement);
      return values.get(requirement) as RuntimeResourceValue<R>;
    },
  });
  return Object.freeze({ clients, resources });
}
