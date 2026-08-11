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

const workspaceRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const selectionId = (digit: string) => `provider-selection:sha256:${digit.repeat(64)}`;
const requirementId = (digit: string) => `resource-requirement:sha256:${digit.repeat(64)}`;

const databaseSelectionId = selectionId("1");
const cacheSelectionId = selectionId("2");
const apiSelectionId = selectionId("3");

const input = {
  kind: "bootgraph.input",
  nodes: [
    {
      selectionId: apiSelectionId,
      providerId: "provider.api",
      resource: {
        resourceId: "resource.api",
        lifetime: "role",
        role: "server",
        instance: "primary",
      },
    },
    {
      selectionId: databaseSelectionId,
      providerId: "provider.database",
      resource: { resourceId: "resource.database", lifetime: "process" },
    },
    {
      selectionId: cacheSelectionId,
      providerId: "provider.cache",
      resource: { resourceId: "resource.cache", lifetime: "role", role: "server" },
    },
  ],
  edges: [
    {
      fromSelectionId: apiSelectionId,
      requirementId: requirementId("3"),
      toSelectionId: cacheSelectionId,
    },
    {
      fromSelectionId: cacheSelectionId,
      requirementId: requirementId("2"),
      toSelectionId: databaseSelectionId,
    },
    {
      fromSelectionId: apiSelectionId,
      requirementId: requirementId("1"),
      toSelectionId: databaseSelectionId,
    },
  ],
} as const satisfies BootgraphInput;

function copyInput(): BootgraphInput {
  return {
    kind: input.kind,
    nodes: input.nodes.map((node) => ({ ...node, resource: { ...node.resource } })),
    edges: input.edges.map((edge) => ({ ...edge })),
  };
}

function expectRecursivelyFrozen(value: unknown, visited = new Set<object>()): void {
  if (value === null || typeof value !== "object" || visited.has(value)) return;
  visited.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectRecursivelyFrozen(child, visited);
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

describe("runtime bootgraph", () => {
  test("orders a nontrivial compiler graph into one exact frozen lifecycle artifact", () => {
    const result = orderBootgraph(input);
    const databaseKey = {
      kind: "boot.resource-key",
      selectionId: databaseSelectionId,
      resourceId: "resource.database",
      lifetime: "process",
    } as const;
    const cacheKey = {
      kind: "boot.resource-key",
      selectionId: cacheSelectionId,
      resourceId: "resource.cache",
      lifetime: "role",
      role: "server",
    } as const;
    const apiKey = {
      kind: "boot.resource-key",
      selectionId: apiSelectionId,
      resourceId: "resource.api",
      lifetime: "role",
      role: "server",
      instance: "primary",
    } as const;

    expect(result).toEqual({
      kind: "bootgraph.ordered",
      modules: [
        {
          kind: "boot.resource-module",
          key: databaseKey,
          providerId: "provider.database",
          dependencies: [],
        },
        {
          kind: "boot.resource-module",
          key: cacheKey,
          providerId: "provider.cache",
          dependencies: [databaseKey],
        },
        {
          kind: "boot.resource-module",
          key: apiKey,
          providerId: "provider.api",
          dependencies: [databaseKey, cacheKey],
        },
      ],
      order: [databaseKey, cacheKey, apiKey],
      rollbackOrder: [apiKey, cacheKey, databaseKey],
      releaseOrder: [apiKey, cacheKey, databaseKey],
    });
    expect(Check(BootgraphSchema, result)).toBe(true);
    expect(result.modules.map((module) => module.key)).toEqual([...result.order]);
    for (let index = 0; index < result.modules.length; index += 1) {
      expect(result.modules[index]!.key).toBe(result.order[index]);
    }
    expect(result.modules[1]!.dependencies[0]).toBe(result.order[0]);
    expect(result.modules[2]!.dependencies[0]).toBe(result.order[0]);
    expect(result.modules[2]!.dependencies[1]).toBe(result.order[1]);
    for (let index = 0; index < result.order.length; index += 1) {
      const reverseKey = result.order[result.order.length - index - 1];
      expect(result.rollbackOrder[index]).toBe(reverseKey);
      expect(result.releaseOrder[index]).toBe(reverseKey);
    }
    expectRecursivelyFrozen(result);
  });

  test("refuses representative malformed input with the built-in TypeError", () => {
    let thrown: unknown;
    try {
      orderBootgraph({ ...input, surplus: true } as BootgraphInput);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(TypeError);
    expect(thrown instanceof TypeError ? thrown.constructor : undefined).toBe(TypeError);
  });

  test("refuses hostile record and array containers before invoking or allocating from them", () => {
    let accessorCalls = 0;

    const foreignRecord = Object.assign(Object.create({ foreign: true }), copyInput());

    class NodeArray extends Array<BootgraphInput["nodes"][number]> {}
    const subclassInput = copyInput();
    const subclassNodes = new NodeArray(...subclassInput.nodes);

    const hiddenFieldInput = copyInput();
    const hiddenFieldNode = { ...hiddenFieldInput.nodes[0]! };
    Object.defineProperty(hiddenFieldNode, "providerId", {
      configurable: true,
      enumerable: false,
      value: hiddenFieldNode.providerId,
      writable: true,
    });

    const hiddenIndexInput = copyInput();
    const hiddenIndexNodes = [...hiddenIndexInput.nodes];
    Object.defineProperty(hiddenIndexNodes, "0", {
      configurable: true,
      enumerable: false,
      value: hiddenIndexNodes[0],
      writable: true,
    });

    const accessorInput = copyInput();
    const accessorNodes = [...accessorInput.nodes];
    const firstNode = accessorNodes[0];
    Object.defineProperty(accessorNodes, "0", {
      configurable: true,
      enumerable: true,
      get: () => {
        accessorCalls += 1;
        return firstNode;
      },
    });

    const hugeSparseInput = copyInput();
    const hugeSparseNodes: BootgraphInput["nodes"][number][] = [];
    hugeSparseNodes.length = 0xffffffff;

    const cases = [
      { name: "foreign record prototype", value: foreignRecord },
      { name: "array subclass prototype", value: { ...subclassInput, nodes: subclassNodes } },
      {
        name: "non-enumerable required record field",
        value: {
          ...hiddenFieldInput,
          nodes: [hiddenFieldNode, ...hiddenFieldInput.nodes.slice(1)],
        },
      },
      {
        name: "non-enumerable array index",
        value: { ...hiddenIndexInput, nodes: hiddenIndexNodes },
      },
      { name: "accessor array index", value: { ...accessorInput, nodes: accessorNodes } },
      { name: "huge sparse array length", value: { ...hugeSparseInput, nodes: hugeSparseNodes } },
    ] as const;

    for (const { name, value } of cases) {
      let thrown: unknown;
      try {
        orderBootgraph(value as BootgraphInput);
      } catch (error) {
        thrown = error;
      }
      expect(thrown, name).toBeInstanceOf(TypeError);
      expect(thrown instanceof TypeError ? thrown.constructor : undefined, name).toBe(TypeError);
    }
    expect(accessorCalls).toBe(0);
  });

  test("refuses numeric entries inherited beyond Array.prototype and restores the global", () => {
    const inheritedIndex = ["4294967294", "4294967293", "4294967292"].find(
      (key) =>
        !Object.prototype.hasOwnProperty.call(Object.prototype, key) &&
        !Object.prototype.hasOwnProperty.call(Array.prototype, key)
    );
    if (inheritedIndex === undefined) {
      throw new Error("No unoccupied high array index is available for inherited-entry proof.");
    }

    try {
      Object.defineProperty(Object.prototype, inheritedIndex, {
        configurable: true,
        enumerable: false,
        value: "inherited numeric pollution",
        writable: true,
      });

      let thrown: unknown;
      try {
        orderBootgraph(input);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(TypeError);
      expect(thrown instanceof TypeError ? thrown.constructor : undefined).toBe(TypeError);
    } finally {
      Reflect.deleteProperty(Object.prototype, inheritedIndex);
    }

    expect(Object.prototype.hasOwnProperty.call(Object.prototype, inheritedIndex)).toBe(false);
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
