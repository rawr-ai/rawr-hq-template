import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProjectGraphAsync, readProjectsConfigurationFromProjectGraph } from "@nx/devkit";
import { Check } from "typebox/value";
import { parseConfigFileTextToJson } from "typescript";

import { type BootgraphInput, BootgraphInputSchema } from "../../compiler/src";
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
  expect(Check(BootgraphInputSchema, value)).toBe(true);
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
    const sparseNodes = [...valid.nodes];
    delete sparseNodes[0];
    const sparseEdges = [...valid.edges];
    delete sparseEdges[0];
    const cases: readonly { readonly name: string; readonly value: unknown }[] = [
      { name: "undefined input", value: undefined },
      { name: "null input", value: null },
      { name: "numeric input", value: 1 },
      { name: "string input", value: "bootgraph.input" },
      { name: "boolean input", value: true },
      { name: "array input", value: [] },
      { name: "missing input kind", value: { nodes: valid.nodes, edges: valid.edges } },
      { name: "wrong input kind", value: { ...valid, kind: "bootgraph.wrong" } },
      { name: "missing nodes", value: { kind: valid.kind, edges: valid.edges } },
      { name: "non-array nodes", value: { ...valid, nodes: {} } },
      { name: "missing edges", value: { kind: valid.kind, nodes: valid.nodes } },
      { name: "non-array edges", value: { ...valid, edges: {} } },
      { name: "surplus input field", value: { ...valid, surplus: true } },
      { name: "sparse nodes array", value: { ...valid, nodes: sparseNodes } },
      { name: "sparse edges array", value: { ...valid, edges: sparseEdges } },
      { name: "undefined node", value: replaceNode(undefined) },
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
      { name: "undefined edge", value: replaceEdge(undefined) },
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
