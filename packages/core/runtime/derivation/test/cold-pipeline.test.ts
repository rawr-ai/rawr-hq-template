import { describe, expect, spyOn, test } from "bun:test";
import { createEffectClient, type WithEffectContext } from "@orpc/experimental-effect";
import { createRouterClient, implement } from "@orpc/server";
import { Context, Effect as NativeEffect } from "effect";
import { Type } from "typebox";

import {
  type AppRole,
  defineApp,
  defineAsyncStepEffect,
  defineAsyncWorkflowPlugin,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineServerInternalPlugin,
  defineService,
  defineWebAppPlugin,
  defineWorkflow,
  Effect,
  type PluginDefinition,
  type ProviderSelection,
  providerFx,
  providerSelection,
  type ResourceRequirement,
  type RuntimeConfigSource,
  requireResource,
  resourceDep,
  type ServiceClientAssembly,
  type ServiceDependencyDeclaration,
  type ServiceRuntimeExport,
  type ServiceUses,
  sealService,
  serviceDep,
  useService,
} from "../../definition/src/index";
import { RuntimeSchema, standard } from "../../schema/src/index";
import { canonicalJson } from "../src/identity-policy";
import {
  deriveRuntimeArtifacts,
  type RuntimeDerivationInput,
  type RuntimeDerivationResult,
  readRuntimeDerivationHandoff,
} from "../src/index";
import { coldService } from "./support/cold-service";

// Standalone native proof assembly, not a derivation-owned process binder.
const clients: ServiceClientAssembly = {
  bind: ({ context, createNativeClient }) =>
    createEffectClient(
      createNativeClient({
        context: () => ({ ...context(), "effect/context": Context.empty() }),
      })
    ),
};

const LaneSchema = RuntimeSchema.fromTypeBox(Type.Object({ value: Type.String() }));
const configRef = (key: string) => ({ kind: "runtime.config" as const, key });

function selectedInput(input: {
  readonly plugins: readonly PluginDefinition[];
  readonly roles?: readonly AppRole[];
  readonly providers?: readonly ProviderSelection[];
  readonly configSources?: readonly RuntimeConfigSource[];
  readonly profileHarnesses?: readonly string[];
  readonly processHarness?: string;
}): RuntimeDerivationInput {
  const app = defineApp({ id: "cold.app", plugins: input.plugins });
  const profile = defineRuntimeProfile({
    id: "cold.profile",
    providers: input.providers ?? [],
    configSources: input.configSources ?? [],
    harnesses: input.profileHarnesses ?? ["web", "async"],
  });
  const process = defineProcessCatalog({
    selected: {
      id: "cold.process",
      roles: input.roles ?? ["server"],
      ...(input.processHarness === undefined ? {} : { harness: input.processHarness }),
    },
  }).selected;
  return {
    profileId: profile.id,
    entrypoint: defineEntrypoint({
      id: "cold.entrypoint",
      app,
      profile,
      process,
      identity: {
        app: app.id,
        process: process.id,
        entrypoint: "cold.entrypoint",
        deployment: "test",
        source: "cold-pipeline-test",
      },
    }),
  };
}

function server(services: ServiceUses, resourceRequirements: readonly ResourceRequirement[] = []) {
  return defineServerInternalPlugin.factory()({
    capability: "cold",
    routeBase: "/cold",
    services,
    resourceRequirements,
    internal: () => {
      throw new Error("Cold derivation must not realize a router.");
    },
  })();
}

function bindingOf(result: RuntimeDerivationResult, serviceId: string) {
  const plan = result.graph.serviceBindingPlans.find(
    (candidate) => candidate.serviceId === serviceId
  );
  if (plan === undefined) throw new Error(`Missing service binding: ${serviceId}`);
  return plan;
}

describe("selected cold executable handoff", () => {
  test.each([
    { profileHarnesses: [], processHarness: "process-only", expected: ["process-only"] },
    {
      profileHarnesses: ["web", "async"],
      processHarness: "server",
      expected: ["async", "server", "web"],
    },
    { profileHarnesses: ["web", "async"], processHarness: "async", expected: ["async", "web"] },
  ])("preserves the selected process/profile harness union: $processHarness", (selection) => {
    const result = deriveRuntimeArtifacts(selectedInput({ plugins: [server({})], ...selection }));
    const handoff = readRuntimeDerivationHandoff(result);
    expect(handoff.harnessIds).toEqual(selection.expected);
    expect(Object.isFrozen(handoff.harnessIds)).toBe(true);
    expect(result.graph.profile.harnesses).toEqual([...selection.profileHarnesses].sort());
  });

  test("retains exact nonempty native service, provider, policy and loader references", async () => {
    const calls = { constructor: 0, procedure: 0, provider: 0, effect: 0, loader: 0 };
    const fixture = (() => {
      const resource = defineRuntimeResource<"native.resource", string>({
        id: "native.resource",
        title: "Native",
        purpose: "Cold reference proof",
      });
      const definition = defineService({
        id: "native.service",
        deps: { value: resourceDep(resource) },
      });
      const contract = definition.oc.router({
        echo: definition.oc.input(standard(Type.String())).output(standard(Type.String())),
      });
      const native = implement(contract).$context<WithEffectContext<never>>();
      const service = sealService(definition, {
        contract,
        construct: ({ clients, deps }) => {
          calls.constructor += 1;
          const router = native.router({
            echo: native.echo.handler(({ input }) => {
              calls.procedure += 1;
              return `${deps.value}:${input}`;
            }),
          });
          return {
            kind: "service.client.construction-bound",
            serviceId: definition.id,
            withInvocation: () =>
              clients.bind({
                context: () => ({}),
                createNativeClient: (options) => createRouterClient(router, options),
              }),
          };
        },
      });
      const provider = defineRuntimeProvider({
        id: "native.provider",
        title: "Native",
        provides: resource,
        requires: [],
        build: () => {
          calls.provider += 1;
          return providerFx.acquireRelease({
            acquire: providerFx.succeed("provided"),
            release: () => providerFx.succeed(undefined),
          });
        },
      });
      const step = defineAsyncStepEffect({
        id: "native.step",
        policy: { interruptible: true },
        effect: () => {
          calls.effect += 1;
          return Effect.succeed(undefined);
        },
      });
      const async = defineAsyncWorkflowPlugin.factory()({
        capability: "cold",
        services: {},
        workflows: [
          defineWorkflow({
            id: "native.workflow",
            eventName: "native/workflow",
            inputSchema: LaneSchema,
            steps: [step],
            run: () => undefined,
          }),
        ],
      })();
      const loader = async () => {
        calls.loader += 1;
        return { page: "native" };
      };
      const web = defineWebAppPlugin.factory()({
        capability: "cold",
        routes: [{ id: "native.route", path: "/cold", module: loader }],
      })();
      const result = deriveRuntimeArtifacts(
        selectedInput({
          plugins: [
            web,
            server({ primary: useService(service), alias: useService(service) }),
            async,
          ],
          roles: ["web", "async", "server"],
          providers: [providerSelection({ resource, provider })],
        })
      );
      return { result, service, provider, step, loader };
    })();
    const { result } = fixture;
    const handoff = readRuntimeDerivationHandoff(result);
    expect(calls).toEqual({ constructor: 0, procedure: 0, provider: 0, effect: 0, loader: 0 });
    expect(Object.keys(result).sort()).toEqual([
      "cliCommandSources",
      "executionDescriptorTable",
      "graph",
      "portableArtifact",
      "topology",
      "webRouteModuleTable",
    ]);
    expect(handoff.graph).toBe(result.graph);
    expect(handoff.identity).toBe(result.topology.identity);
    expect(handoff.roles).toBe(result.topology.roleRequirements);
    expect(handoff.harnessIds).toEqual(["async", "web"]);
    expect(handoff.services).toEqual([
      [bindingOf(result, "native.service").bindingId, fixture.service],
    ]);
    expect(handoff.services[0]?.[1]).toBe(fixture.service);
    expect(handoff.providers[0]?.[1]).toBe(fixture.provider);
    expect(handoff.executionPolicies[0]?.[1]).toBe(fixture.step.policy);
    expect(result.executionDescriptorTable.entries()[0]?.[1].policy).toBe(fixture.step.policy);
    expect(result.webRouteModuleTable.entries()[0]?.load).toBe(fixture.loader);
    expect(handoff.resourceBindings).toEqual([
      [
        result.graph.resourceRequirements[0]!.requirementId,
        result.graph.profile.providerSelections[0]!.selectionId,
      ],
    ]);
    expect(Object.isFrozen(handoff)).toBe(true);
    for (const tuples of [
      handoff.providers,
      handoff.services,
      handoff.resourceBindings,
      handoff.executionPolicies,
    ]) {
      expect(Object.isFrozen(tuples)).toBe(true);
      for (const tuple of tuples) expect(Object.isFrozen(tuple)).toBe(true);
    }
    const symbol = Object.getOwnPropertySymbols(result)[0]!;
    expect(Object.getOwnPropertyDescriptor(result, symbol)).toMatchObject({
      enumerable: false,
      writable: false,
      configurable: false,
    });
    // The producer scope is gone; the exact retained export is still natively callable.
    const client = fixture.service.construct({ clients, deps: { value: "retained" } });
    const operation = client.withInvocation({}).echo("hello");
    expect(NativeEffect.isEffect(operation)).toBe(true);
    expect(calls.procedure).toBe(0);
    expect(await NativeEffect.runPromise(operation)).toBe("retained:hello");
    expect(calls).toEqual({ constructor: 1, procedure: 1, provider: 0, effect: 0, loader: 0 });
  });

  test("refuses a graph-only shell and mismatched graph or topology witnesses", () => {
    const result = deriveRuntimeArtifacts(selectedInput({ plugins: [server({})] }));
    const shell = {
      topology: result.topology,
      graph: result.graph,
      executionDescriptorTable: result.executionDescriptorTable,
      webRouteModuleTable: result.webRouteModuleTable,
      portableArtifact: result.portableArtifact,
    };
    // @ts-expect-error Inspectable fields do not constitute a nominal executable handoff.
    expect(() => readRuntimeDerivationHandoff(shell)).toThrow(TypeError);
    expect(() => readRuntimeDerivationHandoff({ ...result })).toThrow(TypeError);
    const witness = Object.getOwnPropertySymbols(result)[0]!;
    const descriptor = Object.getOwnPropertyDescriptor(result, witness)!;
    const graphMismatch = Object.defineProperty(
      { ...result, graph: { ...result.graph } },
      witness,
      descriptor
    );
    const topologyMismatch = Object.defineProperty(
      { ...result, topology: { ...result.topology } },
      witness,
      descriptor
    );
    expect(() => readRuntimeDerivationHandoff(graphMismatch)).toThrow(TypeError);
    expect(() => readRuntimeDerivationHandoff(topologyMismatch)).toThrow(TypeError);
  });

  test("excludes sibling-role roots before service lanes and required coverage", () => {
    const resource = defineRuntimeResource({
      id: "async.resource",
      title: "Async",
      purpose: "Sibling",
    });
    const sibling = coldService(
      defineService({
        id: "async.service",
        deps: { value: resourceDep(resource) },
        config: LaneSchema,
      })
    );
    const async = defineAsyncWorkflowPlugin.factory()({
      capability: "sibling",
      services: { value: useService(sibling) },
      workflows: [],
    })();
    const plugins = [server({}), async];
    const result = deriveRuntimeArtifacts(selectedInput({ plugins }));
    expect(result.topology.pluginIdentities).toEqual([{ pluginId: "server.internal.cold" }]);
    expect(result.graph.plugins).toHaveLength(1);
    expect(result.graph.serviceBindingPlans).toEqual([]);
    expect(result.graph.resourceRequirements).toEqual([]);
    expect(() => deriveRuntimeArtifacts(selectedInput({ plugins, roles: ["async"] }))).toThrow(
      TypeError
    );
    const boundAsync = defineAsyncWorkflowPlugin.factory()({
      capability: "sibling",
      services: { value: useService(sibling, { binding: { config: configRef("ASYNC") } }) },
      workflows: [],
    })();
    expect(() =>
      deriveRuntimeArtifacts(selectedInput({ plugins: [boundAsync], roles: ["async"] }))
    ).toThrow("A required resource has no provider.");
  });

  test("keeps unused provider supersets inert and selects only reached transitive coverage", () => {
    const resource = (id: string) => defineRuntimeResource({ id, title: id, purpose: id });
    const root = resource("root");
    const dependency = resource("dependency");
    const unused = resource("unused");
    const missing = resource("missing");
    const optional = resource("optional");
    const build = () => {
      throw new Error("Provider build must remain cold.");
    };
    const dependencyProvider = defineRuntimeProvider({
      id: "dependency.provider",
      title: "Dependency",
      provides: dependency,
      requires: [],
      build,
    });
    const rootProvider = defineRuntimeProvider({
      id: "root.provider",
      title: "Root",
      provides: root,
      requires: [requireResource({ resource: dependency, reason: "Dependency" })],
      build,
    });
    const unusedProvider = defineRuntimeProvider({
      id: "unused.provider",
      title: "Unused",
      provides: unused,
      requires: [requireResource({ resource: missing, reason: "Missing" })],
      configSchema: LaneSchema,
      build,
    });
    const providers = [
      providerSelection({ resource: unused, provider: unusedProvider }),
      providerSelection({ resource: dependency, provider: dependencyProvider }),
      providerSelection({ resource: root, provider: rootProvider }),
    ];
    const result = deriveRuntimeArtifacts(
      selectedInput({
        plugins: [
          server({}, [
            requireResource({ resource: root, reason: "Root" }),
            requireResource({ resource: optional, reason: "Optional", optional: true }),
          ]),
        ],
        providers,
        configSources: [{ kind: "file", path: "config/required.json" }, { kind: "dotenv" }],
      })
    );
    expect(
      result.graph.profile.providerSelections.map((selection) => selection.providerId).sort()
    ).toEqual(["dependency.provider", "root.provider"]);
    expect(
      result.graph.resourceRequirements.map((requirement) => requirement.resource.resourceId).sort()
    ).toEqual(["dependency", "optional", "root"]);
    expect(result.graph.findings).toHaveLength(1);
    expect(readRuntimeDerivationHandoff(result).resourceBindings).toHaveLength(2);
    expect(
      readRuntimeDerivationHandoff(result).providers.some(
        ([, provider]) => provider === unusedProvider
      )
    ).toBe(false);
    expect(result.graph.profile.configSources).toEqual([
      { kind: "file", path: "config/required.json", optional: false },
      { kind: "dotenv", path: ".env", optional: false },
    ]);
    const reachedUnused = selectedInput({
      plugins: [server({}, [requireResource({ resource: unused, reason: "Now selected" })])],
      providers,
    });
    expect(() => deriveRuntimeArtifacts(reachedUnused)).toThrow(
      "A schema-backed provider selection requires a config key."
    );
  });
});

describe("named service recipes and convergence", () => {
  test("retains named child instances and aliases and hashes assignment swaps", () => {
    const store = coldService(defineService({ id: "store", deps: {}, config: LaneSchema }));
    const comparison = coldService(
      defineService({
        id: "comparison",
        deps: { right: serviceDep(store), left: serviceDep(store) },
      })
    );
    const derive = (swap: boolean) =>
      deriveRuntimeArtifacts(
        selectedInput({
          plugins: [
            server({
              second: useService(comparison, {
                binding: {
                  dependencies: {
                    left: {
                      instance: swap ? "right" : "left",
                      config: configRef(swap ? "RIGHT" : "LEFT"),
                    },
                    right: {
                      instance: swap ? "left" : "right",
                      config: configRef(swap ? "LEFT" : "RIGHT"),
                    },
                  },
                },
              }),
              first: useService(comparison, {
                binding: {
                  dependencies: {
                    right: {
                      instance: swap ? "left" : "right",
                      config: configRef(swap ? "LEFT" : "RIGHT"),
                    },
                    left: {
                      instance: swap ? "right" : "left",
                      config: configRef(swap ? "RIGHT" : "LEFT"),
                    },
                  },
                },
              }),
            }),
          ],
        })
      );
    const result = derive(false);
    const parent = bindingOf(result, "comparison");
    const children = result.graph.serviceBindingPlans.filter((plan) => plan.serviceId === "store");
    expect(children).toHaveLength(2);
    expect(
      parent.serviceDependencies.map(({ localName, bindingId }) => ({
        localName,
        instance: children.find((child) => child.bindingId === bindingId)?.serviceInstance,
      }))
    ).toEqual([
      { localName: "left", instance: "left" },
      { localName: "right", instance: "right" },
    ]);
    expect(result.graph.surfaceRuntimePlans[0]?.serviceBindings).toEqual([
      { localName: "first", bindingId: parent.bindingId },
      { localName: "second", bindingId: parent.bindingId },
    ]);
    expect(bindingOf(derive(true), "comparison").bindingId).not.toBe(parent.bindingId);
    const shared = deriveRuntimeArtifacts(
      selectedInput({
        plugins: [
          server({
            root: useService(comparison, {
              binding: {
                dependencies: {
                  left: { instance: "shared", config: configRef("SHARED") },
                  right: { instance: "shared", config: configRef("SHARED") },
                },
              },
            }),
          }),
        ],
      })
    );
    const sharedAssignments = bindingOf(shared, "comparison").serviceDependencies;
    expect(sharedAssignments).toHaveLength(2);
    expect(sharedAssignments[0]?.bindingId).toBe(sharedAssignments[1]?.bindingId);
    expect(shared.graph.serviceBindingPlans).toHaveLength(2);
    expect(() =>
      deriveRuntimeArtifacts(
        selectedInput({
          plugins: [
            server({
              root: useService(comparison, {
                binding: {
                  dependencies: {
                    left: { instance: "shared", config: configRef("LEFT") },
                    right: { instance: "shared", config: configRef("RIGHT") },
                  },
                },
              }),
            }),
          ],
        })
      )
    ).toThrow("A service binding diamond diverged.");
  });

  test("explicit instances remain distinct with equal refs and never inherit to children", () => {
    const leaf = coldService(defineService({ id: "instance.leaf", deps: {} }));
    const parent = coldService(
      defineService({ id: "instance.parent", deps: { leaf: serviceDep(leaf) } })
    );
    const result = deriveRuntimeArtifacts(
      selectedInput({
        plugins: [
          server({
            lower: useService(parent, { instance: "a" }),
            upper: useService(parent, { instance: "A" }),
            default: useService(parent),
          }),
        ],
      })
    );
    expect(
      result.graph.serviceBindingPlans.filter((plan) => plan.serviceId === "instance.parent")
    ).toHaveLength(3);
    expect(
      result.graph.serviceBindingPlans.filter((plan) => plan.serviceId === "instance.leaf")
    ).toHaveLength(1);
    expect(bindingOf(result, "instance.leaf").serviceInstance).toBeUndefined();
    expect(() => useService(parent, { instance: "" })).toThrow(TypeError);
    expect(() =>
      useService(parent, { binding: { dependencies: { leaf: { instance: "" } } } })
    ).toThrow(TypeError);
  });

  test("bounds equal layered-DAG work by distinct declarations rather than paths", () => {
    const definitions = new WeakSet<object>();
    let service: ServiceRuntimeExport = coldService(defineService({ id: "dag.0", deps: {} }));
    definitions.add(service.definition.deps);
    const depth = 14;
    for (let index = 1; index <= depth; index += 1) {
      const deps: Record<string, ServiceDependencyDeclaration> = {
        left: serviceDep(service),
        right: serviceDep(service),
      };
      service = coldService(defineService({ id: `dag.${index}`, deps }));
      definitions.add(service.definition.deps);
    }
    const input = selectedInput({ plugins: [server({ root: useService(service) })] });
    const originalKeys = Object.keys;
    let dependencyEnumerations = 0;
    const keys = spyOn(Object, "keys").mockImplementation((object) => {
      if (definitions.has(object)) dependencyEnumerations += 1;
      return originalKeys(object);
    });
    let result: RuntimeDerivationResult;
    try {
      result = deriveRuntimeArtifacts(input);
    } finally {
      keys.mockRestore();
    }
    expect(result.graph.serviceBindingPlans).toHaveLength(depth + 1);
    expect(result.graph.serviceDependencies).toHaveLength(depth * 2);
    expect(dependencyEnumerations).toBeGreaterThanOrEqual(depth + 1);
    expect(dependencyEnumerations).toBeLessThanOrEqual((depth + 1) * 3);
  });

  test("memoization cannot hide divergent inherited refs or a nested leaf override", () => {
    const leaf = coldService(defineService({ id: "memo.leaf", deps: {}, config: LaneSchema }));
    const branch = coldService(
      defineService({ id: "memo.branch", deps: { leaf: serviceDep(leaf) }, config: LaneSchema })
    );
    const root = coldService(
      defineService({
        id: "memo.root",
        deps: { left: serviceDep(branch), right: serviceDep(branch) },
        config: LaneSchema,
      })
    );
    const reused = useService(root, { binding: { config: configRef("ROOT") } });
    const inherited = useService(root, { binding: { config: configRef("OTHER") } });
    const nested = useService(root, {
      binding: {
        config: configRef("ROOT"),
        dependencies: {
          right: { dependencies: { leaf: { config: configRef("LEAF") } } },
        },
      },
    });
    for (const divergent of [inherited, nested]) {
      expect(() =>
        deriveRuntimeArtifacts(
          selectedInput({ plugins: [server({ first: reused, second: divergent })] })
        )
      ).toThrow("A service binding diamond diverged.");
    }
  });

  test("refuses conflicting exact leaf exports even when their ids and plans would match", () => {
    const leaf = coldService(defineService({ id: "conflict.leaf", deps: {} }));
    const duplicate = coldService(leaf.definition);
    const left = coldService(
      defineService({ id: "conflict.left", deps: { leaf: serviceDep(leaf) } })
    );
    const right = coldService(
      defineService({ id: "conflict.right", deps: { leaf: serviceDep(duplicate) } })
    );
    const root = coldService(
      defineService({
        id: "conflict.root",
        deps: { left: serviceDep(left), right: serviceDep(right) },
      })
    );
    expect(() =>
      deriveRuntimeArtifacts(selectedInput({ plugins: [server({ root: useService(root) })] }))
    ).toThrow(TypeError);
  });

  test("rejects lone surrogate values and keys while retaining valid astral identity", () => {
    const astral = "\ud83d\ude80";
    expect(canonicalJson({ [astral]: astral })).toBe(JSON.stringify({ [astral]: astral }));
    for (const malformed of ["\ud800", "prefix\ud800", "\udc00", "\ud800x"]) {
      expect(() => canonicalJson(malformed)).toThrow(TypeError);
      expect(() => canonicalJson({ [malformed]: "value" })).toThrow(TypeError);
      const service = coldService(defineService({ id: malformed, deps: {} }));
      expect(() =>
        deriveRuntimeArtifacts(selectedInput({ plugins: [server({ root: useService(service) })] }))
      ).toThrow(TypeError);
    }
    const service = coldService(defineService({ id: astral, deps: {} }));
    expect(
      bindingOf(
        deriveRuntimeArtifacts(selectedInput({ plugins: [server({ root: useService(service) })] })),
        astral
      ).serviceId
    ).toBe(astral);
  });
});
