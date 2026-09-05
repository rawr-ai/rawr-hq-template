import { expect, test } from "bun:test";
import { os } from "@orpc/server";

import { defineServerApiPlugin, defineServerInternalPlugin } from "../../definition/src/index";
import { readRuntimeDerivationHandoff } from "../src/index";
import { deriveServerFixture } from "./helpers/server-source-fixture";

test("selected native server factories and route bases remain exact, cold and nonportable", () => {
  let factories = 0;
  let bodies = 0;
  const api = () => {
    factories++;
    return {
      hello: os.handler(() => {
        bodies++;
        return "public";
      }),
    };
  };
  const internal = () => {
    factories++;
    return {
      hello: os.handler(() => {
        bodies++;
        return "internal";
      }),
    };
  };
  const plugins = [
    defineServerApiPlugin.factory()({
      capability: "native",
      services: {},
      routeBase: "/api",
      api,
    })(),
    defineServerInternalPlugin.factory()({
      capability: "native",
      services: {},
      routeBase: "/rpc",
      internal,
    })(),
  ];
  const result = deriveServerFixture(plugins);
  const handoff = readRuntimeDerivationHandoff(result);
  expect(handoff.serverSources).toHaveLength(2);
  expect(handoff.serverSources.map(([id]) => id)).toEqual(
    result.graph.surfaceRuntimePlans.map(({ surfacePlanId }) => surfacePlanId)
  );
  for (const [id, source] of handoff.serverSources) {
    const plan = result.graph.surfaceRuntimePlans.find((surface) => surface.surfacePlanId === id)!;
    expect(plan.surface).toBe(source.kind);
    expect(source.createRouter).toBe(source.kind === "server/api" ? api : internal);
    expect(source.routeBase).toBe(source.kind === "server/api" ? "/api" : "/rpc");
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(source.createRouter)).toBe(false);
  }
  expect(Object.isFrozen(handoff.serverSources)).toBe(true);
  expect(handoff.serverSources.every(Object.isFrozen)).toBe(true);
  expect(result.executionDescriptorTable.entries()).toEqual([]);
  expect(JSON.stringify(result)).not.toContain("routeBase");
  expect(JSON.stringify(result.portableArtifact)).not.toContain("createRouter");
  expect({ factories, bodies }).toEqual({ factories: 0, bodies: 0 });

  const sibling = deriveServerFixture(plugins, ["cli"]);
  expect(readRuntimeDerivationHandoff(sibling).serverSources).toEqual([]);
  expect({ factories, bodies }).toEqual({ factories: 0, bodies: 0 });
});
