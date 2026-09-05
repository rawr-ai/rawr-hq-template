import { describe, expect, test } from "bun:test";
import type { RouterContract } from "@orpc/contract";
import { call, implement } from "@orpc/server";
import { Type } from "typebox";
import { Validator } from "typebox/schema";
import { RuntimeSchema, standard } from "../../schema/src";
import type {
  AsyncStepEffectDescriptor,
  AsyncStepExecutionContext,
  EffectExecutionDescriptor,
  Entrypoint,
  HabitatEffect,
  ProviderBuildContext,
  ProviderEffectPlan,
  ProviderSelection,
  RuntimeProvider,
  RuntimeResource,
  RuntimeResourceMap,
  ServiceContractOf,
  ServiceDefinition,
  ServiceUses,
} from "../src";
import {
  defineApp,
  defineAsyncConsumerPlugin,
  defineAsyncSchedulePlugin,
  defineAsyncStepEffect,
  defineAsyncWorkflowPlugin,
  defineConsumer,
  defineEffectExecution,
  defineEntrypoint,
  definePlugin,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineSchedule,
  defineServerApiPlugin,
  defineServerInternalPlugin,
  defineService,
  defineWebAppPlugin,
  defineWorkflow,
  Effect,
  isHabitatEffect,
  providerFx,
  providerSelection,
  RuntimeObservationRecordSchema,
  readServiceUse,
  requireResource,
  resourceDep,
  runtimeLaunchIdentity,
  sealService,
  semanticDep,
  serviceDep,
  TaggedError,
  useService,
} from "../src";

// Topology-only fixtures must never ask for live service construction.
function coldService<D extends ServiceDefinition, C extends RouterContract>(
  definition: D,
  contract: C
) {
  return sealService(definition, {
    contract,
    construct: () => {
      throw new Error("Cold constructor executed");
    },
  });
}

type HabitatEffectChannels<TEffect> =
  TEffect extends HabitatEffect<infer TSuccess, infer TError, infer TRequirements>
    ? readonly [TSuccess, TError, TRequirements]
    : never;

type TypesEqual<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2
    ? (<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2
      ? true
      : false
    : false;

type Assert<T extends true> = T;

type ExecutionDescriptorChannels<TDescriptor> =
  TDescriptor extends EffectExecutionDescriptor<
    infer TInput,
    infer TOutput,
    infer TError,
    infer TContext,
    infer TRequirements
  >
    ? readonly [TInput, TOutput, TError, TContext, TRequirements]
    : never;

type AsyncStepDescriptorChannels<TDescriptor> =
  TDescriptor extends AsyncStepEffectDescriptor<
    infer TOutput,
    infer TError,
    infer TRequirements,
    infer TContext
  >
    ? readonly [TOutput, TError, TRequirements, TContext]
    : never;

type ServiceSchemaChannels<TDefinition> =
  TDefinition extends ServiceDefinition<
    infer _TId,
    infer _TDependencies,
    infer TScope,
    infer TConfig,
    infer TInvocation
  >
    ? readonly [TScope, TConfig, TInvocation]
    : never;

type RuntimeProviderChannels<TProvider> =
  TProvider extends RuntimeProvider<infer TResource, infer TConfig, infer TAcquireError>
    ? readonly [TResource, TConfig, TAcquireError]
    : never;

interface ProviderTypeOracleValue {
  readonly now: () => Date;
}

interface ProviderTypeOracleAcquireError {
  readonly _tag: "ProviderTypeOracleAcquireError";
}

function createProviderDefinitionTypeOracle(
  resources: RuntimeResourceMap,
  widenedOptional: boolean | undefined
) {
  const resource = defineRuntimeResource<"typing.clock", ProviderTypeOracleValue>({
    id: "typing.clock",
    title: "Typing clock",
    purpose: "Exercises provider authoring inference.",
  });
  const exactOptional = requireResource({
    resource,
    optional: true,
    reason: "Optional clock",
    proof: "whole-input" as const,
  });
  const exactRequired = requireResource({
    resource,
    optional: false,
    reason: "Required clock",
  });
  const absentOptionality = requireResource({
    resource,
    reason: "Required clock by absence",
  });
  const widenedRequirement = requireResource({
    resource,
    optional: widenedOptional,
    reason: "Widened optionality",
  });
  const defaultAcquire = providerFx.succeed<ProviderTypeOracleValue>({
    now: () => new Date(0),
  });
  const defaultProvider = defineRuntimeProvider({
    id: "typing.clock.default",
    title: "Default typing clock",
    provides: resource,
    requires: [],
    build: (context) => {
      if (false) {
        // @ts-expect-error Provider build context contains no lifecycle scope.
        context.scope;
        // @ts-expect-error Provider build context contains no telemetry client.
        context.telemetry;
      }
      return providerFx.acquireRelease({
        acquire: defaultAcquire,
        release: () => providerFx.succeed(undefined),
      });
    },
  });
  const typedAcquire = providerFx.tryPromise<
    ProviderTypeOracleValue,
    ProviderTypeOracleAcquireError
  >({
    try: () => ({ now: () => new Date(0) }),
    catch: () => ({ _tag: "ProviderTypeOracleAcquireError" }),
  });
  const typedProvider = defineRuntimeProvider({
    id: "typing.clock.typed",
    title: "Typed typing clock",
    provides: resource,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: typedAcquire,
        release: () => providerFx.succeed(undefined),
      }),
  });

  return {
    absentOptionality,
    absentOptionalityValue: resources.get(absentOptionality),
    defaultProvider,
    exactOptional,
    exactOptionalValue: resources.get(exactOptional),
    exactRequired,
    exactRequiredValue: resources.get(exactRequired),
    hasOptional: resources.has(exactOptional),
    resource,
    typedProvider,
    widenedRequirement,
    widenedValue: resources.get(widenedRequirement),
  };
}

type ProviderDefinitionTypeOracleShape = ReturnType<typeof createProviderDefinitionTypeOracle>;
type DefaultProviderBuildContext = Parameters<
  ProviderDefinitionTypeOracleShape["defaultProvider"]["build"]
>[0];

export type ProviderDefinitionTypeOracle = readonly [
  Assert<
    TypesEqual<
      RuntimeProviderChannels<RuntimeProvider>,
      readonly [RuntimeResource, unknown, unknown]
    >
  >,
  Assert<
    TypesEqual<
      RuntimeProviderChannels<ProviderDefinitionTypeOracleShape["defaultProvider"]>,
      readonly [ProviderDefinitionTypeOracleShape["resource"], undefined, never]
    >
  >,
  Assert<
    TypesEqual<
      RuntimeProviderChannels<ProviderDefinitionTypeOracleShape["typedProvider"]>,
      readonly [
        ProviderDefinitionTypeOracleShape["resource"],
        undefined,
        ProviderTypeOracleAcquireError,
      ]
    >
  >,
  Assert<TypesEqual<DefaultProviderBuildContext, ProviderBuildContext<undefined>>>,
  Assert<TypesEqual<keyof DefaultProviderBuildContext, "config" | "observation" | "resources">>,
  Assert<TypesEqual<Extract<keyof RuntimeResourceMap, string>, "get" | "has">>,
  Assert<TypesEqual<ProviderDefinitionTypeOracleShape["hasOptional"], boolean>>,
  Assert<TypesEqual<ProviderDefinitionTypeOracleShape["exactOptional"]["optional"], true>>,
  Assert<TypesEqual<ProviderDefinitionTypeOracleShape["exactOptional"]["proof"], "whole-input">>,
  Assert<TypesEqual<ProviderDefinitionTypeOracleShape["exactRequired"]["optional"], false>>,
  Assert<
    TypesEqual<
      Extract<"optional", keyof ProviderDefinitionTypeOracleShape["absentOptionality"]>,
      never
    >
  >,
  Assert<
    TypesEqual<
      ProviderDefinitionTypeOracleShape["widenedRequirement"]["optional"],
      boolean | undefined
    >
  >,
  Assert<
    TypesEqual<
      ProviderDefinitionTypeOracleShape["exactOptionalValue"],
      ProviderTypeOracleValue | undefined
    >
  >,
  Assert<
    TypesEqual<ProviderDefinitionTypeOracleShape["exactRequiredValue"], ProviderTypeOracleValue>
  >,
  Assert<
    TypesEqual<ProviderDefinitionTypeOracleShape["absentOptionalityValue"], ProviderTypeOracleValue>
  >,
  Assert<
    TypesEqual<
      ProviderDefinitionTypeOracleShape["widenedValue"],
      ProviderTypeOracleValue | undefined
    >
  >,
  Assert<
    TypesEqual<
      ReturnType<ProviderDefinitionTypeOracleShape["typedProvider"]["build"]>,
      ProviderEffectPlan<ProviderTypeOracleValue, ProviderTypeOracleAcquireError>
    >
  >,
];

declare const providerDefinitionTypeOracle: ProviderDefinitionTypeOracleShape;

if (false) {
  // @ts-expect-error The whole-input requirement result is readonly.
  providerDefinitionTypeOracle.exactOptional.reason = "mutated";
  // @ts-expect-error A runtime provider declaration requires synchronous build.
  defineRuntimeProvider({
    id: "typing.clock.missing-build",
    title: "Missing build",
    provides: providerDefinitionTypeOracle.resource,
    requires: [],
  });
  defineRuntimeProvider({
    id: "typing.clock.async-build",
    title: "Async build",
    provides: providerDefinitionTypeOracle.resource,
    requires: [],
    build: async () =>
      // @ts-expect-error Provider build returns a plan synchronously, never a Promise.
      providerFx.acquireRelease({
        acquire: providerFx.succeed<ProviderTypeOracleValue>({
          now: () => new Date(0),
        }),
        release: () => providerFx.succeed(undefined),
      }),
  });
}

function createWebDefinitionTypeOracle() {
  return defineWebAppPlugin.factory()({
    capability: "work-items-board",
    routes: [
      {
        id: "work-items-board.index",
        path: "/work-items",
        module: async () => ({ mount: "work-items-board" }) as const,
        label: "not-a-route-field",
      },
    ] as const,
  })();
}

type WebDefinitionTypeOracle = ReturnType<typeof createWebDefinitionTypeOracle>;

export type WebProjectionTypeOracle = readonly [
  Assert<TypesEqual<WebDefinitionTypeOracle["id"], "web.app.work-items-board">>,
  Assert<TypesEqual<WebDefinitionTypeOracle["role"], "web">>,
  Assert<TypesEqual<WebDefinitionTypeOracle["surface"], "web/app">>,
  Assert<TypesEqual<WebDefinitionTypeOracle["routes"][0]["id"], "work-items-board.index">>,
  Assert<TypesEqual<WebDefinitionTypeOracle["routes"][0]["path"], "/work-items">>,
  Assert<
    TypesEqual<
      Awaited<ReturnType<WebDefinitionTypeOracle["routes"][0]["module"]>>,
      Readonly<{ mount: "work-items-board" }>
    >
  >,
  Assert<
    TypesEqual<
      Extract<keyof WebDefinitionTypeOracle["routes"][0], string>,
      "id" | "path" | "module"
    >
  >,
  Assert<TypesEqual<WebDefinitionTypeOracle["resourceRequirements"], readonly []>>,
  Assert<TypesEqual<keyof WebDefinitionTypeOracle["services"], never>>,
];

declare const webDefinitionTypeOracle: WebDefinitionTypeOracle;

if (false) {
  // @ts-expect-error The frozen output never exposes mutable array operations.
  webDefinitionTypeOracle.routes.push(undefined as never);
  // @ts-expect-error The frozen route snapshot never exposes mutable fields.
  webDefinitionTypeOracle.routes[0].path = "/changed";
  // @ts-expect-error Surplus author fields are not part of the route snapshot.
  webDefinitionTypeOracle.routes[0].label;
  defineWebAppPlugin.factory()({
    capability: "invalid-role",
    routes: [],
    // @ts-expect-error Projection classification is fixed by the lane builder.
    role: "web",
  });
  defineWebAppPlugin.factory()({
    capability: "invalid-services",
    routes: [],
    // @ts-expect-error Web projection cannot author service bindings.
    services: {},
  });
  defineWebAppPlugin.factory()({
    capability: "invalid-resources",
    routes: [],
    // @ts-expect-error Web projection cannot author runtime resource requirements.
    resourceRequirements: [],
  });
}

function coldEffect<TSuccess, TError, TRequirements>(
  value: TSuccess,
  error: TError
): HabitatEffect<TSuccess, TError, TRequirements> {
  return Effect.tryPromise({
    try: () => value,
    catch: () => error,
  });
}

function createEntrypointMismatchFixture(mismatchedField: "app" | "process" | "entrypoint") {
  let executableCalls = 0;
  const externalSentinel = { projected: false };
  const plugin = definePlugin({
    id: "selection.plugin",
    role: "server",
    surface: "server/internal",
    capability: "selection",
    services: {},
    resourceRequirements: [],
    project: ({ pluginId }) => {
      executableCalls += 1;
      externalSentinel.projected = true;
      return {
        kind: "plugin.projection",
        facts: { pluginId, externalSentinel },
      };
    },
  });
  const app = defineApp({ id: "selection.app", plugins: [plugin] });
  const profile = defineRuntimeProfile({
    id: "selection.profile",
    providers: [],
  });
  const process = defineProcessCatalog({
    server: { id: "selection.process", roles: ["server"] },
  }).server;
  const identity = {
    app: mismatchedField === "app" ? "other.app" : app.id,
    process: mismatchedField === "process" ? "other.process" : process.id,
    entrypoint: mismatchedField === "entrypoint" ? "other.entrypoint" : "selection.entrypoint",
    deployment: "selection.deployment",
    source: "selection.source",
  };
  const identitySnapshot = { ...identity };
  const input = {
    id: "selection.entrypoint",
    app,
    profile,
    process,
    identity,
  };
  const callerReferences = { id: input.id, app, profile, process, identity };
  let output: Entrypoint<typeof app, typeof profile, typeof process> | undefined;

  return {
    input,
    identity,
    identitySnapshot,
    callerReferences,
    externalSentinel,
    executableCalls: () => executableCalls,
    output: () => output,
    produce: () => {
      output = defineEntrypoint(input);
      return output;
    },
  };
}

function expectEntrypointMismatchRefusal(
  fixture: ReturnType<typeof createEntrypointMismatchFixture>
): void {
  expect(fixture.produce).toThrow(TypeError);
  expect(fixture.output()).toBeUndefined();
  expect(Object.isFrozen(fixture.input)).toBe(false);
  expect(Object.isFrozen(fixture.identity)).toBe(false);
  expect(Object.keys(fixture.input)).toEqual(["id", "app", "profile", "process", "identity"]);
  expect(Object.keys(fixture.identity)).toEqual([
    "app",
    "process",
    "entrypoint",
    "deployment",
    "source",
  ]);
  expect(fixture.identity).toEqual(fixture.identitySnapshot);
  expect(fixture.input.id).toBe(fixture.callerReferences.id);
  expect(fixture.input.app).toBe(fixture.callerReferences.app);
  expect(fixture.input.profile).toBe(fixture.callerReferences.profile);
  expect(fixture.input.process).toBe(fixture.callerReferences.process);
  expect(fixture.input.identity).toBe(fixture.callerReferences.identity);
  expect(fixture.executableCalls()).toBe(0);
  expect(fixture.externalSentinel).toEqual({ projected: false });
}

describe("runtime definition", () => {
  test("selects one cold entrypoint from producer-local real definitions", () => {
    let executableCalls = 0;
    const externalSentinel = { projected: false };
    const entrypoint = (() => {
      const plugin = definePlugin({
        id: "selected.plugin",
        role: "server",
        surface: "server/internal",
        capability: "selected",
        services: {},
        resourceRequirements: [],
        project: ({ pluginId }) => {
          executableCalls += 1;
          externalSentinel.projected = true;
          return {
            kind: "plugin.projection",
            facts: { pluginId, externalSentinel },
          };
        },
      });
      const app = defineApp({ id: "selected.app", plugins: [plugin] });
      const profile = defineRuntimeProfile({
        id: "selected.profile",
        providers: [],
      });
      const process = defineProcessCatalog({
        server: { id: "selected.process", roles: ["server"] },
      }).server;
      const rawIdentity: {
        app: string;
        process: string;
        entrypoint: string;
        deployment: string;
        source: string;
      } = {
        app: app.id,
        process: process.id,
        entrypoint: "selected.entrypoint",
        deployment: "selected.deployment",
        source: "selected.source",
      };
      const selection = defineEntrypoint({
        id: "selected.entrypoint",
        app,
        profile,
        process,
        identity: rawIdentity,
      });
      const appTypeMatches: TypesEqual<typeof selection.app, typeof app> = true;
      const profileTypeMatches: TypesEqual<typeof selection.profile, typeof profile> = true;
      const processTypeMatches: TypesEqual<typeof selection.process, typeof process> = true;

      expect(appTypeMatches).toBe(true);
      expect(profileTypeMatches).toBe(true);
      expect(processTypeMatches).toBe(true);
      expect(selection.app).toBe(app);
      expect(selection.profile).toBe(profile);
      expect(selection.process).toBe(process);
      expect(selection.identity).not.toBe(rawIdentity);
      expect(Object.isFrozen(selection.identity)).toBe(true);
      expect(Object.keys(selection.identity)).toEqual([
        "app",
        "process",
        "entrypoint",
        "deployment",
        "source",
      ]);

      rawIdentity.app = "mutated.app";
      rawIdentity.process = "mutated.process";
      rawIdentity.entrypoint = "mutated.entrypoint";
      rawIdentity.deployment = "mutated.deployment";
      rawIdentity.source = "mutated.source";
      expect(selection.identity).toEqual({
        app: "selected.app",
        process: "selected.process",
        entrypoint: "selected.entrypoint",
        deployment: "selected.deployment",
        source: "selected.source",
      });

      return selection;
    })();

    expect(entrypoint.app.id).toBe("selected.app");
    expect(entrypoint.profile.id).toBe("selected.profile");
    expect(entrypoint.process.id).toBe("selected.process");
    expect(Object.isFrozen(entrypoint)).toBe(true);
    expect(executableCalls).toBe(0);
    expect(externalSentinel).toEqual({ projected: false });
  });

  test("refuses an app launch-identity mismatch before publishing selection", () => {
    const fixture = createEntrypointMismatchFixture("app");

    expect(fixture.identity.app).not.toBe(fixture.input.app.id);
    expect(fixture.identity.process).toBe(fixture.input.process.id);
    expect(fixture.identity.entrypoint).toBe(fixture.input.id);
    expectEntrypointMismatchRefusal(fixture);
  });

  test("refuses a process launch-identity mismatch before publishing selection", () => {
    const fixture = createEntrypointMismatchFixture("process");

    expect(fixture.identity.app).toBe(fixture.input.app.id);
    expect(fixture.identity.process).not.toBe(fixture.input.process.id);
    expect(fixture.identity.entrypoint).toBe(fixture.input.id);
    expectEntrypointMismatchRefusal(fixture);
  });

  test("refuses an entrypoint launch-identity mismatch before publishing selection", () => {
    const fixture = createEntrypointMismatchFixture("entrypoint");

    expect(fixture.identity.app).toBe(fixture.input.app.id);
    expect(fixture.identity.process).toBe(fixture.input.process.id);
    expect(fixture.identity.entrypoint).not.toBe(fixture.input.id);
    expectEntrypointMismatchRefusal(fixture);
  });

  test("creates a frozen cold app, process, profile, and entrypoint graph", () => {
    const resource = defineRuntimeResource<"clock", { now(): Date }>({
      id: "clock",
      title: "Clock",
      purpose: "Supplies process time.",
    });
    const configSchema = RuntimeSchema.fromTypeBox(Type.Object({ zone: Type.String() }), {
      redaction: { paths: ["zone"] },
    });
    let providerBuildCalls = 0;
    const providerBuild = () => {
      providerBuildCalls += 1;
      return providerFx.acquireRelease({
        acquire: providerFx.succeed({ now: () => new Date(0) }),
        release: () => providerFx.succeed(undefined),
      });
    };
    const provider = defineRuntimeProvider({
      id: "clock.system",
      title: "System clock",
      provides: resource,
      requires: [],
      configSchema,
      defaultConfigKey: "clock.primary",
      health: { kind: "provider.health", required: true },
      build: providerBuild,
    });
    const providerConfig = {
      kind: "runtime.config",
      key: "clock.selected",
    } as const;
    const selectedProvider = providerSelection({
      resource,
      provider,
      lifetime: "role",
      role: "server",
      instance: "primary",
      config: providerConfig,
    });
    const defaultProviderSelection = providerSelection({ resource, provider });
    const providerSelectionTypeMatches: TypesEqual<typeof selectedProvider, ProviderSelection> =
      true;
    const service = defineService({
      id: "work",
      deps: { clock: resourceDep(resource) },
    });
    const serviceContract = service.oc.router({ list: service.oc });
    const plugin = definePlugin({
      id: "work.api",
      role: "server",
      surface: "api.public",
      capability: "work",
      services: {
        workItems: useService(coldService(service, serviceContract), {}),
      },
      resourceRequirements: [],
      project: ({ pluginId }) => ({
        kind: "plugin.projection",
        facts: { pluginId },
      }),
    });
    const pluginServiceKeysMatch: TypesEqual<keyof typeof plugin.services, "workItems"> = true;
    const app = defineApp({ id: "example", plugins: [plugin] });
    const processes = defineProcessCatalog({
      server: { id: "example.server", roles: ["server"] },
      background: {
        id: "example.background",
        roles: ["async"],
        harness: "durable",
      },
    });
    const profile = defineRuntimeProfile({
      id: "example.production",
      providers: [selectedProvider],
      configSources: [
        { kind: "env" },
        { kind: "dotenv", path: ".env.production", optional: true },
        { kind: "file", path: "runtime.production.json", optional: true },
        { kind: "memory" },
        { kind: "test" },
      ],
      harnesses: ["http", "durable"],
    });
    const identity = runtimeLaunchIdentity({
      app: app.id,
      process: processes.server.id,
      entrypoint: "server",
      deployment: "deploy-1",
      source: "abc123",
    });
    const entrypoint = defineEntrypoint({
      id: "server",
      app,
      profile,
      process: processes.server,
      identity,
    });

    expect(service.deps.clock.resource).toBe(resource);
    expect(pluginServiceKeysMatch).toBe(true);
    expect(providerSelectionTypeMatches).toBe(true);
    expect(plugin.services.workItems.serviceId).toBe(service.id);
    expect(readServiceUse(plugin.services.workItems).service.definition).toBe(service);
    expect(provider.configSchema?.redaction).toEqual({ paths: ["zone"] });
    expect(profile.providers[0]).toBe(selectedProvider);
    expect(Object.keys(defaultProviderSelection)).toEqual(["provider", "resource"]);
    expect(defaultProviderSelection.provider).toBe(provider);
    expect(defaultProviderSelection.resource).toBe(resource);
    expect(Object.hasOwn(defaultProviderSelection, "lifetime")).toBe(false);
    expect(Object.hasOwn(defaultProviderSelection, "role")).toBe(false);
    expect(Object.hasOwn(defaultProviderSelection, "instance")).toBe(false);
    expect(Object.hasOwn(defaultProviderSelection, "config")).toBe(false);
    expect(selectedProvider).toEqual({
      provider,
      resource,
      lifetime: "role",
      role: "server",
      instance: "primary",
      config: providerConfig,
    });
    expect(selectedProvider.provider).toBe(provider);
    expect(selectedProvider.resource).toBe(resource);
    expect(selectedProvider.config).not.toBe(providerConfig);
    expect(selectedProvider.config?.key).toBe("clock.selected");
    expect(entrypoint.identity).toEqual(identity);
    expect(Object.keys(identity)).toEqual(["app", "process", "entrypoint", "deployment", "source"]);
    for (const value of [
      resource,
      provider,
      selectedProvider,
      defaultProviderSelection,
      service,
      plugin,
      app,
      processes,
      profile,
      identity,
      entrypoint,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Object.isFrozen(processes.server.roles)).toBe(true);
    expect(Object.isFrozen(selectedProvider.config)).toBe(true);
    expect(profile.configSources.map(({ kind }) => kind)).toEqual([
      "env",
      "dotenv",
      "file",
      "memory",
      "test",
    ]);
    expect(profile.configSources.every(Object.isFrozen)).toBe(true);
    expect(provider.build).toBe(providerBuild);
    expect(providerBuildCalls).toBe(0);
    expect(() =>
      providerSelection({
        resource,
        provider,
        config: { kind: "runtime.config", key: "" },
      })
    ).toThrow(TypeError);
  });

  test("keeps service-use witnesses private while preserving contract and map inference", () => {
    const clock = defineRuntimeResource<"clock", { now(): Date }>({
      id: "clock",
      title: "Clock",
      purpose: "Supplies process time.",
    });
    const laneSchema = RuntimeSchema.fromTypeBox(Type.String());
    const auditLog = defineService({
      id: "audit-log",
      deps: {},
      config: laneSchema,
    });
    const query = defineService({
      id: "work-query",
      deps: {
        auditLog: serviceDep(coldService(auditLog, {})),
        clock: resourceDep(clock),
        audit: semanticDep("audit"),
      },
      scope: laneSchema,
      config: laneSchema,
    });
    const metadataDefaults = { audit: { enabled: true } };
    const service = defineService({
      id: "work-items",
      deps: {
        query: serviceDep(coldService(query, {})),
        clock: resourceDep(clock),
        audit: semanticDep("audit"),
      },
      scope: laneSchema,
      config: laneSchema,
      metadataDefaults,
    });
    const contract = service.oc.router({ list: service.oc });
    const binding = {
      scope: { kind: "runtime.config", key: " work.scope " },
      config: { kind: "runtime.config", key: "work.config" },
      dependencies: {
        query: {
          instance: "replica",
          scope: { kind: "runtime.config", key: "query.scope" },
          config: { kind: "runtime.config", key: "query.config" },
          dependencies: {
            auditLog: {
              config: { kind: "runtime.config", key: "audit-log.config" },
            },
          },
        },
      },
    } as const;
    const defaultUse = useService(coldService(service, contract), { binding });
    const replicaUse = useService(coldService(service, contract), {
      instance: "replica",
    });
    if (false) {
      // @ts-expect-error A declaration alone is not a complete service export.
      useService(service);
      // @ts-expect-error Options cannot complete an unsealed declaration.
      useService(service, {});
      // @ts-expect-error The predecessor alias field is not part of the cold relation.
      useService(coldService(service, contract), { alias: "legacy" });
      useService(coldService(service, contract), {
        binding: {
          // @ts-expect-error Only dependency bindings may select an instance.
          instance: "not-a-root-field",
        },
      });
      useService(coldService(service, contract), {
        binding: {
          dependencies: {
            query: {
              // @ts-expect-error Dependency bindings contain no alias field.
              alias: "legacy",
            },
          },
        },
      });
      // @ts-expect-error The private binding carrier is not a public string-keyed field.
      defaultUse.binding;
    }
    const services = {
      workItems: defaultUse,
      replicatedWorkItems: replicaUse,
    } as const satisfies ServiceUses;
    const contractMatches: TypesEqual<
      ServiceContractOf<(typeof services)["workItems"]>,
      typeof contract
    > = true;
    const mapKeysMatch: TypesEqual<keyof typeof services, "workItems" | "replicatedWorkItems"> =
      true;
    const publicFieldsMatch: TypesEqual<
      Extract<keyof typeof defaultUse, string>,
      "kind" | "serviceId" | "serviceInstance"
    > = true;
    const discriminantMatches: TypesEqual<typeof defaultUse.kind, "service.use"> = true;
    const defaultCarrier = readServiceUse(defaultUse);
    const replicaCarrier = readServiceUse(replicaUse);

    expect(contractMatches).toBe(true);
    expect(mapKeysMatch).toBe(true);
    expect(publicFieldsMatch).toBe(true);
    expect(discriminantMatches).toBe(true);
    expect(Object.keys(defaultUse).sort()).toEqual(["kind", "serviceId"]);
    expect(Object.getOwnPropertyNames(defaultUse)).toEqual(["kind", "serviceId"]);
    expect(JSON.parse(JSON.stringify(defaultUse))).toEqual({
      kind: "service.use",
      serviceId: "work-items",
    });
    expect(Object.keys(replicaUse).sort()).toEqual(["kind", "serviceId", "serviceInstance"]);
    expect(JSON.parse(JSON.stringify(replicaUse))).toEqual({
      kind: "service.use",
      serviceId: "work-items",
      serviceInstance: "replica",
    });
    expect(Object.hasOwn(defaultUse, "serviceInstance")).toBe(false);
    expect(replicaUse.serviceInstance).toBe("replica");
    for (const field of ["service", "definition", "contract", "binding", "alias"] as const) {
      expect(Object.hasOwn(defaultUse, field)).toBe(false);
    }
    expect(Object.getOwnPropertySymbols(defaultUse)).toHaveLength(1);
    expect(
      Object.getOwnPropertyDescriptor(defaultUse, Object.getOwnPropertySymbols(defaultUse)[0]!)
    ).toMatchObject({
      configurable: false,
      enumerable: false,
      writable: false,
    });
    expect(defaultCarrier.service.definition).toBe(service);
    expect(defaultCarrier.service.contract).toBe(contract);
    expect(defaultCarrier.binding).toEqual(binding);
    expect(defaultCarrier.binding).not.toBe(binding);
    expect(defaultCarrier.binding?.scope).not.toBe(binding.scope);
    expect(defaultCarrier.binding?.config).not.toBe(binding.config);
    expect(defaultCarrier.binding?.dependencies).not.toBe(binding.dependencies);
    expect(defaultCarrier.binding?.dependencies?.query).not.toBe(binding.dependencies.query);
    expect(defaultCarrier.binding?.dependencies?.query.scope).not.toBe(
      binding.dependencies.query.scope
    );
    expect(defaultCarrier.binding?.dependencies?.query.dependencies).not.toBe(
      binding.dependencies.query.dependencies
    );
    expect(defaultCarrier.binding?.scope?.key).toBe(" work.scope ");
    expect(replicaCarrier.service.definition).toBe(service);
    expect(replicaCarrier.service.contract).toBe(contract);
    expect(Object.hasOwn(replicaCarrier, "binding")).toBe(false);
    expect(Object.isFrozen(defaultCarrier)).toBe(true);
    expect(Object.isFrozen(defaultCarrier.binding)).toBe(true);
    expect(Object.isFrozen(defaultCarrier.binding?.scope)).toBe(true);
    expect(Object.isFrozen(defaultCarrier.binding?.config)).toBe(true);
    expect(Object.isFrozen(defaultCarrier.binding?.dependencies)).toBe(true);
    expect(Object.isFrozen(defaultCarrier.binding?.dependencies?.query)).toBe(true);
    expect(Object.isFrozen(defaultCarrier.binding?.dependencies?.query.scope)).toBe(true);
    expect(Object.isFrozen(defaultCarrier.binding?.dependencies?.query.config)).toBe(true);
    expect(Object.isFrozen(defaultCarrier.binding?.dependencies?.query.dependencies)).toBe(true);
    expect(
      Object.isFrozen(defaultCarrier.binding?.dependencies?.query.dependencies?.auditLog.config)
    ).toBe(true);
    expect(Object.isFrozen(binding)).toBe(false);
    expect(Object.isFrozen(contract)).toBe(false);
    expect(Object.isFrozen(contract.list)).toBe(false);
    expect(Object.isFrozen(metadataDefaults)).toBe(false);
    expect(Object.isFrozen(metadataDefaults.audit)).toBe(false);
    expect(Object.isFrozen(defaultUse)).toBe(true);
    expect(Object.isFrozen(replicaUse)).toBe(true);
    expect(services.workItems).toBe(defaultUse);
    expect(services.replicatedWorkItems).toBe(replicaUse);

    expect(() =>
      useService(coldService(service, contract), {
        binding: { scope: { kind: "runtime.config", key: "" } },
      })
    ).toThrow(TypeError);
    expect(() =>
      useService(coldService(service, contract), {
        binding: { dependencies: { unknown: {} } },
      })
    ).toThrow(TypeError);
    expect(() =>
      useService(coldService(service, contract), {
        binding: { dependencies: { clock: {} } },
      })
    ).toThrow(TypeError);
    expect(() =>
      useService(coldService(service, contract), {
        binding: { dependencies: { audit: {} } },
      })
    ).toThrow(TypeError);
    expect(() =>
      useService(coldService(service, contract), {
        binding: { dependencies: { query: { dependencies: { unknown: {} } } } },
      })
    ).toThrow(TypeError);
    expect(() =>
      useService(coldService(service, contract), {
        binding: { dependencies: { query: { dependencies: { clock: {} } } } },
      })
    ).toThrow(TypeError);
    expect(() =>
      useService(coldService(service, contract), {
        binding: { dependencies: { query: { dependencies: { audit: {} } } } },
      })
    ).toThrow(TypeError);
  });

  test("keeps HabitatEffect programs and execution descriptors cold", () => {
    interface ExecutionContext {
      readonly requestedBy: string;
    }
    interface ExecutionFailure {
      readonly _tag: "ExecutionFailure";
    }
    interface ClockRequirement {
      readonly clock: true;
    }

    let runCalls = 0;
    const descriptor = defineEffectExecution({
      kind: "execution.effect",
      executionId: "work.refresh",
      boundary: "plugin.async-step",
      policy: { interruptible: true },
      run: (_input: { readonly input: void; readonly context: ExecutionContext }) => {
        runCalls += 1;
        return coldEffect<string, ExecutionFailure, ClockRequirement>("done", {
          _tag: "ExecutionFailure",
        });
      },
    });
    const channelsMatch: TypesEqual<
      ExecutionDescriptorChannels<typeof descriptor>,
      readonly [void, string, ExecutionFailure, ExecutionContext, ClockRequirement]
    > = true;

    expect(runCalls).toBe(0);
    const effect = descriptor.run({
      input: undefined,
      context: { requestedBy: "test" },
      execution: {
        appId: "test",
        processId: "test",
        entrypointId: "test",
        profileId: "test",
        role: "cli",
        ownerId: "test",
        executionId: descriptor.executionId,
        traceId: "test",
      },
      telemetry: { span: (_name, program) => program, event: () => Effect.succeed(undefined) },
    });

    expect(channelsMatch).toBe(true);
    expect(runCalls).toBe(1);
    expect(isHabitatEffect(effect)).toBe(true);
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen(descriptor.policy)).toBe(true);

    if (false) {
      // @ts-expect-error The descriptor preserves its exact context contract.
      descriptor.run({ input: undefined, context: { requestedBy: 1 } });

      // @ts-expect-error The Effect requirement channel is not erased to unknown.
      const incompatible: EffectExecutionDescriptor<
        void,
        string,
        ExecutionFailure,
        ExecutionContext,
        { readonly filesystem: true }
      > = descriptor;
      expect(incompatible).toBeDefined();
    }
  });

  test("preserves service schemas, sibling identity, and native authoring helpers", () => {
    const accountScope = RuntimeSchema.fromTypeBox(Type.Object({ workspaceId: Type.String() }));
    const accountConfig = RuntimeSchema.fromTypeBox(Type.Object({ readOnly: Type.Boolean() }));
    const accountInvocation = RuntimeSchema.fromTypeBox(Type.Object({ traceId: Type.String() }));
    const accounts = defineService({
      id: "accounts",
      deps: {},
      scope: accountScope,
      config: accountConfig,
      invocation: accountInvocation,
    });
    const billing = defineService({
      id: "billing",
      deps: { accounts: serviceDep(coldService(accounts, {})) },
    });
    const schemaChannelsMatch: TypesEqual<
      ServiceSchemaChannels<typeof accounts>,
      readonly [{ workspaceId: string }, { readOnly: boolean }, { traceId: string }]
    > = true;
    const dependencyIdentityMatches: TypesEqual<
      typeof billing.deps.accounts.service.definition,
      typeof accounts
    > = true;
    let middlewareRuns = 0;
    const contract = accounts.oc
      .input(standard(Type.Object({ id: Type.String() })))
      .output(standard(Type.Object({ id: Type.String() })));
    const middleware = accounts.createMiddleware(async ({ next }) => {
      middlewareRuns += 1;
      return next();
    });
    const procedure = accounts
      .createImplementer(contract)
      .use(middleware)
      .handler(({ input }) => input);

    expect(schemaChannelsMatch).toBe(true);
    expect(dependencyIdentityMatches).toBe(true);
    expect(billing.deps.accounts.service.definition).toBe(accounts);
    expect(middlewareRuns).toBe(0);
    expect(procedure).toHaveProperty("~orpc");

    if (false) {
      // @ts-expect-error serviceDep accepts a complete sibling export, not a string identity.
      serviceDep("accounts");

      // @ts-expect-error The sibling service literal identity remains available.
      const wrongSiblingId: "users" = billing.deps.accounts.service.definition.id;
      void wrongSiblingId;

      const wrongScope: ServiceSchemaChannels<typeof accounts>[0] = {
        // @ts-expect-error The scope schema decodes workspaceId as a string.
        workspaceId: 1,
      };
      void wrongScope;
    }
  });

  test("preserves yieldability and tagged error discrimination", () => {
    class Failure extends TaggedError("Failure")<{ readonly reason: string }> {}
    const externalFields = { _tag: "Counterfeit", reason: "nope" };
    const structurallyTypedFields: { readonly reason: string } = externalFields;
    const failure = new Failure(structurallyTypedFields);
    const yielded = Effect.succeed(42)[Symbol.iterator]();

    expect(failure).toEqual({ _tag: "Failure", reason: "nope" });
    expect(Object.getOwnPropertyDescriptor(failure, "_tag")).toMatchObject({
      configurable: false,
      enumerable: true,
      writable: false,
    });
    expect(isHabitatEffect(yielded.next().value)).toBe(true);
    expect(yielded.next(42)).toEqual({ done: true, value: 42 });

    if (false) {
      // @ts-expect-error TaggedError reserves _tag for its canonical discriminator.
      class InvalidFailure extends TaggedError("Failure")<{
        readonly _tag: "Counterfeit";
      }> {}
      void InvalidFailure;
    }
  });

  test("infers generator channels without evaluating the cold body", () => {
    interface LoadFailure {
      readonly _tag: "LoadFailure";
      readonly path: string;
    }
    interface ParseFailure {
      readonly _tag: "ParseFailure";
      readonly line: number;
    }
    interface FilesystemRequirement {
      readonly filesystem: true;
    }
    interface ParserRequirement {
      readonly parser: true;
    }

    const load = coldEffect<number, LoadFailure, FilesystemRequirement>(1, {
      _tag: "LoadFailure",
      path: "input.json",
    });
    const parse = coldEffect<string, ParseFailure, ParserRequirement>("ready", {
      _tag: "ParseFailure",
      line: 1,
    });
    let bodyRuns = 0;
    const program = Effect.gen(function* () {
      bodyRuns += 1;
      const count = yield* load;
      const status = yield* parse;
      return { count, status };
    });
    const channelsMatch: TypesEqual<
      HabitatEffectChannels<typeof program>,
      readonly [
        { count: number; status: string },
        LoadFailure | ParseFailure,
        FilesystemRequirement | ParserRequirement,
      ]
    > = true;

    expect(channelsMatch).toBe(true);
    expect(bodyRuns).toBe(0);
    expect(isHabitatEffect(program)).toBe(true);
  });

  test("unions recovery requirements while keeping catchTag and orElse cold", () => {
    interface LoadFailure {
      readonly _tag: "LoadFailure";
      readonly path: string;
    }
    interface ParseFailure {
      readonly _tag: "ParseFailure";
      readonly line: number;
    }
    interface RecoveryFailure {
      readonly _tag: "RecoveryFailure";
      readonly reason: string;
    }
    interface FallbackFailure {
      readonly _tag: "FallbackFailure";
      readonly reason: string;
    }
    interface SourceRequirement {
      readonly source: true;
    }
    interface RecoveryRequirement {
      readonly recovery: true;
    }
    interface FallbackRequirement {
      readonly fallback: true;
    }

    const source = coldEffect<string, LoadFailure | ParseFailure, SourceRequirement>("loaded", {
      _tag: "LoadFailure",
      path: "input.json",
    });
    let catchRuns = 0;
    const caught = Effect.catchTag(source, "LoadFailure", (error) => {
      catchRuns += 1;
      return coldEffect<number, RecoveryFailure, RecoveryRequirement>(error.path.length, {
        _tag: "RecoveryFailure",
        reason: error.path,
      });
    });
    const catchChannelsMatch: TypesEqual<
      HabitatEffectChannels<typeof caught>,
      readonly [
        string | number,
        ParseFailure | RecoveryFailure,
        SourceRequirement | RecoveryRequirement,
      ]
    > = true;
    let fallbackRuns = 0;
    const recovered = Effect.orElse(source, (error) => {
      fallbackRuns += 1;
      return coldEffect<boolean, FallbackFailure, FallbackRequirement>(
        error._tag === "LoadFailure",
        {
          _tag: "FallbackFailure",
          reason: error._tag,
        }
      );
    });
    const fallbackChannelsMatch: TypesEqual<
      HabitatEffectChannels<typeof recovered>,
      readonly [string | boolean, FallbackFailure, SourceRequirement | FallbackRequirement]
    > = true;

    expect(catchChannelsMatch).toBe(true);
    expect(fallbackChannelsMatch).toBe(true);
    expect(catchRuns).toBe(0);
    expect(fallbackRuns).toBe(0);
    expect(isHabitatEffect(caught)).toBe(true);
    expect(isHabitatEffect(recovered)).toBe(true);

    if (false) {
      // @ts-expect-error catchTag accepts only a tag in the source error channel.
      Effect.catchTag(source, "LoadFaliure", () => Effect.succeed("unreachable"));
    }
  });

  test("keeps unhandled tagged errors and unions catchTags handler channels", () => {
    interface LoadFailure {
      readonly _tag: "LoadFailure";
      readonly path: string;
    }
    interface ParseFailure {
      readonly _tag: "ParseFailure";
      readonly line: number;
    }
    interface StoreFailure {
      readonly _tag: "StoreFailure";
      readonly key: string;
    }
    interface RecoveryFailure {
      readonly _tag: "RecoveryFailure";
      readonly reason: string;
    }
    interface AuditFailure {
      readonly _tag: "AuditFailure";
      readonly event: string;
    }
    interface SourceRequirement {
      readonly source: true;
    }
    interface RecoveryRequirement {
      readonly recovery: true;
    }
    interface AuditRequirement {
      readonly audit: true;
    }

    const source = coldEffect<string, LoadFailure | ParseFailure | StoreFailure, SourceRequirement>(
      "stored",
      { _tag: "LoadFailure", path: "input.json" }
    );
    let handlerRuns = 0;
    const recovered = Effect.catchTags(source, {
      LoadFailure: (error) => {
        handlerRuns += 1;
        return coldEffect<number, RecoveryFailure, RecoveryRequirement>(error.path.length, {
          _tag: "RecoveryFailure",
          reason: error.path,
        });
      },
      ParseFailure: (error) => {
        handlerRuns += 1;
        return coldEffect<boolean, AuditFailure, AuditRequirement>(error.line > 0, {
          _tag: "AuditFailure",
          event: String(error.line),
        });
      },
    });
    const partialChannelsMatch: TypesEqual<
      HabitatEffectChannels<typeof recovered>,
      readonly [
        string | number | boolean,
        StoreFailure | RecoveryFailure | AuditFailure,
        SourceRequirement | RecoveryRequirement | AuditRequirement,
      ]
    > = true;
    const exhaustive = Effect.catchTags(source, {
      LoadFailure: () => Effect.succeed(1),
      ParseFailure: () => Effect.succeed(true),
      StoreFailure: () => Effect.succeed(new Date(0)),
    });
    const exhaustiveChannelsMatch: TypesEqual<
      HabitatEffectChannels<typeof exhaustive>,
      readonly [string | number | boolean | Date, never, SourceRequirement]
    > = true;
    expect(partialChannelsMatch).toBe(true);
    expect(exhaustiveChannelsMatch).toBe(true);
    expect(handlerRuns).toBe(0);
    expect(isHabitatEffect(recovered)).toBe(true);
  });

  test("publishes one bounded TypeBox observation record schema", () => {
    const validator = new Validator({}, RuntimeObservationRecordSchema);
    expect(
      validator.Check({
        phase: "definition",
        boundary: "app",
        kind: "app.declared",
        correlationId: "example",
        payload: { id: "example" },
      })
    ).toBe(true);
    expect(validator.Check({ phase: "live" })).toBe(false);
    expect(
      validator.Check({
        phase: "definition",
        boundary: "app",
        kind: "app.declared",
        correlationId: "example",
        payload: {},
        select: () => undefined,
      })
    ).toBe(false);
  });

  test("fixes server lane identity while retaining native handler routers", async () => {
    const service = defineService({ id: "work-items", deps: {} });
    const contract = service.oc
      .input(standard(Type.Object({ id: Type.String() })))
      .output(standard(Type.Object({ id: Type.String(), source: Type.String() })));
    const nativeHandler = implement(contract).handler(({ input }) => ({
      id: input.id,
      source: "handler",
    }));
    const internalHandler = implement(contract).handler(async ({ input }) => ({
      id: input.id,
      source: "promise",
    }));
    const services = {
      workItems: useService(coldService(service, contract), {}),
    } as const;
    let apiRuns = 0;
    const createApi = defineServerApiPlugin.factory()({
      capability: "work-items",
      routeBase: "/work-items",
      services,
      api: () => {
        apiRuns += 1;
        return nativeHandler;
      },
    });
    let optionMappings = 0;
    const createInternal = defineServerInternalPlugin.factory<{
      readonly base: `/${string}`;
    }>()((options) => {
      optionMappings += 1;
      return {
        capability: "work-items-ops",
        routeBase: options.base,
        services,
        internal: () => internalHandler,
      };
    });

    expect(apiRuns).toBe(0);
    expect(optionMappings).toBe(0);
    const api = createApi();
    const internal = createInternal({ base: "/work-items-ops" });

    const mutableInput: {
      capability: "mutable";
      routeBase: `/${string}`;
      services: typeof services;
      api: () => typeof nativeHandler;
    } = {
      capability: "mutable",
      routeBase: "/before",
      services,
      api: () => nativeHandler,
    };
    const mutableProjection = defineServerApiPlugin.factory()(mutableInput)();
    mutableInput.routeBase = "/after";
    expect(optionMappings).toBe(1);
    expect(api).toMatchObject({
      id: "server.api.work-items",
      role: "server",
      surface: "server/api",
      routeBase: "/work-items",
    });
    expect(internal).toMatchObject({
      id: "server.internal.work-items-ops",
      role: "server",
      surface: "server/internal",
      routeBase: "/work-items-ops",
    });
    expect(api.services).toEqual(services);
    expect(internal.services).toEqual(services);
    expect(api.services.workItems).toBe(services.workItems);
    expect(internal.services.workItems).toBe(services.workItems);
    expect(api.services.workItems.serviceId).toBe(service.id);
    expect(readServiceUse(api.services.workItems).service.definition).toBe(service);
    expect(api.api()).toBe(nativeHandler);
    expect(apiRuns).toBe(1);
    expect(Object.isFrozen(api)).toBe(true);
    expect(Object.isFrozen(api.services)).toBe(true);
    expect(Object.isFrozen(api.resourceRequirements)).toBe(true);
    expect(mutableProjection.routeBase).toBe("/before");
    expect(mutableProjection.project({ pluginId: mutableProjection.id }).facts.routeBase).toBe(
      "/before"
    );
    await expect(call(nativeHandler, { id: "one" })).resolves.toEqual({
      id: "one",
      source: "handler",
    });
    await expect(call(internalHandler, { id: "two" })).resolves.toEqual({
      id: "two",
      source: "promise",
    });

    if (false) {
      defineServerApiPlugin.factory()({
        capability: "invalid",
        routeBase: "/invalid",
        services: {},
        api: () => nativeHandler,
        // @ts-expect-error Projection classification is fixed by the lane builder.
        role: "server",
      });
      defineServerApiPlugin.factory()({
        capability: "invalid-undefined",
        routeBase: "/invalid",
        services: {},
        api: () => nativeHandler,
        // @ts-expect-error Even undefined cannot override lane-owned classification.
        role: undefined,
      });
    }

    const classificationVariable = {
      capability: "invalid-variable",
      routeBase: "/invalid" as const,
      services: {},
      api: () => nativeHandler,
      role: undefined,
    };
    expect(() => defineServerApiPlugin.factory()(classificationVariable)()).toThrow(
      "lane classification is fixed"
    );
  });

  test("keeps web route projections cold and snapshots only serializable route facts", () => {
    let routeModuleRuns = 0;
    const loadRouteModule = async () => {
      routeModuleRuns += 1;
      return { mount: "work-items-board" } as const;
    };
    const createWebApp = defineWebAppPlugin.factory()({
      capability: "work-items-board",
      routes: [
        {
          id: "work-items-board.index",
          path: "/work-items",
          module: loadRouteModule,
        },
      ] as const,
    });
    let optionMappings = 0;
    const createSelectedWebApp = defineWebAppPlugin.factory<{
      readonly instance: string;
    }>()((options) => {
      optionMappings += 1;
      return {
        capability: "work-items-board",
        instance: options.instance,
        routes: [
          {
            id: "work-items-board.index",
            path: "/work-items",
            module: loadRouteModule,
          },
        ] as const,
      };
    });

    expect(routeModuleRuns).toBe(0);
    expect(optionMappings).toBe(0);
    const webApp = createWebApp();
    const selectedWebApp = createSelectedWebApp({ instance: "secondary" });
    const projection = webApp.project({ pluginId: webApp.id });
    const projectedRoutes = projection.facts.routes as readonly Readonly<{
      id: string;
      path: string;
    }>[];
    expect(optionMappings).toBe(1);
    expect(routeModuleRuns).toBe(0);
    expect(webApp).toMatchObject({
      kind: "plugin.definition",
      id: "web.app.work-items-board",
      role: "web",
      surface: "web/app",
      capability: "work-items-board",
      services: {},
      resourceRequirements: [],
    });
    expect(Object.hasOwn(webApp, "instance")).toBe(false);
    expect(selectedWebApp.instance).toBe("secondary");
    expect(webApp.routes[0]?.module).toBe(loadRouteModule);
    expect(projection).toEqual({
      kind: "plugin.projection",
      facts: {
        pluginId: "web.app.work-items-board",
        lane: "web/app",
        routes: [{ id: "work-items-board.index", path: "/work-items" }],
      },
    });
    expect(Object.keys(projectedRoutes[0] ?? {})).toEqual(["id", "path"]);
    for (const value of [
      webApp,
      webApp.services,
      webApp.resourceRequirements,
      webApp.routes,
      webApp.routes[0],
      projection,
      projection.facts,
      projectedRoutes,
      projectedRoutes[0],
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }

    const mutableRoute: {
      id: string;
      path: string;
      module: () => Promise<Readonly<{ mount: string }>>;
      label: string;
    } = {
      id: "mutable.before",
      path: "/before",
      module: loadRouteModule,
      label: "not-part-of-the-route-contract",
    };
    const mutableInput = {
      capability: "mutable",
      routes: [mutableRoute],
    };
    const snapshottedWebApp = defineWebAppPlugin.factory()(mutableInput)();
    mutableRoute.id = "mutable.after";
    mutableRoute.path = "/after";
    mutableRoute.module = async () => ({ mount: "replacement" as const });
    expect(snapshottedWebApp.routes[0]).toEqual({
      id: "mutable.before",
      path: "/before",
      module: loadRouteModule,
    });
    expect(Object.keys(snapshottedWebApp.routes[0] ?? {})).toEqual(["id", "path", "module"]);
    expect(snapshottedWebApp.project({ pluginId: snapshottedWebApp.id }).facts.routes).toEqual([
      { id: "mutable.before", path: "/before" },
    ]);

    const invalidClassification = {
      capability: "invalid-variable",
      routes: [],
      role: undefined,
    };
    expect(() => defineWebAppPlugin.factory()(invalidClassification)()).toThrow(
      "lane classification is fixed"
    );
    const invalidComposition = {
      capability: "invalid-composition",
      routes: [],
      services: {},
    };
    expect(() => defineWebAppPlugin.factory()(invalidComposition)()).toThrow(
      "does not accept 'services'"
    );
    const invalidResourceComposition = {
      capability: "invalid-resource-composition",
      routes: [],
      resourceRequirements: undefined,
    };
    expect(() => defineWebAppPlugin.factory()(invalidResourceComposition)()).toThrow(
      "does not accept 'resourceRequirements'"
    );
  });

  test("keeps async declarations and step Effects cold and host-neutral", () => {
    interface StepFailure {
      readonly _tag: "StepFailure";
    }
    interface StepRequirement {
      readonly store: true;
    }
    type StepContext = AsyncStepExecutionContext<
      Readonly<{ itemId: string }>,
      Readonly<Record<string, unknown>>
    >;

    let stepBodyRuns = 0;
    const step = defineAsyncStepEffect({
      id: "sync-item",
      policy: { retry: { times: 2 }, interruptible: true },
      effect: ({ event }: StepContext) => {
        stepBodyRuns += 1;
        return coldEffect<string, StepFailure, StepRequirement>(event.itemId, {
          _tag: "StepFailure",
        });
      },
    });
    interface ParseFailure {
      readonly _tag: "ParseFailure";
    }
    interface ClockRequirement {
      readonly clock: true;
    }
    const mixedStep = defineAsyncStepEffect({
      id: "mixed-step",
      policy: {},
      effect: function* ({ event, clients, resources, telemetry, execution }) {
        void event;
        void clients;
        void resources;
        void telemetry;
        void execution;
        const count = yield* coldEffect<number, StepFailure, StepRequirement>(1, {
          _tag: "StepFailure",
        });
        const label = yield* coldEffect<string, ParseFailure, ClockRequirement>("ready", {
          _tag: "ParseFailure",
        });
        return `${label}:${count}`;
      },
    });
    const mixedChannels: TypesEqual<
      AsyncStepDescriptorChannels<typeof mixedStep>,
      readonly [
        string,
        StepFailure | ParseFailure,
        StepRequirement | ClockRequirement,
        AsyncStepExecutionContext,
      ]
    > = true;
    expect(mixedChannels).toBe(true);
    const inputSchema = RuntimeSchema.fromTypeBox(Type.Object({ itemId: Type.String() }));
    const eventSchema = RuntimeSchema.fromTypeBox(Type.Object({ itemId: Type.String() }));
    const workflow = defineWorkflow({
      id: "items.sync",
      eventName: "items/sync",
      inputSchema,
      steps: [step] as const,
      run: () => undefined,
    });
    const schedule = defineSchedule({
      id: "items.nightly",
      cron: "0 0 * * *",
      steps: [step] as const,
      run: () => undefined,
    });
    const consumer = defineConsumer({
      id: "items.changed",
      eventName: "items/changed",
      eventSchema,
      steps: [step] as const,
      run: () => undefined,
    });
    const service = defineService({ id: "items", deps: {} });
    const serviceContract = service.oc.router({ sync: service.oc });
    const services = {
      items: useService(coldService(service, serviceContract), {}),
    } as const;
    const workflowPlugin = defineAsyncWorkflowPlugin.factory()({
      capability: "item-sync",
      services,
      workflows: [workflow] as const,
    })();
    const schedulePlugin = defineAsyncSchedulePlugin.factory()({
      capability: "item-schedules",
      services,
      schedules: [schedule] as const,
    })();
    const consumerPlugin = defineAsyncConsumerPlugin.factory()({
      capability: "item-consumers",
      services,
      consumers: [consumer] as const,
    })();

    expect(stepBodyRuns).toBe(0);
    expect(step).toMatchObject({ kind: "async.step-effect", id: "sync-item" });
    expect(workflow.steps[0]).toBe(step);
    expect(schedule.steps[0]).toBe(step);
    expect(consumer.steps[0]).toBe(step);
    expect(workflowPlugin).toMatchObject({
      id: "async.workflow.item-sync",
      role: "async",
      surface: "async/workflow",
    });
    expect(schedulePlugin).toMatchObject({
      id: "async.schedule.item-schedules",
      role: "async",
      surface: "async/schedule",
    });
    expect(consumerPlugin).toMatchObject({
      id: "async.consumer.item-consumers",
      role: "async",
      surface: "async/consumer",
    });
    for (const plugin of [workflowPlugin, schedulePlugin, consumerPlugin]) {
      expect(plugin.services).toEqual(services);
      expect(plugin.services.items).toBe(services.items);
    }
    for (const value of [
      step,
      workflow,
      schedule,
      consumer,
      workflowPlugin,
      schedulePlugin,
      consumerPlugin,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Object.isFrozen(step.policy)).toBe(true);
    expect(Object.isFrozen(step.policy.retry)).toBe(true);
    expect(Object.isFrozen(workflow.steps)).toBe(true);
    expect(typeof workflow.run).toBe("function");
    expect("FunctionBundle" in workflowPlugin).toBe(false);
    expect("stepEffect" in workflowPlugin).toBe(false);

    if (false) {
      // @ts-expect-error Consumer event payloads require a RuntimeSchema.
      defineConsumer({ id: "invalid", eventName: "invalid", steps: [step] });
      // @ts-expect-error Cold async declarations retain their required native run callback.
      defineWorkflow({
        id: "invalid",
        eventName: "invalid",
        inputSchema,
        steps: [step],
      });
      defineWorkflow({
        id: "fake-step",
        eventName: "fake-step",
        inputSchema,
        run: () => undefined,
        steps: [
          // @ts-expect-error Async membership requires a complete cold Effect descriptor.
          { kind: "async.step-effect", id: "fake" },
        ],
      });
      defineAsyncWorkflowPlugin.factory()({
        capability: "wrong-lane",
        services,
        // @ts-expect-error Workflow plugins cannot contain schedule declarations.
        workflows: [schedule],
      });
      // @ts-expect-error Every async step descriptor carries an explicit policy.
      defineAsyncStepEffect({
        id: "missing-policy",
        effect: () => Effect.succeed("invalid"),
      });
    }
  });
});
