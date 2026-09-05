import { type as schemaType } from "@orpc/contract";
import type { WithEffectContext } from "@orpc/experimental-effect";
import { createRouterClient, implement } from "@orpc/server";
import {
  defineApp,
  defineAsyncStepEffect,
  defineAsyncWorkflowPlugin,
  defineEntrypoint,
  definePlugin,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineService,
  defineWebAppPlugin,
  defineWorkflow,
  Effect,
  providerFx,
  providerSelection,
  requireResource,
  resourceDep,
  runtimeLaunchIdentity,
  sealService,
  semanticDep,
  serviceDep,
  useService,
} from "../../../definition/src/index";
import {
  deriveRuntimeArtifacts,
  type RuntimeDerivationHandoff,
  type RuntimeDerivationResult,
  readRuntimeDerivationHandoff,
} from "../../../derivation/src/index";

export const zeroCalls = {
  construct: 0,
  operation: 0,
  build: 0,
  acquire: 0,
  release: 0,
  decode: 0,
  effect: 0,
  loader: 0,
  project: 0,
};

/** Producer locals deliberately do not escape; the derived carrier is the executable handoff. */
export function produceHandoff(
  options: {
    apiOnly?: boolean;
    swap?: boolean;
    reverse?: boolean;
    optionalSelected?: boolean;
    zeroConfig?: boolean;
    cyclicPolicy?: boolean;
    profileHarnesses?: readonly string[];
    processHarness?: string;
    directOptional?: boolean;
  } = {}
) {
  const counters = { ...zeroCalls };
  const countedSchema = {
    kind: "runtime.schema" as const,
    serializable: { type: "string" },
    decode: (_input: unknown): never => {
      counters.decode++;
      throw new Error("Unexpected decode");
    },
    validate: (_input: unknown): never => {
      counters.decode++;
      throw new Error("Unexpected validate");
    },
    toRedactedShape: (): never => {
      counters.decode++;
      throw new Error("Unexpected projection");
    },
  };
  const resource = (id: string) => defineRuntimeResource({ id, title: id, purpose: id });
  const leaf = resource("leaf");
  const middle = resource("middle");
  const root = resource("root");
  const missing = resource("optional");
  const sibling = resource("sibling");
  const unused = resource("unused-config");
  const build = () => {
    counters.build++;
    return providerFx.acquireRelease({
      acquire: providerFx.tryPromise({
        try: (): unknown => {
          counters.acquire++;
          return {};
        },
        catch: (cause) => cause,
      }),
      release: () => {
        counters.release++;
        return providerFx.succeed(undefined);
      },
    });
  };
  const leafProvider = defineRuntimeProvider({
    id: "leaf.provider",
    title: "Leaf",
    provides: leaf,
    requires: [],
    build,
  });
  const middleProvider = defineRuntimeProvider({
    id: "middle.provider",
    title: "Middle",
    provides: middle,
    requires: [requireResource({ resource: leaf, reason: "middle-leaf" })],
    build,
  });
  const rootProvider = defineRuntimeProvider({
    id: "root.provider",
    title: "Root",
    provides: root,
    requires: [
      requireResource({ resource: middle, reason: "root-middle" }),
      requireResource({ resource: leaf, reason: "root-leaf", optional: true }),
      requireResource({ resource: missing, reason: "optional", optional: true }),
    ],
    build,
  });
  const optionalProvider = defineRuntimeProvider({
    id: "optional.provider",
    title: "Optional",
    provides: missing,
    requires: [],
    build,
  });
  const siblingProvider = defineRuntimeProvider({
    id: "sibling.provider",
    title: "Sibling",
    provides: sibling,
    requires: [],
    configSchema: countedSchema,
    defaultConfigKey: "sibling.config",
    build,
  });
  const unusedProvider = defineRuntimeProvider({
    id: "unused.provider",
    title: "Unused",
    provides: unused,
    requires: [],
    configSchema: countedSchema,
    build,
  });

  const childDefinition = defineService({
    id: "child",
    deps: { resource: resourceDep(root) },
    ...(options.zeroConfig ? {} : { config: countedSchema }),
  });
  const contract = childDefinition.oc.router({
    read: childDefinition.oc.input(schemaType<string>()).output(schemaType<string>()),
  });
  const native = implement(contract).$context<{ label: string } & WithEffectContext<never>>();
  const nativeRouter = native.router({
    read: native.read.handler(({ input, context }) => {
      counters.operation++;
      return `${context.label}:${input}`;
    }),
  });
  const child = sealService(childDefinition, {
    contract,
    construct: ({ clients, config }) => {
      counters.construct++;
      return {
        kind: "service.client.construction-bound",
        serviceId: "child",
        withInvocation: () =>
          clients.bind({
            context: () => ({ label: String(config) }),
            createNativeClient: (options) => createRouterClient(nativeRouter, options),
          }),
      };
    },
  });
  const parentDefinition = defineService({
    id: "parent",
    deps: { left: serviceDep(child), right: serviceDep(child), audit: semanticDep("audit.native") },
  });
  const parent = sealService(parentDefinition, {
    contract,
    construct: ({ deps }) => {
      counters.construct++;
      return {
        kind: "service.client.construction-bound",
        serviceId: "parent",
        withInvocation: () => deps.left.withInvocation({}),
      };
    },
  });
  const childBinding = (instance: string) => ({
    instance,
    ...(options.zeroConfig
      ? {}
      : { config: { kind: "runtime.config" as const, key: `child.${instance}` } }),
  });
  const binding = {
    dependencies: {
      left: childBinding(options.swap ? "beta" : "alpha"),
      right: childBinding(options.swap ? "alpha" : "beta"),
    },
  };
  const api = definePlugin({
    id: "api",
    role: "server",
    surface: "api.public",
    capability: "items",
    services: { alias: useService(parent, { binding }), primary: useService(parent, { binding }) },
    resourceRequirements: options.directOptional
      ? [requireResource({ resource: missing, optional: true, reason: "direct optional" })]
      : [],
    project: () => {
      counters.project++;
      return { kind: "plugin.projection", facts: {} };
    },
  });
  const retry = { times: 2, backoff: "fixed" as const };
  if (options.cyclicPolicy) {
    const delay: { self?: unknown } = {};
    delay.self = delay;
    Reflect.set(retry, "delay", delay);
  }
  const step = defineAsyncStepEffect({
    id: "step",
    policy: { interruptible: true, retry },
    effect: () => {
      counters.effect++;
      return Effect.succeed("done");
    },
  });
  const workflow = defineWorkflow({
    id: "workflow",
    eventName: "fixture/workflow",
    inputSchema: countedSchema,
    steps: [step],
    run: () => undefined,
  });
  const jobs = defineAsyncWorkflowPlugin.factory()({
    capability: "jobs",
    services: {},
    resourceRequirements: [requireResource({ resource: sibling, reason: "sibling-only" })],
    workflows: [workflow],
  })();
  const web = defineWebAppPlugin.factory()({
    capability: "web",
    routes: [
      {
        id: "home",
        path: "/",
        module: async () => {
          counters.loader++;
          return {};
        },
      },
    ],
  })();
  const plugins = options.reverse ? [web, jobs, api] : [api, jobs, web];
  const app = defineApp({ id: "handoff.app", plugins });
  const providers = [
    providerSelection({ resource: root, provider: rootProvider }),
    providerSelection({ resource: leaf, provider: leafProvider }),
    providerSelection({ resource: middle, provider: middleProvider }),
    providerSelection({ resource: sibling, provider: siblingProvider }),
    providerSelection({ resource: unused, provider: unusedProvider }),
    ...(options.optionalSelected
      ? [providerSelection({ resource: missing, provider: optionalProvider })]
      : []),
  ];
  const profile = defineRuntimeProfile({
    id: "profile",
    providers: options.reverse ? [...providers].reverse() : providers,
    configSources: [
      { kind: "file", path: "required.json", optional: false },
      { kind: "env", prefix: "APP_" },
      { kind: "test" },
    ],
    harnesses: options.profileHarnesses ?? ["shared", "base"],
  });
  const roles = options.apiOnly
    ? ["server" as const]
    : options.reverse
      ? ["web" as const, "async" as const, "server" as const]
      : ["server" as const, "async" as const, "web" as const];
  const process = defineProcessCatalog({
    main: { id: "process", roles, harness: options.processHarness ?? "shared" },
  }).main;
  const entrypoint = defineEntrypoint({
    id: "entry",
    app,
    profile,
    process,
    identity: runtimeLaunchIdentity({
      app: app.id,
      process: process.id,
      entrypoint: "entry",
      deployment: "test",
      source: "fixture",
    }),
  });
  const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  return { derivation, counters };
}

/** Deliberately malformed trusted producer output reaches compiler relation checks. */
export function alterHandoff(
  derivation: RuntimeDerivationResult,
  change: (handoff: RuntimeDerivationHandoff) => RuntimeDerivationHandoff
): RuntimeDerivationResult {
  const handoff = change(readRuntimeDerivationHandoff(derivation));
  const original = readRuntimeDerivationHandoff(derivation);
  const symbol = Object.getOwnPropertySymbols(derivation).find(
    (key) => Reflect.get(derivation, key) === original
  );
  if (symbol === undefined) throw new Error("Fixture requires a genuine carrier");
  const copy = Object.create(
    Object.getPrototypeOf(derivation),
    Object.getOwnPropertyDescriptors({
      ...derivation,
      graph: handoff.graph,
      topology: handoff.graph.topology,
    })
  );
  Object.defineProperty(copy, symbol, { value: handoff, enumerable: false });
  return copy;
}
