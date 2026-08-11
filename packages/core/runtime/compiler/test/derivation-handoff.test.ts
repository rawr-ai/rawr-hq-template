import { expect, test } from "bun:test";

import {
  defineApp,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  runtimeLaunchIdentity,
} from "../../definition/src/index";
import type { NormalizedAuthoringGraph } from "../../derivation/src/normalized-authoring-graph";
import { compileRuntimePlan } from "../src/index";

test("accepts exactly one selected entrypoint and one complete normalized graph", () => {
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
      source: "derivation-handoff",
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

  expect(compileRuntimePlan({ entrypoint, graph }).plan.kind).toBe("compiled.process-plan");
});
