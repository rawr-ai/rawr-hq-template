import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProjectGraphAsync, readProjectsConfigurationFromProjectGraph } from "@nx/devkit";
import { Check } from "typebox/value";
import { parseConfigFileTextToJson } from "typescript";

import type { BootgraphInput } from "../../compiler/src";
import * as runtimeBootgraph from "../src";
import { BootgraphSchema, orderBootgraph } from "../src";

type JsonObject = Record<string, unknown>;
type Bootgraph = ReturnType<typeof orderBootgraph>;
type BootgraphNode = BootgraphInput["nodes"][number];
type BootgraphEdge = BootgraphInput["edges"][number];
type ObjectSnapshot = {
  readonly reference: object;
  readonly prototype: object | null;
  readonly frozen: boolean;
  readonly sealed: boolean;
  readonly extensible: boolean;
  readonly descriptors: readonly (readonly [string | symbol, PropertyDescriptor])[];
};

const workspaceRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const selectionId = (digit: string) => `provider-selection:sha256:${digit.repeat(64)}`;
const requirementId = (digit: string) => `resource-requirement:sha256:${digit.repeat(64)}`;

function makeNode(
  digit: string,
  resourceId: string,
  options: {
    readonly providerId?: string;
    readonly lifetime?: BootgraphNode["resource"]["lifetime"];
    readonly role?: BootgraphNode["resource"]["role"];
    readonly instance?: string;
  } = {}
): BootgraphNode {
  const resource: BootgraphNode["resource"] = {
    resourceId,
    lifetime: options.lifetime ?? "process",
    ...(options.role === undefined ? {} : { role: options.role }),
    ...(options.instance === undefined ? {} : { instance: options.instance }),
  };
  return {
    selectionId: selectionId(digit),
    providerId: options.providerId ?? `provider.${digit}`,
    resource,
  };
}

function makeEdge(from: string, requirement: string, to: string): BootgraphEdge {
  return {
    fromSelectionId: selectionId(from),
    requirementId: requirementId(requirement),
    toSelectionId: selectionId(to),
  };
}

function makeInput(
  nodes: readonly BootgraphNode[],
  edges: readonly BootgraphEdge[] = []
): BootgraphInput {
  return { kind: "bootgraph.input", nodes, edges };
}

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((remainder) => [
      value,
      ...remainder,
    ])
  );
}

function nullPrototypeRecord<T extends object>(value: T): T {
  return Object.assign(Object.create(null), value) as T;
}

function copyInput(value: BootgraphInput): BootgraphInput {
  return {
    kind: value.kind,
    nodes: value.nodes.map((node) => ({ ...node, resource: { ...node.resource } })),
    edges: value.edges.map((edge) => ({ ...edge })),
  };
}

function collectObjects(value: unknown, objects = new Set<object>()): Set<object> {
  if (value === null || typeof value !== "object" || objects.has(value)) return objects;
  objects.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if ("value" in descriptor) collectObjects(descriptor.value, objects);
  }
  return objects;
}

function expectRecursivelyFrozen(value: unknown): void {
  for (const object of collectObjects(value)) expect(Object.isFrozen(object)).toBe(true);
}

function expectClosedDataOnly(value: unknown, visited = new Set<object>()): void {
  expect(["function", "symbol", "bigint"].includes(typeof value)).toBe(false);
  if (value === null || typeof value !== "object" || visited.has(value)) return;
  visited.add(value);
  expect(value).not.toBeInstanceOf(Promise);
  for (const key of Reflect.ownKeys(value)) {
    expect(typeof key).toBe("string");
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    expect("value" in descriptor).toBe(true);
    if ("value" in descriptor) expectClosedDataOnly(descriptor.value, visited);
  }
}

function snapshotObjectGraph(value: unknown): readonly ObjectSnapshot[] {
  return [...collectObjects(value)].map((reference) => ({
    reference,
    prototype: Object.getPrototypeOf(reference),
    frozen: Object.isFrozen(reference),
    sealed: Object.isSealed(reference),
    extensible: Object.isExtensible(reference),
    descriptors: Reflect.ownKeys(reference).map(
      (key) => [key, Object.getOwnPropertyDescriptor(reference, key)!] as const
    ),
  }));
}

function expectObjectGraphUnchanged(snapshots: readonly ObjectSnapshot[]): void {
  for (const snapshot of snapshots) {
    expect(Object.getPrototypeOf(snapshot.reference)).toBe(snapshot.prototype);
    expect(Object.isFrozen(snapshot.reference)).toBe(snapshot.frozen);
    expect(Object.isSealed(snapshot.reference)).toBe(snapshot.sealed);
    expect(Object.isExtensible(snapshot.reference)).toBe(snapshot.extensible);
    expect(Reflect.ownKeys(snapshot.reference)).toEqual(snapshot.descriptors.map(([key]) => key));
    for (const [key, before] of snapshot.descriptors) {
      const after = Object.getOwnPropertyDescriptor(snapshot.reference, key);
      expect(after).toBeDefined();
      expect(after!.configurable).toBe(before.configurable);
      expect(after!.enumerable).toBe(before.enumerable);
      if ("value" in before) {
        expect(after).toHaveProperty("value");
        expect(after!.value).toBe(before.value);
        expect(after!.writable).toBe(before.writable);
      } else {
        expect(after!.get).toBe(before.get);
        expect(after!.set).toBe(before.set);
      }
    }
  }
}

function expectSuccessfulOutput(
  value: BootgraphInput,
  expectedOrder: readonly string[],
  expectedDependencies: Readonly<Record<string, readonly string[]>> = {}
): Bootgraph {
  const inputObjects = collectObjects(value);
  const result = orderBootgraph(value);

  expect(Check(BootgraphSchema, result)).toBe(true);
  expect(result).not.toBeInstanceOf(Promise);
  expect(Object.keys(result).sort()).toEqual([
    "kind",
    "modules",
    "order",
    "releaseOrder",
    "rollbackOrder",
  ]);
  expect(result.kind).toBe("bootgraph.ordered");
  expect(result.modules.map(({ key }) => key.selectionId)).toEqual([...expectedOrder]);
  expect(result.order.map(({ selectionId: id }) => id)).toEqual([...expectedOrder]);
  expect(result.rollbackOrder.map(({ selectionId: id }) => id)).toEqual(
    [...expectedOrder].reverse()
  );
  expect(result.releaseOrder.map(({ selectionId: id }) => id)).toEqual(
    [...expectedOrder].reverse()
  );
  expect("findings" in result).toBe(false);
  expect("diagnostics" in result).toBe(false);
  expect("observationSeed" in result).toBe(false);

  const nodesById = new Map(value.nodes.map((node) => [node.selectionId, node]));
  const keysById = new Map(result.order.map((key) => [key.selectionId, key]));
  for (let index = 0; index < result.modules.length; index += 1) {
    const module = result.modules[index]!;
    const node = nodesById.get(module.key.selectionId)!;
    const expectedKey = {
      kind: "boot.resource-key" as const,
      selectionId: node.selectionId,
      resourceId: node.resource.resourceId,
      lifetime: node.resource.lifetime,
      ...(node.resource.role === undefined ? {} : { role: node.resource.role }),
      ...(node.resource.instance === undefined ? {} : { instance: node.resource.instance }),
    };
    const dependencyIds = expectedDependencies[node.selectionId] ?? [];

    expect(Object.keys(module).sort()).toEqual(["dependencies", "key", "kind", "providerId"]);
    expect(module.kind).toBe("boot.resource-module");
    expect(module.providerId).toBe(node.providerId);
    expect(module.key).toBe(result.order[index]);
    expect(module.key).toEqual(expectedKey);
    expect(Object.keys(module.key).sort()).toEqual(Object.keys(expectedKey).sort());
    expect(module.dependencies.map(({ selectionId: id }) => id)).toEqual([...dependencyIds]);
    for (let dependencyIndex = 0; dependencyIndex < dependencyIds.length; dependencyIndex += 1) {
      expect(module.dependencies[dependencyIndex]).toBe(
        keysById.get(dependencyIds[dependencyIndex]!)!
      );
    }
  }

  for (let index = 0; index < result.order.length; index += 1) {
    const reverseKey = result.order[result.order.length - index - 1];
    expect(result.rollbackOrder[index]).toBe(reverseKey);
    expect(result.releaseOrder[index]).toBe(reverseKey);
  }
  for (const outputObject of collectObjects(result))
    expect(inputObjects.has(outputObject)).toBe(false);
  expectClosedDataOnly(result);
  expectRecursivelyFrozen(result);
  return result;
}

function expectBuiltInTypeErrorBeforeResult(value: unknown, name: string): void {
  const noResult = Symbol("no result");
  let result: unknown = noResult;
  let thrown: unknown;
  try {
    result = orderBootgraph(value as BootgraphInput);
  } catch (error) {
    thrown = error;
  }
  expect(result, name).toBe(noResult);
  expect(thrown, name).toBeInstanceOf(TypeError);
  expect(thrown instanceof TypeError ? thrown.constructor : undefined, name).toBe(TypeError);
}

function expectBuiltInTypeErrorWithoutAccessorWork(
  value: unknown,
  name: string,
  accessorCalls: () => number
): void {
  expectBuiltInTypeErrorBeforeResult(value, name);
  expect(accessorCalls(), name).toBe(0);
}

function readJson(relativePath: string): JsonObject {
  const value: unknown = JSON.parse(readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${relativePath} must contain a JSON object.`);
  }
  return value as JsonObject;
}

function readJsonc(relativePath: string): JsonObject {
  const parsed = parseConfigFileTextToJson(
    relativePath,
    readFileSync(path.join(workspaceRoot, relativePath), "utf8")
  );
  if (
    parsed.error !== undefined ||
    parsed.config === null ||
    typeof parsed.config !== "object" ||
    Array.isArray(parsed.config)
  ) {
    throw new Error(`${relativePath} must contain a JSON object.`);
  }
  return parsed.config as JsonObject;
}

const databaseSelectionId = selectionId("1");
const cacheSelectionId = selectionId("2");
const apiSelectionId = selectionId("3");
const baselineInput = makeInput(
  [
    makeNode("3", "resource.api", {
      providerId: "provider.api",
      lifetime: "role",
      role: "server",
      instance: "primary",
    }),
    makeNode("1", "resource.database", { providerId: "provider.database" }),
    makeNode("2", "resource.cache", {
      providerId: "provider.cache",
      lifetime: "role",
      role: "server",
    }),
  ],
  [makeEdge("3", "3", "2"), makeEdge("2", "2", "1"), makeEdge("3", "1", "1")]
);

describe("runtime bootgraph", () => {
  test("orders a nontrivial graph through the shared exact-output oracle", () => {
    const result = expectSuccessfulOutput(
      baselineInput,
      [databaseSelectionId, cacheSelectionId, apiSelectionId],
      {
        [cacheSelectionId]: [databaseSelectionId],
        [apiSelectionId]: [databaseSelectionId, cacheSelectionId],
      }
    );
    expect(result).toEqual({
      kind: "bootgraph.ordered",
      modules: [
        {
          kind: "boot.resource-module",
          key: {
            kind: "boot.resource-key",
            selectionId: databaseSelectionId,
            resourceId: "resource.database",
            lifetime: "process",
          },
          providerId: "provider.database",
          dependencies: [],
        },
        {
          kind: "boot.resource-module",
          key: {
            kind: "boot.resource-key",
            selectionId: cacheSelectionId,
            resourceId: "resource.cache",
            lifetime: "role",
            role: "server",
          },
          providerId: "provider.cache",
          dependencies: [result.order[0]],
        },
        {
          kind: "boot.resource-module",
          key: {
            kind: "boot.resource-key",
            selectionId: apiSelectionId,
            resourceId: "resource.api",
            lifetime: "role",
            role: "server",
            instance: "primary",
          },
          providerId: "provider.api",
          dependencies: [result.order[0], result.order[1]],
        },
      ],
      order: [result.modules[0]!.key, result.modules[1]!.key, result.modules[2]!.key],
      rollbackOrder: [result.modules[2]!.key, result.modules[1]!.key, result.modules[0]!.key],
      releaseOrder: [result.modules[2]!.key, result.modules[1]!.key, result.modules[0]!.key],
    });
  });

  test("is permutation-independent and applies code-unit ties to initial and newly ready nodes", () => {
    const interiorSelectionId = (digit: string) =>
      `provider-selection:sha256:${"a".repeat(23)}${digit}${"f".repeat(40)}`;
    const oneSelectionId = interiorSelectionId("1");
    const twoSelectionId = interiorSelectionId("2");
    const aSelectionId = interiorSelectionId("a");
    const fSelectionId = interiorSelectionId("f");
    const nodes = [
      { ...makeNode("a", "resource.a"), selectionId: aSelectionId },
      { ...makeNode("1", "resource.one"), selectionId: oneSelectionId },
      { ...makeNode("2", "resource.two"), selectionId: twoSelectionId },
      { ...makeNode("f", "resource.f"), selectionId: fSelectionId },
    ];
    const edges = [
      {
        ...makeEdge("1", "1", "2"),
        fromSelectionId: oneSelectionId,
        toSelectionId: twoSelectionId,
      },
      {
        ...makeEdge("f", "2", "a"),
        fromSelectionId: fSelectionId,
        toSelectionId: aSelectionId,
      },
    ];
    const expectedOrder = [twoSelectionId, oneSelectionId, aSelectionId, fSelectionId];
    const expectedDependencies = {
      [oneSelectionId]: [twoSelectionId],
      [fSelectionId]: [aSelectionId],
    };
    const nodePermutations = permutations(nodes);
    const edgePermutations = [edges, [...edges].reverse()];
    const inputs = nodePermutations.flatMap((nodeOrder) =>
      edgePermutations.map((edgeOrder) => makeInput(nodeOrder, edgeOrder))
    );
    expect(nodePermutations).toHaveLength(24);
    expect(inputs).toHaveLength(48);

    const results = inputs.map((value) =>
      expectSuccessfulOutput(value, expectedOrder, expectedDependencies)
    );
    for (const result of results.slice(1)) expect(result).toEqual(results[0]);
  });

  test("deduplicates a repeated target from distinct requirements and sorts dependency keys", () => {
    const value = makeInput(
      [
        makeNode("3", "resource.consumer"),
        makeNode("2", "resource.secondary"),
        makeNode("1", "resource.shared"),
      ],
      [makeEdge("3", "3", "1"), makeEdge("3", "1", "2"), makeEdge("3", "2", "1")]
    );
    const result = expectSuccessfulOutput(
      value,
      [selectionId("1"), selectionId("2"), selectionId("3")],
      { [selectionId("3")]: [selectionId("1"), selectionId("2")] }
    );
    expect(result.modules[2]!.dependencies).toHaveLength(2);
  });

  test("accepts edges that differ by either source or target within an otherwise equal triple", () => {
    const value = makeInput(
      [
        makeNode("4", "resource.consumer-four"),
        makeNode("2", "resource.target-two"),
        makeNode("3", "resource.consumer-three"),
        makeNode("1", "resource.target-one"),
      ],
      [makeEdge("3", "1", "1"), makeEdge("3", "1", "2"), makeEdge("4", "1", "1")]
    );
    expectSuccessfulOutput(
      value,
      [selectionId("1"), selectionId("2"), selectionId("3"), selectionId("4")],
      {
        [selectionId("3")]: [selectionId("1"), selectionId("2")],
        [selectionId("4")]: [selectionId("1")],
      }
    );
  });

  test("returns exact empty and disconnected artifacts and fresh graphs on every call", () => {
    const emptyInput = makeInput([]);
    const firstEmpty = expectSuccessfulOutput(emptyInput, []);
    const secondEmpty = expectSuccessfulOutput(emptyInput, []);
    expect(firstEmpty).toEqual({
      kind: "bootgraph.ordered",
      modules: [],
      order: [],
      rollbackOrder: [],
      releaseOrder: [],
    });
    expect(secondEmpty).toEqual(firstEmpty);
    const firstEmptyObjects = collectObjects(firstEmpty);
    const secondEmptyObjects = collectObjects(secondEmpty);
    expect([...firstEmptyObjects].filter((object) => secondEmptyObjects.has(object))).toEqual([]);

    const disconnectedInput = makeInput([
      makeNode("b", "resource.shared", { instance: "second" }),
      makeNode("0", "resource.shared", { instance: "first" }),
      makeNode("a", "resource.other", { lifetime: "role", role: "cli" }),
    ]);
    const expectedOrder = [selectionId("0"), selectionId("a"), selectionId("b")];
    const first = expectSuccessfulOutput(disconnectedInput, expectedOrder);
    const second = expectSuccessfulOutput(disconnectedInput, expectedOrder);
    expect(second).toEqual(first);
    const firstObjects = collectObjects(first);
    const secondObjects = collectObjects(second);
    expect([...firstObjects].filter((object) => secondObjects.has(object))).toEqual([]);
  });

  test("accepts same-resource lifecycle tuples separated only by lifetime or role", () => {
    const value = makeInput([
      makeNode("4", "resource.same-lifetime", {
        lifetime: "role",
        role: "server",
        instance: "primary",
      }),
      makeNode("1", "resource.same-lifetime", {
        lifetime: "process",
        role: "server",
        instance: "primary",
      }),
      makeNode("3", "resource.same-role", {
        lifetime: "role",
        role: "cli",
        instance: "primary",
      }),
      makeNode("2", "resource.same-role", {
        lifetime: "role",
        role: "server",
        instance: "primary",
      }),
    ]);

    expectSuccessfulOutput(value, [
      selectionId("1"),
      selectionId("2"),
      selectionId("3"),
      selectionId("4"),
    ]);
  });

  test("accepts exact null-prototype input, node, resource, and edge records", () => {
    const dependencyBase = makeNode("1", "resource.null-dependency");
    const dependentBase = makeNode("2", "resource.null-dependent", {
      lifetime: "role",
      role: "agent",
      instance: "primary",
    });
    const dependency = nullPrototypeRecord({
      ...dependencyBase,
      resource: nullPrototypeRecord({ ...dependencyBase.resource }),
    });
    const dependent = nullPrototypeRecord({
      ...dependentBase,
      resource: nullPrototypeRecord({ ...dependentBase.resource }),
    });
    const edge = nullPrototypeRecord({ ...makeEdge("2", "1", "1") });
    const value = nullPrototypeRecord({
      kind: "bootgraph.input" as const,
      nodes: [dependent, dependency],
      edges: [edge],
    });

    expectSuccessfulOutput(value, [selectionId("1"), selectionId("2")], {
      [selectionId("2")]: [selectionId("1")],
    });
  });

  test("preserves the complete input object graph on success and refusal", () => {
    const successfulInput = copyInput(baselineInput);
    Object.freeze(successfulInput.nodes[0]!.resource);
    Object.freeze(successfulInput.nodes[1]);
    Object.freeze(successfulInput.edges);
    const successfulSnapshot = snapshotObjectGraph(successfulInput);
    expectSuccessfulOutput(
      successfulInput,
      [databaseSelectionId, cacheSelectionId, apiSelectionId],
      {
        [cacheSelectionId]: [databaseSelectionId],
        [apiSelectionId]: [databaseSelectionId, cacheSelectionId],
      }
    );
    expectObjectGraphUnchanged(successfulSnapshot);

    const refusedInput = makeInput([
      makeNode("7", "resource.refused-one"),
      { ...makeNode("8", "resource.refused-two"), selectionId: selectionId("7") },
      makeNode("9", "resource.refused-three"),
    ]);
    Object.freeze(refusedInput.nodes[0]!.resource);
    Object.freeze(refusedInput.nodes[2]);
    Object.freeze(refusedInput.edges);
    const refusedSnapshot = snapshotObjectGraph(refusedInput);
    expectBuiltInTypeErrorBeforeResult(refusedInput, "duplicate selection with mixed frozen state");
    expectObjectGraphUnchanged(refusedSnapshot);

    const sharedNode = makeNode("e", "resource.repeated-alias");
    const repeatedAliasInput = makeInput([sharedNode, sharedNode]);
    const repeatedAliasSnapshot = snapshotObjectGraph(repeatedAliasInput);
    expect(repeatedAliasInput.nodes[0]).toBe(repeatedAliasInput.nodes[1]);
    expectBuiltInTypeErrorBeforeResult(repeatedAliasInput, "refused repeated node alias");
    expectObjectGraphUnchanged(repeatedAliasSnapshot);
    expect(repeatedAliasInput.nodes[0]).toBe(repeatedAliasInput.nodes[1]);
    expect(Object.getOwnPropertyDescriptor(sharedNode, "resource")?.value).toBe(
      sharedNode.resource
    );
  });

  test("refuses every malformed or surplus closed-schema record", () => {
    const valid = copyInput(baselineInput);
    const validNodeInput = makeInput(valid.nodes);
    const node = validNodeInput.nodes[0]!;
    const resource = node.resource;
    const replaceNode = (replacement: unknown) => ({
      ...validNodeInput,
      nodes: [replacement, ...validNodeInput.nodes.slice(1)],
    });
    const validEdgeInput = makeInput(
      [makeNode("5", "resource.edge-target"), makeNode("6", "resource.edge-source")],
      [makeEdge("6", "7", "5")]
    );
    const edge = validEdgeInput.edges[0]!;
    const replaceEdge = (replacement: unknown) => ({
      ...validEdgeInput,
      edges: [replacement],
    });
    const cases: readonly { readonly name: string; readonly value: unknown }[] = [
      { name: "null input", value: null },
      { name: "array input", value: [] },
      { name: "missing input kind", value: { nodes: valid.nodes, edges: valid.edges } },
      { name: "wrong input kind", value: { ...valid, kind: "bootgraph.wrong" } },
      { name: "missing nodes", value: { kind: valid.kind, edges: valid.edges } },
      { name: "non-array nodes", value: { ...valid, nodes: {} } },
      { name: "missing edges", value: { kind: valid.kind, nodes: valid.nodes } },
      { name: "non-array edges", value: { ...valid, edges: {} } },
      { name: "surplus input field", value: { ...valid, surplus: true } },
      { name: "null node", value: replaceNode(null) },
      { name: "array node", value: replaceNode([]) },
      {
        name: "missing node selection",
        value: replaceNode({ providerId: node.providerId, resource }),
      },
      {
        name: "malformed node selection",
        value: replaceNode({ ...node, selectionId: "selection" }),
      },
      {
        name: "non-string node selection",
        value: replaceNode({ ...node, selectionId: 1 }),
      },
      {
        name: "missing node provider",
        value: replaceNode({ selectionId: node.selectionId, resource }),
      },
      {
        name: "non-string node provider",
        value: replaceNode({ ...node, providerId: 1 }),
      },
      {
        name: "missing node resource",
        value: replaceNode({ selectionId: node.selectionId, providerId: node.providerId }),
      },
      { name: "surplus node field", value: replaceNode({ ...node, surplus: true }) },
      { name: "null resource", value: replaceNode({ ...node, resource: null }) },
      { name: "array resource", value: replaceNode({ ...node, resource: [] }) },
      {
        name: "missing resource id",
        value: replaceNode({ ...node, resource: { lifetime: resource.lifetime } }),
      },
      {
        name: "non-string resource id",
        value: replaceNode({ ...node, resource: { ...resource, resourceId: 1 } }),
      },
      {
        name: "missing resource lifetime",
        value: replaceNode({ ...node, resource: { resourceId: resource.resourceId } }),
      },
      {
        name: "invalid resource lifetime",
        value: replaceNode({ ...node, resource: { ...resource, lifetime: "request" } }),
      },
      {
        name: "invalid resource role",
        value: replaceNode({ ...node, resource: { ...resource, role: "invalid" } }),
      },
      {
        name: "non-string resource instance",
        value: replaceNode({ ...node, resource: { ...resource, instance: 1 } }),
      },
      {
        name: "surplus resource field",
        value: replaceNode({ ...node, resource: { ...resource, surplus: true } }),
      },
      { name: "null edge", value: replaceEdge(null) },
      { name: "array edge", value: replaceEdge([]) },
      {
        name: "missing edge source",
        value: replaceEdge({
          requirementId: edge.requirementId,
          toSelectionId: edge.toSelectionId,
        }),
      },
      {
        name: "malformed edge source",
        value: replaceEdge({ ...edge, fromSelectionId: "selection" }),
      },
      {
        name: "non-string edge source",
        value: replaceEdge({ ...edge, fromSelectionId: 1 }),
      },
      {
        name: "missing edge requirement",
        value: replaceEdge({
          fromSelectionId: edge.fromSelectionId,
          toSelectionId: edge.toSelectionId,
        }),
      },
      {
        name: "malformed edge requirement",
        value: replaceEdge({ ...edge, requirementId: "requirement" }),
      },
      {
        name: "non-string edge requirement",
        value: replaceEdge({ ...edge, requirementId: 1 }),
      },
      {
        name: "missing edge target",
        value: replaceEdge({
          fromSelectionId: edge.fromSelectionId,
          requirementId: edge.requirementId,
        }),
      },
      {
        name: "malformed edge target",
        value: replaceEdge({ ...edge, toSelectionId: "selection" }),
      },
      {
        name: "non-string edge target",
        value: replaceEdge({ ...edge, toSelectionId: 1 }),
      },
      { name: "surplus edge field", value: replaceEdge({ ...edge, surplus: true }) },
    ];
    for (const { name, value } of cases) expectBuiltInTypeErrorBeforeResult(value, name);
  });

  test("refuses non-ordinary, accessor, hidden, symbolic, sparse, and augmented containers", () => {
    let accessorCalls = 0;
    const cases: {
      name: string;
      value: unknown;
      accessorCalls?: () => number;
    }[] = [];
    const addAccessorCase = (
      name: string,
      target: object,
      key: PropertyKey,
      value: unknown,
      wrap: (target: object) => unknown
    ) => {
      Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        get: () => {
          accessorCalls += 1;
          return value;
        },
      });
      cases.push({ name, value: wrap(target), accessorCalls: () => accessorCalls });
    };

    const valid = copyInput(baselineInput);
    const validNodeArrayInput = makeInput(valid.nodes);
    const validEdgeInput = makeInput(
      [makeNode("5", "resource.edge-target"), makeNode("6", "resource.edge-source")],
      [makeEdge("6", "7", "5")]
    );
    const replaceNode = (replacement: unknown) => ({
      ...valid,
      nodes: [replacement, ...valid.nodes.slice(1)],
    });
    const replaceEdge = (replacement: unknown) => ({
      ...validEdgeInput,
      edges: [replacement],
    });
    cases.push({
      name: "foreign input prototype",
      value: Object.assign(Object.create({ foreign: true }), valid),
    });
    cases.push({
      name: "foreign node prototype",
      value: replaceNode(Object.assign(Object.create({ foreign: true }), valid.nodes[0])),
    });
    cases.push({
      name: "foreign resource prototype",
      value: replaceNode({
        ...valid.nodes[0]!,
        resource: Object.assign(Object.create({ foreign: true }), valid.nodes[0]!.resource),
      }),
    });
    cases.push({
      name: "foreign edge prototype",
      value: replaceEdge(Object.assign(Object.create({ foreign: true }), validEdgeInput.edges[0])),
    });

    class NodeArray extends Array<BootgraphNode> {}
    cases.push({
      name: "node array subclass",
      value: { ...validNodeArrayInput, nodes: new NodeArray(...validNodeArrayInput.nodes) },
    });
    class EdgeArray extends Array<BootgraphEdge> {}
    cases.push({
      name: "edge array subclass",
      value: { ...validEdgeInput, edges: new EdgeArray(...validEdgeInput.edges) },
    });

    for (const [name, collectionKey, fixture] of [
      ["nodes", "nodes", validNodeArrayInput],
      ["edges", "edges", validEdgeInput],
    ] as const) {
      const sparse = [...fixture[collectionKey]];
      delete sparse[0];
      cases.push({ name: `sparse ${name} array`, value: { ...fixture, [collectionKey]: sparse } });

      const hidden = [...fixture[collectionKey]];
      Object.defineProperty(hidden, "0", {
        configurable: true,
        enumerable: false,
        value: hidden[0],
        writable: true,
      });
      cases.push({ name: `hidden ${name} index`, value: { ...fixture, [collectionKey]: hidden } });

      const augmented = [...fixture[collectionKey]];
      Object.defineProperty(augmented, "surplus", {
        configurable: true,
        enumerable: true,
        value: true,
        writable: true,
      });
      cases.push({
        name: `augmented ${name} array`,
        value: { ...fixture, [collectionKey]: augmented },
      });

      const hiddenSurplus = [...fixture[collectionKey]];
      Object.defineProperty(hiddenSurplus, "surplus", {
        configurable: true,
        enumerable: false,
        value: true,
        writable: true,
      });
      cases.push({
        name: `hidden surplus ${name} array field`,
        value: { ...fixture, [collectionKey]: hiddenSurplus },
      });

      const symbolic = [...fixture[collectionKey]];
      Object.defineProperty(symbolic, Symbol(name), {
        configurable: true,
        enumerable: true,
        value: true,
        writable: true,
      });
      cases.push({
        name: `symbolic ${name} array field`,
        value: { ...fixture, [collectionKey]: symbolic },
      });
    }

    const hugeSparseNodes: BootgraphNode[] = [];
    hugeSparseNodes.length = 0xffffffff;
    cases.push({
      name: "huge sparse nodes array",
      value: { ...validNodeArrayInput, nodes: hugeSparseNodes },
    });

    const hiddenNode = { ...valid.nodes[0]! };
    Object.defineProperty(hiddenNode, "providerId", {
      configurable: true,
      enumerable: false,
      value: hiddenNode.providerId,
      writable: true,
    });
    cases.push({ name: "hidden node field", value: replaceNode(hiddenNode) });

    const hiddenSurplusInput = copyInput(baselineInput);
    Object.defineProperty(hiddenSurplusInput, "surplus", {
      configurable: true,
      enumerable: false,
      value: true,
      writable: true,
    });
    cases.push({ name: "hidden surplus input field", value: hiddenSurplusInput });
    const hiddenSurplusNode = { ...valid.nodes[0]! };
    Object.defineProperty(hiddenSurplusNode, "surplus", {
      configurable: true,
      enumerable: false,
      value: true,
      writable: true,
    });
    cases.push({
      name: "hidden surplus node field",
      value: replaceNode(hiddenSurplusNode),
    });

    const hiddenResource = { ...valid.nodes[0]!.resource };
    Object.defineProperty(hiddenResource, "resourceId", {
      configurable: true,
      enumerable: false,
      value: hiddenResource.resourceId,
      writable: true,
    });
    cases.push({
      name: "hidden resource field",
      value: replaceNode({ ...valid.nodes[0]!, resource: hiddenResource }),
    });
    const hiddenSurplusResource = { ...valid.nodes[0]!.resource };
    Object.defineProperty(hiddenSurplusResource, "surplus", {
      configurable: true,
      enumerable: false,
      value: true,
      writable: true,
    });
    cases.push({
      name: "hidden surplus resource field",
      value: replaceNode({ ...valid.nodes[0]!, resource: hiddenSurplusResource }),
    });
    const hiddenRoleResource = {
      resourceId: "resource.hidden-role",
      lifetime: "role",
      role: "server",
    };
    Object.defineProperty(hiddenRoleResource, "role", {
      configurable: true,
      enumerable: false,
      value: "server",
      writable: true,
    });
    cases.push({
      name: "hidden optional role field",
      value: {
        ...valid,
        nodes: [{ ...makeNode("d", "resource.hidden-role"), resource: hiddenRoleResource }],
        edges: [],
      },
    });
    const hiddenInstanceResource = {
      resourceId: "resource.hidden-instance",
      lifetime: "process",
      instance: "primary",
    };
    Object.defineProperty(hiddenInstanceResource, "instance", {
      configurable: true,
      enumerable: false,
      value: "primary",
      writable: true,
    });
    cases.push({
      name: "hidden optional instance field",
      value: {
        ...valid,
        nodes: [{ ...makeNode("d", "resource.hidden-instance"), resource: hiddenInstanceResource }],
        edges: [],
      },
    });
    const inheritedRoleResource = Object.assign(Object.create({ role: "server" }), {
      resourceId: "resource.inherited-role",
      lifetime: "role",
    });
    cases.push({
      name: "inherited optional role field",
      value: {
        ...valid,
        nodes: [{ ...makeNode("d", "resource.inherited-role"), resource: inheritedRoleResource }],
        edges: [],
      },
    });
    const inheritedInstanceResource = Object.assign(Object.create({ instance: "primary" }), {
      resourceId: "resource.inherited-instance",
      lifetime: "process",
    });
    cases.push({
      name: "inherited optional instance field",
      value: {
        ...valid,
        nodes: [
          {
            ...makeNode("d", "resource.inherited-instance"),
            resource: inheritedInstanceResource,
          },
        ],
        edges: [],
      },
    });

    const hiddenEdge = { ...validEdgeInput.edges[0]! };
    Object.defineProperty(hiddenEdge, "requirementId", {
      configurable: true,
      enumerable: false,
      value: hiddenEdge.requirementId,
      writable: true,
    });
    cases.push({ name: "hidden edge field", value: replaceEdge(hiddenEdge) });
    const hiddenSurplusEdge = { ...validEdgeInput.edges[0]! };
    Object.defineProperty(hiddenSurplusEdge, "surplus", {
      configurable: true,
      enumerable: false,
      value: true,
      writable: true,
    });
    cases.push({
      name: "hidden surplus edge field",
      value: replaceEdge(hiddenSurplusEdge),
    });

    const symbolicInput = copyInput(baselineInput) as BootgraphInput & { [key: symbol]: boolean };
    symbolicInput[Symbol("surplus")] = true;
    cases.push({ name: "symbolic input field", value: symbolicInput });
    const symbolicNode = { ...valid.nodes[0]! };
    Object.defineProperty(symbolicNode, Symbol("node surplus"), {
      configurable: true,
      enumerable: true,
      value: true,
      writable: true,
    });
    cases.push({ name: "symbolic node field", value: replaceNode(symbolicNode) });
    const symbolicResource = { ...valid.nodes[0]!.resource };
    Object.defineProperty(symbolicResource, Symbol("resource surplus"), {
      configurable: true,
      enumerable: true,
      value: true,
      writable: true,
    });
    cases.push({
      name: "symbolic resource field",
      value: replaceNode({ ...valid.nodes[0]!, resource: symbolicResource }),
    });
    const symbolicEdge = { ...validEdgeInput.edges[0]! };
    Object.defineProperty(symbolicEdge, Symbol("edge surplus"), {
      configurable: true,
      enumerable: true,
      value: true,
      writable: true,
    });
    cases.push({ name: "symbolic edge field", value: replaceEdge(symbolicEdge) });

    const accessorInput = copyInput(baselineInput);
    addAccessorCase(
      "input accessor",
      accessorInput,
      "nodes",
      accessorInput.nodes,
      (target) => target
    );
    const accessorNode = { ...valid.nodes[0]! };
    addAccessorCase(
      "node accessor",
      accessorNode,
      "providerId",
      accessorNode.providerId,
      replaceNode
    );
    const accessorResource = { ...valid.nodes[0]!.resource };
    addAccessorCase(
      "resource accessor",
      accessorResource,
      "resourceId",
      accessorResource.resourceId,
      (target) => replaceNode({ ...valid.nodes[0]!, resource: target })
    );
    const accessorEdge = { ...validEdgeInput.edges[0]! };
    addAccessorCase(
      "edge accessor",
      accessorEdge,
      "requirementId",
      accessorEdge.requirementId,
      replaceEdge
    );
    const accessorNodes = [...validNodeArrayInput.nodes];
    addAccessorCase("node array accessor", accessorNodes, "0", accessorNodes[0], (target) => ({
      ...validNodeArrayInput,
      nodes: target,
    }));
    const accessorEdges = [...validEdgeInput.edges];
    addAccessorCase("edge array accessor", accessorEdges, "0", accessorEdges[0], (target) => ({
      ...validEdgeInput,
      edges: target,
    }));

    for (const { name, value, accessorCalls: calls } of cases) {
      if (calls === undefined) expectBuiltInTypeErrorBeforeResult(value, name);
      else expectBuiltInTypeErrorWithoutAccessorWork(value, name, calls);
    }
    expect(accessorCalls).toBe(0);
  });

  test("refuses inherited numeric array entries without leaking global state", () => {
    const inheritedIndex = ["4294967294", "4294967293", "4294967292"].find(
      (key) =>
        !Object.prototype.hasOwnProperty.call(Object.prototype, key) &&
        !Object.prototype.hasOwnProperty.call(Array.prototype, key)
    );
    if (inheritedIndex === undefined)
      throw new Error("No unoccupied high array index is available.");

    try {
      Object.defineProperty(Object.prototype, inheritedIndex, {
        configurable: true,
        enumerable: false,
        value: "inherited numeric pollution",
        writable: true,
      });
      expectBuiltInTypeErrorBeforeResult(baselineInput, "inherited numeric array entry");
    } finally {
      Reflect.deleteProperty(Object.prototype, inheritedIndex);
    }
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, inheritedIndex)).toBe(false);
  });

  test("refuses every duplicate identity and exact-edge case", () => {
    const cases = [
      {
        name: "duplicate selection id",
        value: makeInput([
          makeNode("1", "resource.one"),
          { ...makeNode("2", "resource.two"), selectionId: selectionId("1") },
        ]),
      },
      {
        name: "duplicate process lifecycle tuple",
        value: makeInput([makeNode("1", "resource.same"), makeNode("2", "resource.same")]),
      },
      {
        name: "duplicate role lifecycle tuple",
        value: makeInput([
          makeNode("1", "resource.same", { lifetime: "role", role: "server", instance: "main" }),
          makeNode("2", "resource.same", { lifetime: "role", role: "server", instance: "main" }),
        ]),
      },
      {
        name: "omitted and empty instance are the same lifecycle tuple",
        value: makeInput([
          makeNode("1", "resource.same", { lifetime: "role", role: "server" }),
          makeNode("2", "resource.same", { lifetime: "role", role: "server", instance: "" }),
        ]),
      },
      {
        name: "duplicate exact edge triple",
        value: makeInput(
          [makeNode("1", "resource.one"), makeNode("2", "resource.two")],
          [makeEdge("2", "1", "1"), makeEdge("2", "1", "1")]
        ),
      },
    ];
    for (const { name, value } of cases) expectBuiltInTypeErrorBeforeResult(value, name);
  });

  test("refuses each dangling endpoint and self or multi-node cycle", () => {
    const cases = [
      {
        name: "dangling source",
        value: makeInput([makeNode("1", "resource.one")], [makeEdge("2", "1", "1")]),
      },
      {
        name: "dangling target",
        value: makeInput([makeNode("1", "resource.one")], [makeEdge("1", "1", "2")]),
      },
      {
        name: "self cycle",
        value: makeInput([makeNode("1", "resource.one")], [makeEdge("1", "1", "1")]),
      },
      {
        name: "two-node cycle",
        value: makeInput(
          [makeNode("1", "resource.one"), makeNode("2", "resource.two")],
          [makeEdge("1", "1", "2"), makeEdge("2", "2", "1")]
        ),
      },
      {
        name: "three-node cycle with an acyclic component",
        value: makeInput(
          [
            makeNode("0", "resource.zero"),
            makeNode("1", "resource.one"),
            makeNode("2", "resource.two"),
            makeNode("3", "resource.three"),
          ],
          [makeEdge("1", "1", "2"), makeEdge("2", "2", "3"), makeEdge("3", "3", "1")]
        ),
      },
    ];
    for (const { name, value } of cases) expectBuiltInTypeErrorBeforeResult(value, name);
  });

  test("retains predecessor absence and the exact private Nx owner edge", async () => {
    const graph = await createProjectGraphAsync({ exitOnError: true });
    const projects = readProjectsConfigurationFromProjectGraph(graph).projects;
    const rootPackage = readJson("package.json");
    const workspaces = rootPackage.workspaces;
    const lockfile = readJsonc("bun.lock");
    const lockWorkspaces = lockfile.workspaces as JsonObject;
    const lockPackages = lockfile.packages as JsonObject;

    expect(projects["runtime-bootgraph"]?.root).toBe("packages/core/runtime/bootgraph");
    expect(projects["@rawr/bootgraph"]).toBeUndefined();
    expect([
      ...new Set(
        (graph.dependencies["runtime-bootgraph"] ?? [])
          .map(({ target }) => target)
          .filter((target) => target in graph.nodes)
      ),
    ]).toEqual(["runtime-compiler"]);
    expect(existsSync(path.join(workspaceRoot, "packages/bootgraph"))).toBe(false);
    expect(
      existsSync(path.join(workspaceRoot, "packages/core/runtime/bootgraph/package.json"))
    ).toBe(false);
    expect(Array.isArray(workspaces)).toBe(true);
    expect(workspaces).not.toContain("packages/bootgraph");
    expect(JSON.stringify(workspaces)).not.toContain("@rawr/bootgraph");
    expect(lockWorkspaces["packages/bootgraph"]).toBeUndefined();
    expect(lockPackages["@rawr/bootgraph"]).toBeUndefined();
    expect(JSON.stringify(lockfile)).not.toContain("@rawr/bootgraph");
    expect(Object.keys(runtimeBootgraph).sort()).toEqual([
      "BootResourceKeySchema",
      "BootResourceModuleSchema",
      "BootgraphSchema",
      "orderBootgraph",
    ]);
    expect("BOOTGRAPH_RESERVATION" in runtimeBootgraph).toBe(false);
  });
});

describe("runtime bootgraph task 6.2b Proxy admission", () => {
  type ProxyWrapper = <T extends object>(target: T) => T;
  type ProxyCandidate = {
    readonly name: string;
    readonly create: (wrap: ProxyWrapper) => unknown;
  };

  function expectBuiltInTypeError(value: unknown, name: string): void {
    const noResult = Symbol("no result");
    let result: unknown = noResult;
    let thrown: unknown;
    try {
      result = orderBootgraph(value as BootgraphInput);
    } catch (error) {
      thrown = error;
    }
    expect(result, name).toBe(noResult);
    expect(thrown, name).toBeInstanceOf(TypeError);
    expect(thrown instanceof TypeError ? thrown.constructor : undefined, name).toBe(TypeError);
  }

  const proxyCandidates: readonly ProxyCandidate[] = [
    {
      name: "input shell",
      create: (wrap) => wrap(copyInput(baselineInput)),
    },
    {
      name: "nodes array",
      create: (wrap) => {
        const value = copyInput(baselineInput);
        return { ...value, nodes: wrap(value.nodes) };
      },
    },
    {
      name: "edges array",
      create: (wrap) => {
        const value = copyInput(baselineInput);
        return { ...value, edges: wrap(value.edges) };
      },
    },
    {
      name: "node record",
      create: (wrap) => {
        const value = copyInput(baselineInput);
        return { ...value, nodes: [wrap(value.nodes[0]!), ...value.nodes.slice(1)] };
      },
    },
    {
      name: "resource record",
      create: (wrap) => {
        const value = copyInput(baselineInput);
        const firstNode = value.nodes[0]!;
        return {
          ...value,
          nodes: [{ ...firstNode, resource: wrap(firstNode.resource) }, ...value.nodes.slice(1)],
        };
      },
    },
    {
      name: "edge record",
      create: (wrap) => {
        const value = copyInput(baselineInput);
        return { ...value, edges: [wrap(value.edges[0]!), ...value.edges.slice(1)] };
      },
    },
  ];

  test("refuses active and revoked Proxies at all six container positions without traps", () => {
    const marker = new Error("Proxy trap invoked");
    let trapCalls = 0;
    const trap = (): never => {
      trapCalls += 1;
      throw marker;
    };
    const handler = <T extends object>(): ProxyHandler<T> => ({
      getPrototypeOf: trap,
      ownKeys: trap,
      getOwnPropertyDescriptor: trap,
      has: trap,
      get: trap,
    });
    const activeProxy: ProxyWrapper = <T extends object>(target: T): T =>
      new Proxy(target, handler<T>());
    const revokedProxy: ProxyWrapper = <T extends object>(target: T): T => {
      const revocable = Proxy.revocable(target, handler<T>());
      revocable.revoke();
      return revocable.proxy;
    };

    for (const { name, create } of proxyCandidates) {
      expectBuiltInTypeError(create(activeProxy), `active ${name}`);
      expectBuiltInTypeError(create(revokedProxy), `revoked ${name}`);
    }
    expect(trapCalls).toBe(0);
  });

  test("refuses direct and inherited proxied record and array prototypes without traps", () => {
    const marker = new Error("prototype Proxy trap invoked");
    let trapCalls = 0;
    const trap = (): never => {
      trapCalls += 1;
      throw marker;
    };
    const handler: ProxyHandler<object> = {
      getPrototypeOf: trap,
      ownKeys: trap,
      getOwnPropertyDescriptor: trap,
      has: trap,
      get: trap,
    };
    const proxiedPrototype = new Proxy({}, handler);
    const inheritedPrototype = Object.create(proxiedPrototype);
    const revokedPrototype = Proxy.revocable({}, handler);
    revokedPrototype.revoke();
    const revokedInheritedPrototype = Object.create(revokedPrototype.proxy);

    const directRecord = copyInput(baselineInput);
    Object.setPrototypeOf(directRecord, proxiedPrototype);
    const inheritedRecord = copyInput(baselineInput);
    Object.setPrototypeOf(inheritedRecord, inheritedPrototype);
    const directArray = copyInput(baselineInput);
    Object.setPrototypeOf(directArray.nodes, proxiedPrototype);
    const inheritedArray = copyInput(baselineInput);
    Object.setPrototypeOf(inheritedArray.nodes, inheritedPrototype);
    const revokedDirectRecord = copyInput(baselineInput);
    Object.setPrototypeOf(revokedDirectRecord, revokedPrototype.proxy);
    const revokedInheritedRecord = copyInput(baselineInput);
    Object.setPrototypeOf(revokedInheritedRecord, revokedInheritedPrototype);
    const revokedDirectArray = copyInput(baselineInput);
    Object.setPrototypeOf(revokedDirectArray.nodes, revokedPrototype.proxy);
    const revokedInheritedArray = copyInput(baselineInput);
    Object.setPrototypeOf(revokedInheritedArray.nodes, revokedInheritedPrototype);

    const cases = [
      { name: "direct record prototype", value: directRecord },
      { name: "inherited record prototype", value: inheritedRecord },
      { name: "direct array prototype", value: directArray },
      { name: "inherited array prototype", value: inheritedArray },
      { name: "revoked direct record prototype", value: revokedDirectRecord },
      { name: "revoked inherited record prototype", value: revokedInheritedRecord },
      { name: "revoked direct array prototype", value: revokedDirectArray },
      { name: "revoked inherited array prototype", value: revokedInheritedArray },
    ] as const;
    for (const { name, value } of cases) expectBuiltInTypeError(value, name);
    expect(trapCalls).toBe(0);
  });

  test("refuses record-field and array-index accessors without invoking getters", () => {
    const marker = new Error("getter invoked");
    let getterCalls = 0;
    const getter = (): never => {
      getterCalls += 1;
      throw marker;
    };

    const recordField = copyInput(baselineInput);
    Object.defineProperty(recordField, "nodes", {
      configurable: true,
      enumerable: true,
      get: getter,
    });
    const arrayIndex = copyInput(baselineInput);
    const nodes = [...arrayIndex.nodes];
    Object.defineProperty(nodes, "0", {
      configurable: true,
      enumerable: true,
      get: getter,
    });

    expectBuiltInTypeError(recordField, "record field accessor");
    expectBuiltInTypeError({ ...arrayIndex, nodes }, "array index accessor");
    expect(getterCalls).toBe(0);
  });

  test("preserves one synchronous exact closed-schema-valid success", () => {
    const validSelectionId = selectionId("4");
    const value = {
      kind: "bootgraph.input",
      nodes: [
        {
          selectionId: validSelectionId,
          providerId: "provider.worker",
          resource: { resourceId: "resource.worker", lifetime: "process" },
        },
      ],
      edges: [],
    } as const satisfies BootgraphInput;
    const key = {
      kind: "boot.resource-key",
      selectionId: validSelectionId,
      resourceId: "resource.worker",
      lifetime: "process",
    } as const;

    const result = expectSuccessfulOutput(value, [validSelectionId]);

    expect(result).not.toBeInstanceOf(Promise);
    expect(Check(BootgraphSchema, result)).toBe(true);
    expect(result).toEqual({
      kind: "bootgraph.ordered",
      modules: [
        {
          kind: "boot.resource-module",
          key,
          providerId: "provider.worker",
          dependencies: [],
        },
      ],
      order: [key],
      rollbackOrder: [key],
      releaseOrder: [key],
    });
  });
});
