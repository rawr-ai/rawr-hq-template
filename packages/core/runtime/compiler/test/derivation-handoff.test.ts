import { expect, test } from "bun:test";

import {
  defineApp,
  defineAsyncSchedulePlugin,
  defineAsyncStepEffect,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineSchedule,
  defineWebAppPlugin,
  Effect,
  runtimeLaunchIdentity,
} from "../../definition/src/index";
import { deriveRuntimeArtifacts } from "../../derivation/src/index";
import type { NormalizedAuthoringGraph } from "../../derivation/src/normalized-authoring-graph";
import { compileRuntimePlan, type RuntimeCompilationResult } from "../src/index";

interface HandoffCounters {
  effectBodyCalls: number;
  loaderCalls: number;
}

function produceDerivationHandoff() {
  const counters: HandoffCounters = {
    effectBodyCalls: 0,
    loaderCalls: 0,
  };
  const step = defineAsyncStepEffect({
    id: "handoff.step",
    policy: { interruptible: true },
    effect: () => {
      counters.effectBodyCalls += 1;
      return Effect.succeed("completed");
    },
  });
  const schedule = defineSchedule({
    id: "handoff.schedule",
    cron: "0 * * * *",
    steps: [step] as const,
  });
  const asyncPlugin = defineAsyncSchedulePlugin.factory()({
    capability: "handoff-jobs",
    services: {},
    resourceRequirements: [] as const,
    schedules: [schedule] as const,
  })();
  const loader = async () => {
    counters.loaderCalls += 1;
    return { page: "handoff" } as const;
  };
  const webPlugin = defineWebAppPlugin.factory()({
    capability: "handoff-web",
    routes: [{ id: "handoff.index", path: "/handoff", module: loader }] as const,
  })();
  const app = defineApp({
    id: "handoff.app",
    plugins: [asyncPlugin, webPlugin] as const,
  });
  const profile = defineRuntimeProfile({
    id: "handoff.profile",
    providers: [] as const,
  });
  const process = defineProcessCatalog({
    application: {
      id: "handoff.process",
      roles: ["async", "web"] as const,
    },
  }).application;
  const identity = runtimeLaunchIdentity({
    app: app.id,
    process: process.id,
    entrypoint: "handoff.entrypoint",
    deployment: "test",
    source: "derivation-handoff",
  });
  const entrypoint = defineEntrypoint({
    id: "handoff.entrypoint",
    app,
    profile,
    process,
    identity,
  });
  const { graph } = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });

  return Object.freeze({ counters, entrypoint, graph });
}

function corruptAppId(graph: NormalizedAuthoringGraph): NormalizedAuthoringGraph {
  return Object.freeze({
    ...graph,
    app: Object.freeze({ ...graph.app, appId: "corrupt.app" }),
  });
}

function corruptProfileId(graph: NormalizedAuthoringGraph): NormalizedAuthoringGraph {
  return Object.freeze({
    ...graph,
    profile: Object.freeze({ ...graph.profile, profileId: "corrupt.profile" }),
  });
}

function corruptTopologyProfileId(graph: NormalizedAuthoringGraph): NormalizedAuthoringGraph {
  return Object.freeze({
    ...graph,
    topology: Object.freeze({ ...graph.topology, profileId: "corrupt.profile" }),
  });
}

type TopologyIdentityField = keyof NormalizedAuthoringGraph["topology"]["identity"];

function corruptTopologyIdentity(
  graph: NormalizedAuthoringGraph,
  field: TopologyIdentityField
): NormalizedAuthoringGraph {
  return Object.freeze({
    ...graph,
    topology: Object.freeze({
      ...graph.topology,
      identity: Object.freeze({
        ...graph.topology.identity,
        [field]: `corrupt.${field}`,
      }),
    }),
  });
}

interface HandoffCorruption {
  readonly agreement: string;
  readonly apply: (graph: NormalizedAuthoringGraph) => NormalizedAuthoringGraph;
}

const handoffCorruptions = [
  { agreement: "graph.app.appId", apply: corruptAppId },
  { agreement: "graph.profile.profileId", apply: corruptProfileId },
  { agreement: "graph.topology.profileId", apply: corruptTopologyProfileId },
  {
    agreement: "graph.topology.identity.app",
    apply: (graph) => corruptTopologyIdentity(graph, "app"),
  },
  {
    agreement: "graph.topology.identity.process",
    apply: (graph) => corruptTopologyIdentity(graph, "process"),
  },
  {
    agreement: "graph.topology.identity.entrypoint",
    apply: (graph) => corruptTopologyIdentity(graph, "entrypoint"),
  },
  {
    agreement: "graph.topology.identity.deployment",
    apply: (graph) => corruptTopologyIdentity(graph, "deployment"),
  },
  {
    agreement: "graph.topology.identity.source",
    apply: (graph) => corruptTopologyIdentity(graph, "source"),
  },
] satisfies readonly HandoffCorruption[];

test("compiles a real derivation graph after producer-local authoring bindings leave scope", () => {
  const { counters, entrypoint, graph } = produceDerivationHandoff();

  const result = compileRuntimePlan({ entrypoint, graph });

  expect(graph.executionDescriptorRefs).toHaveLength(1);
  expect(graph.webRouteModuleRefs).toHaveLength(1);
  expect(result.plan.kind).toBe("compiled.process-plan");
  expect(counters).toEqual({ effectBodyCalls: 0, loaderCalls: 0 });
});

for (const corruption of handoffCorruptions) {
  test(`refuses corrupt ${corruption.agreement} before producing a compiler result`, () => {
    const { counters, entrypoint, graph: derivedGraph } = produceDerivationHandoff();
    const graph = corruption.apply(derivedGraph);
    let result: RuntimeCompilationResult | undefined;

    expect(() => {
      result = compileRuntimePlan({ entrypoint, graph });
    }).toThrow(TypeError);

    expect(result).toBeUndefined();
    expect(counters).toEqual({ effectBodyCalls: 0, loaderCalls: 0 });
  });
}
