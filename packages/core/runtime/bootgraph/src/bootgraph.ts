import { isProxy } from "node:util/types";

import { ReadonlyObject, type Static, type TSchema, Type } from "typebox";
import { Check } from "typebox/value";

import {
  type BootgraphInput,
  BootgraphInputSchema,
  type ProviderDependencyEdge,
  type ProviderDependencyNode,
} from "../../compiler/src";
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

function collectPrototypeChain(value: object): readonly object[] | undefined {
  const prototypes: object[] = [];
  const seen = new Set<object>();
  let prototype = Object.getPrototypeOf(value);

  while (prototype !== null) {
    if (isProxy(prototype) || seen.has(prototype)) return undefined;
    seen.add(prototype);
    prototypes.push(prototype);
    prototype = Object.getPrototypeOf(prototype);
  }

  return prototypes;
}

function readExactOwnDataProperties(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = []
): ReadonlyMap<string, unknown> | undefined {
  if (isProxy(value)) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;

  const prototypes = collectPrototypeChain(value);
  if (prototypes === undefined) return undefined;
  const directPrototype = prototypes[0] ?? null;
  if (directPrototype !== Object.prototype && directPrototype !== null) return undefined;

  const allowed = new Set([...required, ...optional]);
  const keys = Reflect.ownKeys(value);
  const properties = new Map<string, unknown>();

  for (const key of keys) {
    if (typeof key !== "string" || !allowed.has(key)) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      return undefined;
    }
    properties.set(key, descriptor.value);
  }

  if (required.some((key) => !properties.has(key))) return undefined;
  for (const key of optional) {
    if (properties.has(key)) continue;
    for (const prototype of prototypes) {
      if (Object.getOwnPropertyDescriptor(prototype, key) !== undefined) return undefined;
    }
  }

  return properties;
}

function isCanonicalArrayIndex(key: PropertyKey): key is string {
  if (typeof key !== "string" || key.length === 0) return false;
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < 2 ** 32 - 1 && `${index}` === key;
}

function readDenseOwnDataArray(value: unknown): readonly unknown[] | undefined {
  if (isProxy(value)) return undefined;
  if (!Array.isArray(value)) return undefined;

  const prototypes = collectPrototypeChain(value);
  if (prototypes === undefined || prototypes[0] !== Array.prototype) return undefined;
  for (const prototype of prototypes) {
    if (Reflect.ownKeys(prototype).some(isCanonicalArrayIndex)) return undefined;
  }

  const keys = Reflect.ownKeys(value);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (lengthDescriptor === undefined || !("value" in lengthDescriptor)) return undefined;
  const length = lengthDescriptor.value;
  if (!Number.isInteger(length) || length < 0 || length > 2 ** 32 - 1) return undefined;
  if (keys.length !== length + 1) return undefined;

  const elements = new Array<unknown>(length);
  for (const key of keys) {
    if (key === "length") continue;
    if (!isCanonicalArrayIndex(key) || Number(key) >= length) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      return undefined;
    }
    elements[Number(key)] = descriptor.value;
  }

  return elements;
}

function hasAdmittedNodeShape(value: unknown): boolean {
  const properties = readExactOwnDataProperties(value, ["selectionId", "providerId", "resource"]);
  if (properties === undefined) return false;
  return (
    readExactOwnDataProperties(
      properties.get("resource"),
      ["resourceId", "lifetime"],
      ["role", "instance"]
    ) !== undefined
  );
}

function hasAdmittedEdgeShape(value: unknown): boolean {
  return (
    readExactOwnDataProperties(value, ["fromSelectionId", "requirementId", "toSelectionId"]) !==
    undefined
  );
}

function scanAdmittedInput(value: unknown): boolean {
  const properties = readExactOwnDataProperties(value, ["kind", "nodes", "edges"]);
  if (properties === undefined) return false;

  const nodes = readDenseOwnDataArray(properties.get("nodes"));
  const edges = readDenseOwnDataArray(properties.get("edges"));
  if (nodes === undefined || edges === undefined) return false;
  for (const node of nodes) if (!hasAdmittedNodeShape(node)) return false;
  for (const edge of edges) if (!hasAdmittedEdgeShape(edge)) return false;
  return true;
}

function assertAdmittedInput(value: unknown): asserts value is BootgraphInput {
  try {
    if (!scanAdmittedInput(value) || !Check(BootgraphInputSchema, value)) refuse();
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
