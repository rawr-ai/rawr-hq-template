import { ReadonlyObject, type Static, type TSchema, Type } from "typebox";
import { Check } from "typebox/value";

import {
  type BootgraphInput,
  BootgraphInputSchema,
  type ProviderDependencyEdge,
  type ProviderDependencyNode,
} from "../../compiler/src/compiled-process-plan";
import { type BootResourceKey, BootResourceKeySchema } from "./boot-resource-key";
import { type BootResourceModule, BootResourceModuleSchema } from "./boot-resource-module";

const closedBootgraph = { additionalProperties: false } as const;
const immutable = <T extends TSchema>(schema: T) => ReadonlyObject(Type.Array(schema));

export const BootgraphSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("bootgraph.ordered"),
    modules: immutable(BootResourceModuleSchema),
    order: immutable(BootResourceKeySchema),
    rollbackOrder: immutable(BootResourceKeySchema),
    releaseOrder: immutable(BootResourceKeySchema),
  }),
  closedBootgraph
);

export type Bootgraph = Static<typeof BootgraphSchema>;

function compareSelectionIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function refuse(): never {
  throw new TypeError("Bootgraph ordering refused.");
}

function assertAdmittedInput(value: unknown): asserts value is BootgraphInput {
  try {
    if (!Check(BootgraphInputSchema, value)) refuse();
  } catch {
    refuse();
  }
}

function lifecycleIdentity(node: ProviderDependencyNode): string {
  return JSON.stringify([
    node.resource.resourceId,
    node.resource.lifetime,
    node.resource.role ?? "",
    node.resource.instance ?? "",
  ]);
}

function edgeIdentity(edge: ProviderDependencyEdge): string {
  return JSON.stringify([edge.fromSelectionId, edge.requirementId, edge.toSelectionId]);
}

function createKey(node: ProviderDependencyNode): BootResourceKey {
  return Object.freeze({
    kind: "boot.resource-key",
    selectionId: node.selectionId,
    resourceId: node.resource.resourceId,
    lifetime: node.resource.lifetime,
    ...(node.resource.role === undefined ? {} : { role: node.resource.role }),
    ...(node.resource.instance === undefined ? {} : { instance: node.resource.instance }),
  });
}

function assertOutputRelations(
  result: Bootgraph,
  nodesBySelection: ReadonlyMap<string, ProviderDependencyNode>,
  dependencyTargets: ReadonlyMap<string, ReadonlySet<string>>
): void {
  if (
    result.modules.length !== nodesBySelection.size ||
    result.order.length !== result.modules.length ||
    result.rollbackOrder.length !== result.order.length ||
    result.releaseOrder.length !== result.order.length
  ) {
    refuse();
  }

  const keysBySelection = new Map<string, BootResourceKey>();
  for (let index = 0; index < result.modules.length; index += 1) {
    const module = result.modules[index]!;
    const node = nodesBySelection.get(module.key.selectionId);
    if (
      node === undefined ||
      keysBySelection.has(module.key.selectionId) ||
      module.key !== result.order[index] ||
      module.providerId !== node.providerId ||
      module.key.resourceId !== node.resource.resourceId ||
      module.key.lifetime !== node.resource.lifetime ||
      module.key.role !== node.resource.role ||
      module.key.instance !== node.resource.instance
    ) {
      refuse();
    }
    keysBySelection.set(module.key.selectionId, module.key);
  }

  const orderPositions = new Map(
    result.order.map((key, index) => [key.selectionId, index] as const)
  );
  for (const module of result.modules) {
    const expected = [...(dependencyTargets.get(module.key.selectionId) ?? [])].sort(
      compareSelectionIds
    );
    if (module.dependencies.length !== expected.length) refuse();
    for (let index = 0; index < expected.length; index += 1) {
      const dependencyId = expected[index]!;
      const dependencyPosition = orderPositions.get(dependencyId);
      const modulePosition = orderPositions.get(module.key.selectionId);
      if (
        module.dependencies[index] !== keysBySelection.get(dependencyId) ||
        dependencyPosition === undefined ||
        modulePosition === undefined ||
        dependencyPosition >= modulePosition
      ) {
        refuse();
      }
    }
  }

  for (let index = 0; index < result.order.length; index += 1) {
    const reverseKey = result.order[result.order.length - index - 1];
    if (result.rollbackOrder[index] !== reverseKey || result.releaseOrder[index] !== reverseKey) {
      refuse();
    }
  }
}

export function orderBootgraph(input: BootgraphInput): Bootgraph {
  assertAdmittedInput(input);

  const nodesBySelection = new Map<string, ProviderDependencyNode>();
  const lifecycleIdentities = new Set<string>();
  for (let index = 0; index < input.nodes.length; index += 1) {
    const node = input.nodes[index]!;
    const identity = lifecycleIdentity(node);
    if (nodesBySelection.has(node.selectionId) || lifecycleIdentities.has(identity)) refuse();
    nodesBySelection.set(node.selectionId, node);
    lifecycleIdentities.add(identity);
  }

  const dependencyTargets = new Map<string, Set<string>>();
  const dependentTargets = new Map<string, Set<string>>();
  for (const selectionId of nodesBySelection.keys()) {
    dependencyTargets.set(selectionId, new Set());
    dependentTargets.set(selectionId, new Set());
  }
  const edgeIdentities = new Set<string>();
  for (let index = 0; index < input.edges.length; index += 1) {
    const edge = input.edges[index]!;
    if (
      !nodesBySelection.has(edge.fromSelectionId) ||
      !nodesBySelection.has(edge.toSelectionId) ||
      edge.fromSelectionId === edge.toSelectionId
    ) {
      refuse();
    }
    const identity = edgeIdentity(edge);
    if (edgeIdentities.has(identity)) refuse();
    edgeIdentities.add(identity);
    dependencyTargets.get(edge.fromSelectionId)!.add(edge.toSelectionId);
    dependentTargets.get(edge.toSelectionId)!.add(edge.fromSelectionId);
  }

  const remainingDependencies = new Map(
    [...dependencyTargets].map(([selectionId, dependencies]) => [selectionId, dependencies.size])
  );
  const ready = [...remainingDependencies]
    .filter(([, count]) => count === 0)
    .map(([selectionId]) => selectionId)
    .sort(compareSelectionIds);
  const acquisitionSelectionIds: string[] = [];

  while (ready.length > 0) {
    const selectionId = ready.shift()!;
    acquisitionSelectionIds.push(selectionId);
    for (const dependent of dependentTargets.get(selectionId) ?? []) {
      const count = remainingDependencies.get(dependent);
      if (count === undefined || count === 0) refuse();
      remainingDependencies.set(dependent, count - 1);
      if (count === 1) {
        ready.push(dependent);
        ready.sort(compareSelectionIds);
      }
    }
  }
  if (acquisitionSelectionIds.length !== input.nodes.length) refuse();

  const keysBySelection = new Map(
    [...nodesBySelection].map(([selectionId, node]) => [selectionId, createKey(node)])
  );
  const modules = Object.freeze(
    acquisitionSelectionIds.map((selectionId): BootResourceModule => {
      const node = nodesBySelection.get(selectionId)!;
      const dependencies = Object.freeze(
        [...(dependencyTargets.get(selectionId) ?? [])]
          .sort(compareSelectionIds)
          .map((dependencyId) => keysBySelection.get(dependencyId)!)
      );
      return Object.freeze({
        kind: "boot.resource-module",
        key: keysBySelection.get(selectionId)!,
        providerId: node.providerId,
        dependencies,
      });
    })
  );
  const order = Object.freeze(modules.map((module) => module.key));
  const rollbackOrder = Object.freeze([...order].reverse());
  const releaseOrder = Object.freeze([...order].reverse());
  const result: Bootgraph = Object.freeze({
    kind: "bootgraph.ordered",
    modules,
    order,
    rollbackOrder,
    releaseOrder,
  });

  try {
    if (!Check(BootgraphSchema, result)) refuse();
    assertOutputRelations(result, nodesBySelection, dependencyTargets);
  } catch {
    refuse();
  }
  return result;
}
