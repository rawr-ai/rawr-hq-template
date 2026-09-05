import { expect, test } from "bun:test";
import { os } from "@orpc/server";

import { defineServerApiPlugin, defineServerInternalPlugin } from "../../definition/src/index";
import { readRuntimeDerivationHandoff } from "../../derivation/src/index";
import { deriveServerFixture } from "../../derivation/test/helpers/server-source-fixture";
import { compileRuntimePlan, readRuntimeCompilationServerSources } from "../src/index";
import { alterHandoff } from "./helpers/handoff-fixture";

function fixture() {
  let factories = 0;
  const api = () => {
    factories++;
    return { hello: os.handler(() => "public") };
  };
  const internal = () => {
    factories++;
    return { hello: os.handler(() => "internal") };
  };
  const derivation = deriveServerFixture([
    defineServerApiPlugin.factory()({
      capability: "public",
      services: {},
      routeBase: "/api",
      api,
    })(),
    defineServerInternalPlugin.factory()({
      capability: "private",
      services: {},
      routeBase: "/rpc",
      internal,
    })(),
  ]);
  return { derivation, factories: () => factories };
}

test("compiled private source channel preserves exact native factories without portable exposure", () => {
  const { derivation, factories } = fixture();
  const handoff = readRuntimeDerivationHandoff(derivation);
  const compiled = compileRuntimePlan({ derivation });
  const sources = readRuntimeCompilationServerSources(compiled.references);
  expect(sources).toHaveLength(2);
  sources.forEach(([id, source], index) => {
    expect(id).toBe(handoff.serverSources[index]![0]);
    expect(source).toBe(handoff.serverSources[index]![1]);
    expect(compiled.plan.surfaces.find((surface) => surface.surfacePlanId === id)?.surface).toBe(
      source.kind
    );
  });
  expect(Object.isFrozen(sources)).toBe(true);
  expect(sources.every(Object.isFrozen)).toBe(true);
  expect(Object.keys(compiled.references)).not.toContain("serverSources");
  expect(JSON.stringify(compiled)).not.toContain("routeBase");
  expect(factories()).toBe(0);
});

for (const corruption of [
  "absent surface",
  "wrong lane",
  "duplicate",
  "nonfunction",
  "invalid base",
] as const) {
  test(`refuses native server source ${corruption} before invoking a factory`, () => {
    const { derivation, factories } = fixture();
    const changed = alterHandoff(derivation, (handoff) => {
      const [id, source] = handoff.serverSources[0]!;
      const invalidSource = { ...source };
      if (corruption === "nonfunction") Reflect.set(invalidSource, "createRouter", undefined);
      if (corruption === "invalid base") Reflect.set(invalidSource, "routeBase", "not-a-path");
      const replacement =
        corruption === "absent surface"
          ? (["absent", source] as const)
          : corruption === "wrong lane"
            ? ([
                id,
                {
                  ...source,
                  kind:
                    source.kind === "server/api"
                      ? ("server/internal" as const)
                      : ("server/api" as const),
                },
              ] as const)
            : ([id, invalidSource] as const);
      return {
        ...handoff,
        serverSources:
          corruption === "duplicate"
            ? [...handoff.serverSources, ...handoff.serverSources]
            : [replacement, ...handoff.serverSources.slice(1)],
      };
    });
    expect(() => compileRuntimePlan({ derivation: changed })).toThrow(TypeError);
    expect(factories()).toBe(0);
  });
}
