import { describe, expect, test } from "bun:test";
import { call } from "@orpc/server";
import { Type } from "typebox";
import { Validator } from "typebox/schema";
import { RuntimeSchema, standard } from "../../schema/src";
import type {
  AsyncStepEffectDescriptor,
  AsyncStepExecutionContext,
  EffectExecutionDescriptor,
  HabitatEffect,
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
  defineWorkflow,
  Effect,
  implementServerApiPlugin,
  implementServerInternalPlugin,
  RuntimeObservationRecordSchema,
  readHabitatEffectOperation,
  readServiceUse,
  resourceDep,
  runtimeLaunchIdentity,
  serviceDep,
  TaggedError,
  useService,
} from "../src";

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

function coldEffect<TSuccess, TError, TRequirements>(
  value: TSuccess,
  error: TError
): HabitatEffect<TSuccess, TError, TRequirements> {
  return Effect.tryPromise({
    try: () => value,
    catch: () => error,
  });
}

describe("runtime definition", () => {
  test("creates a frozen cold app, process, profile, and entrypoint graph", () => {
    const resource = defineRuntimeResource<"clock", { now(): Date }>({
      id: "clock",
      title: "Clock",
      purpose: "Supplies process time.",
    });
    const configSchema = RuntimeSchema.fromTypeBox(Type.Object({ zone: Type.String() }), {
      redaction: { paths: ["zone"] },
    });
    const provider = defineRuntimeProvider({
      id: "clock.system",
      title: "System clock",
      provides: resource,
      requires: [],
      configSchema,
      defaultConfigKey: "clock.primary",
      health: { kind: "provider.health", required: true },
    });
    const service = defineService({
      id: "work",
      deps: { clock: resourceDep(resource) },
    });
    const serviceContract = { operation: "list-work" } as const;
    const plugin = definePlugin({
      id: "work.api",
      role: "server",
      surface: "api.public",
      capability: "work",
      services: { workItems: useService(service, { contract: serviceContract }) },
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
      providers: [],
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
    expect(plugin.services.workItems.serviceId).toBe(service.id);
    expect(readServiceUse(plugin.services.workItems).definition).toBe(service);
    expect(provider.configSchema?.redaction).toEqual({ paths: ["zone"] });
    expect(entrypoint.identity).toEqual(identity);
    expect(Object.keys(identity)).toEqual(["app", "process", "entrypoint", "deployment", "source"]);
    for (const value of [
      resource,
      provider,
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
    expect(profile.configSources.map(({ kind }) => kind)).toEqual([
      "env",
      "dotenv",
      "file",
      "memory",
      "test",
    ]);
    expect(profile.configSources.every(Object.isFrozen)).toBe(true);
    expect("build" in provider).toBe(false);
  });

  test("keeps service-use witnesses private while preserving contract and map inference", () => {
    const service = defineService({ id: "work-items", deps: {} });
    const contract = {
      list: { method: "GET", path: "/work-items" },
    } as const;
    const defaultUse = useService(service, { contract });
    const replicaUse = useService(service, { contract, instance: "replica" });
    if (false) {
      // @ts-expect-error A service use always carries an explicit contract witness.
      useService(service);
      // @ts-expect-error An empty options object cannot omit the contract witness.
      useService(service, {});
      // @ts-expect-error The predecessor alias field is not part of the cold relation.
      useService(service, { contract, alias: "legacy" });
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
    for (const field of ["service", "definition", "contract", "alias"] as const) {
      expect(Object.hasOwn(defaultUse, field)).toBe(false);
    }
    expect(Object.getOwnPropertySymbols(defaultUse)).toHaveLength(1);
    expect(
      Object.getOwnPropertyDescriptor(defaultUse, Object.getOwnPropertySymbols(defaultUse)[0]!)
    ).toMatchObject({ configurable: false, enumerable: false, writable: false });
    expect(defaultCarrier.definition).toBe(service);
    expect(defaultCarrier.contract).toBe(contract);
    expect(replicaCarrier.definition).toBe(service);
    expect(replicaCarrier.contract).toBe(contract);
    expect(Object.isFrozen(defaultCarrier)).toBe(true);
    expect(Object.isFrozen(defaultUse)).toBe(true);
    expect(Object.isFrozen(replicaUse)).toBe(true);
    expect(services.workItems).toBe(defaultUse);
    expect(services.replicatedWorkItems).toBe(replicaUse);
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
    const effect = descriptor.run({ input: undefined, context: { requestedBy: "test" } });

    expect(channelsMatch).toBe(true);
    expect(runCalls).toBe(1);
    expect(readHabitatEffectOperation(effect).kind).toBe("try-promise");
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
      deps: { accounts: serviceDep(accounts) },
    });
    const schemaChannelsMatch: TypesEqual<
      ServiceSchemaChannels<typeof accounts>,
      readonly [{ workspaceId: string }, { readOnly: boolean }, { traceId: string }]
    > = true;
    const dependencyIdentityMatches: TypesEqual<
      typeof billing.deps.accounts.service,
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
    expect(billing.deps.accounts.service).toBe(accounts);
    expect(middlewareRuns).toBe(0);
    expect(procedure).toHaveProperty("~orpc");

    if (false) {
      // @ts-expect-error serviceDep accepts a sibling definition, not a string identity.
      serviceDep("accounts");

      // @ts-expect-error The sibling service literal identity remains available.
      const wrongSiblingId: "users" = billing.deps.accounts.service.id;
      void wrongSiblingId;

      // @ts-expect-error The scope schema decodes workspaceId as a string.
      const wrongScope: ServiceSchemaChannels<typeof accounts>[0] = { workspaceId: 1 };
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
    expect(yielded.next().value).toHaveProperty("kind", "habitat.effect");
    expect(yielded.next(42)).toEqual({ done: true, value: 42 });

    if (false) {
      // @ts-expect-error TaggedError reserves _tag for its canonical discriminator.
      class InvalidFailure extends TaggedError("Failure")<{ readonly _tag: "Counterfeit" }> {}
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
    expect(readHabitatEffectOperation(program)).toMatchObject({ kind: "gen" });
    expect(Object.isFrozen(program)).toBe(true);
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
    expect(readHabitatEffectOperation(caught)).toMatchObject({
      kind: "transform",
      transform: "catch-tag",
      source,
    });
    expect(readHabitatEffectOperation(recovered)).toMatchObject({
      kind: "transform",
      transform: "or-else",
      source,
    });

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
    const operation = readHabitatEffectOperation(recovered);

    expect(partialChannelsMatch).toBe(true);
    expect(exhaustiveChannelsMatch).toBe(true);
    expect(handlerRuns).toBe(0);
    expect(operation).toMatchObject({
      kind: "transform",
      transform: "catch-tags",
      source,
    });
    if (operation.kind === "transform") {
      expect(Object.isFrozen(operation.input)).toBe(true);
    }
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

  test("fixes server lane identity while retaining native handler implementers", async () => {
    const service = defineService({ id: "work-items", deps: {} });
    const contract = service.oc
      .input(standard(Type.Object({ id: Type.String() })))
      .output(standard(Type.Object({ id: Type.String(), source: Type.String() })));
    const nativeHandler = implementServerApiPlugin(contract).handler(({ input }) => ({
      id: input.id,
      source: "handler",
    }));
    const internalHandler = implementServerInternalPlugin(contract).handler(async ({ input }) => ({
      id: input.id,
      source: "promise",
    }));
    const services = { workItems: useService(service, { contract }) } as const;
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
    const createInternal = defineServerInternalPlugin.factory<{ readonly base: `/${string}` }>()(
      (options) => {
        optionMappings += 1;
        return {
          capability: "work-items-ops",
          routeBase: options.base,
          services,
          internal: () => internalHandler,
        };
      }
    );

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
    expect(readServiceUse(api.services.workItems).definition).toBe(service);
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
    const workflow = defineWorkflow({ id: "items.sync", inputSchema, steps: [step] as const });
    const schedule = defineSchedule({
      id: "items.nightly",
      cron: "0 0 * * *",
      steps: [step] as const,
    });
    const consumer = defineConsumer({
      id: "items.changed",
      eventName: "items/changed",
      eventSchema,
      steps: [step] as const,
    });
    const service = defineService({ id: "items", deps: {} });
    const serviceContract = { operation: "sync-items" } as const;
    const services = { items: useService(service, { contract: serviceContract }) } as const;
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
    expect("run" in workflow).toBe(false);
    expect("FunctionBundle" in workflowPlugin).toBe(false);
    expect("stepEffect" in workflowPlugin).toBe(false);

    if (false) {
      // @ts-expect-error Consumer event payloads require a RuntimeSchema.
      defineConsumer({ id: "invalid", eventName: "invalid", steps: [step] });
      defineWorkflow({
        id: "invalid",
        inputSchema,
        steps: [step],
        // @ts-expect-error Native run functions do not belong in cold task-4.2 declarations.
        run: async () => undefined,
      });
      defineWorkflow({
        id: "fake-step",
        inputSchema,
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
