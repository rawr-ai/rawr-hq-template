import { describe, expect, test } from "bun:test";

import {
  defineApp,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  runtimeLaunchIdentity,
} from "../../definition/src/index";
import type { NormalizedAuthoringGraph } from "../../derivation/src/normalized-authoring-graph";
import { compileRuntimePlan, type RuntimeCompilationInput } from "../src/index";

function makeFixture(): RuntimeCompilationInput {
  const app = defineApp({ id: "fixture", plugins: [] as const });
  const profile = defineRuntimeProfile({ id: "test", providers: [] as const });
  const processes = defineProcessCatalog({
    server: { id: "server", roles: ["server"] as const },
  });
  const entrypoint = defineEntrypoint({
    id: "fixture.server",
    app,
    profile,
    process: processes.server,
    identity: runtimeLaunchIdentity({
      app: app.id,
      process: processes.server.id,
      entrypoint: "fixture.server",
      deployment: "test",
      source: "compiler-baseline",
    }),
  });
  const graph: NormalizedAuthoringGraph = {
    kind: "normalized.authoring-graph",
    topology: {
      identity: entrypoint.identity,
      profileId: profile.id,
      pluginIdentities: [],
      roleRequirements: ["server"],
      surfaceRequirements: [],
      resourceRequirementIdentities: [],
      edges: [],
    },
    app: { kind: "normalized.app-definition", appId: app.id, pluginOwnerIds: [] },
    plugins: [],
    roleSurfaceIndex: { kind: "derived.role-surface-index", entries: [] },
    serviceUses: [],
    serviceDependencies: [],
    semanticDependencies: [],
    resourceRequirements: [],
    profile: {
      kind: "normalized.runtime-profile",
      profileId: profile.id,
      providerSelections: [],
      configSources: [],
      harnesses: [],
    },
    serviceBindingPlans: [],
    surfaceRuntimePlans: [],
    workflowDispatcherDescriptors: [],
    executionDescriptorRefs: [],
    webRouteModuleRefs: [],
    findings: [],
  };
  return { entrypoint, graph };
}

describe("compileRuntimePlan", () => {
  test("returns the baseline compilation result", () => {
    const result = compileRuntimePlan(makeFixture());

    expect(Object.keys(result)).toEqual(["plan", "references", "observationSeed"]);
    expect(result.plan.kind).toBe("compiled.process-plan");
  });

  test("refuses invalid input", () => {
    const fixture = makeFixture();
    const entrypoint = {
      ...fixture.entrypoint,
      identity: { ...fixture.entrypoint.identity, process: "other" },
    } as RuntimeCompilationInput["entrypoint"];

    expect(() => compileRuntimePlan({ entrypoint, graph: fixture.graph })).toThrow();
  });
});
